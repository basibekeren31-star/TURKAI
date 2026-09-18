"use strict";

/*
============================================================
 TÜRKAI — SERVER.JS
 ULTRA BACKEND
 PARÇA 1 / 5

 Bu dosya sıfırdan oluşturulmaktadır.

 PARÇA 1 İÇERİĞİ
 -----------------------------------------------------------
 • Node.js başlangıç sistemi
 • Express
 • HTTP
 • Socket.IO
 • dotenv
 • Güvenlik başlıkları
 • JSON body sistemi
 • Kalıcı JSON veritabanı
 • Kullanıcı sistemi
 • Oturum sistemi
 • Plan sistemi
 • Yetkilendirme
 • Admin sistemi
 • Rate limit altyapısı
 • Yardımcı fonksiyonlar
 • Sistem ayarları
 • Health API
 • Temel API altyapısı

 Sonraki parçalar:
 PARÇA 2 → Chat + Memory + Knowledge + Model/Fusion
 PARÇA 3 → Research + Files + Code Engine
 PARÇA 4 → Admin + Denetçi + Feedback + Corrections
 PARÇA 5 → Advanced orchestration + Security + Final system
============================================================
*/


// ============================================================
// 001 — MODULES
// ============================================================

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const http = require("http");

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { Server } = require("socket.io");

require("dotenv").config();


// ============================================================
// 002 — APPLICATION
// ============================================================

const app = express();

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PATCH", "DELETE", "PUT"]
    }
});


// ============================================================
// 003 — BASIC CONFIGURATION
// ============================================================

const PORT =
    Number(process.env.PORT) ||
    3000;

const HOST =
    process.env.HOST ||
    "0.0.0.0";

const APP_NAME =
    "TürkAI";

const APP_VERSION =
    "11.0.0";

const NODE_ENV =
    process.env.NODE_ENV ||
    "development";

const IS_PRODUCTION =
    NODE_ENV === "production";


// ============================================================
// 004 — PATHS
// ============================================================

const ROOT_DIR =
    __dirname;

const DATA_DIR =
    path.join(ROOT_DIR, "data");

const DB_DIR =
    path.join(DATA_DIR, "database");

const STORAGE_DIR =
    path.join(DATA_DIR, "storage");

const USERS_DIR =
    path.join(STORAGE_DIR, "users");

const GENERATED_DIR =
    path.join(STORAGE_DIR, "generated");

const UPLOADS_DIR =
    path.join(STORAGE_DIR, "uploads");

const LOGS_DIR =
    path.join(DATA_DIR, "logs");

const PUBLIC_DIR =
    path.join(ROOT_DIR, "public");


// ============================================================
// 005 — DIRECTORY CREATION
// ============================================================

const requiredDirectories = [
    DATA_DIR,
    DB_DIR,
    STORAGE_DIR,
    USERS_DIR,
    GENERATED_DIR,
    UPLOADS_DIR,
    LOGS_DIR,
    PUBLIC_DIR
];

for (const directory of requiredDirectories) {
    fs.mkdirSync(directory, {
        recursive: true
    });
}


// ============================================================
// 006 — DATABASE FILES
// ============================================================

const DB_FILES = {
    users: path.join(DB_DIR, "users.json"),
    sessions: path.join(DB_DIR, "sessions.json"),
    chats: path.join(DB_DIR, "chats.json"),
    messages: path.join(DB_DIR, "messages.json"),
    memories: path.join(DB_DIR, "memories.json"),
    knowledge: path.join(DB_DIR, "knowledge.json"),
    feedback: path.join(DB_DIR, "feedback.json"),
    corrections: path.join(DB_DIR, "corrections.json"),
    usage: path.join(DB_DIR, "usage.json"),
    audit: path.join(DB_DIR, "audit.json"),
    security: path.join(DB_DIR, "security.json"),
    settings: path.join(DB_DIR, "settings.json"),
    files: path.join(DB_DIR, "files.json")
};


// ============================================================
// 007 — DEFAULT DATABASE
// ============================================================

const DEFAULT_DB = {
    users: [],
    sessions: [],
    chats: [],
    messages: [],
    memories: [],
    knowledge: [],
    feedback: [],
    correctionsQueue: [],
    usage: {},
    audit: [],
    securityEvents: [],
    files: [],
    settings: {
        announcement: "",
        maintenance: false,
        registrationEnabled: true,
        researchEnabled: true,
        fileCreationEnabled: true,
        memoryEnabled: true,
        auditorEnabled: true,
        updatedAt: null
    }
};


// ============================================================
// 008 — DATABASE OBJECT
// ============================================================

const db = {
    users: [],
    sessions: [],
    chats: [],
    messages: [],
    memories: [],
    knowledge: [],
    feedback: [],
    correctionsQueue: [],
    usage: {},
    audit: [],
    securityEvents: [],
    files: [],
    settings: {
        ...DEFAULT_DB.settings
    }
};


// ============================================================
// 009 — SAFE JSON READ
// ============================================================

function readJSON(filePath, fallback) {

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
            "[DATABASE READ ERROR]",
            filePath,
            error.message
        );

        return fallback;
    }
}


// ============================================================
// 010 — SAFE JSON WRITE
// ============================================================

function writeJSON(filePath, data) {

    const temporaryPath =
        `${filePath}.tmp`;

    try {

        fs.writeFileSync(
            temporaryPath,
            JSON.stringify(
                data,
                null,
                2
            ),
            "utf8"
        );

        fs.renameSync(
            temporaryPath,
            filePath
        );

        return true;

    } catch (error) {

        console.error(
            "[DATABASE WRITE ERROR]",
            filePath,
            error.message
        );

        try {

            if (fs.existsSync(temporaryPath)) {
                fs.unlinkSync(temporaryPath);
            }

        } catch {}

        return false;
    }
}


// ============================================================
// 011 — LOAD DATABASE
// ============================================================

function loadDatabase() {

    db.users =
        readJSON(
            DB_FILES.users,
            []
        );

    db.sessions =
        readJSON(
            DB_FILES.sessions,
            []
        );

    db.chats =
        readJSON(
            DB_FILES.chats,
            []
        );

    db.messages =
        readJSON(
            DB_FILES.messages,
            []
        );

    db.memories =
        readJSON(
            DB_FILES.memories,
            []
        );

    db.knowledge =
        readJSON(
            DB_FILES.knowledge,
            []
        );

    db.feedback =
        readJSON(
            DB_FILES.feedback,
            []
        );

    db.correctionsQueue =
        readJSON(
            DB_FILES.corrections,
            []
        );

    db.usage =
        readJSON(
            DB_FILES.usage,
            {}
        );

    db.audit =
        readJSON(
            DB_FILES.audit,
            []
        );

    db.securityEvents =
        readJSON(
            DB_FILES.security,
            []
        );

    db.files =
        readJSON(
            DB_FILES.files,
            []
        );

    db.settings = {
        ...DEFAULT_DB.settings,
        ...readJSON(
            DB_FILES.settings,
            {}
        )
    };
}


// ============================================================
// 012 — SAVE DATABASE
// ============================================================

function saveDB(type) {

    try {

        switch (type) {

            case "users":
                return writeJSON(
                    DB_FILES.users,
                    db.users
                );

            case "sessions":
                return writeJSON(
                    DB_FILES.sessions,
                    db.sessions
                );

            case "chats":
                return writeJSON(
                    DB_FILES.chats,
                    db.chats
                );

            case "messages":
                return writeJSON(
                    DB_FILES.messages,
                    db.messages
                );

            case "memories":
                return writeJSON(
                    DB_FILES.memories,
                    db.memories
                );

            case "knowledge":
                return writeJSON(
                    DB_FILES.knowledge,
                    db.knowledge
                );

            case "feedback":
                return writeJSON(
                    DB_FILES.feedback,
                    db.feedback
                );

            case "corrections":
                return writeJSON(
                    DB_FILES.corrections,
                    db.correctionsQueue
                );

            case "usage":
                return writeJSON(
                    DB_FILES.usage,
                    db.usage
                );

            case "audit":
                return writeJSON(
                    DB_FILES.audit,
                    db.audit
                );

            case "security":
                return writeJSON(
                    DB_FILES.security,
                    db.securityEvents
                );

            case "files":
                return writeJSON(
                    DB_FILES.files,
                    db.files
                );

            case "settings":
                return writeJSON(
                    DB_FILES.settings,
                    db.settings
                );

            default:
                return false;
        }

    } catch (error) {

        console.error(
            "[SAVE DATABASE]",
            error
        );

        return false;
    }
}


// ============================================================
// 013 — INITIAL DATABASE LOAD
// ============================================================

loadDatabase();


// ============================================================
// 014 — TIME HELPERS
// ============================================================

function isoNow() {
    return new Date().toISOString();
}


function getDateKey(date = new Date()) {

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


// ============================================================
// 015 — ID GENERATOR
// ============================================================

function createId(prefix = "id") {

    return `${prefix}_${Date.now()}_${crypto
        .randomBytes(8)
        .toString("hex")}`;
}


// ============================================================
// 016 — RANDOM TOKEN
// ============================================================

function createToken(bytes = 32) {

    return crypto
        .randomBytes(bytes)
        .toString("hex");
}


// ============================================================
// 017 — PASSWORD HASH
// ============================================================

function hashPassword(password) {

    const salt =
        crypto.randomBytes(16).toString("hex");

    const hash =
        crypto
            .scryptSync(
                String(password),
                salt,
                64
            )
            .toString("hex");

    return `${salt}:${hash}`;
}


// ============================================================
// 018 — PASSWORD VERIFY
// ============================================================

function verifyPassword(password, storedPassword) {

    try {

        const parts =
            String(storedPassword).split(":");

        if (parts.length !== 2) {
            return false;
        }

        const salt =
            parts[0];

        const originalHash =
            parts[1];

        const hash =
            crypto
                .scryptSync(
                    String(password),
                    salt,
                    64
                )
                .toString("hex");

        return crypto.timingSafeEqual(
            Buffer.from(hash, "hex"),
            Buffer.from(originalHash, "hex")
        );

    } catch {

        return false;
    }
}


// ============================================================
// 019 — TEXT SANITIZATION
// ============================================================

function safeText(value, maxLength = 10000) {

    if (
        value === undefined ||
        value === null
    ) {
        return "";
    }

    return String(value)
        .replace(/\u0000/g, "")
        .trim()
        .slice(0, maxLength);
}


// ============================================================
// 020 — USERNAME NORMALIZATION
// ============================================================

function normalizeUsername(username) {

    return safeText(
        username,
        40
    )
        .toLowerCase()
        .replace(/\s+/g, "")
        .replace(/[^a-z0-9ğüşöçıİĞÜŞÖÇ_.-]/gi, "");
}


// ============================================================
// 021 — EMAIL NORMALIZATION
// ============================================================

function normalizeEmail(email) {

    return safeText(
        email,
        150
    )
        .toLowerCase();
}


// ============================================================
// 022 — USERNAME VALIDATION
// ============================================================

function isValidUsername(username) {

    if (!username) {
        return false;
    }

    if (
        username.length < 3 ||
        username.length > 40
    ) {
        return false;
    }

    return /^[a-zA-Z0-9ğüşöçıİĞÜŞÖÇ_.-]+$/
        .test(username);
}


// ============================================================
// 023 — PASSWORD VALIDATION
// ============================================================

function isValidPassword(password) {

    if (!password) {
        return false;
    }

    return String(password).length >= 6;
}


// ============================================================
// 024 — PLANS
// ============================================================

const PLANS = {

    free: {
        id: "free",
        name: "Free",
        monthlyPrice: 0,
        annualPrice: 0,
        modelAccess: 3,
        dailyLimit: 50,
        imageLimit: 0,
        videoEnabled: false,
        memoryEnabled: true,
        researchEnabled: true,
        fileEnabled: true
    },

    pro: {
        id: "pro",
        name: "Pro",
        monthlyPrice: 250,
        annualPrice: 2400,
        modelAccess: 6,
        dailyLimit: 100,
        imageLimit: 2,
        videoEnabled: false,
        memoryEnabled: true,
        researchEnabled: true,
        fileEnabled: true
    },

    plus: {
        id: "plus",
        name: "Plus",
        monthlyPrice: 500,
        annualPrice: 4800,
        modelAccess: 9,
        dailyLimit: 200,
        imageLimit: 4,
        videoEnabled: false,
        memoryEnabled: true,
        researchEnabled: true,
        fileEnabled: true
    },

    ultra: {
        id: "ultra",
        name: "Ultra",
        monthlyPrice: 6000,
        firstMonthPrice: 1000,
        annualPrice: 53600,
        modelAccess: 12,
        dailyLimit: null,
        imageLimit: null,
        videoEnabled: false,
        memoryEnabled: true,
        researchEnabled: true,
        fileEnabled: true
    }
};


// ============================================================
// 025 — MODEL PROFILES
// ============================================================

const MODEL_PROFILES = {

    fast: {
        id: "fast",
        name: "TürkAI Fast",
        description: "Günlük hızlı sohbet",
        capability: "general"
    },

    think: {
        id: "think",
        name: "TürkAI Think",
        description: "Karmaşık düşünme ve analiz",
        capability: "reasoning"
    },

    math: {
        id: "math",
        name: "TürkAI Math",
        description: "Matematik ve hesaplama",
        capability: "math"
    },

    code: {
        id: "code",
        name: "TürkAI Code",
        description: "Programlama ve yazılım",
        capability: "coding"
    },

    research: {
        id: "research",
        name: "TürkAI Research",
        description: "Güncel araştırma",
        capability: "research"
    },

    writer: {
        id: "writer",
        name: "TürkAI Writer",
        description: "Yazı ve metin üretimi",
        capability: "writing"
    },

    learn: {
        id: "learn",
        name: "TürkAI Learn",
        description: "Eğitim ve öğretme",
        capability: "education"
    },

    creative: {
        id: "creative",
        name: "TürkAI Creative",
        description: "Yaratıcı içerik",
        capability: "creative"
    },

    file: {
        id: "file",
        name: "TürkAI File",
        description: "Dosya analizi",
        capability: "files"
    },

    security: {
        id: "security",
        name: "TürkAI Security",
        description: "Savunmacı siber güvenlik",
        capability: "security"
    },

    vision: {
        id: "vision",
        name: "TürkAI Vision",
        description: "Görsel ve dosya analizi",
        capability: "vision"
    },

    ultra: {
        id: "ultra",
        name: "TürkAI Ultra",
        description: "Genel premium sistem",
        capability: "general"
    }
};


// ============================================================
// 026 — MODEL ORDER
// ============================================================

const MODEL_ORDER = [
    "fast",
    "think",
    "math",
    "code",
    "research",
    "writer",
    "learn",
    "creative",
    "file",
    "security",
    "vision",
    "ultra"
];


// ============================================================
// 027 — PLAN HELPER
// ============================================================

function getPlan(user) {

    const planId =
        String(
            user?.plan || "free"
        ).toLowerCase();

    return (
        PLANS[planId] ||
        PLANS.free
    );
}


// ============================================================
// 028 — MODEL ACCESS
// ============================================================

function getAccessibleModels(user) {

    const plan =
        getPlan(user);

    return MODEL_ORDER
        .slice(0, plan.modelAccess)
        .map(id => MODEL_PROFILES[id]);
}


// ============================================================
// 029 — USER LOOKUP
// ============================================================

function findUserById(userId) {

    return db.users.find(
        user =>
            user.id === userId
    );
}


function findUserByUsername(username) {

    const normalized =
        normalizeUsername(username);

    return db.users.find(
        user =>
            normalizeUsername(
                user.username
            ) === normalized
    );
}


function findUserByEmail(email) {

    const normalized =
        normalizeEmail(email);

    return db.users.find(
        user =>
            normalizeEmail(
                user.email
            ) === normalized
    );
}


// ============================================================
// 030 — SESSION LOOKUP
// ============================================================

function findSession(token) {

    if (!token) {
        return null;
    }

    return db.sessions.find(
        session =>
            session.token === token
    );
}


// ============================================================
// 031 — SESSION CREATE
// ============================================================

function createSession(userId) {

    const token =
        createToken(48);

    const session = {

        id: createId("session"),

        userId,

        token,

        createdAt: isoNow(),

        lastActivityAt: isoNow(),

        expiresAt:
            new Date(
                Date.now() +
                1000 * 60 * 60 * 24 * 30
            ).toISOString()
    };

    db.sessions.push(session);

    if (db.sessions.length > 50000) {
        db.sessions =
            db.sessions.slice(-50000);
    }

    saveDB("sessions");

    return session;
}


// ============================================================
// 032 — SESSION DELETE
// ============================================================

function deleteSession(token) {

    const before =
        db.sessions.length;

    db.sessions =
        db.sessions.filter(
            session =>
                session.token !== token
        );

    if (
        db.sessions.length !== before
    ) {
        saveDB("sessions");
    }
}


// ============================================================
// 033 — SESSION CLEANUP
// ============================================================

function cleanupSessions() {

    const now =
        Date.now();

    const before =
        db.sessions.length;

    db.sessions =
        db.sessions.filter(
            session => {

                const expires =
                    Date.parse(
                        session.expiresAt
                    );

                return (
                    Number.isFinite(expires) &&
                    expires > now
                );
            }
        );

    if (
        db.sessions.length !== before
    ) {
        saveDB("sessions");
    }
}


// ============================================================
// 034 — AUTH TOKEN
// ============================================================

function getTokenFromRequest(req) {

    const authorization =
        String(
            req.headers.authorization || ""
        );

    if (
        authorization
            .toLowerCase()
            .startsWith("bearer ")
    ) {
        return authorization
            .slice(7)
            .trim();
    }

    const headerToken =
        req.headers["x-auth-token"];

    if (headerToken) {
        return String(headerToken);
    }

    if (req.body?.token) {
        return String(req.body.token);
    }

    if (req.query?.token) {
        return String(req.query.token);
    }

    return "";
}


// ============================================================
// 035 — AUTH MIDDLEWARE
// ============================================================

function requireAuth(req, res, next) {

    const token =
        getTokenFromRequest(req);

    if (!token) {

        return res.status(401).json({
            success: false,
            error: "Oturum gerekli.",
            code: "AUTH_REQUIRED"
        });
    }

    const session =
        findSession(token);

    if (!session) {

        return res.status(401).json({
            success: false,
            error: "Oturum bulunamadı.",
            code: "INVALID_SESSION"
        });
    }

    if (
        Date.parse(
            session.expiresAt
        ) <= Date.now()
    ) {

        deleteSession(token);

        return res.status(401).json({
            success: false,
            error: "Oturum süresi dolmuş.",
            code: "SESSION_EXPIRED"
        });
    }

    const user =
        findUserById(
            session.userId
        );

    if (!user) {

        deleteSession(token);

        return res.status(401).json({
            success: false,
            error: "Kullanıcı bulunamadı.",
            code: "USER_NOT_FOUND"
        });
    }

    if (user.disabled) {

        return res.status(403).json({
            success: false,
            error: "Bu hesap devre dışı bırakılmış.",
            code: "ACCOUNT_DISABLED"
        });
    }

    session.lastActivityAt =
        isoNow();

    user.lastActivityAt =
        isoNow();

    req.user =
        user;

    req.session =
        session;

    next();
}


// ============================================================
// 036 — ADMIN MIDDLEWARE
// ============================================================

function requireAdmin(req, res, next) {

    if (!req.user) {

        return res.status(401).json({
            success: false,
            error: "Oturum gerekli."
        });
    }

    if (
        req.user.role !== "admin"
    ) {

        return res.status(403).json({
            success: false,
            error: "Admin yetkisi gerekli.",
            code: "ADMIN_REQUIRED"
        });
    }

    next();
}


// ============================================================
// 037 — API SECURITY CONFIG
// ============================================================

app.disable("x-powered-by");

app.set(
    "trust proxy",
    1
);


// ============================================================
// 038 — CORS
// ============================================================

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
            "X-Auth-Token"
        ]
    })
);


// ============================================================
// 039 — HELMET
// ============================================================

app.use(
    helmet({
        crossOriginResourcePolicy: false,
        contentSecurityPolicy: false
    })
);


// ============================================================
// 040 — BODY PARSER
// ============================================================

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


// ============================================================
// 041 — REQUEST ID
// ============================================================

app.use((req, res, next) => {

    req.requestId =
        createId("request");

    res.setHeader(
        "X-Request-ID",
        req.requestId
    );

    next();
});


// ============================================================
// 042 — BASIC REQUEST LOGGING
// ============================================================

app.use((req, res, next) => {

    const started =
        Date.now();

    res.on("finish", () => {

        const duration =
            Date.now() - started;

        if (
            process.env.LOG_REQUESTS !== "false"
        ) {

            console.log(
                `[HTTP] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`
            );
        }
    });

    next();
});


// ============================================================
// 043 — RATE LIMIT STORAGE
// ============================================================

const rateLimitStore =
    new Map();


// ============================================================
// 044 — BASIC RATE LIMITER
// ============================================================

function rateLimit({
    windowMs = 60_000,
    max = 100
} = {}) {

    return (req, res, next) => {

        const key =
            req.ip ||
            "unknown";

        const now =
            Date.now();

        let record =
            rateLimitStore.get(key);

        if (
            !record ||
            now - record.startedAt >= windowMs
        ) {

            record = {
                startedAt: now,
                count: 0
            };

            rateLimitStore.set(
                key,
                record
            );
        }

        record.count++;

        if (
            record.count > max
        ) {

            return res.status(429).json({
                success: false,
                error: "Çok fazla istek gönderildi.",
                code: "RATE_LIMIT"
            });
        }

        next();
    };
}


// ============================================================
// 045 — GENERAL RATE LIMIT
// ============================================================

app.use(
    "/api",
    rateLimit({
        windowMs: 60_000,
        max: 180
    })
);


// ============================================================
// 046 — AUDIT SYSTEM
// ============================================================

function audit(
    action,
    details = {},
    userId = null
) {

    const item = {

        id: createId("audit"),

        action,

        userId,

        details,

        createdAt: isoNow()
    };

    db.audit.push(item);

    if (db.audit.length > 50000) {
        db.audit =
            db.audit.slice(-50000);
    }

    saveDB("audit");

    return item;
}


// ============================================================
// 047 — SECURITY EVENT
// ============================================================

function securityEvent(
    type,
    message,
    metadata = {}
) {

    const item = {

        id: createId("security"),

        type,

        message,

        metadata,

        createdAt: isoNow()
    };

    db.securityEvents.push(item);

    if (
        db.securityEvents.length >
        50000
    ) {

        db.securityEvents =
            db.securityEvents.slice(-50000);
    }

    saveDB("security");

    return item;
}


// ============================================================
// 048 — USER CREATION
// ============================================================

function createUser({
    username,
    password,
    email = "",
    role = "user",
    plan = "free",
    consentLogging = false
}) {

    const normalizedUsername =
        normalizeUsername(username);

    const normalizedEmail =
        normalizeEmail(email);

    if (
        !isValidUsername(
            normalizedUsername
        )
    ) {
        throw new Error(
            "Geçersiz kullanıcı adı."
        );
    }

    if (
        !isValidPassword(password)
    ) {
        throw new Error(
            "Şifre en az 6 karakter olmalı."
        );
    }

    if (
        findUserByUsername(
            normalizedUsername
        )
    ) {
        throw new Error(
            "Bu kullanıcı adı zaten kullanılıyor."
        );
    }

    if (
        normalizedEmail &&
        findUserByEmail(
            normalizedEmail
        )
    ) {
        throw new Error(
            "Bu e-posta zaten kullanılıyor."
        );
    }

    const user = {

        id: createId("user"),

        username:
            normalizedUsername,

        email:
            normalizedEmail || null,

        passwordHash:
            hashPassword(password),

        role:
            role === "admin"
                ? "admin"
                : "user",

        plan:
            PLANS[plan]
                ? plan
                : "free",

        disabled: false,

        consentLogging:
            Boolean(
                consentLogging
            ),

        createdAt:
            isoNow(),

        updatedAt:
            isoNow(),

        lastActivityAt:
            null
    };

    db.users.push(user);

    saveDB("users");

    audit(
        "user_created",
        {
            username:
                user.username,

            plan:
                user.plan
        },
        user.id
    );

    return user;
}


// ============================================================
// 049 — PUBLIC USER OBJECT
// ============================================================

function publicUser(user) {

    if (!user) {
        return null;
    }

    const plan =
        getPlan(user);

    return {

        id:
            user.id,

        username:
            user.username,

        email:
            user.email || null,

        role:
            user.role,

        plan:
            plan.id,

        planName:
            plan.name,

        disabled:
            Boolean(user.disabled),

        consentLogging:
            Boolean(
                user.consentLogging
            ),

        createdAt:
            user.createdAt,

        lastActivityAt:
            user.lastActivityAt,

        models:
            getAccessibleModels(user)
                .map(model => model.id)
    };
}


// ============================================================
// 050 — REGISTER API
// ============================================================

app.post(
    "/api/auth/register",
    rateLimit({
        windowMs: 60_000,
        max: 10
    }),
    (req, res) => {

        try {

            if (
                db.settings.registrationEnabled === false
            ) {

                return res.status(403).json({
                    success: false,
                    error: "Yeni kayıtlar şu anda kapalı."
                });
            }

            const username =
                normalizeUsername(
                    req.body?.username
                );

            const password =
                String(
                    req.body?.password || ""
                );

            const email =
                normalizeEmail(
                    req.body?.email
                );

            const consentLogging =
                req.body?.consentLogging === true;

            if (
                !isValidUsername(username)
            ) {

                return res.status(400).json({
                    success: false,
                    error: "Kullanıcı adı 3-40 karakter olmalı."
                });
            }

            if (
                !isValidPassword(password)
            ) {

                return res.status(400).json({
                    success: false,
                    error: "Şifre en az 6 karakter olmalı."
                });
            }

            const user =
                createUser({
                    username,
                    password,
                    email,
                    plan: "free",
                    role: "user",
                    consentLogging
                });

            const session =
                createSession(
                    user.id
                );

            res.status(201).json({

                success: true,

                user:
                    publicUser(user),

                token:
                    session.token
            });

        } catch (error) {

            console.error(
                "[REGISTER]",
                error
            );

            res.status(400).json({
                success: false,
                error:
                    error.message ||
                    "Kayıt oluşturulamadı."
            });
        }
    }
);


// ============================================================
// 051 — LOGIN API
// ============================================================

app.post(
    "/api/auth/login",
    rateLimit({
        windowMs: 60_000,
        max: 20
    }),
    (req, res) => {

        try {

            const username =
                normalizeUsername(
                    req.body?.username
                );

            const password =
                String(
                    req.body?.password || ""
                );

            const user =
                findUserByUsername(
                    username
                );

            if (
                !user ||
                !verifyPassword(
                    password,
                    user.passwordHash
                )
            ) {

                securityEvent(
                    "login_failed",
                    "Başarısız giriş denemesi.",
                    {
                        username
                    }
                );

                return res.status(401).json({
                    success: false,
                    error:
                        "Kullanıcı adı veya şifre hatalı."
                });
            }

            if (user.disabled) {

                return res.status(403).json({
                    success: false,
                    error:
                        "Bu hesap devre dışı bırakılmış."
                });
            }

            const session =
                createSession(
                    user.id
                );

            user.lastActivityAt =
                isoNow();

            user.updatedAt =
                isoNow();

            saveDB("users");

            audit(
                "user_login",
                {
                    username:
                        user.username,

                    role:
                        user.role
                },
                user.id
            );

            res.json({

                success: true,

                token:
                    session.token,

                user:
                    publicUser(user)
            });

        } catch (error) {

            console.error(
                "[LOGIN]",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "Giriş sırasında hata oluştu."
            });
        }
    }
);


// ============================================================
// 052 — LOGOUT API
// ============================================================

app.post(
    "/api/auth/logout",
    requireAuth,
    (req, res) => {

        const token =
            getTokenFromRequest(req);

        deleteSession(token);

        audit(
            "user_logout",
            {},
            req.user.id
        );

        res.json({
            success: true
        });
    }
);


// ============================================================
// 053 — CURRENT USER
// ============================================================

app.get(
    "/api/auth/me",
    requireAuth,
    (req, res) => {

        res.json({

            success: true,

            user:
                publicUser(
                    req.user
                ),

            plan:
                getPlan(
                    req.user
                ),

            models:
                getAccessibleModels(
                    req.user
                )
        });
    }
);


// ============================================================
// 054 — PLAN LIST
// ============================================================

app.get(
    "/api/plans",
    (req, res) => {

        res.json({

            success: true,

            plans:
                Object.values(
                    PLANS
                )
        });
    }
);


// ============================================================
// 055 — MODEL LIST
// ============================================================

app.get(
    "/api/models",
    requireAuth,
    (req, res) => {

        res.json({

            success: true,

            models:
                getAccessibleModels(
                    req.user
                ),

            allModels:
                req.user.role === "admin"
                    ? Object.values(
                        MODEL_PROFILES
                    )
                    : undefined
        });
    }
);


// ============================================================
// 056 — USER PROFILE
// ============================================================

app.get(
    "/api/profile",
    requireAuth,
    (req, res) => {

        res.json({

            success: true,

            user:
                publicUser(
                    req.user
                )
        });
    }
);


// ============================================================
// 057 — PROFILE UPDATE
// ============================================================

app.patch(
    "/api/profile",
    requireAuth,
    (req, res) => {

        try {

            const user =
                req.user;

            if (
                req.body?.email !== undefined
            ) {

                const email =
                    normalizeEmail(
                        req.body.email
                    );

                const existing =
                    findUserByEmail(
                        email
                    );

                if (
                    email &&
                    existing &&
                    existing.id !== user.id
                ) {

                    return res.status(409).json({
                        success: false,
                        error:
                            "Bu e-posta başka bir hesapta kullanılıyor."
                    });
                }

                user.email =
                    email || null;
            }

            if (
                req.body?.consentLogging !== undefined
            ) {

                user.consentLogging =
                    req.body.consentLogging === true;
            }

            user.updatedAt =
                isoNow();

            saveDB("users");

            audit(
                "profile_updated",
                {
                    consentLogging:
                        user.consentLogging
                },
                user.id
            );

            res.json({

                success: true,

                user:
                    publicUser(user)
            });

        } catch (error) {

            console.error(
                "[PROFILE UPDATE]",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "Profil güncellenemedi."
            });
        }
    }
);


// ============================================================
// 058 — CHANGE PASSWORD
// ============================================================

app.post(
    "/api/profile/password",
    requireAuth,
    (req, res) => {

        try {

            const oldPassword =
                String(
                    req.body?.oldPassword || ""
                );

            const newPassword =
                String(
                    req.body?.newPassword || ""
                );

            if (
                !verifyPassword(
                    oldPassword,
                    req.user.passwordHash
                )
            ) {

                return res.status(401).json({
                    success: false,
                    error:
                        "Mevcut şifre hatalı."
                });
            }

            if (
                !isValidPassword(
                    newPassword
                )
            ) {

                return res.status(400).json({
                    success: false,
                    error:
                        "Yeni şifre en az 6 karakter olmalı."
                });
            }

            req.user.passwordHash =
                hashPassword(
                    newPassword
                );

            req.user.updatedAt =
                isoNow();

            saveDB("users");

            audit(
                "password_changed",
                {},
                req.user.id
            );

            res.json({
                success: true
            });

        } catch (error) {

            console.error(
                "[PASSWORD CHANGE]",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "Şifre değiştirilemedi."
            });
        }
    }
);


// ============================================================
// 059 — SYSTEM SETTINGS
// ============================================================

app.get(
    "/api/system/settings",
    (req, res) => {

        res.json({

            success: true,

            app: {
                name: APP_NAME,
                version: APP_VERSION,
                environment:
                    NODE_ENV
            },

            settings: {
                announcement:
                    db.settings.announcement,

                maintenance:
                    db.settings.maintenance,

                registrationEnabled:
                    db.settings.registrationEnabled,

                researchEnabled:
                    db.settings.researchEnabled,

                fileCreationEnabled:
                    db.settings.fileCreationEnabled,

                memoryEnabled:
                    db.settings.memoryEnabled,

                auditorEnabled:
                    db.settings.auditorEnabled
            }
        });
    }
);


// ============================================================
// 060 — HEALTH
// ============================================================

app.get(
    "/api/health",
    (req, res) => {

        const memory =
            process.memoryUsage();

        res.json({

            success: true,

            status: "ok",

            app: APP_NAME,

            version:
                APP_VERSION,

            uptime:
                process.uptime(),

            time:
                isoNow(),

            node:
                process.version,

            memory: {
                rss:
                    memory.rss,

                heapUsed:
                    memory.heapUsed,

                heapTotal:
                    memory.heapTotal
            },

            database: {
                users:
                    db.users.length,

                chats:
                    db.chats.length,

                messages:
                    db.messages.length,

                knowledge:
                    db.knowledge.length,

                memories:
                    db.memories.length
            }
        });
    }
);


// ============================================================
// 061 — ADMIN HEALTH
// ============================================================

app.get(
    "/api/admin/health",
    requireAuth,
    requireAdmin,
    (req, res) => {

        const memory =
            process.memoryUsage();

        res.json({

            success: true,

            server: {
                app:
                    APP_NAME,

                version:
                    APP_VERSION,

                environment:
                    NODE_ENV,

                uptime:
                    process.uptime(),

                pid:
                    process.pid,

                node:
                    process.version
            },

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

            database: {

                users:
                    db.users.length,

                sessions:
                    db.sessions.length,

                chats:
                    db.chats.length,

                messages:
                    db.messages.length,

                memories:
                    db.memories.length,

                knowledge:
                    db.knowledge.length,

                feedback:
                    db.feedback.length,

                corrections:
                    db.correctionsQueue.length,

                files:
                    db.files.length,

                audit:
                    db.audit.length,

                securityEvents:
                    db.securityEvents.length
            },

            time:
                isoNow()
        });
    }
);


// ============================================================
// 062 — SOCKET.IO
// ============================================================

io.on(
    "connection",
    socket => {

        console.log(
            `[SOCKET] Bağlandı: ${socket.id}`
        );

        socket.emit(
            "turkai:ready",
            {
                app:
                    APP_NAME,

                version:
                    APP_VERSION,

                time:
                    isoNow()
            }
        );

        socket.on(
            "turkai:ping",
            () => {

                socket.emit(
                    "turkai:pong",
                    {
                        time:
                            isoNow()
                    }
                );
            }
        );

        socket.on(
            "disconnect",
            reason => {

                console.log(
                    `[SOCKET] Ayrıldı: ${socket.id} — ${reason}`
                );
            }
        );
    }
);


// ============================================================
// 063 — STATIC FILES
// ============================================================

if (
    fs.existsSync(PUBLIC_DIR)
) {

    app.use(
        express.static(
            PUBLIC_DIR
        )
    );
}


// ============================================================
// 064 — API 404
// ============================================================

app.use(
    "/api",
    (req, res) => {

        res.status(404).json({

            success: false,

            error:
                "API endpoint bulunamadı.",

            path:
                req.originalUrl,

            method:
                req.method,

            requestId:
                req.requestId
        });
    }
);


// ============================================================
// 065 — GLOBAL ERROR HANDLER
// ============================================================

app.use(
    (error, req, res, next) => {

        console.error(
            "[GLOBAL ERROR]",
            error
        );

        securityEvent(
            "server_error",
            error.message ||
                "Bilinmeyen sunucu hatası.",
            {
                method:
                    req.method,

                path:
                    req.originalUrl,

                requestId:
                    req.requestId
            }
        );

        if (res.headersSent) {
            return next(error);
        }

        res.status(500).json({

            success: false,

            error:
                IS_PRODUCTION
                    ? "Sunucu hatası oluştu."
                    : error.message,

            requestId:
                req.requestId
        });
    }
);


// ============================================================
// 066 — PERIODIC SESSION CLEANUP
// ============================================================

setInterval(
    () => {

        try {
            cleanupSessions();
        } catch (error) {

            console.error(
                "[SESSION CLEANUP]",
                error
            );
        }

    },
    1000 * 60 * 30
);


// ============================================================
// 067 — RATE LIMIT CLEANUP
// ============================================================

setInterval(
    () => {

        const now =
            Date.now();

        for (
            const [
                key,
                record
            ] of rateLimitStore
        ) {

            if (
                now -
                record.startedAt >
                1000 * 60 * 10
            ) {

                rateLimitStore.delete(
                    key
                );
            }
        }

    },
    1000 * 60 * 10
);


// ============================================================
// 068 — STARTUP INFORMATION
// ============================================================

function printStartupInfo() {

    console.log("");
    console.log(
        "============================================================"
    );
    console.log(
        " TÜRKAI SERVER"
    );
    console.log(
        "============================================================"
    );

    console.log(
        ` Uygulama : ${APP_NAME}`
    );

    console.log(
        ` Sürüm    : ${APP_VERSION}`
    );

    console.log(
        ` Ortam    : ${NODE_ENV}`
    );

    console.log(
        ` Node     : ${process.version}`
    );

    console.log(
        ` Port     : ${PORT}`
    );

    console.log(
        ` Kullanıcı: ${db.users.length}`
    );

    console.log(
        ` Sohbet   : ${db.chats.length}`
    );

    console.log(
        ` Mesaj    : ${db.messages.length}`
    );

    console.log(
        ` Knowledge: ${db.knowledge.length}`
    );

    console.log(
        ` Memory   : ${db.memories.length}`
    );

    console.log(
        "============================================================"
    );

    console.log(
        " TürkAI backend hazır."
    );

    console.log(
        "============================================================"
    );

    console.log("");
}


// ============================================================
// 069 — SERVER START
// ============================================================

httpServer.listen(
    PORT,
    HOST,
    () => {

        printStartupInfo();

        audit(
            "server_started",
            {
                version:
                    APP_VERSION,

                environment:
                    NODE_ENV,

                port:
                    PORT
            }
        );
    }
);


// ============================================================
// 070 — PROCESS ERROR
// ============================================================

process.on(
    "uncaughtException",
    error => {

        console.error(
            "[UNCAUGHT EXCEPTION]",
            error
        );

        securityEvent(
            "uncaught_exception",
            error.message || "Bilinmeyen hata."
        );
    }
);


// ============================================================
// 071 — UNHANDLED REJECTION
// ============================================================

process.on(
    "unhandledRejection",
    reason => {

        console.error(
            "[UNHANDLED REJECTION]",
            reason
        );

        securityEvent(
            "unhandled_rejection",
            String(reason)
        );
    }
);


// ============================================================
// 072 — GRACEFUL SHUTDOWN
// ============================================================

function gracefulShutdown(signal) {

    console.log(
        `[SYSTEM] ${signal} alındı. Sunucu kapatılıyor...`
    );

    try {

        saveDB("users");
        saveDB("sessions");
        saveDB("chats");
        saveDB("messages");
        saveDB("memories");
        saveDB("knowledge");
        saveDB("feedback");
        saveDB("corrections");
        saveDB("usage");
        saveDB("audit");
        saveDB("security");
        saveDB("files");
        saveDB("settings");

    } catch (error) {

        console.error(
            "[SHUTDOWN SAVE ERROR]",
            error
        );
    }

    httpServer.close(
        () => {

            console.log(
                "[SYSTEM] TürkAI güvenli şekilde kapandı."
            );

            process.exit(0);
        }
    );

    setTimeout(
        () => process.exit(1),
        10000
    );
}


process.on(
    "SIGTERM",
    () => gracefulShutdown("SIGTERM")
);

process.on(
    "SIGINT",
    () => gracefulShutdown("SIGINT")
);


// ============================================================
// PARÇA 1 / 5 — SON
// ============================================================
//
// Buradan sonra PARÇA 2 doğrudan devam edecek.
//
// PARÇA 2:
// • Chat sistemi
// • Chat geçmişi
// • Ready Answers
// • Knowledge Engine
// • TürkAI Memory
// • Model seçimi
// • Fusion planı
// • Mesaj limitleri
// • Feedback altyapısı
// • Yerel cevap motoru
//
// ============================================================
// ============================================================
// ============================================================
// TÜRKAI SERVER.JS — PARÇA 2 / 5
// CHAT + KNOWLEDGE + MEMORY + FUSION ENGINE
// ============================================================
// ============================================================


// ============================================================
// 073 — CHAT CONFIGURATION
// ============================================================

const CHAT_CONFIG = {

    maxMessageLength: 30000,

    maxChatTitleLength: 100,

    maxMessagesPerChat: 10000,

    maxChatsPerUser: 500,

    contextMessageCount: 30,

    knowledgeLimit: 50000,

    memoryLimitPerUser: 1000,

    correctionLimit: 20000,

    feedbackLimit: 50000,

    enableReadyAnswers: true,

    enableKnowledge: true,

    enableMemory: true,

    enableFusion: true,

    enableAuditor: true
};


// ============================================================
// 074 — MESSAGE LIMIT HELPERS
// ============================================================

function getDailyUsage(userId) {

    const dateKey =
        getDateKey();

    if (!db.usage[userId]) {

        db.usage[userId] = {};
    }

    if (!db.usage[userId][dateKey]) {

        db.usage[userId][dateKey] = {

            messages: 0,

            research: 0,

            files: 0,

            images: 0,

            videos: 0,

            errors: 0,

            responseTimeTotal: 0,

            responseCount: 0,

            updatedAt: isoNow()
        };
    }

    return db.usage[userId][dateKey];
}


// ============================================================
// 075 — USAGE INCREMENT
// ============================================================

function incrementUsage(
    userId,
    type,
    amount = 1
) {

    const usage =
        getDailyUsage(userId);

    if (
        typeof usage[type] !== "number"
    ) {

        usage[type] = 0;
    }

    usage[type] += amount;

    usage.updatedAt =
        isoNow();

    if (!db.usage[userId].totals) {

        db.usage[userId].totals = {

            messages: 0,

            research: 0,

            files: 0,

            images: 0,

            videos: 0,

            errors: 0,

            responseTimeTotal: 0,

            responseCount: 0
        };
    }

    if (
        typeof db.usage[userId].totals[type]
        !== "number"
    ) {

        db.usage[userId].totals[type] = 0;
    }

    db.usage[userId].totals[type] +=
        amount;

    saveDB("usage");

    return usage;
}


// ============================================================
// 076 — USER USAGE
// ============================================================

function getUserUsage(userId) {

    const today =
        getDailyUsage(userId);

    const totals =
        db.usage[userId]?.totals || {

            messages: 0,

            research: 0,

            files: 0,

            images: 0,

            videos: 0,

            errors: 0,

            responseTimeTotal: 0,

            responseCount: 0
        };

    return {

        today,

        totals,

        lastActivityAt:
            findUserById(
                userId
            )?.lastActivityAt || null
    };
}


// ============================================================
// 077 — MESSAGE LIMIT
// ============================================================

function getMessageLimit(user) {

    const plan =
        getPlan(user);

    return plan.dailyLimit;
}


// ============================================================
// 078 — MESSAGE LIMIT CHECK
// ============================================================

function checkMessageLimit(user) {

    const limit =
        getMessageLimit(user);

    const usage =
        getDailyUsage(user.id);

    const used =
        Number(
            usage.messages || 0
        );

    if (limit === null) {

        return {

            allowed: true,

            limit: null,

            used,

            remaining: null
        };
    }

    return {

        allowed:
            used < limit,

        limit,

        used,

        remaining:
            Math.max(
                0,
                limit - used
            )
    };
}


// ============================================================
// 079 — CHAT TITLE
// ============================================================

function createChatTitle(message) {

    const text =
        safeText(
            message,
            CHAT_CONFIG.maxChatTitleLength
        );

    if (!text) {

        return "Yeni sohbet";
    }

    return text.length >
        CHAT_CONFIG.maxChatTitleLength

        ? `${text.slice(
            0,
            CHAT_CONFIG.maxChatTitleLength - 3
        )}...`

        : text;
}


// ============================================================
// 080 — CHAT FIND
// ============================================================

function getChat(
    chatId,
    userId
) {

    return db.chats.find(
        chat =>
            chat.id === chatId &&
            chat.userId === userId
    );
}


// ============================================================
// 081 — CHAT CREATE
// ============================================================

function createChat(
    userId,
    firstMessage = ""
) {

    const userChats =
        db.chats.filter(
            chat =>
                chat.userId === userId
        );

    if (
        userChats.length >=
        CHAT_CONFIG.maxChatsPerUser
    ) {

        userChats.sort(
            (a, b) =>
                String(
                    a.updatedAt
                ).localeCompare(
                    String(
                        b.updatedAt
                    )
                )
        );

        const oldest =
            userChats[0];

        if (oldest) {

            db.chats =
                db.chats.filter(
                    chat =>
                        chat.id !== oldest.id
                );

            db.messages =
                db.messages.filter(
                    message =>
                        message.chatId !==
                        oldest.id
                );
        }
    }

    const chat = {

        id:
            createId("chat"),

        userId,

        title:
            createChatTitle(
                firstMessage
            ),

        createdAt:
            isoNow(),

        updatedAt:
            isoNow(),

        messageCount: 0,

        archived: false,

        pinned: false,

        metadata: {}
    };

    db.chats.push(chat);

    saveDB("chats");

    audit(
        "chat_created",
        {
            chatId:
                chat.id
        },
        userId
    );

    return chat;
}


// ============================================================
// 082 — CHAT UPDATE
// ============================================================

function updateChat(
    chatId,
    userId,
    changes = {}
) {

    const chat =
        getChat(
            chatId,
            userId
        );

    if (!chat) {

        return null;
    }

    if (
        changes.title !== undefined
    ) {

        const title =
            safeText(
                changes.title,
                CHAT_CONFIG.maxChatTitleLength
            );

        if (title) {

            chat.title =
                title;
        }
    }

    if (
        changes.archived !== undefined
    ) {

        chat.archived =
            Boolean(
                changes.archived
            );
    }

    if (
        changes.pinned !== undefined
    ) {

        chat.pinned =
            Boolean(
                changes.pinned
            );
    }

    chat.updatedAt =
        isoNow();

    saveDB("chats");

    return chat;
}


// ============================================================
// 083 — CHAT DELETE
// ============================================================

function deleteChat(
    chatId,
    userId
) {

    const chat =
        getChat(
            chatId,
            userId
        );

    if (!chat) {

        return false;
    }

    db.chats =
        db.chats.filter(
            item =>
                item.id !== chatId
        );

    db.messages =
        db.messages.filter(
            message =>
                message.chatId !== chatId
        );

    saveDB("chats");

    saveDB("messages");

    audit(
        "chat_deleted",
        {
            chatId
        },
        userId
    );

    return true;
}


// ============================================================
// 084 — SAVE MESSAGE
// ============================================================

function saveMessage(
    chatId,
    data = {}
) {

    const chat =
        db.chats.find(
            item =>
                item.id === chatId
        );

    if (!chat) {

        throw new Error(
            "Sohbet bulunamadı."
        );
    }

    const role =
        ["user", "assistant", "system"]
            .includes(
                data.role
            )
            ? data.role
            : "assistant";

    const message = {

        id:
            createId("message"),

        chatId,

        userId:
            chat.userId,

        role,

        content:
            safeText(
                data.content,
                CHAT_CONFIG.maxMessageLength
            ),

        model:
            data.model || null,

        source:
            data.source || null,

        fusion:
            data.fusion || null,

        responseTime:
            Number(
                data.responseTime || 0
            ),

        researchUsed:
            Boolean(
                data.researchUsed
            ),

        createdAt:
            isoNow(),

        metadata:
            data.metadata || {}
    };

    db.messages.push(message);

    chat.messageCount =
        Number(
            chat.messageCount || 0
        ) + 1;

    chat.updatedAt =
        isoNow();

    if (
        db.messages.length >
        100000
    ) {

        db.messages =
            db.messages.slice(
                -100000
            );
    }

    saveDB("messages");

    saveDB("chats");

    return message;
}


// ============================================================
// 085 — CHAT MESSAGES
// ============================================================

function getChatMessages(
    chatId,
    userId,
    limit =
        CHAT_CONFIG.contextMessageCount
) {

    const chat =
        getChat(
            chatId,
            userId
        );

    if (!chat) {

        return [];
    }

    const safeLimit =
        Math.min(
            Math.max(
                Number(limit) || 30,
                1
            ),
            200
        );

    return db.messages
        .filter(
            message =>
                message.chatId === chatId
        )
        .slice(-safeLimit);
}


// ============================================================
// 086 — ALL USER CHATS
// ============================================================

function getUserChats(
    userId
) {

    return db.chats
        .filter(
            chat =>
                chat.userId === userId
        )
        .sort(
            (a, b) =>
                String(
                    b.updatedAt
                ).localeCompare(
                    String(
                        a.updatedAt
                    )
                )
        );
}


// ============================================================
// 087 — CHAT LIST API
// ============================================================

app.get(
    "/api/chats",
    requireAuth,
    (req, res) => {

        const chats =
            getUserChats(
                req.user.id
            );

        res.json({

            success: true,

            chats
        });
    }
);


// ============================================================
// 088 — CREATE CHAT API
// ============================================================

app.post(
    "/api/chats",
    requireAuth,
    (req, res) => {

        try {

            const title =
                safeText(
                    req.body?.title,
                    CHAT_CONFIG.maxChatTitleLength
                );

            const chat =
                createChat(
                    req.user.id,
                    title
                );

            if (title) {

                chat.title =
                    title;

                saveDB("chats");
            }

            res.status(201).json({

                success: true,

                chat
            });

        } catch (error) {

            console.error(
                "[CREATE CHAT]",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "Sohbet oluşturulamadı."
            });
        }
    }
);


// ============================================================
// 089 — GET CHAT API
// ============================================================

app.get(
    "/api/chats/:id",
    requireAuth,
    (req, res) => {

        const chat =
            getChat(
                req.params.id,
                req.user.id
            );

        if (!chat) {

            return res.status(404).json({
                success: false,
                error:
                    "Sohbet bulunamadı."
            });
        }

        const messages =
            getChatMessages(
                chat.id,
                req.user.id,
                req.query?.limit
            );

        res.json({

            success: true,

            chat,

            messages
        });
    }
);


// ============================================================
// 090 — UPDATE CHAT API
// ============================================================

app.patch(
    "/api/chats/:id",
    requireAuth,
    (req, res) => {

        const chat =
            updateChat(
                req.params.id,
                req.user.id,
                req.body || {}
            );

        if (!chat) {

            return res.status(404).json({
                success: false,
                error:
                    "Sohbet bulunamadı."
            });
        }

        res.json({

            success: true,

            chat
        });
    }
);


// ============================================================
// 091 — DELETE CHAT API
// ============================================================

app.delete(
    "/api/chats/:id",
    requireAuth,
    (req, res) => {

        const deleted =
            deleteChat(
                req.params.id,
                req.user.id
            );

        if (!deleted) {

            return res.status(404).json({
                success: false,
                error:
                    "Sohbet bulunamadı."
            });
        }

        res.json({
            success: true
        });
    }
);


// ============================================================
// 092 — MESSAGE HISTORY SEARCH
// ============================================================

app.get(
    "/api/history/search",
    requireAuth,
    (req, res) => {

        const query =
            safeText(
                req.query?.q,
                200
            ).toLowerCase();

        if (!query) {

            return res.json({
                success: true,
                results: []
            });
        }

        const results =
            db.messages
                .filter(
                    message =>
                        message.userId ===
                            req.user.id &&
                        String(
                            message.content || ""
                        )
                            .toLowerCase()
                            .includes(query)
                )
                .slice(-100)
                .map(
                    message => {

                        const chat =
                            getChat(
                                message.chatId,
                                req.user.id
                            );

                        return {

                            messageId:
                                message.id,

                            chatId:
                                message.chatId,

                            chatTitle:
                                chat?.title ||
                                "Sohbet",

                            role:
                                message.role,

                            content:
                                message.content,

                            createdAt:
                                message.createdAt
                        };
                    }
                );

        res.json({

            success: true,

            results
        });
    }
);


// ============================================================
// 093 — MEMORY STORAGE
// ============================================================

function getUserMemories(
    userId
) {

    return db.memories
        .filter(
            memory =>
                memory.userId === userId
        )
        .sort(
            (a, b) =>
                String(
                    b.updatedAt
                ).localeCompare(
                    String(
                        a.updatedAt
                    )
                )
        );
}


// ============================================================
// 094 — MEMORY NORMALIZATION
// ============================================================

function normalizeMemory(
    content
) {

    return safeText(
        content,
        5000
    )
        .replace(/\s+/g, " ")
        .trim();
}


// ============================================================
// 095 — MEMORY DUPLICATE CHECK
// ============================================================

function findDuplicateMemory(
    userId,
    content
) {

    const normalized =
        normalizeMemory(
            content
        ).toLowerCase();

    return getUserMemories(
        userId
    ).find(
        memory =>
            normalizeMemory(
                memory.content
            ).toLowerCase() ===
            normalized
    );
}


// ============================================================
// 096 — SAVE MEMORY
// ============================================================

function saveMemory(
    userId,
    content
) {

    const normalized =
        normalizeMemory(
            content
        );

    if (!normalized) {

        return null;
    }

    const duplicate =
        findDuplicateMemory(
            userId,
            normalized
        );

    if (duplicate) {

        duplicate.updatedAt =
            isoNow();

        saveDB("memories");

        return duplicate;
    }

    const memories =
        getUserMemories(
            userId
        );

    if (
        memories.length >=
        CHAT_CONFIG.memoryLimitPerUser
    ) {

        const oldest =
            memories[
                memories.length - 1
            ];

        if (oldest) {

            db.memories =
                db.memories.filter(
                    memory =>
                        memory.id !==
                        oldest.id
                );
        }
    }

    const memory = {

        id:
            createId("memory"),

        userId,

        content:
            normalized,

        createdAt:
            isoNow(),

        updatedAt:
            isoNow()
    };

    db.memories.push(
        memory
    );

    saveDB("memories");

    audit(
        "memory_saved",
        {
            memoryId:
                memory.id
        },
        userId
    );

    return memory;
}


// ============================================================
// 097 — DELETE MEMORY
// ============================================================

function deleteMemory(
    userId,
    memoryId
) {

    const index =
        db.memories.findIndex(
            memory =>
                memory.id ===
                    memoryId &&
                memory.userId ===
                    userId
        );

    if (index === -1) {

        return false;
    }

    db.memories.splice(
        index,
        1
    );

    saveDB("memories");

    audit(
        "memory_deleted",
        {
            memoryId
        },
        userId
    );

    return true;
}


// ============================================================
// 098 — MEMORY API
// ============================================================

app.get(
    "/api/memory",
    requireAuth,
    (req, res) => {

        res.json({

            success: true,

            memories:
                getUserMemories(
                    req.user.id
                )
        });
    }
);


// ============================================================
// 099 — MEMORY SAVE API
// ============================================================

app.post(
    "/api/memory",
    requireAuth,
    (req, res) => {

        if (
            db.settings.memoryEnabled === false
        ) {

            return res.status(403).json({
                success: false,
                error:
                    "Bellek sistemi şu anda kapalı."
            });
        }

        const content =
            normalizeMemory(
                req.body?.content
            );

        if (!content) {

            return res.status(400).json({
                success: false,
                error:
                    "Belleğe kaydedilecek içerik boş."
            });
        }

        const memory =
            saveMemory(
                req.user.id,
                content
            );

        res.json({

            success: true,

            memory
        });
    }
);


// ============================================================
// 100 — MEMORY DELETE API
// ============================================================

app.delete(
    "/api/memory/:id",
    requireAuth,
    (req, res) => {

        const deleted =
            deleteMemory(
                req.user.id,
                req.params.id
            );

        if (!deleted) {

            return res.status(404).json({
                success: false,
                error:
                    "Bellek bulunamadı."
            });
        }

        res.json({
            success: true
        });
    }
);


// ============================================================
// 101 — CLEAR MEMORY
// ============================================================

app.delete(
    "/api/memory",
    requireAuth,
    (req, res) => {

        const before =
            db.memories.length;

        db.memories =
            db.memories.filter(
                memory =>
                    memory.userId !==
                    req.user.id
            );

        saveDB("memories");

        audit(
            "memory_cleared",
            {
                deleted:
                    before -
                    db.memories.length
            },
            req.user.id
        );

        res.json({

            success: true,

            deleted:
                before -
                db.memories.length
        });
    }
);


// ============================================================
// 102 — EXPLICIT MEMORY COMMAND DETECTOR
// ============================================================

function isMemoryCommand(
    message
) {

    const text =
        String(
            message || ""
        )
            .toLowerCase()
            .trim();

    const patterns = [

        "bunu belleğe kaydet",

        "bunu hafızana kaydet",

        "bunu hatırla",

        "bunu belleğinde tut",

        "bunu hafızanda tut",

        "belleğime kaydet",

        "hafızama kaydet",

        "bunu unut",

        "bunu hafızandan sil",

        "belleğimi güncelle"
    ];

    return patterns.some(
        pattern =>
            text.includes(
                pattern
            )
    );
}


// ============================================================
// 103 — MEMORY COMMAND CONTENT
// ============================================================

function extractMemoryContent(
    message
) {

    let text =
        safeText(
            message,
            5000
        );

    const prefixes = [

        "bunu belleğe kaydet",

        "bunu hafızana kaydet",

        "bunu hatırla",

        "bunu belleğinde tut",

        "bunu hafızanda tut",

        "belleğime kaydet",

        "hafızama kaydet",

        "belleğimi güncelle"
    ];

    for (
        const prefix of prefixes
    ) {

        if (
            text
                .toLowerCase()
                .startsWith(prefix)
        ) {

            text =
                text.slice(
                    prefix.length
                )
                .trim();

            break;
        }
    }

    return text;
}


// ============================================================
// 104 — READY ANSWER DATABASE
// ============================================================

const READY_ANSWERS = [

    {
        id: "greeting_hello",

        patterns: [
            "merhaba",
            "selam",
            "selamlar",
            "slm",
            "slmm",
            "slmmmm",
            "sa",
            "s.a",
            "hey"
        ],

        answer:
            "Merhaba! Ben TürkAI. Sana nasıl yardımcı olabilirim?",

        category:
            "greeting"
    },

    {
        id: "greeting_how",

        patterns: [
            "nasılsın",
            "nasilsin",
            "naber",
            "nasıl gidiyor",
            "nasıl gidiyo"
        ],

        answer:
            "İyiyim, teşekkürler. Hazırım; ne üzerinde çalışmak istersin?",

        category:
            "greeting"
    },

    {
        id: "identity",

        patterns: [
            "sen kimsin",
            "kimsin",
            "sen nesin",
            "türkai nedir",
            "turkai nedir"
        ],

        answer:
            "Ben TürkAI. Sohbet, araştırma, kodlama, eğitim, dosya işlemleri ve daha fazlası için tasarlanmış bir yapay zekâ sistemiyim.",

        category:
            "identity"
    },

    {
        id: "fastest",

        patterns: [
            "en hızlı kim",
            "en hizli kim"
        ],

        answer:
            "TürkAI ⚡🤖",

        category:
            "identity"
    },

    {
        id: "thanks",

        patterns: [
            "teşekkürler",
            "teşekkür ederim",
            "sağol",
            "sağ ol",
            "eyvallah",
            "çok sağol"
        ],

        answer:
            "Rica ederim! Başka bir konuda da yardımcı olabilirim.",

        category:
            "social"
    },

    {
        id: "bye",

        patterns: [
            "görüşürüz",
            "gorusuruz",
            "bay bay",
            "bye",
            "hoşçakal",
            "hoşça kal"
        ],

        answer:
            "Görüşürüz! TürkAI burada olacak.",

        category:
            "social"
    },

    {
        id: "help",

        patterns: [
            "yardım",
            "yardım et",
            "ne yapabilirsin",
            "neler yapabilirsin",
            "özelliklerin neler"
        ],

        answer:
            "Sohbet edebilir, kod yazabilir, dosyaları analiz edebilir, araştırma yapabilir, bilgileri düzenleyebilir ve eğitim konularında yardımcı olabilirim.",

        category:
            "help"
    }

];


// ============================================================
// 105 — TEXT SIMILARITY
// ============================================================

function normalizeForSimilarity(
    text
) {

    return String(
        text || ""
    )
        .toLowerCase()
        .replace(
            /[^\p{L}\p{N}\s]/gu,
            " "
        )
        .replace(
            /\s+/g,
            " "
        )
        .trim();
}


// ============================================================
// 106 — TOKENIZE
// ============================================================

function tokenize(
    text
) {

    return normalizeForSimilarity(
        text
    )
        .split(" ")
        .filter(
            token =>
                token.length >= 2
        );
}


// ============================================================
// 107 — SIMILARITY SCORE
// ============================================================

function similarityScore(
    a,
    b
) {

    const tokensA =
        new Set(
            tokenize(a)
        );

    const tokensB =
        new Set(
            tokenize(b)
        );

    if (
        tokensA.size === 0 ||
        tokensB.size === 0
    ) {

        return 0;
    }

    let intersection = 0;

    for (
        const token of tokensA
    ) {

        if (
            tokensB.has(token)
        ) {

            intersection++;
        }
    }

    const union =
        new Set([
            ...tokensA,
            ...tokensB
        ]).size;

    if (!union) {
        return 0;
    }

    return intersection /
        union;
}


// ============================================================
// 108 — READY ANSWER FIND
// ============================================================

function findReadyAnswer(
    message
) {

    if (
        !CHAT_CONFIG.enableReadyAnswers
    ) {

        return null;
    }

    const input =
        normalizeForSimilarity(
            message
        );

    if (!input) {
        return null;
    }

    let best =
        null;

    let bestScore =
        0;

    for (
        const item of READY_ANSWERS
    ) {

        for (
            const pattern of item.patterns
        ) {

            const score =
                similarityScore(
                    input,
                    pattern
                );

            if (
                input ===
                normalizeForSimilarity(
                    pattern
                )
            ) {

                return {

                    ...item,

                    score: 1,

                    exact: true
                };
            }

            if (
                score > bestScore
            ) {

                bestScore =
                    score;

                best = {

                    ...item,

                    score,

                    exact: false
                };
            }
        }
    }

    if (
        best &&
        bestScore >= 0.35
    ) {

        return best;
    }

    return null;
}


// ============================================================
// 109 — KNOWLEDGE SEARCH
// ============================================================

function searchKnowledge(
    message
) {

    if (
        !CHAT_CONFIG.enableKnowledge
    ) {

        return null;
    }

    if (
        !Array.isArray(
            db.knowledge
        )
    ) {

        return null;
    }

    let best =
        null;

    let bestScore =
        0;

    for (
        const item of db.knowledge
    ) {

        if (
            item.active === false
        ) {

            continue;
        }

        const question =
            item.question ||
            item.prompt ||
            "";

        const score =
            similarityScore(
                message,
                question
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
        bestScore >= 0.30
    ) {

        return {

            item: best,

            score:
                bestScore
        };
    }

    return null;
}


// ============================================================
// 110 — MEMORY CONTEXT
// ============================================================

function buildMemoryContext(
    userId
) {

    if (
        !CHAT_CONFIG.enableMemory
    ) {

        return [];
    }

    return getUserMemories(
        userId
    )
        .slice(0, 30)
        .map(
            memory =>
                memory.content
        );
}


// ============================================================
// 111 — CHAT CONTEXT
// ============================================================

function buildChatContext(
    chatId,
    userId
) {

    return getChatMessages(
        chatId,
        userId,
        CHAT_CONFIG.contextMessageCount
    ).map(
        message => ({

            role:
                message.role,

            content:
                message.content
        })
    );
}


// ============================================================
// 112 — QUESTION TYPE
// ============================================================

function detectQuestionType(
    message
) {

    const text =
        normalizeForSimilarity(
            message
        );

    if (
        /\b(nasıl|nasıl yapılır|yapabilir misin|kodla|yaz)\b/
            .test(text)
    ) {

        return "coding";
    }

    if (
        /\b(kaç|hesapla|topla|çıkar|çarp|böl|yüzde|denklem)\b/
            .test(text)
    ) {

        return "math";
    }

    if (
        /\b(bugün|şimdi|güncel|son durum|fiyat|haber|hava|maç|kur)\b/
            .test(text)
    ) {

        return "current";
    }

    if (
        /\b(öğret|anlat|ders|çalıştır|konu)\b/
            .test(text)
    ) {

        return "education";
    }

    if (
        /\b(dosya|pdf|csv|json|html|txt|yükle)\b/
            .test(text)
    ) {

        return "file";
    }

    return "general";
}


// ============================================================
// 113 — MODEL PROFILE SELECTION
// ============================================================

function selectPrimaryModel(
    message,
    user,
    requestedModel = null
) {

    const accessible =
        getAccessibleModels(
            user
        );

    const accessibleIds =
        accessible.map(
            model =>
                model.id
        );

    if (
        requestedModel &&
        accessibleIds.includes(
            requestedModel
        )
    ) {

        return requestedModel;
    }

    const type =
        detectQuestionType(
            message
        );

    const mapping = {

        coding:
            "code",

        math:
            "math",

        current:
            "research",

        education:
            "learn",

        file:
            "file",

        general:
            "fast"
    };

    const preferred =
        mapping[type] ||
        "fast";

    if (
        accessibleIds.includes(
            preferred
        )
    ) {

        return preferred;
    }

    return (
        accessibleIds[0] ||
        "fast"
    );
}


// ============================================================
// 114 — FUSION PLAN
// ============================================================

function buildFusionPlan(
    message,
    user,
    requestedModel = null
) {

    const primary =
        selectPrimaryModel(
            message,
            user,
            requestedModel
        );

    const accessible =
        getAccessibleModels(
            user
        );

    const accessibleIds =
        accessible.map(
            model =>
                model.id
        );

    const type =
        detectQuestionType(
            message
        );

    let delegates = [];

    if (
        type === "coding"
    ) {

        delegates = [
            "code",
            "think"
        ];
    }

    else if (
        type === "math"
    ) {

        delegates = [
            "math",
            "think"
        ];
    }

    else if (
        type === "current"
    ) {

        delegates = [
            "research",
            "think"
        ];
    }

    else if (
        type === "education"
    ) {

        delegates = [
            "learn",
            "writer"
        ];
    }

    else if (
        type === "file"
    ) {

        delegates = [
            "file",
            "think"
        ];
    }

    else {

        delegates = [
            primary
        ];
    }

    delegates =
        delegates.filter(
            id =>
                accessibleIds.includes(
                    id
                )
        );

    delegates =
        [
            ...new Set(
                delegates
            )
        ];

    if (
        delegates.length === 0
    ) {

        delegates = [
            primary
        ];
    }

    const fusionEnabled =
        CHAT_CONFIG.enableFusion &&
        delegates.length > 1;

    return {

        enabled:
            fusionEnabled,

        primary,

        delegates,

        type,

        editor:
            accessibleIds.includes(
                "ultra"
            )
                ? "ultra"
                : primary,

        strategy:
            fusionEnabled
                ? "multi_profile_editor"
                : "single_profile"
    };
}


// ============================================================
// 115 — LOCAL ANSWER ENGINE
// ============================================================

function generateLocalAnswer(
    message,
    user
) {

    const ready =
        findReadyAnswer(
            message
        );

    if (ready) {

        return {

            answer:
                ready.answer,

            model:
                "fast",

            source:
                "ready_answer",

            needsResearch:
                false,

            confidence:
                ready.score,

            readyAnswer:
                true
        };
    }

    const knowledge =
        searchKnowledge(
            message
        );

    if (knowledge) {

        return {

            answer:
                knowledge.item.answer,

            model:
                "fast",

            source:
                "knowledge",

            needsResearch:
                false,

            confidence:
                knowledge.score,

            knowledgeId:
                knowledge.item.id
        };
    }

    const type =
        detectQuestionType(
            message
        );

    if (
        type === "current"
    ) {

        return {

            answer:
                "Bu soru güncel bilgi gerektirebilir. TürkAI'nin araştırma sistemiyle güvenilir kaynaklardan kontrol edilmesi gerekiyor.",

            model:
                "research",

            source:
                "research_required",

            needsResearch:
                true,

            confidence:
                0.1
        };
    }

    if (
        type === "coding"
    ) {

        return {

            answer:
                "Kodlama isteğini aldım. TürkAI Code profili bu soruyu ayrıntılı şekilde ele alacak.",

            model:
                "code",

            source:
                "local_router",

            needsResearch:
                false,

            confidence:
                0.2
        };
    }

    if (
        type === "math"
    ) {

        return {

            answer:
                "Matematik isteğini TürkAI Math profiline yönlendirebilirim.",

            model:
                "math",

            source:
                "local_router",

            needsResearch:
                false,

            confidence:
                0.2
        };
    }

    return {

        answer:
            "Sorunu anladım. Bunu ayrıntılı şekilde ele almak için TürkAI'nin uygun model profilini kullanabiliriz.",

        model:
            "fast",

        source:
            "local_fallback",

        needsResearch:
            false,

        confidence:
            0.15
    };
}


// ============================================================
// 116 — CHAT RESPONSE ROUTER
// ============================================================

function routeChatMessage(
    message,
    user,
    requestedModel = null
) {

    const fusion =
        buildFusionPlan(
            message,
            user,
            requestedModel
        );

    const local =
        generateLocalAnswer(
            message,
            user
        );

    return {

        ...local,

        fusion
    };
}


// ============================================================
// 117 — CHAT API
// ============================================================

app.post(
    "/api/chat",
    requireAuth,
    async (req, res) => {

        const started =
            Date.now();

        try {

            const message =
                safeText(
                    req.body?.message,
                    CHAT_CONFIG.maxMessageLength
                );

            if (!message) {

                return res.status(400).json({
                    success: false,
                    error:
                        "Mesaj boş olamaz."
                });
            }

            if (
                message.length >
                CHAT_CONFIG.maxMessageLength
            ) {

                return res.status(400).json({
                    success: false,
                    error:
                        "Mesaj çok uzun."
                });
            }

            const limit =
                checkMessageLimit(
                    req.user
                );

            if (!limit.allowed) {

                return res.status(429).json({

                    success: false,

                    error:
                        "Günlük mesaj limitine ulaştın.",

                    limit:
                        limit.limit,

                    used:
                        limit.used,

                    remaining:
                        limit.remaining
                });
            }

            let chat =
                req.body?.chatId
                    ? getChat(
                        req.body.chatId,
                        req.user.id
                    )
                    : null;

            if (!chat) {

                chat =
                    createChat(
                        req.user.id,
                        message
                    );
            }

            const requestedModel =
                safeText(
                    req.body?.model,
                    50
                ) || null;

            const fusion =
                buildFusionPlan(
                    message,
                    req.user,
                    requestedModel
                );

            const context =
                buildChatContext(
                    chat.id,
                    req.user.id
                );

            const memories =
                buildMemoryContext(
                    req.user.id
                );

            saveMessage(
                chat.id,
                {
                    role:
                        "user",

                    content:
                        message,

                    model:
                        fusion.primary,

                    fusion,

                    metadata: {

                        questionType:
                            fusion.type,

                        contextMessages:
                            context.length,

                        memoryItems:
                            memories.length
                    }
                }
            );

            const result =
                routeChatMessage(
                    message,
                    req.user,
                    requestedModel
                );

            const responseTime =
                Date.now() -
                started;

            const assistant =
                saveMessage(
                    chat.id,
                    {
                        role:
                            "assistant",

                        content:
                            result.answer,

                        model:
                            result.model,

                        source:
                            result.source,

                        fusion:
                            result.fusion,

                        responseTime,

                        researchUsed:
                            Boolean(
                                result.needsResearch
                            ),

                        metadata: {

                            confidence:
                                result.confidence,

                            contextMessages:
                                context.length,

                            memoryItems:
                                memories.length
                        }
                    }
                );

            incrementUsage(
                req.user.id,
                "messages",
                1
            );

            const usage =
                getDailyUsage(
                    req.user.id
                );

            usage.responseTimeTotal +=
                responseTime;

            usage.responseCount +=
                1;

            if (
                !db.usage[
                    req.user.id
                ].totals
            ) {

                db.usage[
                    req.user.id
                ].totals = {};
            }

            db.usage[
                req.user.id
            ].totals.responseTimeTotal =
                Number(
                    db.usage[
                        req.user.id
                    ].totals.responseTimeTotal ||
                    0
                ) +
                responseTime;

            db.usage[
                req.user.id
            ].totals.responseCount =
                Number(
                    db.usage[
                        req.user.id
                    ].totals.responseCount ||
                    0
                ) +
                1;

            saveDB("usage");

            res.json({

                success: true,

                chatId:
                    chat.id,

                messageId:
                    assistant.id,

                answer:
                    result.answer,

                model:
                    result.model,

                source:
                    result.source,

                fusion:
                    result.fusion,

                needsResearch:
                    Boolean(
                        result.needsResearch
                    ),

                responseTime,

                usage: {

                    limit:
                        limit.limit,

                    used:
                        limit.used + 1,

                    remaining:
                        limit.limit === null
                            ? null
                            : Math.max(
                                0,
                                limit.limit -
                                (limit.used + 1)
                            )
                }
            });

        } catch (error) {

            incrementUsage(
                req.user.id,
                "errors",
                1
            );

            console.error(
                "[CHAT]",
                error
            );

            res.status(500).json({

                success: false,

                error:
                    "TürkAI cevap oluştururken bir hata oluştu."
            });
        }
    }
);


// ============================================================
// 118 — USAGE API
// ============================================================

app.get(
    "/api/usage",
    requireAuth,
    (req, res) => {

        const usage =
            getUserUsage(
                req.user.id
            );

        const limit =
            getMessageLimit(
                req.user
            );

        const todayMessages =
            Number(
                usage.today.messages || 0
            );

        res.json({

            success: true,

            usage,

            limits: {

                messages:
                    limit,

                remaining:
                    limit === null
                        ? null
                        : Math.max(
                            0,
                            limit -
                            todayMessages
                        )
            }
        });
    }
);


// ============================================================
// 119 — USAGE HISTORY
// ============================================================

app.get(
    "/api/usage/history",
    requireAuth,
    (req, res) => {

        const userUsage =
            db.usage[
                req.user.id
            ] || {};

        const dates =
            Object.keys(
                userUsage
            )
            .filter(
                key =>
                    key !== "totals"
            )
            .sort()
            .reverse();

        res.json({

            success: true,

            history:
                dates.map(
                    date => ({

                        date,

                        ...userUsage[
                            date
                        ]
                    })
                )
        });
    }
);


// ============================================================
// 120 — FEEDBACK REASONS
// ============================================================

const FEEDBACK_REASONS = [

    "wrong_info",

    "misunderstood",

    "too_long",

    "too_short",

    "technical_error",

    "other"
];


// ============================================================
// 121 — FEEDBACK API
// ============================================================

app.post(
    "/api/feedback",
    requireAuth,
    (req, res) => {

        try {

            const rating =
                req.body?.rating === "up"
                    ? "up"
                    : req.body?.rating === "down"
                        ? "down"
                        : null;

            if (!rating) {

                return res.status(400).json({
                    success: false,
                    error:
                        "Geçersiz feedback."
                });
            }

            const reason =
                safeText(
                    req.body?.reason,
                    100
                );

            if (
                rating === "down" &&
                reason &&
                !FEEDBACK_REASONS.includes(
                    reason
                )
            ) {

                return res.status(400).json({
                    success: false,
                    error:
                        "Geçersiz feedback nedeni."
                });
            }

            const messageId =
                safeText(
                    req.body?.messageId,
                    150
                );

            const message =
                db.messages.find(
                    item =>
                        item.id ===
                            messageId &&
                        item.userId ===
                            req.user.id
                );

            if (
                messageId &&
                !message
            ) {

                return res.status(404).json({
                    success: false,
                    error:
                        "Mesaj bulunamadı."
                });
            }

            const item = {

                id:
                    createId(
                        "feedback"
                    ),

                userId:
                    req.user.id,

                messageId:
                    messageId || null,

                rating,

                reason:
                    reason || null,

                comment:
                    safeText(
                        req.body?.comment,
                        3000
                    ),

                createdAt:
                    isoNow()
            };

            db.feedback.push(
                item
            );

            if (
                db.feedback.length >
                CHAT_CONFIG.feedbackLimit
            ) {

                db.feedback =
                    db.feedback.slice(
                        -CHAT_CONFIG.feedbackLimit
                    );
            }

            saveDB("feedback");

            audit(
                "feedback_created",
                {
                    feedbackId:
                        item.id,

                    rating,

                    reason
                },
                req.user.id
            );

            res.json({

                success: true,

                feedback:
                    item
            });

        } catch (error) {

            console.error(
                "[FEEDBACK]",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "Feedback kaydedilemedi."
            });
        }
    }
);


// ============================================================
// 122 — CORRECTION QUEUE
// ============================================================

app.post(
    "/api/corrections",
    requireAuth,
    (req, res) => {

        try {

            const question =
                safeText(
                    req.body?.question,
                    5000
                );

            const correctedAnswer =
                safeText(
                    req.body?.correctedAnswer,
                    20000
                );

            const messageId =
                safeText(
                    req.body?.messageId,
                    150
                );

            if (
                !question ||
                !correctedAnswer
            ) {

                return res.status(400).json({
                    success: false,
                    error:
                        "Soru ve düzeltilmiş cevap gerekli."
                });
            }

            const item = {

                id:
                    createId(
                        "correction"
                    ),

                userId:
                    req.user.id,

                messageId:
                    messageId || null,

                question,

                correctedAnswer,

                status:
                    "pending",

                adminNote:
                    null,

                reviewedBy:
                    null,

                reviewedAt:
                    null,

                createdAt:
                    isoNow(),

                updatedAt:
                    isoNow()
            };

            db.correctionsQueue.push(
                item
            );

            if (
                db.correctionsQueue.length >
                CHAT_CONFIG.correctionLimit
            ) {

                db.correctionsQueue =
                    db.correctionsQueue.slice(
                        -CHAT_CONFIG.correctionLimit
                    );
            }

            saveDB(
                "corrections"
            );

            audit(
                "correction_submitted",
                {
                    correctionId:
                        item.id
                },
                req.user.id
            );

            res.status(201).json({

                success: true,

                correction:
                    item
            });

        } catch (error) {

            console.error(
                "[CORRECTION]",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "Düzeltme gönderilemedi."
            });
        }
    }
);


// ============================================================
// 123 — USER CORRECTION LIST
// ============================================================

app.get(
    "/api/corrections",
    requireAuth,
    (req, res) => {

        const items =
            db.correctionsQueue
                .filter(
                    item =>
                        item.userId ===
                        req.user.id
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
                );

        res.json({

            success: true,

            corrections:
                items
        });
    }
);


// ============================================================
// 124 — MEMORY AUTO-COMMAND PROCESSOR
// ============================================================

function processExplicitMemoryCommand(
    message,
    userId
) {

    if (
        !isMemoryCommand(
            message
        )
    ) {

        return null;
    }

    const text =
        String(
            message
        ).toLowerCase();

    if (
        text.includes(
            "unut"
        )
    ) {

        return {

            type:
                "forget_request",

            content:
                extractMemoryContent(
                    message
                )
        };
    }

    const content =
        extractMemoryContent(
            message
        );

    if (!content) {

        return {

            type:
                "invalid_memory_request"
        };
    }

    const memory =
        saveMemory(
            userId,
            content
        );

    return {

        type:
            "memory_saved",

        memory
    };
}


// ============================================================
// 125 — MEMORY COMMAND RESPONSE
// ============================================================

function createMemoryCommandResponse(
    result
) {

    if (!result) {
        return null;
    }

    if (
        result.type ===
        "memory_saved"
    ) {

        return {
            answer:
                "Tamam, bunu belleğine kaydettim.",
            source:
                "memory",
            model:
                "fast"
        };
    }

    if (
        result.type ===
        "invalid_memory_request"
    ) {

        return {
            answer:
                "Belleğe kaydetmem için hatırlamamı istediğin bilgiyi de yazmalısın.",
            source:
                "memory",
            model:
                "fast"
        };
    }

    if (
        result.type ===
        "forget_request"
    ) {

        return {
            answer:
                "Unutma isteğini aldım. İlgili kayıtları Bellek bölümünden kontrol edip silebilirsin.",
            source:
                "memory",
            model:
                "fast"
        };
    }

    return null;
}


// ============================================================
// 126 — CHAT ROUTER V2
// ============================================================

function advancedChatRouter(
    message,
    user,
    requestedModel = null
) {

    const memoryCommand =
        processExplicitMemoryCommand(
            message,
            user.id
        );

    const memoryResponse =
        createMemoryCommandResponse(
            memoryCommand
        );

    if (memoryResponse) {

        return {

            ...memoryResponse,

            needsResearch:
                false,

            confidence:
                1,

            fusion: {

                enabled:
                    false,

                primary:
                    "fast",

                delegates:
                    ["fast"],

                type:
                    "memory",

                editor:
                    "fast",

                strategy:
                    "single_profile"
            }
        };
    }

    return routeChatMessage(
        message,
        user,
        requestedModel
    );
}


// ============================================================
// 127 — QUESTION ROUTER API
// ============================================================

app.post(
    "/api/chat/analyze",
    requireAuth,
    (req, res) => {

        const message =
            safeText(
                req.body?.message,
                CHAT_CONFIG.maxMessageLength
            );

        if (!message) {

            return res.status(400).json({
                success: false,
                error:
                    "Mesaj boş olamaz."
            });
        }

        const type =
            detectQuestionType(
                message
            );

        const primary =
            selectPrimaryModel(
                message,
                req.user,
                req.body?.model
            );

        const fusion =
            buildFusionPlan(
                message,
                req.user,
                req.body?.model
            );

        const ready =
            findReadyAnswer(
                message
            );

        const knowledge =
            searchKnowledge(
                message
            );

        res.json({

            success: true,

            analysis: {

                type,

                primaryModel:
                    primary,

                fusion,

                readyAnswer:
                    ready
                        ? {
                            id:
                                ready.id,

                            score:
                                ready.score
                        }
                        : null,

                knowledge:
                    knowledge
                        ? {
                            id:
                                knowledge.item.id,

                            score:
                                knowledge.score
                        }
                        : null,

                researchSuggested:
                    type === "current"
            }
        });
    }
);


// ============================================================
// 128 — KNOWLEDGE ADD INTERNAL
// ============================================================

function addKnowledge(
    {
        question,
        answer,
        source = "system",
        confidence = 1,
        active = true,
        metadata = {}
    }
) {

    const cleanQuestion =
        safeText(
            question,
            5000
        );

    const cleanAnswer =
        safeText(
            answer,
            20000
        );

    if (
        !cleanQuestion ||
        !cleanAnswer
    ) {

        return null;
    }

    if (
        !Array.isArray(
            db.knowledge
        )
    ) {

        db.knowledge = [];
    }

    const existing =
        db.knowledge.find(
            item =>
                similarityScore(
                    item.question,
                    cleanQuestion
                ) >= 0.92
        );

    if (existing) {

        existing.answer =
            cleanAnswer;

        existing.updatedAt =
            isoNow();

        existing.confidence =
            confidence;

        existing.source =
            source;

        saveDB(
            "knowledge"
        );

        return existing;
    }

    const item = {

        id:
            createId(
                "knowledge"
            ),

        question:
            cleanQuestion,

        answer:
            cleanAnswer,

        source,

        confidence:

            Math.max(
                0,
                Math.min(
                    1,
                    Number(
                        confidence
                    ) || 0
                )
            ),

        active,

        metadata,

        createdAt:
            isoNow(),

        updatedAt:
            isoNow()
    };

    db.knowledge.push(
        item
    );

    if (
        db.knowledge.length >
        CHAT_CONFIG.knowledgeLimit
    ) {

        db.knowledge =
            db.knowledge.slice(
                -CHAT_CONFIG.knowledgeLimit
            );
    }

    saveDB(
        "knowledge"
    );

    return item;
}


// ============================================================
// 129 — KNOWLEDGE SEARCH API
// ============================================================

app.get(
    "/api/knowledge/search",
    requireAuth,
    (req, res) => {

        const query =
            safeText(
                req.query?.q,
                5000
            );

        if (!query) {

            return res.json({
                success: true,
                results: []
            });
        }

        const results =
            db.knowledge
                .filter(
                    item =>
                        item.active !== false
                )
                .map(
                    item => ({

                        item,

                        score:
                            similarityScore(
                                query,
                                item.question
                            )
                    })
                )
                .filter(
                    result =>
                        result.score >=
                        0.20
                )
                .sort(
                    (a, b) =>
                        b.score -
                        a.score
                )
                .slice(0, 20);

        res.json({

            success: true,

            results
        });
    }
);


// ============================================================
// 130 — MODEL PROFILE DETAILS
// ============================================================

app.get(
    "/api/models/:id",
    requireAuth,
    (req, res) => {

        const model =
            MODEL_PROFILES[
                req.params.id
            ];

        if (!model) {

            return res.status(404).json({
                success: false,
                error:
                    "Model profili bulunamadı."
            });
        }

        const accessible =
            getAccessibleModels(
                req.user
            )
                .some(
                    item =>
                        item.id ===
                        model.id
                );

        if (
            !accessible &&
            req.user.role !== "admin"
        ) {

            return res.status(403).json({
                success: false,
                error:
                    "Bu model profiline erişimin yok."
            });
        }

        res.json({

            success: true,

            model
        });
    }
);


// ============================================================
// 131 — FUSION PREVIEW
// ============================================================

app.post(
    "/api/fusion/preview",
    requireAuth,
    (req, res) => {

        const message =
            safeText(
                req.body?.message,
                CHAT_CONFIG.maxMessageLength
            );

        if (!message) {

            return res.status(400).json({
                success: false,
                error:
                    "Mesaj gerekli."
            });
        }

        const fusion =
            buildFusionPlan(
                message,
                req.user,
                req.body?.model
            );

        res.json({

            success: true,

            fusion
        });
    }
);


// ============================================================
// 132 — USER PLAN INFO
// ============================================================

app.get(
    "/api/account/plan",
    requireAuth,
    (req, res) => {

        const plan =
            getPlan(
                req.user
            );

        const usage =
            getDailyUsage(
                req.user.id
            );

        res.json({

            success: true,

            plan,

            usage,

            accessibleModels:
                getAccessibleModels(
                    req.user
                )
        });
    }
);


// ============================================================
// 133 — CHAT STATISTICS
// ============================================================

app.get(
    "/api/chats/stats",
    requireAuth,
    (req, res) => {

        const chats =
            getUserChats(
                req.user.id
            );

        const messages =
            db.messages.filter(
                message =>
                    message.userId ===
                    req.user.id
            );

        res.json({

            success: true,

            stats: {

                chats:
                    chats.length,

                messages:
                    messages.length,

                archived:
                    chats.filter(
                        chat =>
                            chat.archived
                    ).length,

                pinned:
                    chats.filter(
                        chat =>
                            chat.pinned
                    ).length,

                lastActivity:
                    chats[0]?.updatedAt ||
                    null
            }
        });
    }
);


// ============================================================
// 134 — PIN CHAT
// ============================================================

app.post(
    "/api/chats/:id/pin",
    requireAuth,
    (req, res) => {

        const chat =
            getChat(
                req.params.id,
                req.user.id
            );

        if (!chat) {

            return res.status(404).json({
                success: false,
                error:
                    "Sohbet bulunamadı."
            });
        }

        chat.pinned =
            !chat.pinned;

        chat.updatedAt =
            isoNow();

        saveDB("chats");

        res.json({

            success: true,

            pinned:
                chat.pinned
        });
    }
);


// ============================================================
// 135 — ARCHIVE CHAT
// ============================================================

app.post(
    "/api/chats/:id/archive",
    requireAuth,
    (req, res) => {

        const chat =
            getChat(
                req.params.id,
                req.user.id
            );

        if (!chat) {

            return res.status(404).json({
                success: false,
                error:
                    "Sohbet bulunamadı."
            });
        }

        chat.archived =
            !chat.archived;

        chat.updatedAt =
            isoNow();

        saveDB("chats");

        res.json({

            success: true,

            archived:
                chat.archived
        });
    }
);


// ============================================================
// 136 — RENAME CHAT
// ============================================================

app.post(
    "/api/chats/:id/rename",
    requireAuth,
    (req, res) => {

        const title =
            safeText(
                req.body?.title,
                CHAT_CONFIG.maxChatTitleLength
            );

        if (!title) {

            return res.status(400).json({
                success: false,
                error:
                    "Sohbet adı boş olamaz."
            });
        }

        const chat =
            updateChat(
                req.params.id,
                req.user.id,
                {
                    title
                }
            );

        if (!chat) {

            return res.status(404).json({
                success: false,
                error:
                    "Sohbet bulunamadı."
            });
        }

        res.json({

            success: true,

            chat
        });
    }
);


// ============================================================
// 137 — EXPORT CHAT DATA
// ============================================================

app.get(
    "/api/chats/:id/export",
    requireAuth,
    (req, res) => {

        const chat =
            getChat(
                req.params.id,
                req.user.id
            );

        if (!chat) {

            return res.status(404).json({
                success: false,
                error:
                    "Sohbet bulunamadı."
            });
        }

        const messages =
            getChatMessages(
                chat.id,
                req.user.id,
                10000
            );

        res.json({

            success: true,

            export: {

                app:
                    APP_NAME,

                version:
                    APP_VERSION,

                exportedAt:
                    isoNow(),

                chat,

                messages
            }
        });
    }
);


// ============================================================
// 138 — USER DATA EXPORT
// ============================================================

app.get(
    "/api/account/export",
    requireAuth,
    (req, res) => {

        const userId =
            req.user.id;

        const chats =
            getUserChats(
                userId
            );

        const messages =
            db.messages.filter(
                item =>
                    item.userId ===
                    userId
            );

        const memories =
            getUserMemories(
                userId
            );

        const feedback =
            db.feedback.filter(
                item =>
                    item.userId ===
                    userId
            );

        res.json({

            success: true,

            exportedAt:
                isoNow(),

            user:
                publicUser(
                    req.user
                ),

            chats,

            messages,

            memories,

            feedback
        });
    }
);


// ============================================================
// 139 — DELETE ACCOUNT DATA
// ============================================================

app.delete(
    "/api/account/data",
    requireAuth,
    (req, res) => {

        const userId =
            req.user.id;

        db.messages =
            db.messages.filter(
                item =>
                    item.userId !==
                    userId
            );

        db.chats =
            db.chats.filter(
                item =>
                    item.userId !==
                    userId
            );

        db.memories =
            db.memories.filter(
                item =>
                    item.userId !==
                    userId
            );

        db.feedback =
            db.feedback.filter(
                item =>
                    item.userId !==
                    userId
            );

        db.correctionsQueue =
            db.correctionsQueue.filter(
                item =>
                    item.userId !==
                    userId
            );

        db.usage[userId] =
            undefined;

        delete db.usage[userId];

        saveDB("messages");
        saveDB("chats");
        saveDB("memories");
        saveDB("feedback");
        saveDB("corrections");
        saveDB("usage");

        audit(
            "account_data_deleted",
            {},
            userId
        );

        res.json({

            success: true,

            message:
                "Hesabın içerik verileri silindi."
        });
    }
);


// ============================================================
// 140 — PART 2 STATUS
// ============================================================

app.get(
    "/api/system/chat-engine",
    requireAuth,
    (req, res) => {

        res.json({

            success: true,

            engine: {

                chat:
                    true,

                readyAnswers:
                    CHAT_CONFIG.enableReadyAnswers,

                knowledge:
                    CHAT_CONFIG.enableKnowledge,

                memory:
                    CHAT_CONFIG.enableMemory,

                fusion:
                    CHAT_CONFIG.enableFusion,

                models:
                    MODEL_ORDER.length,

                accessibleModels:
                    getAccessibleModels(
                        req.user
                    ).length,

                contextMessages:
                    CHAT_CONFIG.contextMessageCount
            }
        });
    }
);


// ============================================================
// PARÇA 2 / 5 — SON
// ============================================================
//
// TAMAMLANANLAR:
//
// ✓ Chat sistemi
// ✓ Chat geçmişi
// ✓ Chat arama
// ✓ Sohbet oluşturma
// ✓ Sohbet silme
// ✓ Sohbet arşivleme
// ✓ Sohbet sabitleme
// ✓ Sohbet yeniden adlandırma
// ✓ Ready Answers
// ✓ Yazım benzerliği
// ✓ Knowledge araması
// ✓ Memory sistemi
// ✓ Açık memory komutları
// ✓ 12 model profili
// ✓ Plan bazlı model erişimi
// ✓ Fusion planı
// ✓ Question router
// ✓ Kullanım limitleri
// ✓ Usage history
// ✓ Feedback
// ✓ Kullanıcı düzeltmeleri
// ✓ Knowledge ekleme altyapısı
// ✓ Veri dışa aktarma
// ✓ Chat export
//
// SONRAKİ:
// PARÇA 3 / 5
//
// • Gerçek Research Engine
// • Resmî kaynak kontrolü
// • Research cache
// • URL doğrulama
// • Dosya yükleme
// • Dosya okuma
// • Kod dosyası oluşturma
// • HTML/CSS/JS projeleri
// • Python / Java / C++ / C#
// • ZIP proje sistemi
// • Dosya geçmişi
// • Dosya arama
// • Proje yönetimi
// • Upload güvenliği
// ============================================================
/* ============================================================
   TÜRKAI SERVER.JS — PART 3 / 5
   RESEARCH + FILES + CODE PROJECT ENGINE
   ============================================================ */

/* ============================================================
   141 — RESEARCH ENGINE CONFIG
   ============================================================ */

const RESEARCH_CONFIG = {
    enabled: true,
    officialOnly: true,
    maxSources: 8,
    maxSourceText: 18000,
    cacheMinutes: 30,
    timeoutMs: 12000,
    maxRedirects: 4,
    userAgent:
        "TurkAIResearchBot/1.0 (+https://erencanai-1.onrender.com)",
    allowedProtocols: ["http:", "https:"],
    blockedExtensions: [
        ".exe",
        ".apk",
        ".msi",
        ".bat",
        ".cmd",
        ".scr",
        ".dll",
        ".so"
    ]
};


/* ============================================================
   142 — RESEARCH CACHE STORAGE
   ============================================================ */

if (!db.researchCache) {
    db.researchCache = {};
}

if (!db.researchHistory) {
    db.researchHistory = [];
}

if (!db.researchSources) {
    db.researchSources = [];
}


/* ============================================================
   143 — RESEARCH CACHE CLEANUP
   ============================================================ */

function cleanupResearchCache() {
    const now = Date.now();

    for (const [key, value] of Object.entries(db.researchCache)) {
        if (!value || !value.createdAt) {
            delete db.researchCache[key];
            continue;
        }

        const age = now - new Date(value.createdAt).getTime();

        if (age > RESEARCH_CONFIG.cacheMinutes * 60 * 1000) {
            delete db.researchCache[key];
        }
    }
}


/* ============================================================
   144 — RESEARCH QUERY NORMALIZER
   ============================================================ */

function normalizeResearchQuery(query) {
    return safeText(query, 1000)
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}


/* ============================================================
   145 — RESEARCH CACHE KEY
   ============================================================ */

function createResearchCacheKey(query) {
    return crypto
        .createHash("sha256")
        .update(normalizeResearchQuery(query))
        .digest("hex");
}


/* ============================================================
   146 — OFFICIAL DOMAIN DETECTOR
   ============================================================ */

function isOfficialDomain(urlString) {
    try {
        const url = new URL(urlString);

        const host = url.hostname.toLowerCase();

        const officialPatterns = [
            ".gov",
            ".gov.tr",
            ".edu",
            ".edu.tr",
            ".mil",
            ".org",
            "who.int",
            "un.org",
            "europa.eu",
            "openai.com",
            "google.com",
            "microsoft.com",
            "apple.com",
            "github.com",
            "nodejs.org",
            "python.org",
            "developer.mozilla.org"
        ];

        return officialPatterns.some(pattern => {
            return host === pattern ||
                host.endsWith(pattern) ||
                host.includes(pattern);
        });
    } catch {
        return false;
    }
}


/* ============================================================
   147 — DOMAIN RISK CHECK
   ============================================================ */

function getDomainRisk(urlString) {
    try {
        const url = new URL(urlString);

        const host = url.hostname.toLowerCase();

        if (
            host === "localhost" ||
            host === "127.0.0.1" ||
            host === "::1"
        ) {
            return "blocked";
        }

        if (
            host.startsWith("10.") ||
            host.startsWith("192.168.") ||
            host.startsWith("172.")
        ) {
            return "blocked";
        }

        if (isOfficialDomain(urlString)) {
            return "official";
        }

        return "external";
    } catch {
        return "invalid";
    }
}


/* ============================================================
   148 — RESEARCH URL SAFETY
   ============================================================ */

function isResearchUrlSafe(urlString) {
    try {
        const url = new URL(urlString);

        if (!RESEARCH_CONFIG.allowedProtocols.includes(url.protocol)) {
            return false;
        }

        if (getDomainRisk(urlString) === "blocked") {
            return false;
        }

        const pathname = url.pathname.toLowerCase();

        for (const extension of RESEARCH_CONFIG.blockedExtensions) {
            if (pathname.endsWith(extension)) {
                return false;
            }
        }

        return true;
    } catch {
        return false;
    }
}


/* ============================================================
   149 — HTML TEXT EXTRACTION
   ============================================================ */

function extractReadableText(html) {
    if (!html) return "";

    let text = String(html);

    text = text.replace(
        /<script\b[^>]*>[\s\S]*?<\/script>/gi,
        " "
    );

    text = text.replace(
        /<style\b[^>]*>[\s\S]*?<\/style>/gi,
        " "
    );

    text = text.replace(
        /<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi,
        " "
    );

    text = text.replace(
        /<svg\b[^>]*>[\s\S]*?<\/svg>/gi,
        " "
    );

    text = text.replace(/<[^>]+>/g, " ");

    text = text
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">");

    return text
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, RESEARCH_CONFIG.maxSourceText);
}


/* ============================================================
   150 — TITLE EXTRACTION
   ============================================================ */

function extractPageTitle(html) {
    if (!html) return "";

    const match = String(html).match(
        /<title[^>]*>([\s\S]*?)<\/title>/i
    );

    if (!match) return "";

    return safeText(
        match[1]
            .replace(/\s+/g, " ")
            .trim(),
        300
    );
}


/* ============================================================
   151 — DESCRIPTION EXTRACTION
   ============================================================ */

function extractMetaDescription(html) {
    if (!html) return "";

    const match = String(html).match(
        /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i
    );

    return match
        ? safeText(match[1], 500)
        : "";
}


/* ============================================================
   152 — SOURCE QUALITY SCORE
   ============================================================ */

function calculateSourceQuality(source) {
    if (!source) return 0;

    let score = 40;

    if (source.official) {
        score += 35;
    }

    if (source.title) {
        score += 5;
    }

    if (source.description) {
        score += 5;
    }

    if (source.text && source.text.length > 500) {
        score += 5;
    }

    if (source.protocol === "https:") {
        score += 5;
    }

    return Math.min(100, score);
}


/* ============================================================
   153 — FETCH RESEARCH PAGE
   ============================================================ */

async function fetchResearchPage(urlString) {
    if (!isResearchUrlSafe(urlString)) {
        throw new Error("Güvenli olmayan araştırma adresi.");
    }

    const controller = new AbortController();

    const timeout = setTimeout(() => {
        controller.abort();
    }, RESEARCH_CONFIG.timeoutMs);

    try {
        const response = await fetch(urlString, {
            method: "GET",
            redirect: "follow",
            signal: controller.signal,
            headers: {
                "User-Agent": RESEARCH_CONFIG.userAgent,
                "Accept":
                    "text/html,application/xhtml+xml,text/plain;q=0.9"
            }
        });

        const contentType =
            response.headers.get("content-type") || "";

        if (
            !contentType.includes("text/html") &&
            !contentType.includes("application/xhtml+xml") &&
            !contentType.includes("text/plain")
        ) {
            throw new Error("Desteklenmeyen içerik tipi.");
        }

        const html = await response.text();

        return {
            url: response.url || urlString,
            status: response.status,
            title: extractPageTitle(html),
            description: extractMetaDescription(html),
            text: extractReadableText(html),
            official: isOfficialDomain(response.url || urlString),
            protocol: new URL(response.url || urlString).protocol,
            fetchedAt: isoNow()
        };
    } finally {
        clearTimeout(timeout);
    }
}


/* ============================================================
   154 — RESEARCH SOURCE RECORD
   ============================================================ */

function createResearchRecord(source, query) {
    const record = {
        id: createId("research"),
        query: safeText(query, 1000),
        url: source.url,
        title: source.title || source.url,
        description: source.description || "",
        official: Boolean(source.official),
        quality: calculateSourceQuality(source),
        textLength: source.text?.length || 0,
        createdAt: isoNow()
    };

    db.researchSources.unshift(record);

    db.researchSources =
        db.researchSources.slice(0, 500);

    return record;
}


/* ============================================================
   155 — RESEARCH CACHE READ
   ============================================================ */

function getResearchCache(query) {
    cleanupResearchCache();

    const key = createResearchCacheKey(query);

    const cached = db.researchCache[key];

    if (!cached) {
        return null;
    }

    return cached;
}


/* ============================================================
   156 — RESEARCH CACHE WRITE
   ============================================================ */

function setResearchCache(query, result) {
    const key = createResearchCacheKey(query);

    db.researchCache[key] = {
        query: safeText(query, 1000),
        result,
        createdAt: isoNow()
    };

    saveDB("research-cache");

    return db.researchCache[key];
}


/* ============================================================
   157 — RESEARCH HISTORY
   ============================================================ */

function saveResearchHistory(userId, query, result) {
    db.researchHistory.unshift({
        id: createId("rh"),
        userId,
        query: safeText(query, 1000),
        sourceCount: result?.sources?.length || 0,
        officialOnly: RESEARCH_CONFIG.officialOnly,
        createdAt: isoNow()
    });

    db.researchHistory =
        db.researchHistory.slice(0, 2000);

    saveDB("research-history");
}


/* ============================================================
   158 — RESEARCH SOURCE DEDUPLICATION
   ============================================================ */

function deduplicateResearchSources(sources) {
    const seen = new Set();
    const result = [];

    for (const source of sources || []) {
        if (!source?.url) continue;

        let normalized;

        try {
            normalized = new URL(source.url).href;
        } catch {
            continue;
        }

        if (seen.has(normalized)) {
            continue;
        }

        seen.add(normalized);
        result.push({
            ...source,
            url: normalized
        });
    }

    return result;
}


/* ============================================================
   159 — RESEARCH RESULT BUILDER
   ============================================================ */

function buildResearchEngineResult(query, sources) {
    const cleaned = deduplicateResearchSources(sources);

    const filtered = RESEARCH_CONFIG.officialOnly
        ? cleaned.filter(source => source.official)
        : cleaned;

    const finalSources =
        filtered
            .sort((a, b) => {
                return calculateSourceQuality(b) -
                    calculateSourceQuality(a);
            })
            .slice(0, RESEARCH_CONFIG.maxSources);

    return {
        query: safeText(query, 1000),
        sourceCount: finalSources.length,
        officialOnly: RESEARCH_CONFIG.officialOnly,
        generatedAt: isoNow(),
        sources: finalSources.map(source => ({
            id: source.id || createId("src"),
            url: source.url,
            title: source.title || source.url,
            description: source.description || "",
            text: source.text || "",
            official: Boolean(source.official),
            quality: calculateSourceQuality(source)
        }))
    };
}


/* ============================================================
   160 — RESEARCH ENDPOINT
   ============================================================ */

app.post("/api/research", requireAuth, async (req, res) => {
    const started = Date.now();

    try {
        const query = safeText(req.body?.query, 1000);

        if (!query || query.length < 2) {
            return res.status(400).json({
                ok: false,
                error: "Araştırma konusu boş olamaz."
            });
        }

        const cached = getResearchCache(query);

        if (cached) {
            return res.json({
                ok: true,
                cached: true,
                result: cached.result,
                responseTime: Date.now() - started
            });
        }

        /*
         * Gerçek arama sağlayıcısı bağlanana kadar
         * endpoint doğrudan verilen güvenilir URL'leri
         * analiz edebilecek şekilde tasarlanmıştır.
         */

        const urls = Array.isArray(req.body?.urls)
            ? req.body.urls.slice(0, 8)
            : [];

        const sources = [];

        for (const url of urls) {
            try {
                const page = await fetchResearchPage(url);

                if (
                    RESEARCH_CONFIG.officialOnly &&
                    !page.official
                ) {
                    continue;
                }

                const record =
                    createResearchRecord(page, query);

                sources.push({
                    ...page,
                    id: record.id
                });
            } catch (error) {
                audit(
                    req.user?.id || "unknown",
                    "research_fetch_error",
                    {
                        query,
                        url,
                        error: error.message
                    }
                );
            }
        }

        const result =
            buildResearchEngineResult(
                query,
                sources
            );

        setResearchCache(query, result);

        saveResearchHistory(
            req.user.id,
            query,
            result
        );

        return res.json({
            ok: true,
            cached: false,
            result,
            responseTime: Date.now() - started
        });
    } catch (error) {
        console.error("Research error:", error);

        return res.status(500).json({
            ok: false,
            error: "Araştırma motorunda hata oluştu."
        });
    }
});


/* ============================================================
   161 — RESEARCH HISTORY API
   ============================================================ */

app.get(
    "/api/research/history",
    requireAuth,
    async (req, res) => {
        const rows =
            db.researchHistory
                .filter(row =>
                    row.userId === req.user.id
                )
                .slice(0, 100);

        res.json({
            ok: true,
            history: rows
        });
    }
);


/* ============================================================
   162 — RESEARCH SOURCE API
   ============================================================ */

app.get(
    "/api/research/sources",
    requireAuth,
    async (req, res) => {
        const rows =
            db.researchSources
                .slice(0, 100);

        res.json({
            ok: true,
            sources: rows
        });
    }
);


/* ============================================================
   163 — RESEARCH CACHE STATS
   ============================================================ */

app.get(
    "/api/research/cache",
    requireAuth,
    async (req, res) => {
        cleanupResearchCache();

        res.json({
            ok: true,
            entries:
                Object.keys(db.researchCache).length,
            cacheMinutes:
                RESEARCH_CONFIG.cacheMinutes
        });
    }
);


/* ============================================================
   164 — FILE SYSTEM CONFIG
   ============================================================ */

const TURKAI_FILE_CONFIG = {
    maxUploadSize: 10 * 1024 * 1024,
    maxGeneratedFileSize: 2 * 1024 * 1024,
    maxProjectFiles: 80,
    allowedExtensions: [
        ".txt",
        ".md",
        ".json",
        ".csv",
        ".html",
        ".css",
        ".js",
        ".ts",
        ".jsx",
        ".tsx",
        ".py",
        ".java",
        ".c",
        ".cpp",
        ".cs",
        ".xml",
        ".sql",
        ".yaml",
        ".yml",
        ".svg"
    ]
};


/* ============================================================
   165 — FILE DATABASE
   ============================================================ */

if (!db.files) {
    db.files = [];
}

if (!db.projects) {
    db.projects = [];
}

if (!db.fileHistory) {
    db.fileHistory = [];
}


/* ============================================================
   166 — FILE EXTENSION
   ============================================================ */

function getExtension(filename) {
    const clean = safeText(filename, 255);

    const index = clean.lastIndexOf(".");

    if (index === -1) {
        return "";
    }

    return clean
        .slice(index)
        .toLowerCase();
}


/* ============================================================
   167 — FILE TYPE
   ============================================================ */

function getFileType(filename) {
    const ext = getExtension(filename);

    const map = {
        ".html": "html",
        ".css": "css",
        ".js": "javascript",
        ".ts": "typescript",
        ".jsx": "react",
        ".tsx": "react-typescript",
        ".py": "python",
        ".java": "java",
        ".c": "c",
        ".cpp": "cpp",
        ".cs": "csharp",
        ".json": "json",
        ".csv": "csv",
        ".md": "markdown",
        ".txt": "text",
        ".sql": "sql",
        ".xml": "xml",
        ".yaml": "yaml",
        ".yml": "yaml",
        ".svg": "svg"
    };

    return map[ext] || "unknown";
}


/* ============================================================
   168 — SAFE FILE NAME
   ============================================================ */

function createSafeFileName(filename) {
    let name = safeText(filename, 150);

    name = name
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
        .replace(/\.\./g, "_")
        .trim();

    if (!name) {
        name = "dosya.txt";
    }

    return name;
}


/* ============================================================
   169 — SAFE PROJECT NAME
   ============================================================ */

function createSafeProjectName(name) {
    return safeText(name, 100)
        .replace(/[^a-zA-Z0-9ğüşöçıİĞÜŞÖÇ _-]/g, "")
        .replace(/\s+/g, "-")
        .toLowerCase()
        .slice(0, 80) || "turkai-project";
}


/* ============================================================
   170 — FILE PATH SECURITY
   ============================================================ */

function isSafeRelativePath(relativePath) {
    if (!relativePath) {
        return false;
    }

    const normalized =
        String(relativePath)
            .replace(/\\/g, "/");

    if (
        normalized.includes("../") ||
        normalized.startsWith("../") ||
        normalized.includes("/../")
    ) {
        return false;
    }

    if (
        normalized.startsWith("/") ||
        normalized.includes("\0")
    ) {
        return false;
    }

    return true;
}


/* ============================================================
   171 — USER FILE DIRECTORY
   ============================================================ */

function getUserFilesDirectory(userId) {
    const safeId =
        String(userId)
            .replace(/[^a-zA-Z0-9_-]/g, "_");

    const directory =
        path.join(
            GENERATED_FILES_DIR,
            "users",
            safeId
        );

    fs.mkdirSync(directory, {
        recursive: true
    });

    return directory;
}


/* ============================================================
   172 — PROJECT DIRECTORY
   ============================================================ */

function getProjectDirectory(userId, projectId) {
    const base =
        getUserFilesDirectory(userId);

    const safeProject =
        String(projectId)
            .replace(/[^a-zA-Z0-9_-]/g, "_");

    const directory =
        path.join(
            base,
            "projects",
            safeProject
        );

    fs.mkdirSync(directory, {
        recursive: true
    });

    return directory;
}


/* ============================================================
   173 — FILE PATH RESOLUTION
   ============================================================ */

function resolveProjectFile(userId, projectId, relativePath) {
    if (!isSafeRelativePath(relativePath)) {
        throw new Error("Güvensiz dosya yolu.");
    }

    const projectDir =
        getProjectDirectory(
            userId,
            projectId
        );

    const absolute =
        path.resolve(
            projectDir,
            relativePath
        );

    const root =
        path.resolve(projectDir);

    if (
        absolute !== root &&
        !absolute.startsWith(root + path.sep)
    ) {
        throw new Error("Dosya yolu proje dışına çıkıyor.");
    }

    return absolute;
}


/* ============================================================
   174 — FILE DATABASE RECORD
   ============================================================ */

function createFileDatabaseRecord({
    userId,
    projectId = null,
    filename,
    relativePath,
    size,
    language,
    source = "generated"
}) {
    const record = {
        id: createId("file"),
        userId,
        projectId,
        filename: createSafeFileName(filename),
        relativePath,
        size,
        language,
        source,
        createdAt: isoNow(),
        updatedAt: isoNow()
    };

    db.files.unshift(record);

    db.files =
        db.files.slice(0, 5000);

    saveDB("files");

    return record;
}


/* ============================================================
   175 — FILE HISTORY RECORD
   ============================================================ */

function addFileHistory(
    userId,
    fileId,
    action,
    metadata = {}
) {
    db.fileHistory.unshift({
        id: createId("fh"),
        userId,
        fileId,
        action,
        metadata,
        createdAt: isoNow()
    });

    db.fileHistory =
        db.fileHistory.slice(0, 10000);

    saveDB("file-history");
}


/* ============================================================
   176 — CREATE PROJECT
   ============================================================ */

function createProjectRecord(
    userId,
    name,
    description = ""
) {
    const project = {
        id: createId("project"),
        userId,
        name: createSafeProjectName(name),
        displayName: safeText(name, 100),
        description: safeText(description, 1000),
        files: [],
        createdAt: isoNow(),
        updatedAt: isoNow()
    };

    db.projects.unshift(project);

    db.projects =
        db.projects.slice(0, 1000);

    saveDB("projects");

    getProjectDirectory(
        userId,
        project.id
    );

    return project;
}


/* ============================================================
   177 — CREATE PROJECT API
   ============================================================ */

app.post(
    "/api/projects",
    requireAuth,
    async (req, res) => {
        try {
            const name =
                safeText(
                    req.body?.name,
                    100
                );

            const description =
                safeText(
                    req.body?.description,
                    1000
                );

            if (!name) {
                return res.status(400).json({
                    ok: false,
                    error: "Proje adı gerekli."
                });
            }

            const project =
                createProjectRecord(
                    req.user.id,
                    name,
                    description
                );

            res.json({
                ok: true,
                project
            });
        } catch (error) {
            res.status(500).json({
                ok: false,
                error: "Proje oluşturulamadı."
            });
        }
    }
);


/* ============================================================
   178 — LIST PROJECTS
   ============================================================ */

app.get(
    "/api/projects",
    requireAuth,
    async (req, res) => {
        const projects =
            db.projects.filter(
                project =>
                    project.userId === req.user.id
            );

        res.json({
            ok: true,
            projects
        });
    }
);


/* ============================================================
   179 — GET PROJECT
   ============================================================ */

app.get(
    "/api/projects/:id",
    requireAuth,
    async (req, res) => {
        const project =
            db.projects.find(
                item =>
                    item.id === req.params.id &&
                    item.userId === req.user.id
            );

        if (!project) {
            return res.status(404).json({
                ok: false,
                error: "Proje bulunamadı."
            });
        }

        res.json({
            ok: true,
            project
        });
    }
);


/* ============================================================
   180 — UPDATE PROJECT
   ============================================================ */

app.patch(
    "/api/projects/:id",
    requireAuth,
    async (req, res) => {
        const project =
            db.projects.find(
                item =>
                    item.id === req.params.id &&
                    item.userId === req.user.id
            );

        if (!project) {
            return res.status(404).json({
                ok: false,
                error: "Proje bulunamadı."
            });
        }

        if (req.body?.name !== undefined) {
            project.displayName =
                safeText(req.body.name, 100);

            project.name =
                createSafeProjectName(
                    req.body.name
                );
        }

        if (req.body?.description !== undefined) {
            project.description =
                safeText(
                    req.body.description,
                    1000
                );
        }

        project.updatedAt = isoNow();

        saveDB("projects");

        res.json({
            ok: true,
            project
        });
    }
);


/* ============================================================
   181 — DELETE PROJECT
   ============================================================ */

app.delete(
    "/api/projects/:id",
    requireAuth,
    async (req, res) => {
        const index =
            db.projects.findIndex(
                project =>
                    project.id === req.params.id &&
                    project.userId === req.user.id
            );

        if (index === -1) {
            return res.status(404).json({
                ok: false,
                error: "Proje bulunamadı."
            });
        }

        const project =
            db.projects[index];

        db.projects.splice(index, 1);

        db.files =
            db.files.filter(
                file =>
                    !(
                        file.userId === req.user.id &&
                        file.projectId === project.id
                    )
            );

        saveDB("projects");
        saveDB("files");

        try {
            const directory =
                getProjectDirectory(
                    req.user.id,
                    project.id
                );

            fs.rmSync(directory, {
                recursive: true,
                force: true
            });
        } catch {}

        res.json({
            ok: true,
            message: "Proje silindi."
        });
    }
);


/* ============================================================
   182 — WRITE PROJECT FILE
   ============================================================ */

function writeProjectFile({
    userId,
    projectId,
    relativePath,
    content,
    source = "generated"
}) {
    if (!isSafeRelativePath(relativePath)) {
        throw new Error("Geçersiz dosya yolu.");
    }

    const text =
        typeof content === "string"
            ? content
            : String(content ?? "");

    if (
        Buffer.byteLength(text, "utf8") >
        TURKAI_FILE_CONFIG.maxGeneratedFileSize
    ) {
        throw new Error(
            "Dosya boyutu izin verilen sınırı aşıyor."
        );
    }

    const absolute =
        resolveProjectFile(
            userId,
            projectId,
            relativePath
        );

    fs.mkdirSync(
        path.dirname(absolute),
        {
            recursive: true
        }
    );

    fs.writeFileSync(
        absolute,
        text,
        "utf8"
    );

    const filename =
        path.basename(relativePath);

    const language =
        getFileType(filename);

    let record =
        db.files.find(
            file =>
                file.userId === userId &&
                file.projectId === projectId &&
                file.relativePath === relativePath
        );

    if (record) {
        record.size =
            Buffer.byteLength(
                text,
                "utf8"
            );

        record.language =
            language;

        record.updatedAt =
            isoNow();
    } else {
        record =
            createFileDatabaseRecord({
                userId,
                projectId,
                filename,
                relativePath,
                size:
                    Buffer.byteLength(
                        text,
                        "utf8"
                    ),
                language,
                source
            });
    }

    const project =
        db.projects.find(
            item =>
                item.id === projectId &&
                item.userId === userId
        );

    if (project) {
        if (!project.files.includes(record.id)) {
            project.files.push(record.id);
        }

        project.updatedAt = isoNow();
    }

    addFileHistory(
        userId,
        record.id,
        "write",
        {
            path: relativePath,
            size: record.size
        }
    );

    saveDB("files");
    saveDB("projects");

    return record;
}


/* ============================================================
   183 — READ PROJECT FILE
   ============================================================ */

function readProjectFile(
    userId,
    projectId,
    relativePath
) {
    const absolute =
        resolveProjectFile(
            userId,
            projectId,
            relativePath
        );

    if (!fs.existsSync(absolute)) {
        throw new Error("Dosya bulunamadı.");
    }

    const stats =
        fs.statSync(absolute);

    if (!stats.isFile()) {
        throw new Error("Bu yol bir dosya değil.");
    }

    if (
        stats.size >
        TURKAI_FILE_CONFIG.maxGeneratedFileSize
    ) {
        throw new Error(
            "Dosya okunamayacak kadar büyük."
        );
    }

    return fs.readFileSync(
        absolute,
        "utf8"
    );
}


/* ============================================================
   184 — CREATE FILE API
   ============================================================ */

app.post(
    "/api/projects/:id/files",
    requireAuth,
    async (req, res) => {
        try {
            const project =
                db.projects.find(
                    item =>
                        item.id === req.params.id &&
                        item.userId === req.user.id
                );

            if (!project) {
                return res.status(404).json({
                    ok: false,
                    error: "Proje bulunamadı."
                });
            }

            const relativePath =
                safeText(
                    req.body?.path,
                    300
                );

            const content =
                typeof req.body?.content === "string"
                    ? req.body.content
                    : "";

            if (!isSafeRelativePath(relativePath)) {
                return res.status(400).json({
                    ok: false,
                    error: "Geçersiz dosya yolu."
                });
            }

            const record =
                writeProjectFile({
                    userId: req.user.id,
                    projectId: project.id,
                    relativePath,
                    content,
                    source: "user"
                });

            res.json({
                ok: true,
                file: record
            });
        } catch (error) {
            res.status(400).json({
                ok: false,
                error: error.message
            });
        }
    }
);


/* ============================================================
   185 — READ FILE API
   ============================================================ */

app.get(
    "/api/projects/:id/files/read",
    requireAuth,
    async (req, res) => {
        try {
            const project =
                db.projects.find(
                    item =>
                        item.id === req.params.id &&
                        item.userId === req.user.id
                );

            if (!project) {
                return res.status(404).json({
                    ok: false,
                    error: "Proje bulunamadı."
                });
            }

            const relativePath =
                safeText(
                    req.query?.path,
                    300
                );

            const content =
                readProjectFile(
                    req.user.id,
                    project.id,
                    relativePath
                );

            res.json({
                ok: true,
                path: relativePath,
                content
            });
        } catch (error) {
            res.status(400).json({
                ok: false,
                error: error.message
            });
        }
    }
);


/* ============================================================
   186 — LIST PROJECT FILES
   ============================================================ */

function walkProjectDirectory(
    directory,
    rootDirectory,
    result = []
) {
    if (!fs.existsSync(directory)) {
        return result;
    }

    const entries =
        fs.readdirSync(
            directory,
            {
                withFileTypes: true
            }
        );

    for (const entry of entries) {
        const fullPath =
            path.join(
                directory,
                entry.name
            );

        if (entry.isDirectory()) {
            walkProjectDirectory(
                fullPath,
                rootDirectory,
                result
            );

            continue;
        }

        if (!entry.isFile()) {
            continue;
        }

        const relative =
            path.relative(
                rootDirectory,
                fullPath
            ).replace(/\\/g, "/");

        result.push(relative);

        if (
            result.length >=
            TURKAI_FILE_CONFIG.maxProjectFiles
        ) {
            break;
        }
    }

    return result;
}


/* ============================================================
   187 — PROJECT FILES API
   ============================================================ */

app.get(
    "/api/projects/:id/files",
    requireAuth,
    async (req, res) => {
        const project =
            db.projects.find(
                item =>
                    item.id === req.params.id &&
                    item.userId === req.user.id
            );

        if (!project) {
            return res.status(404).json({
                ok: false,
                error: "Proje bulunamadı."
            });
        }

        const directory =
            getProjectDirectory(
                req.user.id,
                project.id
            );

        const files =
            walkProjectDirectory(
                directory,
                directory,
                []
            );

        res.json({
            ok: true,
            files
        });
    }
);


/* ============================================================
   188 — DELETE PROJECT FILE
   ============================================================ */

app.delete(
    "/api/projects/:id/files",
    requireAuth,
    async (req, res) => {
        try {
            const project =
                db.projects.find(
                    item =>
                        item.id === req.params.id &&
                        item.userId === req.user.id
                );

            if (!project) {
                return res.status(404).json({
                    ok: false,
                    error: "Proje bulunamadı."
                });
            }

            const relativePath =
                safeText(
                    req.body?.path,
                    300
                );

            const absolute =
                resolveProjectFile(
                    req.user.id,
                    project.id,
                    relativePath
                );

            if (!fs.existsSync(absolute)) {
                return res.status(404).json({
                    ok: false,
                    error: "Dosya bulunamadı."
                });
            }

            fs.rmSync(
                absolute,
                {
                    recursive: false,
                    force: true
                }
            );

            const record =
                db.files.find(
                    file =>
                        file.userId === req.user.id &&
                        file.projectId === project.id &&
                        file.relativePath === relativePath
                );

            if (record) {
                db.files =
                    db.files.filter(
                        file =>
                            file.id !== record.id
                    );

                addFileHistory(
                    req.user.id,
                    record.id,
                    "delete",
                    {
                        path: relativePath
                    }
                );
            }

            project.files =
                project.files.filter(
                    id =>
                        id !== record?.id
                );

            project.updatedAt = isoNow();

            saveDB("files");
            saveDB("projects");

            res.json({
                ok: true,
                message: "Dosya silindi."
            });
        } catch (error) {
            res.status(400).json({
                ok: false,
                error: error.message
            });
        }
    }
);


/* ============================================================
   189 — CODE LANGUAGE CONFIGURATION
   ============================================================ */

const CODE_LANGUAGE_CONFIG = {
    javascript: {
        extension: ".js",
        name: "JavaScript",
        comment: "//"
    },

    typescript: {
        extension: ".ts",
        name: "TypeScript",
        comment: "//"
    },

    html: {
        extension: ".html",
        name: "HTML",
        comment: "<!--"
    },

    css: {
        extension: ".css",
        name: "CSS",
        comment: "/*"
    },

    python: {
        extension: ".py",
        name: "Python",
        comment: "#"
    },

    java: {
        extension: ".java",
        name: "Java",
        comment: "//"
    },

    cpp: {
        extension: ".cpp",
        name: "C++",
        comment: "//"
    },

    c: {
        extension: ".c",
        name: "C",
        comment: "//"
    },

    csharp: {
        extension: ".cs",
        name: "C#",
        comment: "//"
    },

    json: {
        extension: ".json",
        name: "JSON",
        comment: ""
    },

    sql: {
        extension: ".sql",
        name: "SQL",
        comment: "--"
    }
};


/* ============================================================
   190 — CODE TEMPLATE ENGINE
   ============================================================ */

function getCodeTemplate(language, projectName) {
    const name =
        safeText(projectName, 100);

    switch (language) {
        case "javascript":
            return `/**
 * ${name}
 * TürkAI Code Engine
 */

console.log("Merhaba ${name}!");

function main() {
    console.log("Uygulama çalışıyor.");
}

main();
`;

        case "typescript":
            return `/**
 * ${name}
 * TürkAI TypeScript Project
 */

function main(): void {
    console.log("TürkAI TypeScript projesi çalışıyor.");
}

main();
`;

        case "python":
            return `"""
${name}
TürkAI Python Project
"""

def main():
    print("TürkAI Python projesi çalışıyor.")

if __name__ == "__main__":
    main()
`;

        case "java":
            return `public class Main {
    public static void main(String[] args) {
        System.out.println("TürkAI Java projesi çalışıyor.");
    }
}
`;

        case "cpp":
            return `#include <iostream>

int main() {
    std::cout << "TürkAI C++ projesi çalışıyor." << std::endl;
    return 0;
}
`;

        case "c":
            return `#include <stdio.h>

int main(void) {
    printf("TürkAI C projesi çalışıyor.\\n");
    return 0;
}
`;

        case "csharp":
            return `using System;

class Program
{
    static void Main()
    {
        Console.WriteLine("TürkAI C# projesi çalışıyor.");
    }
}
`;

        case "html":
            return `<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${name}</title>
</head>
<body>
    <main>
        <h1>${name}</h1>
        <p>TürkAI tarafından oluşturuldu.</p>
    </main>
</body>
</html>
`;

        case "css":
            return `:root {
    --bg: #090b10;
    --text: #ffffff;
    --accent: #7c5cff;
}

* {
    box-sizing: border-box;
}

body {
    margin: 0;
    min-height: 100vh;
    background: var(--bg);
    color: var(--text);
    font-family: system-ui, sans-serif;
}

main {
    max-width: 1000px;
    margin: auto;
    padding: 40px 20px;
}
`;

        case "json":
            return JSON.stringify({
                name,
                createdBy: "TürkAI",
                version: "1.0.0"
            }, null, 4);

        case "sql":
            return `CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

SELECT * FROM users;
`;

        default:
            return "";
    }
}


/* ============================================================
   191 — CREATE CODE FILE
   ============================================================ */

app.post(
    "/api/projects/:id/code",
    requireAuth,
    async (req, res) => {
        try {
            const project =
                db.projects.find(
                    item =>
                        item.id === req.params.id &&
                        item.userId === req.user.id
                );

            if (!project) {
                return res.status(404).json({
                    ok: false,
                    error: "Proje bulunamadı."
                });
            }

            const language =
                safeText(
                    req.body?.language,
                    50
                ).toLowerCase();

            const config =
                CODE_LANGUAGE_CONFIG[language];

            if (!config) {
                return res.status(400).json({
                    ok: false,
                    error: "Desteklenmeyen kod dili."
                });
            }

            const requestedName =
                safeText(
                    req.body?.name ||
                    language,
                    100
                );

            let filename =
                createSafeFileName(
                    requestedName
                );

            if (!filename.includes(".")) {
                filename += config.extension;
            }

            const content =
                typeof req.body?.content === "string"
                    ? req.body.content
                    : getCodeTemplate(
                        language,
                        project.displayName
                    );

            const record =
                writeProjectFile({
                    userId: req.user.id,
                    projectId: project.id,
                    relativePath: filename,
                    content,
                    source: "code-generator"
                });

            res.json({
                ok: true,
                file: record,
                language: config.name
            });
        } catch (error) {
            res.status(400).json({
                ok: false,
                error: error.message
            });
        }
    }
);


/* ============================================================
   192 — WEB PROJECT GENERATOR
   ============================================================ */

function generateWebProjectFiles(projectName) {
    const name =
        safeText(
            projectName,
            100
        );

    return [
        {
            path: "index.html",
            content: `<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#090b10">
    <title>${name}</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <main class="app">
        <section class="hero">
            <span class="badge">TürkAI</span>
            <h1>${name}</h1>
            <p>TürkAI tarafından oluşturulan web projesi.</p>
            <button id="startButton">Başlat</button>
            <div id="result"></div>
        </section>
    </main>

    <script src="app.js"></script>
</body>
</html>`
        },

        {
            path: "style.css",
            content: `* {
    box-sizing: border-box;
}

body {
    margin: 0;
    min-height: 100vh;
    background: #090b10;
    color: white;
    font-family: system-ui, sans-serif;
}

.app {
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 24px;
}

.hero {
    width: min(700px, 100%);
    padding: 36px;
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 28px;
    background: rgba(255,255,255,.05);
    backdrop-filter: blur(20px);
}

.badge {
    display: inline-block;
    padding: 7px 12px;
    border-radius: 999px;
    background: rgba(124,92,255,.18);
}

button {
    border: 0;
    border-radius: 14px;
    padding: 13px 18px;
    cursor: pointer;
    background: #7c5cff;
    color: white;
    font-weight: 700;
}

#result {
    margin-top: 20px;
    min-height: 30px;
}`
        },

        {
            path: "app.js",
            content: `const button = document.getElementById("startButton");
const result = document.getElementById("result");

button.addEventListener("click", () => {
    result.textContent = "Uygulama çalışıyor.";
});`
        },

        {
            path: "README.md",
            content: `# ${name}

Bu proje TürkAI tarafından oluşturuldu.

## Dosyalar

- index.html
- style.css
- app.js
- README.md

## Başlangıç

index.html dosyasını tarayıcıda aç.`
        }
    ];
}


/* ============================================================
   193 — GENERATE WEB PROJECT API
   ============================================================ */

app.post(
    "/api/projects/:id/generate-web",
    requireAuth,
    async (req, res) => {
        try {
            const project =
                db.projects.find(
                    item =>
                        item.id === req.params.id &&
                        item.userId === req.user.id
                );

            if (!project) {
                return res.status(404).json({
                    ok: false,
                    error: "Proje bulunamadı."
                });
            }

            const files =
                generateWebProjectFiles(
                    project.displayName
                );

            const created = [];

            for (const file of files) {
                const record =
                    writeProjectFile({
                        userId: req.user.id,
                        projectId: project.id,
                        relativePath: file.path,
                        content: file.content,
                        source: "web-generator"
                    });

                created.push(record);
            }

            res.json({
                ok: true,
                projectId: project.id,
                files: created
            });
        } catch (error) {
            res.status(500).json({
                ok: false,
                error: error.message
            });
        }
    }
);


/* ============================================================
   194 — PROJECT FILE SEARCH
   ============================================================ */

app.get(
    "/api/projects/:id/search",
    requireAuth,
    async (req, res) => {
        try {
            const project =
                db.projects.find(
                    item =>
                        item.id === req.params.id &&
                        item.userId === req.user.id
                );

            if (!project) {
                return res.status(404).json({
                    ok: false,
                    error: "Proje bulunamadı."
                });
            }

            const query =
                safeText(
                    req.query?.q,
                    200
                ).toLowerCase();

            if (!query) {
                return res.json({
                    ok: true,
                    results: []
                });
            }

            const directory =
                getProjectDirectory(
                    req.user.id,
                    project.id
                );

            const paths =
                walkProjectDirectory(
                    directory,
                    directory,
                    []
                );

            const results = [];

            for (const relativePath of paths) {
                if (
                    results.length >= 100
                ) {
                    break;
                }

                const absolute =
                    resolveProjectFile(
                        req.user.id,
                        project.id,
                        relativePath
                    );

                let content;

                try {
                    content =
                        fs.readFileSync(
                            absolute,
                            "utf8"
                        );
                } catch {
                    continue;
                }

                const lower =
                    content.toLowerCase();

                const index =
                    lower.indexOf(query);

                if (index === -1) {
                    continue;
                }

                const start =
                    Math.max(
                        0,
                        index - 100
                    );

                const end =
                    Math.min(
                        content.length,
                        index + query.length + 150
                    );

                results.push({
                    path: relativePath,
                    snippet:
                        content.slice(
                            start,
                            end
                        ),
                    index
                });
            }

            res.json({
                ok: true,
                query,
                results
            });
        } catch (error) {
            res.status(500).json({
                ok: false,
                error: "Dosya araması başarısız."
            });
        }
    }
);


/* ============================================================
   195 — PROJECT TREE
   ============================================================ */

function buildProjectTree(
    directory,
    root = directory
) {
    if (!fs.existsSync(directory)) {
        return [];
    }

    const entries =
        fs.readdirSync(
            directory,
            {
                withFileTypes: true
            }
        );

    return entries
        .slice(0, TURKAI_FILE_CONFIG.maxProjectFiles)
        .map(entry => {
            const full =
                path.join(
                    directory,
                    entry.name
                );

            if (entry.isDirectory()) {
                return {
                    name: entry.name,
                    type: "directory",
                    children:
                        buildProjectTree(
                            full,
                            root
                        )
                };
            }

            const relative =
                path.relative(
                    root,
                    full
                ).replace(/\\/g, "/");

            const stats =
                fs.statSync(full);

            return {
                name: entry.name,
                type: "file",
                path: relative,
                size: stats.size,
                language:
                    getFileType(entry.name)
            };
        });
}


/* ============================================================
   196 — PROJECT TREE API
   ============================================================ */

app.get(
    "/api/projects/:id/tree",
    requireAuth,
    async (req, res) => {
        const project =
            db.projects.find(
                item =>
                    item.id === req.params.id &&
                    item.userId === req.user.id
            );

        if (!project) {
            return res.status(404).json({
                ok: false,
                error: "Proje bulunamadı."
            });
        }

        const directory =
            getProjectDirectory(
                req.user.id,
                project.id
            );

        res.json({
            ok: true,
            tree:
                buildProjectTree(
                    directory
                )
        });
    }
);


/* ============================================================
   197 — CODE STATISTICS
   ============================================================ */

function getProjectStatistics(
    userId,
    projectId
) {
    const project =
        db.projects.find(
            item =>
                item.id === projectId &&
                item.userId === userId
        );

    if (!project) {
        return null;
    }

    const directory =
        getProjectDirectory(
            userId,
            projectId
        );

    const files =
        walkProjectDirectory(
            directory,
            directory,
            []
        );

    const stats = {
        files: files.length,
        totalBytes: 0,
        languages: {},
        largestFile: null
    };

    for (const relativePath of files) {
        try {
            const absolute =
                resolveProjectFile(
                    userId,
                    projectId,
                    relativePath
                );

            const info =
                fs.statSync(absolute);

            const language =
                getFileType(relativePath);

            stats.totalBytes +=
                info.size;

            stats.languages[language] =
                (stats.languages[language] || 0) + 1;

            if (
                !stats.largestFile ||
                info.size >
                stats.largestFile.size
            ) {
                stats.largestFile = {
                    path: relativePath,
                    size: info.size
                };
            }
        } catch {}
    }

    return stats;
}


/* ============================================================
   198 — PROJECT STATISTICS API
   ============================================================ */

app.get(
    "/api/projects/:id/stats",
    requireAuth,
    async (req, res) => {
        const stats =
            getProjectStatistics(
                req.user.id,
                req.params.id
            );

        if (!stats) {
            return res.status(404).json({
                ok: false,
                error: "Proje bulunamadı."
            });
        }

        res.json({
            ok: true,
            stats
        });
    }
);


/* ============================================================
   199 — CODE FILE VALIDATION
   ============================================================ */

function validateGeneratedCode(
    language,
    content
) {
    const result = {
        valid: true,
        warnings: [],
        errors: []
    };

    if (
        typeof content !== "string" ||
        !content.trim()
    ) {
        result.valid = false;
        result.errors.push(
            "Kod içeriği boş."
        );

        return result;
    }

    if (
        content.length >
        TURKAI_FILE_CONFIG.maxGeneratedFileSize
    ) {
        result.valid = false;
        result.errors.push(
            "Kod dosyası çok büyük."
        );
    }

    if (language === "javascript") {
        if (
            content.includes("eval(")
        ) {
            result.warnings.push(
                "eval kullanımı tespit edildi."
            );
        }

        if (
            content.includes(
                "child_process"
            )
        ) {
            result.warnings.push(
                "Sistem komutu çalıştırma modülü tespit edildi."
            );
        }
    }

    if (language === "html") {
        if (
            /<script[^>]+src=["']https?:\/\//i.test(
                content
            )
        ) {
            result.warnings.push(
                "Harici script kaynağı bulundu."
            );
        }
    }

    return result;
}


/* ============================================================
   200 — CODE VALIDATION API
   ============================================================ */

app.post(
    "/api/code/validate",
    requireAuth,
    async (req, res) => {
        const language =
            safeText(
                req.body?.language,
                50
            ).toLowerCase();

        const content =
            typeof req.body?.content === "string"
                ? req.body.content
                : "";

        const result =
            validateGeneratedCode(
                language,
                content
            );

        res.json({
            ok: true,
            result
        });
    }
);


/* ============================================================
   201 — FILE HISTORY API
   ============================================================ */

app.get(
    "/api/files/history",
    requireAuth,
    async (req, res) => {
        const history =
            db.fileHistory
                .filter(
                    item =>
                        item.userId === req.user.id
                )
                .slice(0, 200);

        res.json({
            ok: true,
            history
        });
    }
);


/* ============================================================
   202 — USER FILE RECORDS
   ============================================================ */

app.get(
    "/api/files/all",
    requireAuth,
    async (req, res) => {
        const files =
            db.files.filter(
                file =>
                    file.userId === req.user.id
            );

        res.json({
            ok: true,
            files
        });
    }
);


/* ============================================================
   203 — FILE RECORD DELETE
   ============================================================ */

app.delete(
    "/api/files/:id/permanent",
    requireAuth,
    async (req, res) => {
        const index =
            db.files.findIndex(
                file =>
                    file.id === req.params.id &&
                    file.userId === req.user.id
            );

        if (index === -1) {
            return res.status(404).json({
                ok: false,
                error: "Dosya kaydı bulunamadı."
            });
        }

        const file =
            db.files[index];

        if (file.projectId) {
            try {
                const absolute =
                    resolveProjectFile(
                        req.user.id,
                        file.projectId,
                        file.relativePath
                    );

                if (fs.existsSync(absolute)) {
                    fs.rmSync(
                        absolute,
                        {
                            force: true
                        }
                    );
                }
            } catch {}
        }

        db.files.splice(index, 1);

        addFileHistory(
            req.user.id,
            file.id,
            "permanent-delete",
            {
                path: file.relativePath
            }
        );

        saveDB("files");

        res.json({
            ok: true,
            message: "Dosya kalıcı olarak silindi."
        });
    }
);


/* ============================================================
   204 — FILE QUOTA
   ============================================================ */

function getUserFileQuota(userId) {
    const files =
        db.files.filter(
            file =>
                file.userId === userId
        );

    const bytes =
        files.reduce(
            (sum, file) =>
                sum +
                Number(file.size || 0),
            0
        );

    const plan =
        getPlan(
            findUserById(userId)
        );

    const limits = {
        free: 25 * 1024 * 1024,
        pro: 250 * 1024 * 1024,
        plus: 1024 * 1024 * 1024,
        ultra: 5 * 1024 * 1024 * 1024
    };

    const limit =
        limits[plan] ||
        limits.free;

    return {
        used: bytes,
        limit,
        remaining:
            Math.max(
                0,
                limit - bytes
            ),
        files: files.length
    };
}


/* ============================================================
   205 — FILE QUOTA API
   ============================================================ */

app.get(
    "/api/files/quota",
    requireAuth,
    async (req, res) => {
        res.json({
            ok: true,
            quota:
                getUserFileQuota(
                    req.user.id
                )
        });
    }
);


/* ============================================================
   206 — CODE ASSISTANT ANALYSIS
   ============================================================ */

function analyzeCodeStructure(
    language,
    content
) {
    const lines =
        String(content || "")
            .split(/\r?\n/);

    const nonEmpty =
        lines.filter(
            line => line.trim()
        );

    const comments =
        lines.filter(
            line => {
                const value =
                    line.trim();

                return (
                    value.startsWith("//") ||
                    value.startsWith("#") ||
                    value.startsWith("/*") ||
                    value.startsWith("*") ||
                    value.startsWith("<!--")
                );
            }
        );

    const functions =
        (
            String(content)
                .match(
                    /\b(function|def|class|public\s+static|void|async)\b/g
                ) || []
        ).length;

    const imports =
        (
            String(content)
                .match(
                    /\b(import|require|using|include)\b/g
                ) || []
        ).length;

    return {
        language,
        lines: lines.length,
        nonEmptyLines: nonEmpty.length,
        commentLines: comments.length,
        estimatedFunctions: functions,
        imports,
        characters:
            String(content || "").length
    };
}


/* ============================================================
   207 — CODE ANALYSIS API
   ============================================================ */

app.post(
    "/api/code/analyze",
    requireAuth,
    async (req, res) => {
        const language =
            safeText(
                req.body?.language,
                50
            );

        const content =
            typeof req.body?.content === "string"
                ? req.body.content
                : "";

        if (!content) {
            return res.status(400).json({
                ok: false,
                error: "Kod boş."
            });
        }

        const validation =
            validateGeneratedCode(
                language,
                content
            );

        const structure =
            analyzeCodeStructure(
                language,
                content
            );

        res.json({
            ok: true,
            validation,
            structure
        });
    }
);


/* ============================================================
   208 — PROJECT README GENERATOR
   ============================================================ */

function generateProjectReadme(project) {
    return `# ${project.displayName}

${project.description || "TürkAI projesi."}

## TürkAI Proje Bilgisi

- Proje: ${project.displayName}
- TürkAI Proje ID: ${project.id}
- Oluşturulma: ${project.createdAt}

## Dosyalar

Bu proje TürkAI dosya motoru tarafından yönetilebilir.

## Not

Bu README otomatik olarak oluşturulmuştur.
`;
}


/* ============================================================
   209 — README API
   ============================================================ */

app.post(
    "/api/projects/:id/readme",
    requireAuth,
    async (req, res) => {
        const project =
            db.projects.find(
                item =>
                    item.id === req.params.id &&
                    item.userId === req.user.id
            );

        if (!project) {
            return res.status(404).json({
                ok: false,
                error: "Proje bulunamadı."
            });
        }

        try {
            const record =
                writeProjectFile({
                    userId: req.user.id,
                    projectId: project.id,
                    relativePath: "README.md",
                    content:
                        generateProjectReadme(
                            project
                        ),
                    source: "readme-generator"
                });

            res.json({
                ok: true,
                file: record
            });
        } catch (error) {
            res.status(500).json({
                ok: false,
                error: error.message
            });
        }
    }
);


/* ============================================================
   210 — FILE ENGINE HEALTH
   ============================================================ */

app.get(
    "/api/files/health",
    requireAuth,
    async (req, res) => {
        const quota =
            getUserFileQuota(
                req.user.id
            );

        res.json({
            ok: true,
            engine: "TurkAI File Engine",
            status: "operational",
            quota,
            supportedLanguages:
                Object.keys(
                    CODE_LANGUAGE_CONFIG
                ),
            maxUpload:
                TURKAI_FILE_CONFIG.maxUploadSize,
            maxGeneratedFile:
                TURKAI_FILE_CONFIG.maxGeneratedFileSize
        });
    }
);


/* ============================================================
   211 — KNOWLEDGE SOURCE LINKING
   ============================================================ */

function attachResearchToKnowledge(
    query,
    result,
    options = {}
) {
    if (!result?.sources?.length) {
        return null;
    }

    const officialSources =
        result.sources.filter(
            source =>
                source.official === true
        );

    if (!officialSources.length) {
        return null;
    }

    return {
        query: safeText(query, 1000),
        sources:
            officialSources.map(
                source => ({
                    title: source.title,
                    url: source.url,
                    quality: source.quality
                })
            ),
        validated: true,
        confidence:
            Math.min(
                100,
                60 +
                officialSources.length * 8
            ),
        createdAt: isoNow(),
        requireAdminApproval:
            options.requireAdminApproval !== false
    };
}


/* ============================================================
   212 — SAVE VALIDATED RESEARCH KNOWLEDGE
   ============================================================ */

function saveValidatedResearchKnowledge(
    query,
    answer,
    result
) {
    const link =
        attachResearchToKnowledge(
            query,
            result,
            {
                requireAdminApproval: true
            }
        );

    if (!link) {
        return null;
    }

    return addKnowledge(
        query,
        answer,
        "research",
        {
            research: link,
            pendingApproval: true
        }
    );
}


/* ============================================================
   213 — RESEARCH KNOWLEDGE PREVIEW API
   ============================================================ */

app.post(
    "/api/research/knowledge-preview",
    requireAuth,
    async (req, res) => {
        const query =
            safeText(
                req.body?.query,
                1000
            );

        const answer =
            safeText(
                req.body?.answer,
                12000
            );

        if (!query || !answer) {
            return res.status(400).json({
                ok: false,
                error:
                    "Soru ve cevap gerekli."
            });
        }

        const cached =
            getResearchCache(query);

        if (!cached) {
            return res.status(404).json({
                ok: false,
                error:
                    "Bu konu için araştırma sonucu bulunamadı."
            });
        }

        const preview =
            attachResearchToKnowledge(
                query,
                cached.result,
                {
                    requireAdminApproval: true
                }
            );

        res.json({
            ok: true,
            preview
        });
    }
);


/* ============================================================
   214 — RESEARCH ENGINE CONFIG API
   ============================================================ */

app.get(
    "/api/research/config",
    requireAuth,
    async (req, res) => {
        res.json({
            ok: true,
            config: {
                enabled:
                    RESEARCH_CONFIG.enabled,
                officialOnly:
                    RESEARCH_CONFIG.officialOnly,
                maxSources:
                    RESEARCH_CONFIG.maxSources,
                cacheMinutes:
                    RESEARCH_CONFIG.cacheMinutes,
                timeoutMs:
                    RESEARCH_CONFIG.timeoutMs
            }
        });
    }
);


/* ============================================================
   215 — PROJECT DUPLICATE
   ============================================================ */

app.post(
    "/api/projects/:id/duplicate",
    requireAuth,
    async (req, res) => {
        try {
            const original =
                db.projects.find(
                    project =>
                        project.id === req.params.id &&
                        project.userId === req.user.id
                );

            if (!original) {
                return res.status(404).json({
                    ok: false,
                    error: "Proje bulunamadı."
                });
            }

            const copy =
                createProjectRecord(
                    req.user.id,
                    `${original.displayName} Kopya`,
                    original.description
                );

            const sourceDir =
                getProjectDirectory(
                    req.user.id,
                    original.id
                );

            const targetDir =
                getProjectDirectory(
                    req.user.id,
                    copy.id
                );

            if (fs.existsSync(sourceDir)) {
                fs.cpSync(
                    sourceDir,
                    targetDir,
                    {
                        recursive: true
                    }
                );
            }

            const paths =
                walkProjectDirectory(
                    targetDir,
                    targetDir,
                    []
                );

            for (const relativePath of paths) {
                try {
                    const content =
                        readProjectFile(
                            req.user.id,
                            copy.id,
                            relativePath
                        );

                    writeProjectFile({
                        userId: req.user.id,
                        projectId: copy.id,
                        relativePath,
                        content,
                        source: "project-duplicate"
                    });
                } catch {}
            }

            res.json({
                ok: true,
                project: copy
            });
        } catch (error) {
            res.status(500).json({
                ok: false,
                error:
                    "Proje kopyalanamadı."
            });
        }
    }
);


/* ============================================================
   216 — FILE ENGINE SUMMARY
   ============================================================ */

app.get(
    "/api/files/summary",
    requireAuth,
    async (req, res) => {
        const userFiles =
            db.files.filter(
                file =>
                    file.userId === req.user.id
            );

        const userProjects =
            db.projects.filter(
                project =>
                    project.userId === req.user.id
            );

        const languages = {};

        for (const file of userFiles) {
            languages[file.language] =
                (languages[file.language] || 0) + 1;
        }

        res.json({
            ok: true,
            summary: {
                totalFiles:
                    userFiles.length,
                totalProjects:
                    userProjects.length,
                languages,
                quota:
                    getUserFileQuota(
                        req.user.id
                    )
            }
        });
    }
);


/* ============================================================
   217 — AUTO BACKUP METADATA
   ============================================================ */

if (!db.projectBackups) {
    db.projectBackups = [];
}

function createProjectBackupMetadata(
    userId,
    projectId
) {
    const project =
        db.projects.find(
            item =>
                item.id === projectId &&
                item.userId === userId
        );

    if (!project) {
        return null;
    }

    const backup = {
        id: createId("backup"),
        userId,
        projectId,
        createdAt: isoNow(),
        status: "metadata-only",
        note:
            "Dosya yedekleme altyapısı hazır."
    };

    db.projectBackups.unshift(
        backup
    );

    db.projectBackups =
        db.projectBackups.slice(
            0,
            500
        );

    saveDB("project-backups");

    return backup;
}


/* ============================================================
   218 — BACKUP API
   ============================================================ */

app.post(
    "/api/projects/:id/backup",
    requireAuth,
    async (req, res) => {
        const backup =
            createProjectBackupMetadata(
                req.user.id,
                req.params.id
            );

        if (!backup) {
            return res.status(404).json({
                ok: false,
                error: "Proje bulunamadı."
            });
        }

        res.json({
            ok: true,
            backup
        });
    }
);


/* ============================================================
   219 — BACKUP LIST
   ============================================================ */

app.get(
    "/api/projects/:id/backups",
    requireAuth,
    async (req, res) => {
        const project =
            db.projects.find(
                item =>
                    item.id === req.params.id &&
                    item.userId === req.user.id
            );

        if (!project) {
            return res.status(404).json({
                ok: false,
                error: "Proje bulunamadı."
            });
        }

        const backups =
            db.projectBackups.filter(
                backup =>
                    backup.projectId === project.id &&
                    backup.userId === req.user.id
            );

        res.json({
            ok: true,
            backups
        });
    }
);


/* ============================================================
   220 — FINAL PART 3 MARKER
   ============================================================ */

console.log(
    "[TürkAI] Part 3 Research + File + Code Engine loaded."
);

/* ============================================================
   PART 3 / 5 SONU
   ============================================================ */
/* ============================================================
   TÜRKAI SERVER.JS — PART 4 / 5
   ADMIN CENTER + DENETÇİ + SYSTEM CONTROL
   ============================================================ */


/* ============================================================
   221 — ADMIN DATABASE STRUCTURES
   ============================================================ */

if (!db.adminLogs) {
    db.adminLogs = [];
}

if (!db.systemAnnouncements) {
    db.systemAnnouncements = [];
}

if (!db.systemEvents) {
    db.systemEvents = [];
}

if (!db.qualityReports) {
    db.qualityReports = [];
}

if (!db.securityEvents) {
    db.securityEvents = [];
}

if (!db.adminSettings) {
    db.adminSettings = {
        maintenanceMode: false,
        registrationEnabled: true,
        researchEnabled: true,
        fileEngineEnabled: true,
        memoryEnabled: true,
        feedbackEnabled: true,
        denetciEnabled: true,
        announcementsEnabled: true,
        maxLoginAttempts: 8,
        sessionHours: 24,
        updatedAt: isoNow()
    };
}


/* ============================================================
   222 — ADMIN ROLE CHECK
   ============================================================ */

function isAdminUser(user) {
    if (!user) {
        return false;
    }

    return (
        user.role === "admin" ||
        user.role === "developer" ||
        user.isAdmin === true
    );
}


/* ============================================================
   223 — ADMIN MIDDLEWARE
   ============================================================ */

function requireAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
            ok: false,
            error: "Oturum gerekli."
        });
    }

    if (!isAdminUser(req.user)) {
        securityEvent(
            req.user.id,
            "unauthorized_admin_access",
            {
                path: req.path,
                method: req.method
            }
        );

        return res.status(403).json({
            ok: false,
            error: "Admin yetkisi gerekli."
        });
    }

    next();
}


/* ============================================================
   224 — ADMIN LOG
   ============================================================ */

function adminLog(
    adminId,
    action,
    metadata = {}
) {
    const record = {
        id: createId("adminlog"),
        adminId,
        action,
        metadata,
        createdAt: isoNow()
    };

    db.adminLogs.unshift(record);

    db.adminLogs =
        db.adminLogs.slice(0, 10000);

    saveDB("admin-logs");

    return record;
}


/* ============================================================
   225 — ADMIN USER SANITIZER
   ============================================================ */

function adminUserView(user) {
    if (!user) {
        return null;
    }

    return {
        id: user.id,
        username: user.username,
        role: user.role || "user",
        plan: getPlan(user),
        disabled: Boolean(user.disabled),
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt || null,
        consentLogging:
            user.consentLogging === true,
        messageCount:
            db.messages.filter(
                message =>
                    message.userId === user.id
            ).length,
        chatCount:
            db.chats.filter(
                chat =>
                    chat.userId === user.id
            ).length,
        memoryCount:
            db.memories.filter(
                memory =>
                    memory.userId === user.id
            ).length,
        fileCount:
            db.files.filter(
                file =>
                    file.userId === user.id
            ).length
    };
}


/* ============================================================
   226 — ADMIN USER LIST
   ============================================================ */

app.get(
    "/api/admin/users",
    requireAuth,
    requireAdmin,
    async (req, res) => {
        const users =
            db.users.map(
                adminUserView
            );

        adminLog(
            req.user.id,
            "users_list"
        );

        res.json({
            ok: true,
            users
        });
    }
);


/* ============================================================
   227 — ADMIN USER DETAIL
   ============================================================ */

app.get(
    "/api/admin/users/:id",
    requireAuth,
    requireAdmin,
    async (req, res) => {
        const user =
            findUserById(
                req.params.id
            );

        if (!user) {
            return res.status(404).json({
                ok: false,
                error: "Kullanıcı bulunamadı."
            });
        }

        const result = {
            user: adminUserView(user),

            chats:
                db.chats.filter(
                    chat =>
                        chat.userId === user.id
                ).slice(0, 100),

            memories:
                db.memories.filter(
                    memory =>
                        memory.userId === user.id
                ).slice(0, 100),

            usage:
                db.usage.filter
                    ? db.usage.filter(
                        row =>
                            row.userId === user.id
                    ).slice(0, 100)
                    : [],

            feedback:
                db.feedback.filter(
                    item =>
                        item.userId === user.id
                ).slice(0, 100),

            files:
                db.files.filter(
                    file =>
                        file.userId === user.id
                ).slice(0, 100)
        };

        adminLog(
            req.user.id,
            "user_detail_view",
            {
                targetUserId: user.id
            }
        );

        res.json({
            ok: true,
            data: result
        });
    }
);


/* ============================================================
   228 — ADMIN USER UPDATE
   ============================================================ */

app.patch(
    "/api/admin/users/:id",
    requireAuth,
    requireAdmin,
    async (req, res) => {
        const user =
            findUserById(
                req.params.id
            );

        if (!user) {
            return res.status(404).json({
                ok: false,
                error: "Kullanıcı bulunamadı."
            });
        }

        if (
            req.body?.plan !== undefined
        ) {
            const allowedPlans = [
                "free",
                "pro",
                "plus",
                "ultra",
                "developer"
            ];

            if (
                allowedPlans.includes(
                    req.body.plan
                )
            ) {
                user.plan =
                    req.body.plan;
            }
        }

        if (
            req.body?.disabled !== undefined
        ) {
            user.disabled =
                Boolean(
                    req.body.disabled
                );
        }

        if (
            req.body?.role !== undefined
        ) {
            const allowedRoles = [
                "user",
                "admin",
                "developer"
            ];

            if (
                allowedRoles.includes(
                    req.body.role
                )
            ) {
                user.role =
                    req.body.role;
            }
        }

        user.updatedAt =
            isoNow();

        saveDB("users");

        adminLog(
            req.user.id,
            "user_updated",
            {
                targetUserId: user.id
            }
        );

        res.json({
            ok: true,
            user:
                adminUserView(user)
        });
    }
);


/* ============================================================
   229 — ADMIN DISABLE USER
   ============================================================ */

app.post(
    "/api/admin/users/:id/disable",
    requireAuth,
    requireAdmin,
    async (req, res) => {
        const user =
            findUserById(
                req.params.id
            );

        if (!user) {
            return res.status(404).json({
                ok: false,
                error: "Kullanıcı bulunamadı."
            });
        }

        user.disabled = true;
        user.disabledAt = isoNow();
        user.disabledBy =
            req.user.id;

        saveDB("users");

        securityEvent(
            req.user.id,
            "admin_disabled_user",
            {
                targetUserId: user.id
            }
        );

        res.json({
            ok: true,
            message:
                "Kullanıcı devre dışı bırakıldı."
        });
    }
);


/* ============================================================
   230 — ADMIN ENABLE USER
   ============================================================ */

app.post(
    "/api/admin/users/:id/enable",
    requireAuth,
    requireAdmin,
    async (req, res) => {
        const user =
            findUserById(
                req.params.id
            );

        if (!user) {
            return res.status(404).json({
                ok: false,
                error: "Kullanıcı bulunamadı."
            });
        }

        user.disabled = false;
        user.disabledAt = null;
        user.disabledBy = null;

        saveDB("users");

        adminLog(
            req.user.id,
            "user_enabled",
            {
                targetUserId: user.id
            }
        );

        res.json({
            ok: true,
            message:
                "Kullanıcının hesabı yeniden etkinleştirildi."
        });
    }
);


/* ============================================================
   231 — PLAN STATISTICS
   ============================================================ */

function calculatePlanStatistics() {
    const stats = {
        free: 0,
        pro: 0,
        plus: 0,
        ultra: 0,
        developer: 0
    };

    for (const user of db.users) {
        const plan =
            getPlan(user);

        if (
            Object.prototype.hasOwnProperty.call(
                stats,
                plan
            )
        ) {
            stats[plan]++;
        }
    }

    return stats;
}


/* ============================================================
   232 — PLAN STATISTICS API
   ============================================================ */

app.get(
    "/api/admin/plans",
    requireAuth,
    requireAdmin,
    async (req, res) => {
        const stats =
            calculatePlanStatistics();

        const prices = {
            free: 0,
            pro: 250,
            plus: 500,
            ultra: 6000,
            developer: 0
        };

        let monthlyRevenue = 0;

        for (const [plan, count] of Object.entries(stats)) {
            monthlyRevenue +=
                Number(prices[plan] || 0) *
                count;
        }

        res.json({
            ok: true,
            plans: stats,
            prices,
            estimatedMonthlyRevenue:
                monthlyRevenue
        });
    }
);


/* ============================================================
   233 — TOTAL MESSAGE STATISTICS
   ============================================================ */

function calculateMessageStatistics() {
    const total =
        db.messages.length;

    let userMessages = 0;
    let assistantMessages = 0;

    for (const message of db.messages) {
        if (message.role === "user") {
            userMessages++;
        }

        if (message.role === "assistant") {
            assistantMessages++;
        }
    }

    return {
        total,
        userMessages,
        assistantMessages
    };
}


/* ============================================================
   234 — MODEL USAGE STATISTICS
   ============================================================ */

function calculateModelStatistics() {
    const stats = {};

    for (const message of db.messages) {
        if (
            message.role !== "assistant"
        ) {
            continue;
        }

        const model =
            message.model ||
            "unknown";

        if (!stats[model]) {
            stats[model] = {
                count: 0,
                errors: 0,
                averageResponseTime: 0,
                responseTimes: []
            };
        }

        stats[model].count++;

        if (message.error) {
            stats[model].errors++;
        }

        if (
            Number.isFinite(
                Number(
                    message.responseTime
                )
            )
        ) {
            stats[model]
                .responseTimes
                .push(
                    Number(
                        message.responseTime
                    )
                );
        }
    }

    for (const model of Object.keys(stats)) {
        const times =
            stats[model].responseTimes;

        stats[model].averageResponseTime =
            times.length
                ? Math.round(
                    times.reduce(
                        (a, b) =>
                            a + b,
                        0
                    ) /
                    times.length
                )
                : 0;

        delete stats[model].responseTimes;
    }

    return stats;
}


/* ============================================================
   235 — FEATURE USAGE STATISTICS
   ============================================================ */

function calculateFeatureStatistics() {
    const features = {};

    function add(name) {
        features[name] =
            (features[name] || 0) + 1;
    }

    for (const message of db.messages) {
        if (message.researchUsed) {
            add("research");
        }

        if (message.memoryUsed) {
            add("memory");
        }

        if (message.fusion) {
            add("fusion");
        }

        if (message.fileUsed) {
            add("files");
        }

        if (message.codeUsed) {
            add("coding");
        }

        if (message.imageUsed) {
            add("image");
        }
    }

    return features;
}


/* ============================================================
   236 — ADMIN USAGE SUMMARY
   ============================================================ */

app.get(
    "/api/admin/usage",
    requireAuth,
    requireAdmin,
    async (req, res) => {
        const messageStats =
            calculateMessageStatistics();

        const modelStats =
            calculateModelStatistics();

        const featureStats =
            calculateFeatureStatistics();

        const users =
            db.users.length;

        res.json({
            ok: true,
            users,
            messages:
                messageStats,
            models:
                modelStats,
            features:
                featureStats
        });
    }
);


/* ============================================================
   237 — DAILY ACTIVITY GENERATOR
   ============================================================ */

function getDailyActivity(days = 30) {
    const result = [];

    const count =
        Math.max(
            1,
            Math.min(
                Number(days) || 30,
                90
            )
        );

    for (
        let offset = count - 1;
        offset >= 0;
        offset--
    ) {
        const date =
            new Date(
                Date.now() -
                offset * 86400000
            );

        const key =
            date
                .toISOString()
                .slice(0, 10);

        const messages =
            db.messages.filter(
                message =>
                    String(
                        message.createdAt || ""
                    ).slice(0, 10) === key
            ).length;

        const users =
            new Set(
                db.messages
                    .filter(
                        message =>
                            String(
                                message.createdAt || ""
                            ).slice(0, 10) === key
                    )
                    .map(
                        message =>
                            message.userId
                    )
            ).size;

        result.push({
            date: key,
            messages,
            activeUsers: users
        });
    }

    return result;
}


/* ============================================================
   238 — DAILY ACTIVITY API
   ============================================================ */

app.get(
    "/api/admin/activity",
    requireAuth,
    requireAdmin,
    async (req, res) => {
        const days =
            Number(req.query?.days || 30);

        res.json({
            ok: true,
            activity:
                getDailyActivity(days)
        });
    }
);


/* ============================================================
   239 — ADMIN FEEDBACK STATISTICS
   ============================================================ */

function calculateFeedbackStatistics() {
    const stats = {
        total: 0,
        helpful: 0,
        notHelpful: 0,
        reasons: {}
    };

    for (const item of db.feedback) {
        stats.total++;

        if (item.type === "helpful") {
            stats.helpful++;
        }

        if (item.type === "not_helpful") {
            stats.notHelpful++;
        }

        if (item.reason) {
            stats.reasons[item.reason] =
                (stats.reasons[item.reason] || 0) + 1;
        }
    }

    return stats;
}


/* ============================================================
   240 — FEEDBACK API
   ============================================================ */

app.get(
    "/api/admin/feedback",
    requireAuth,
    requireAdmin,
    async (req, res) => {
        res.json({
            ok: true,
            statistics:
                calculateFeedbackStatistics(),
            feedback:
                db.feedback
                    .slice(0, 500)
        });
    }
);


/* ============================================================
   241 — QUALITY EVENT CREATOR
   ============================================================ */

function createQualityReport({
    userId,
    messageId,
    category,
    severity,
    reason,
    metadata = {}
}) {
    const report = {
        id: createId("quality"),
        userId,
        messageId,
        category,
        severity,
        reason,
        metadata,
        status: "open",
        createdAt: isoNow()
    };

    db.qualityReports.unshift(report);

    db.qualityReports =
        db.qualityReports.slice(
            0,
            10000
        );

    saveDB("quality-reports");

    return report;
}


/* ============================================================
   242 — DENETÇİ TEXT ANALYZER
   ============================================================ */

function analyzeInteractionForQuality(
    userMessage,
    assistantMessage
) {
    const findings = [];

    const userText =
        String(
            userMessage || ""
        );

    const answer =
        String(
            assistantMessage || ""
        );

    if (!answer.trim()) {
        findings.push({
            category: "technical_error",
            severity: "high",
            reason:
                "AI cevabı boş."
        });
    }

    if (
        answer.length >
        30000
    ) {
        findings.push({
            category: "too_long",
            severity: "medium",
            reason:
                "Yanıt olağan dışı uzun."
        });
    }

    if (
        userText.length > 0 &&
        answer.length < 10
    ) {
        findings.push({
            category: "too_short",
            severity: "medium",
            reason:
                "Yanıt soruya göre çok kısa olabilir."
        });
    }

    const currentPatterns = [
        "bugün",
        "şu an",
        "güncel",
        "son dakika",
        "en son",
        "2026",
        "fiyatı",
        "hava durumu"
    ];

    const researchNeeded =
        currentPatterns.some(
            pattern =>
                userText
                    .toLowerCase()
                    .includes(pattern)
        );

    if (
        researchNeeded &&
        !answer.includes("kaynak") &&
        !answer.includes("source")
    ) {
        findings.push({
            category: "research_needed",
            severity: "medium",
            reason:
                "Güncel bilgi gerektiren bir soru araştırmasız yanıtlanmış olabilir."
        });
    }

    const suspiciousMemoryPatterns = [
        "şifre",
        "parola",
        "kart numarası",
        "tc kimlik",
        "kimlik numarası"
    ];

    if (
        suspiciousMemoryPatterns.some(
            pattern =>
                userText
                    .toLowerCase()
                    .includes(pattern)
        )
    ) {
        findings.push({
            category: "sensitive_memory",
            severity: "high",
            reason:
                "Hassas bilgi içerebilecek bir bellek işlemi tespit edildi."
        });
    }

    return findings;
}


/* ============================================================
   243 — DENETÇİ INTERACTION SCANNER
   ============================================================ */

function scanRecentInteractions(limit = 100) {
    const messages =
        db.messages
            .filter(
                message =>
                    message.role === "assistant"
            )
            .slice(0, limit);

    const reports = [];

    for (const assistant of messages) {
        const userMessage =
            db.messages.find(
                message =>
                    message.chatId === assistant.chatId &&
                    message.role === "user" &&
                    new Date(
                        message.createdAt || 0
                    ).getTime() <
                    new Date(
                        assistant.createdAt || 0
                    ).getTime()
            );

        const findings =
            analyzeInteractionForQuality(
                userMessage?.content || "",
                assistant.content || ""
            );

        for (const finding of findings) {
            reports.push(
                createQualityReport({
                    userId:
                        assistant.userId,
                    messageId:
                        assistant.id,
                    category:
                        finding.category,
                    severity:
                        finding.severity,
                    reason:
                        finding.reason,
                    metadata: {
                        model:
                            assistant.model ||
                            null,
                        researchUsed:
                            Boolean(
                                assistant.researchUsed
                            ),
                        responseTime:
                            assistant.responseTime ||
                            null
                    }
                })
            );
        }
    }

    return reports;
}


/* ============================================================
   244 — DENETÇİ RUN API
   ============================================================ */

app.post(
    "/api/admin/denetci/run",
    requireAuth,
    requireAdmin,
    async (req, res) => {
        if (
            db.adminSettings.denetciEnabled === false
        ) {
            return res.status(403).json({
                ok: false,
                error:
                    "TürkAI Denetçi kapalı."
            });
        }

        const limit =
            Math.max(
                1,
                Math.min(
                    Number(
                        req.body?.limit || 100
                    ),
                    500
                )
            );

        const reports =
            scanRecentInteractions(
                limit
            );

        adminLog(
            req.user.id,
            "denetci_run",
            {
                scanned: limit,
                reports: reports.length
            }
        );

        res.json({
            ok: true,
            scanned: limit,
            reportsCreated:
                reports.length,
            reports
        });
    }
);


/* ============================================================
   245 — QUALITY REPORTS API
   ============================================================ */

app.get(
    "/api/admin/quality/reports",
    requireAuth,
    requireAdmin,
    async (req, res) => {
        const status =
            safeText(
                req.query?.status,
                50
            );

        let reports =
            db.qualityReports;

        if (status) {
            reports =
                reports.filter(
                    report =>
                        report.status === status
                );
        }

        res.json({
            ok: true,
            reports:
                reports.slice(0, 1000)
        });
    }
);


/* ============================================================
   246 — QUALITY REPORT REVIEW
   ============================================================ */

app.patch(
    "/api/admin/quality/reports/:id",
    requireAuth,
    requireAdmin,
    async (req, res) => {
        const report =
            db.qualityReports.find(
                item =>
                    item.id === req.params.id
            );

        if (!report) {
            return res.status(404).json({
                ok: false,
                error:
                    "Kalite raporu bulunamadı."
            });
        }

        const allowedStatuses = [
            "open",
            "reviewing",
            "resolved",
            "ignored"
        ];

        if (
            req.body?.status &&
            allowedStatuses.includes(
                req.body.status
            )
        ) {
            report.status =
                req.body.status;
        }

        report.reviewedBy =
            req.user.id;

        report.reviewedAt =
            isoNow();

        if (
            req.body?.note !== undefined
        ) {
            report.reviewNote =
                safeText(
                    req.body.note,
                    2000
                );
        }

        saveDB("quality-reports");

        res.json({
            ok: true,
            report
        });
    }
);


/* ============================================================
   247 — CORRECTION QUEUE ADMIN
   ============================================================ */

if (!db.correctionsQueue) {
    db.correctionsQueue = [];
}


/* ============================================================
   248 — CORRECTION QUEUE LIST
   ============================================================ */

app.get(
    "/api/admin/corrections",
    requireAuth,
    requireAdmin,
    async (req, res) => {
        res.json({
            ok: true,
            corrections:
                db.correctionsQueue
                    .slice(0, 1000)
        });
    }
);


/* ============================================================
   249 — CORRECTION REVIEW
   ============================================================ */

app.post(
    "/api/admin/corrections/:id/review",
    requireAuth,
    requireAdmin,
    async (req, res) => {
        const correction =
            db.correctionsQueue.find(
                item =>
                    item.id === req.params.id
            );

        if (!correction) {
            return res.status(404).json({
                ok: false,
                error:
                    "Düzeltme bulunamadı."
            });
        }

        const decision =
            safeText(
                req.body?.decision,
                30
            ).toLowerCase();

        if (
            ![
                "approve",
                "reject"
            ].includes(decision)
        ) {
            return res.status(400).json({
                ok: false,
                error:
                    "Karar approve veya reject olmalı."
            });
        }

        correction.status =
            decision === "approve"
                ? "approved"
                : "rejected";

        correction.reviewedBy =
            req.user.id;

        correction.reviewedAt =
            isoNow();

        correction.reviewNote =
            safeText(
                req.body?.note,
                2000
            );

        if (
            decision === "approve"
        ) {
            const question =
                safeText(
                    correction.question,
                    1000
                );

            const answer =
                safeText(
                    correction.correctedAnswer,
                    12000
                );

            if (question && answer) {
                const knowledge =
                    addKnowledge(
                        question,
                        answer,
                        "user-correction",
                        {
                            approvedBy:
                                req.user.id,
                            correctionId:
                                correction.id,
                            pendingApproval:
                                false
                        }
                    );

                correction.knowledgeId =
                    knowledge?.id || null;
            }
        }

        saveDB("corrections");

        adminLog(
            req.user.id,
            "correction_reviewed",
            {
                correctionId:
                    correction.id,
                decision
            }
        );

        res.json({
            ok: true,
            correction
        });
    }
);


/* ============================================================
   250 — KNOWLEDGE ADMIN LIST
   ============================================================ */

app.get(
    "/api/admin/knowledge",
    requireAuth,
    requireAdmin,
    async (req, res) => {
        const query =
            safeText(
                req.query?.q,
                300
            ).toLowerCase();

        let items =
            db.knowledge || [];

        if (query) {
            items =
                items.filter(
                    item =>
                        String(
                            item.question || ""
                        )
                            .toLowerCase()
                            .includes(query) ||
                        String(
                            item.answer || ""
                        )
                            .toLowerCase()
                            .includes(query)
                );
        }

        res.json({
            ok: true,
            knowledge:
                items.slice(0, 1000)
        });
    }
);


/* ============================================================
   251 — KNOWLEDGE ADMIN UPDATE
   ============================================================ */

app.patch(
    "/api/admin/knowledge/:id",
    requireAuth,
    requireAdmin,
    async (req, res) => {
        const item =
            (db.knowledge || [])
                .find(
                    entry =>
                        entry.id === req.params.id
                );

        if (!item) {
            return res.status(404).json({
                ok: false,
                error:
                    "Knowledge kaydı bulunamadı."
            });
        }

        if (
            req.body?.question !== undefined
        ) {
            item.question =
                safeText(
                    req.body.question,
                    1000
                );
        }

        if (
            req.body?.answer !== undefined
        ) {
            item.answer =
                safeText(
                    req.body.answer,
                    12000
                );
        }

        if (
            req.body?.approved !== undefined
        ) {
            item.approved =
                Boolean(
                    req.body.approved
                );
        }

        item.updatedAt =
            isoNow();

        saveDB("knowledge");

        res.json({
            ok: true,
            item
        });
    }
);


/* ============================================================
   252 — KNOWLEDGE DELETE
   ============================================================ */

app.delete(
    "/api/admin/knowledge/:id",
    requireAuth,
    requireAdmin,
    async (req, res) => {
        const index =
            (db.knowledge || [])
                .findIndex(
                    item =>
                        item.id === req.params.id
                );

        if (index === -1) {
            return res.status(404).json({
                ok: false,
                error:
                    "Knowledge kaydı bulunamadı."
            });
        }

        const removed =
            db.knowledge.splice(
                index,
                1
            )[0];

        saveDB("knowledge");

        adminLog(
            req.user.id,
            "knowledge_deleted",
            {
                knowledgeId:
                    removed.id
            }
        );

        res.json({
            ok: true,
            message:
                "Knowledge kaydı silindi."
        });
    }
);


/* ============================================================
   253 — MEMORY ADMIN OVERVIEW
   ============================================================ */

app.get(
    "/api/admin/memory",
    requireAuth,
    requireAdmin,
    async (req, res) => {
        const memories =
            db.memories || [];

        const usersWithMemory =
            new Set(
                memories.map(
                    memory =>
                        memory.userId
                )
            ).size;

        res.json({
            ok: true,
            statistics: {
                total:
                    memories.length,
                usersWithMemory,
                enabled:
                    db.settings?.memoryEnabled !== false
            },
            recent:
                memories.slice(0, 500)
        });
    }
);


/* ============================================================
   254 — ADMIN FILE OVERVIEW
   ============================================================ */

app.get(
    "/api/admin/files",
    requireAuth,
    requireAdmin,
    async (req, res) => {
        const total =
            db.files.length;

        const totalBytes =
            db.files.reduce(
                (sum, file) =>
                    sum +
                    Number(
                        file.size || 0
                    ),
                0
            );

        const projects =
            db.projects.length;

        res.json({
            ok: true,
            statistics: {
                totalFiles: total,
                totalBytes,
                totalProjects: projects
            },
            recent:
                db.files.slice(0, 500)
        });
    }
);


/* ============================================================
   255 — SYSTEM EVENT
   ============================================================ */

function createSystemEvent(
    type,
    message,
    metadata = {}
) {
    const event = {
        id: createId("system"),
        type,
        message,
        metadata,
        createdAt: isoNow()
    };

    db.systemEvents.unshift(event);

    db.systemEvents =
        db.systemEvents.slice(
            0,
            10000
        );

    saveDB("system-events");

    return event;
}


/* ============================================================
   256 — ANNOUNCEMENT CREATE
   ============================================================ */

app.post(
    "/api/admin/announcements",
    requireAuth,
    requireAdmin,
    async (req, res) => {
        if (
            db.adminSettings
                .announcementsEnabled === false
        ) {
            return res.status(403).json({
                ok: false,
                error:
                    "Duyuru sistemi kapalı."
            });
        }

        const title =
            safeText(
                req.body?.title,
                200
            );

        const content =
            safeText(
                req.body?.content,
                5000
            );

        if (!title || !content) {
            return res.status(400).json({
                ok: false,
                error:
                    "Başlık ve içerik gerekli."
            });
        }

        const announcement = {
            id: createId("announcement"),
            title,
            content,
            priority:
                safeText(
                    req.body?.priority ||
                    "normal",
                    30
                ),
            active: true,
            createdBy:
                req.user.id,
            createdAt: isoNow()
        };

        db.systemAnnouncements.unshift(
            announcement
        );

        db.systemAnnouncements =
            db.systemAnnouncements.slice(
                0,
                500
            );

        saveDB("announcements");

        createSystemEvent(
            "announcement",
            title,
            {
                announcementId:
                    announcement.id
            }
        );

        res.json({
            ok: true,
            announcement
        });
    }
);


/* ============================================================
   257 — ANNOUNCEMENT LIST
   ============================================================ */

app.get(
    "/api/admin/announcements",
    requireAuth,
    requireAdmin,
    async (req, res) => {
        res.json({
            ok: true,
            announcements:
                db.systemAnnouncements
        });
    }
);


/* ============================================================
   258 — ANNOUNCEMENT DELETE
   ============================================================ */

app.delete(
    "/api/admin/announcements/:id",
    requireAuth,
    requireAdmin,
    async (req, res) => {
        const index =
            db.systemAnnouncements.findIndex(
                item =>
                    item.id === req.params.id
            );

        if (index === -1) {
            return res.status(404).json({
                ok: false,
                error:
                    "Duyuru bulunamadı."
            });
        }

        db.systemAnnouncements.splice(
            index,
            1
        );

        saveDB("announcements");

        res.json({
            ok: true
        });
    }
);


/* ============================================================
   259 — SYSTEM SETTINGS API
   ============================================================ */

app.get(
    "/api/admin/settings",
    requireAuth,
    requireAdmin,
    async (req, res) => {
        res.json({
            ok: true,
            settings:
                db.adminSettings
        });
    }
);


/* ============================================================
   260 — SYSTEM SETTINGS UPDATE
   ============================================================ */

app.patch(
    "/api/admin/settings",
    requireAuth,
    requireAdmin,
    async (req, res) => {
        const booleanFields = [
            "maintenanceMode",
            "registrationEnabled",
            "researchEnabled",
            "fileEngineEnabled",
            "memoryEnabled",
            "feedbackEnabled",
            "denetciEnabled",
            "announcementsEnabled"
        ];

        for (const field of booleanFields) {
            if (
                req.body?.[field] !== undefined
            ) {
                db.adminSettings[field] =
                    Boolean(
                        req.body[field]
                    );
            }
        }

        if (
            req.body?.maxLoginAttempts !== undefined
        ) {
            db.adminSettings.maxLoginAttempts =
                Math.max(
                    3,
                    Math.min(
                        30,
                        Number(
                            req.body.maxLoginAttempts
                        ) || 8
                    )
                );
        }

        if (
            req.body?.sessionHours !== undefined
        ) {
            db.adminSettings.sessionHours =
                Math.max(
                    1,
                    Math.min(
                        720,
                        Number(
                            req.body.sessionHours
                        ) || 24
                    )
                );
        }

        db.adminSettings.updatedAt =
            isoNow();

        saveDB("admin-settings");

        adminLog(
            req.user.id,
            "settings_updated"
        );

        res.json({
            ok: true,
            settings:
                db.adminSettings
        });
    }
);


/* ============================================================
   261 — SECURITY EVENT LIST
   ============================================================ */

app.get(
    "/api/admin/security/events",
    requireAuth,
    requireAdmin,
    async (req, res) => {
        res.json({
            ok: true,
            events:
                db.securityEvents
                    .slice(0, 1000)
        });
    }
);


/* ============================================================
   262 — SECURITY SUMMARY
   ============================================================ */

function calculateSecuritySummary() {
    const summary = {
        total: db.securityEvents.length,
        high: 0,
        medium: 0,
        low: 0,
        recent: 0
    };

    const recentLimit =
        Date.now() -
        24 * 60 * 60 * 1000;

    for (const event of db.securityEvents) {
        const severity =
            event.severity ||
            "low";

        if (
            Object.prototype.hasOwnProperty.call(
                summary,
                severity
            )
        ) {
            summary[severity]++;
        }

        if (
            new Date(
                event.createdAt || 0
            ).getTime() >= recentLimit
        ) {
            summary.recent++;
        }
    }

    return summary;
}


/* ============================================================
   263 — SECURITY SUMMARY API
   ============================================================ */

app.get(
    "/api/admin/security/summary",
    requireAuth,
    requireAdmin,
    async (req, res) => {
        res.json({
            ok: true,
            summary:
                calculateSecuritySummary()
        });
    }
);


/* ============================================================
   264 — SYSTEM HEALTH
   ============================================================ */

function getSystemHealth() {
    const memory =
        process.memoryUsage();

    return {
        status: "operational",
        uptime:
            Math.round(
                process.uptime()
            ),
        node:
            process.version,
        platform:
            process.platform,
        architecture:
            process.arch,
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
        database: {
            users:
                db.users.length,
            messages:
                db.messages.length,
            chats:
                db.chats.length,
            memories:
                db.memories.length,
            files:
                db.files.length,
            projects:
                db.projects.length,
            knowledge:
                db.knowledge.length
        }
    };
}


/* ============================================================
   265 — SYSTEM HEALTH API
   ============================================================ */

app.get(
    "/api/admin/system/health",
    requireAuth,
    requireAdmin,
    async (req, res) => {
        res.json({
            ok: true,
            health:
                getSystemHealth()
        });
    }
);


/* ============================================================
   266 — DATABASE COUNTERS
   ============================================================ */

function getDatabaseCounters() {
    const counters = {};

    for (const key of Object.keys(db)) {
        const value = db[key];

        if (Array.isArray(value)) {
            counters[key] =
                value.length;
        } else if (
            value &&
            typeof value === "object"
        ) {
            counters[key] =
                Object.keys(value).length;
        } else {
            counters[key] = 1;
        }
    }

    return counters;
}


/* ============================================================
   267 — DATABASE COUNTERS API
   ============================================================ */

app.get(
    "/api/admin/system/database",
    requireAuth,
    requireAdmin,
    async (req, res) => {
        res.json({
            ok: true,
            counters:
                getDatabaseCounters()
        });
    }
);


/* ============================================================
   268 — ADMIN AUDIT LOG
   ============================================================ */

app.get(
    "/api/admin/logs",
    requireAuth,
    requireAdmin,
    async (req, res) => {
        res.json({
            ok: true,
            logs:
                db.adminLogs
                    .slice(0, 2000)
        });
    }
);


/* ============================================================
   269 — ADMIN SYSTEM EVENTS
   ============================================================ */

app.get(
    "/api/admin/system/events",
    requireAuth,
    requireAdmin,
    async (req, res) => {
        res.json({
            ok: true,
            events:
                db.systemEvents
                    .slice(0, 1000)
        });
    }
);


/* ============================================================
   270 — ADMIN DASHBOARD SUMMARY
   ============================================================ */

function buildAdminDashboardSummary() {
    const totalUsers =
        db.users.length;

    const disabledUsers =
        db.users.filter(
            user =>
                user.disabled === true
        ).length;

    const plans =
        calculatePlanStatistics();

    const messages =
        calculateMessageStatistics();

    const modelStats =
        calculateModelStatistics();

    const features =
        calculateFeatureStatistics();

    const feedback =
        calculateFeedbackStatistics();

    const openQualityReports =
        db.qualityReports.filter(
            report =>
                report.status === "open"
        ).length;

    const pendingCorrections =
        db.correctionsQueue.filter(
            item =>
                item.status === "pending"
        ).length;

    const recentErrors =
        db.messages.filter(
            message => {
                if (!message.error) {
                    return false;
                }

                const time =
                    new Date(
                        message.createdAt || 0
                    ).getTime();

                return (
                    time >=
                    Date.now() -
                    24 * 60 * 60 * 1000
                );
            }
        ).length;

    const totalStorage =
        db.files.reduce(
            (sum, file) =>
                sum +
                Number(
                    file.size || 0
                ),
            0
        );

    return {
        generatedAt: isoNow(),

        users: {
            total: totalUsers,
            disabled: disabledUsers,
            active:
                Math.max(
                    0,
                    totalUsers -
                    disabledUsers
                )
        },

        plans,

        messages,

        chats: {
            total:
                db.chats.length
        },

        memory: {
            total:
                db.memories.length
        },

        files: {
            total:
                db.files.length,
            storageBytes:
                totalStorage,
            projects:
                db.projects.length
        },

        knowledge: {
            total:
                db.knowledge.length
        },

        quality: {
            openReports:
                openQualityReports,
            pendingCorrections:
                pendingCorrections,
            feedbackTotal:
                feedback.total,
            helpful:
                feedback.helpful,
            notHelpful:
                feedback.notHelpful
        },

        errors: {
            last24Hours:
                recentErrors
        },

        security:
            calculateSecuritySummary(),

        models:
            modelStats,

        features,

        system:
            getSystemHealth()
    };
}


/* ============================================================
   271 — ADMIN DASHBOARD SUMMARY API
   ============================================================ */

app.get(
    "/api/admin/dashboard-summary",
    requireAuth,
    requireAdmin,
    async (req, res) => {
        const summary =
            buildAdminDashboardSummary();

        adminLog(
            req.user.id,
            "dashboard_summary_view"
        );

        res.json({
            ok: true,
            summary
        });
    }
);


/* ============================================================
   272 — ADMIN DASHBOARD LIVE SUMMARY
   ============================================================ */

app.get(
    "/api/admin/dashboard/live",
    requireAuth,
    requireAdmin,
    async (req, res) => {
        const summary =
            buildAdminDashboardSummary();

        res.json({
            ok: true,
            timestamp:
                Date.now(),
            summary
        });
    }
);


/* ============================================================
   273 — ADMIN MESSAGE QUALITY VIEW
   ============================================================ */

app.get(
    "/api/admin/quality/messages",
    requireAuth,
    requireAdmin,
    async (req, res) => {
        const messages =
            db.messages
                .filter(
                    message =>
                        message.role === "assistant"
                )
                .slice(0, 500);

        const result = [];

        for (const assistant of messages) {
            const user =
                db.users.find(
                    item =>
                        item.id ===
                        assistant.userId
                );

            /*
             * Sadece açık rıza veren kullanıcıların
             * tam mesaj içeriği admin kalite paneline
             * aktarılır.
             */

            if (
                user?.consentLogging !== true
            ) {
                continue;
            }

            const previousUser =
                db.messages.find(
                    message =>
                        message.chatId ===
                            assistant.chatId &&
                        message.role ===
                            "user" &&
                        new Date(
                            message.createdAt || 0
                        ).getTime() <
                            new Date(
                                assistant.createdAt || 0
                            ).getTime()
                );

            result.push({
                messageId:
                    assistant.id,

                userId:
                    assistant.userId,

                username:
                    user.username,

                userMessage:
                    previousUser?.content ||
                    "",

                assistantMessage:
                    assistant.content ||
                    "",

                model:
                    assistant.model ||
                    null,

                responseTime:
                    assistant.responseTime ||
                    null,

                researchUsed:
                    Boolean(
                        assistant.researchUsed
                    ),

                fusion:
                    assistant.fusion ||
                    null,

                createdAt:
                    assistant.createdAt
            });
        }

        res.json({
            ok: true,
            consentRequired: true,
            messages: result
        });
    }
);


/* ============================================================
   274 — ADMIN USER CONSENT STATISTICS
   ============================================================ */

app.get(
    "/api/admin/quality/consent",
    requireAuth,
    requireAdmin,
    async (req, res) => {
        const total =
            db.users.length;

        const consented =
            db.users.filter(
                user =>
                    user.consentLogging === true
            ).length;

        res.json({
            ok: true,
            totalUsers: total,
            consentedUsers: consented,
            nonConsentedUsers:
                Math.max(
                    0,
                    total -
                    consented
                )
        });
    }
);


/* ============================================================
   275 — ADMIN MODEL QUALITY
   ============================================================ */

app.get(
    "/api/admin/models/quality",
    requireAuth,
    requireAdmin,
    async (req, res) => {
        const stats =
            calculateModelStatistics();

        const result =
            Object.entries(stats)
                .map(
                    ([model, value]) => ({
                        model,
                        count:
                            value.count,
                        errors:
                            value.errors,
                        averageResponseTime:
                            value.averageResponseTime
                    })
                );

        res.json({
            ok: true,
            models: result
        });
    }
);


/* ============================================================
   276 — ADMIN RESEARCH STATISTICS
   ============================================================ */

app.get(
    "/api/admin/research",
    requireAuth,
    requireAdmin,
    async (req, res) => {
        const history =
            db.researchHistory || [];

        const officialQueries =
            history.filter(
                item =>
                    item.officialOnly === true
            ).length;

        res.json({
            ok: true,
            statistics: {
                totalResearch:
                    history.length,

                officialOnly:
                    officialQueries,

                cacheEntries:
                    Object.keys(
                        db.researchCache || {}
                    ).length,

                sourceRecords:
                    db.researchSources.length
            },

            recent:
                history.slice(0, 500)
        });
    }
);


/* ============================================================
   277 — ADMIN FUSION STATISTICS
   ============================================================ */

function calculateFusionStatistics() {
    let total = 0;
    let multiModel = 0;

    const profiles = {};

    for (const message of db.messages) {
        if (
            message.role !== "assistant" ||
            !message.fusion
        ) {
            continue;
        }

        total++;

        const fusion =
            message.fusion;

        const used =
            Array.isArray(
                fusion.usedModels
            )
                ? fusion.usedModels
                : [];

        if (used.length > 1) {
            multiModel++;
        }

        for (const model of used) {
            profiles[model] =
                (profiles[model] || 0) + 1;
        }
    }

    return {
        total,
        multiModel,
        profiles
    };
}


/* ============================================================
   278 — ADMIN FUSION API
   ============================================================ */

app.get(
    "/api/admin/fusion",
    requireAuth,
    requireAdmin,
    async (req, res) => {
        res.json({
            ok: true,
            statistics:
                calculateFusionStatistics()
        });
    }
);


/* ============================================================
   279 — ADMIN MEMORY QUALITY
   ============================================================ */

app.get(
    "/api/admin/memory/quality",
    requireAuth,
    requireAdmin,
    async (req, res) => {
        const memories =
            db.memories || [];

        const suspicious =
            memories.filter(
                memory => {
                    const text =
                        String(
                            memory.content ||
                            memory.value ||
                            ""
                        ).toLowerCase();

                    return [
                        "şifre",
                        "parola",
                        "kart",
                        "tc",
                        "kimlik"
                    ].some(
                        term =>
                            text.includes(term)
                    );
                }
            );

        res.json({
            ok: true,
            total:
                memories.length,
            suspicious:
                suspicious.length,
            items:
                suspicious.slice(0, 200)
        });
    }
);


/* ============================================================
   280 — ADMIN FILE QUALITY
   ============================================================ */

app.get(
    "/api/admin/files/quality",
    requireAuth,
    requireAdmin,
    async (req, res) => {
        const files =
            db.files || [];

        const byLanguage = {};

        for (const file of files) {
            byLanguage[file.language] =
                (byLanguage[file.language] || 0) + 1;
        }

        const largeFiles =
            files
                .filter(
                    file =>
                        Number(file.size || 0) >
                        1024 * 1024
                )
                .sort(
                    (a, b) =>
                        Number(b.size || 0) -
                        Number(a.size || 0)
                )
                .slice(0, 100);

        res.json({
            ok: true,
            statistics: {
                total:
                    files.length,
                byLanguage
            },
            largeFiles
        });
    }
);


/* ============================================================
   281 — ADMIN ERROR CENTER
   ============================================================ */

function getAdminErrorCenter() {
    const errors =
        db.messages
            .filter(
                message =>
                    Boolean(message.error)
            )
            .slice(0, 500);

    const grouped = {};

    for (const error of errors) {
        const key =
            safeText(
                error.error,
                300
            ) || "unknown";

        grouped[key] =
            (grouped[key] || 0) + 1;
    }

    return {
        total:
            errors.length,
        grouped,
        recent:
            errors.slice(0, 100)
    };
}


/* ============================================================
   282 — ADMIN ERROR CENTER API
   ============================================================ */

app.get(
    "/api/admin/errors",
    requireAuth,
    requireAdmin,
    async (req, res) => {
        res.json({
            ok: true,
            errors:
                getAdminErrorCenter()
        });
    }
);


/* ============================================================
   283 — ADMIN ANNOUNCEMENT PUBLIC API
   ============================================================ */

app.get(
    "/api/announcements",
    requireAuth,
    async (req, res) => {
        if (
            db.adminSettings
                .announcementsEnabled === false
        ) {
            return res.json({
                ok: true,
                announcements: []
            });
        }

        const active =
            db.systemAnnouncements.filter(
                item =>
                    item.active !== false
            );

        res.json({
            ok: true,
            announcements:
                active.slice(0, 20)
        });
    }
);


/* ============================================================
   284 — ADMIN PLAN CHANGE HISTORY
   ============================================================ */

if (!db.planHistory) {
    db.planHistory = [];
}

function recordPlanChange(
    adminId,
    userId,
    oldPlan,
    newPlan
) {
    db.planHistory.unshift({
        id: createId("planchange"),
        adminId,
        userId,
        oldPlan,
        newPlan,
        createdAt: isoNow()
    });

    db.planHistory =
        db.planHistory.slice(
            0,
            5000
        );

    saveDB("plan-history");
}


/* ============================================================
   285 — PLAN CHANGE API
   ============================================================ */

app.post(
    "/api/admin/users/:id/plan",
    requireAuth,
    requireAdmin,
    async (req, res) => {
        const user =
            findUserById(
                req.params.id
            );

        if (!user) {
            return res.status(404).json({
                ok: false,
                error:
                    "Kullanıcı bulunamadı."
            });
        }

        const allowed = [
            "free",
            "pro",
            "plus",
            "ultra",
            "developer"
        ];

        const newPlan =
            safeText(
                req.body?.plan,
                30
            ).toLowerCase();

        if (
            !allowed.includes(
                newPlan
            )
        ) {
            return res.status(400).json({
                ok: false,
                error:
                    "Geçersiz plan."
            });
        }

        const oldPlan =
            getPlan(user);

        user.plan =
            newPlan;

        user.updatedAt =
            isoNow();

        saveDB("users");

        recordPlanChange(
            req.user.id,
            user.id,
            oldPlan,
            newPlan
        );

        adminLog(
            req.user.id,
            "plan_changed",
            {
                userId:
                    user.id,
                oldPlan,
                newPlan
            }
        );

        res.json({
            ok: true,
            oldPlan,
            newPlan,
            user:
                adminUserView(user)
        });
    }
);


/* ============================================================
   286 — PLAN HISTORY API
   ============================================================ */

app.get(
    "/api/admin/plan-history",
    requireAuth,
    requireAdmin,
    async (req, res) => {
        res.json({
            ok: true,
            history:
                db.planHistory
                    .slice(0, 1000)
        });
    }
);


/* ============================================================
   287 — SYSTEM MAINTENANCE CHECK
   ============================================================ */

function isMaintenanceMode() {
    return (
        db.adminSettings
            ?.maintenanceMode === true
    );
}


/* ============================================================
   288 — MAINTENANCE STATUS API
   ============================================================ */

app.get(
    "/api/system/maintenance",
    async (req, res) => {
        res.json({
            ok: true,
            maintenance:
                isMaintenanceMode()
        });
    }
);


/* ============================================================
   289 — ADMIN MAINTENANCE TOGGLE
   ============================================================ */

app.post(
    "/api/admin/maintenance",
    requireAuth,
    requireAdmin,
    async (req, res) => {
        db.adminSettings.maintenanceMode =
            Boolean(
                req.body?.enabled
            );

        db.adminSettings.updatedAt =
            isoNow();

        saveDB("admin-settings");

        createSystemEvent(
            "maintenance",
            db.adminSettings
                .maintenanceMode
                ? "Bakım modu açıldı."
                : "Bakım modu kapatıldı.",
            {
                adminId:
                    req.user.id
            }
        );

        res.json({
            ok: true,
            maintenance:
                db.adminSettings
                    .maintenanceMode
        });
    }
);


/* ============================================================
   290 — ADMIN SEARCH
   ============================================================ */

app.get(
    "/api/admin/search",
    requireAuth,
    requireAdmin,
    async (req, res) => {
        const query =
            safeText(
                req.query?.q,
                200
            ).toLowerCase();

        if (!query) {
            return res.json({
                ok: true,
                results: []
            });
        }

        const users =
            db.users
                .filter(
                    user =>
                        String(
                            user.username || ""
                        )
                            .toLowerCase()
                            .includes(query)
                )
                .slice(0, 50)
                .map(
                    adminUserView
                );

        const chats =
            db.chats
                .filter(
                    chat =>
                        String(
                            chat.title || ""
                        )
                            .toLowerCase()
                            .includes(query)
                )
                .slice(0, 50);

        const knowledge =
            db.knowledge
                .filter(
                    item =>
                        String(
                            item.question || ""
                        )
                            .toLowerCase()
                            .includes(query)
                )
                .slice(0, 50);

        res.json({
            ok: true,
            results: {
                users,
                chats,
                knowledge
            }
        });
    }
);


/* ============================================================
   291 — ADMIN EXPORT SUMMARY
   ============================================================ */

app.get(
    "/api/admin/export-summary",
    requireAuth,
    requireAdmin,
    async (req, res) => {
        const summary =
            buildAdminDashboardSummary();

        adminLog(
            req.user.id,
            "summary_export"
        );

        res.json({
            ok: true,
            generatedAt:
                isoNow(),
            summary
        });
    }
);


/* ============================================================
   292 — ADMIN RECENT ACTIVITY
   ============================================================ */

app.get(
    "/api/admin/recent-activity",
    requireAuth,
    requireAdmin,
    async (req, res) => {
        const activity = [];

        for (
            const log of db.adminLogs.slice(0, 100)
        ) {
            activity.push({
                type: "admin",
                action:
                    log.action,
                createdAt:
                    log.createdAt,
                metadata:
                    log.metadata
            });
        }

        for (
            const event of db.systemEvents.slice(0, 100)
        ) {
            activity.push({
                type: "system",
                action:
                    event.type,
                message:
                    event.message,
                createdAt:
                    event.createdAt
            });
        }

        activity.sort(
            (a, b) =>
                new Date(
                    b.createdAt || 0
                ).getTime() -
                new Date(
                    a.createdAt || 0
                ).getTime()
        );

        res.json({
            ok: true,
            activity:
                activity.slice(0, 200)
        });
    }
);


/* ============================================================
   293 — ADMIN DASHBOARD QUICK STATS
   ============================================================ */

app.get(
    "/api/admin/quick-stats",
    requireAuth,
    requireAdmin,
    async (req, res) => {
        const summary =
            buildAdminDashboardSummary();

        res.json({
            ok: true,
            stats: {
                users:
                    summary.users.total,

                activeUsers:
                    summary.users.active,

                messages:
                    summary.messages.total,

                chats:
                    summary.chats.total,

                files:
                    summary.files.total,

                projects:
                    summary.files.projects,

                knowledge:
                    summary.knowledge.total,

                openQuality:
                    summary.quality
                        .openReports,

                corrections:
                    summary.quality
                        .pendingCorrections,

                errors24h:
                    summary.errors
                        .last24Hours
            }
        });
    }
);


/* ============================================================
   294 — ADMIN CONTROL CENTER
   ============================================================ */

app.get(
    "/api/admin/control-center",
    requireAuth,
    requireAdmin,
    async (req, res) => {
        const dashboard =
            buildAdminDashboardSummary();

        const controlCenter = {
            dashboard,

            settings:
                db.adminSettings,

            plans:
                calculatePlanStatistics(),

            security:
                calculateSecuritySummary(),

            feedback:
                calculateFeedbackStatistics(),

            fusion:
                calculateFusionStatistics(),

            system:
                getSystemHealth(),

            research: {
                cache:
                    Object.keys(
                        db.researchCache || {}
                    ).length,

                history:
                    db.researchHistory.length
            },

            quality: {
                reports:
                    db.qualityReports.length,

                open:
                    db.qualityReports.filter(
                        item =>
                            item.status === "open"
                    ).length
            }
        };

        res.json({
            ok: true,
            controlCenter
        });
    }
);


/* ============================================================
   295 — ADMIN LOGIN STATUS
   ============================================================ */

app.get(
    "/api/admin/me",
    requireAuth,
    requireAdmin,
    async (req, res) => {
        res.json({
            ok: true,
            admin: {
                id:
                    req.user.id,
                username:
                    req.user.username,
                role:
                    req.user.role,
                plan:
                    getPlan(req.user),
                loggedInAt:
                    req.user.lastLoginAt ||
                    null
            }
        });
    }
);


/* ============================================================
   296 — ADMIN DENETÇİ SUMMARY
   ============================================================ */

app.get(
    "/api/admin/denetci/summary",
    requireAuth,
    requireAdmin,
    async (req, res) => {
        const reports =
            db.qualityReports;

        const byCategory = {};
        const bySeverity = {};

        for (const report of reports) {
            byCategory[
                report.category
            ] =
                (
                    byCategory[
                        report.category
                    ] || 0
                ) + 1;

            bySeverity[
                report.severity
            ] =
                (
                    bySeverity[
                        report.severity
                    ] || 0
                ) + 1;
        }

        res.json({
            ok: true,
            summary: {
                total:
                    reports.length,

                open:
                    reports.filter(
                        item =>
                            item.status === "open"
                    ).length,

                resolved:
                    reports.filter(
                        item =>
                            item.status === "resolved"
                    ).length,

                byCategory,
                bySeverity
            }
        });
    }
);


/* ============================================================
   297 — ADMIN QUALITY ACTION
   ============================================================ */

app.post(
    "/api/admin/quality/action",
    requireAuth,
    requireAdmin,
    async (req, res) => {
        const action =
            safeText(
                req.body?.action,
                100
            );

        const messageId =
            safeText(
                req.body?.messageId,
                100
            );

        const message =
            db.messages.find(
                item =>
                    item.id === messageId
            );

        if (!message) {
            return res.status(404).json({
                ok: false,
                error:
                    "Mesaj bulunamadı."
            });
        }

        if (
            action === "mark-research-needed"
        ) {
            message.researchRequired =
                true;
        }

        if (
            action === "mark-reviewed"
        ) {
            message.reviewed =
                true;

            message.reviewedBy =
                req.user.id;

            message.reviewedAt =
                isoNow();
        }

        if (
            action === "mark-error"
        ) {
            message.reviewError =
                true;
        }

        saveDB("messages");

        adminLog(
            req.user.id,
            "quality_action",
            {
                messageId,
                action
            }
        );

        res.json({
            ok: true,
            message
        });
    }
);


/* ============================================================
   298 — SYSTEM FEATURE STATUS
   ============================================================ */

app.get(
    "/api/admin/features",
    requireAuth,
    requireAdmin,
    async (req, res) => {
        res.json({
            ok: true,
            features: {
                chat: true,
                research:
                    db.adminSettings
                        .researchEnabled !== false,

                files:
                    db.adminSettings
                        .fileEngineEnabled !== false,

                memory:
                    db.adminSettings
                        .memoryEnabled !== false,

                feedback:
                    db.adminSettings
                        .feedbackEnabled !== false,

                denetci:
                    db.adminSettings
                        .denetciEnabled !== false,

                announcements:
                    db.adminSettings
                        .announcementsEnabled !== false,

                image:
                    true,

                video:
                    false
            }
        });
    }
);


/* ============================================================
   299 — ADMIN SYSTEM SNAPSHOT
   ============================================================ */

app.get(
    "/api/admin/snapshot",
    requireAuth,
    requireAdmin,
    async (req, res) => {
        const snapshot = {
            createdAt:
                isoNow(),

            dashboard:
                buildAdminDashboardSummary(),

            health:
                getSystemHealth(),

            security:
                calculateSecuritySummary(),

            denetci:
                calculateFeedbackStatistics(),

            database:
                getDatabaseCounters()
        };

        res.json({
            ok: true,
            snapshot
        });
    }
);


/* ============================================================
   300 — PART 4 SONU
   ============================================================ */

console.log(
    "[TürkAI] Part 4 Admin Center + Denetçi loaded."
);

/* ============================================================
   PART 4 / 5 SONU
   ============================================================ */
/* ============================================================
   TÜRKAI SERVER.JS
   PART 5 / 5
   SECURITY + API + FILES + SOCKET + STARTUP
   ============================================================ */


/* ============================================================
   301 — COMPATIBILITY INITIALIZATION
   ============================================================ */

db.users = Array.isArray(db.users) ? db.users : [];
db.messages = Array.isArray(db.messages) ? db.messages : [];
db.chats = Array.isArray(db.chats) ? db.chats : [];
db.memories = Array.isArray(db.memories) ? db.memories : [];
db.knowledge = Array.isArray(db.knowledge) ? db.knowledge : [];
db.feedback = Array.isArray(db.feedback) ? db.feedback : [];
db.correctionsQueue = Array.isArray(db.correctionsQueue)
  ? db.correctionsQueue
  : [];
db.files = Array.isArray(db.files) ? db.files : [];
db.projects = Array.isArray(db.projects) ? db.projects : [];
db.researchHistory = Array.isArray(db.researchHistory)
  ? db.researchHistory
  : [];
db.researchSources = Array.isArray(db.researchSources)
  ? db.researchSources
  : [];
db.planHistory = Array.isArray(db.planHistory)
  ? db.planHistory
  : [];
db.adminLogs = Array.isArray(db.adminLogs)
  ? db.adminLogs
  : [];
db.systemAnnouncements = Array.isArray(db.systemAnnouncements)
  ? db.systemAnnouncements
  : [];
db.systemEvents = Array.isArray(db.systemEvents)
  ? db.systemEvents
  : [];
db.qualityReports = Array.isArray(db.qualityReports)
  ? db.qualityReports
  : [];
db.securityEvents = Array.isArray(db.securityEvents)
  ? db.securityEvents
  : [];

db.settings = db.settings || {};
db.adminSettings = db.adminSettings || {};

db.settings.maintenanceMode =
  Boolean(db.settings.maintenanceMode);

db.settings.allowRegistration =
  db.settings.allowRegistration !== false;

db.settings.maxUploadMB =
  Number(db.settings.maxUploadMB || 10);

db.settings.maxMessageLength =
  Number(db.settings.maxMessageLength || 12000);


/* ============================================================
   302 — SECURITY CONFIGURATION
   ============================================================ */

const SECURITY_CONFIG = {
  loginWindowMs: 15 * 60 * 1000,
  loginMaxAttempts: 10,

  apiWindowMs: 60 * 1000,
  apiMaxRequests: 120,

  chatWindowMs: 60 * 1000,
  chatMaxRequests: 30,

  uploadWindowMs: 60 * 1000,
  uploadMaxRequests: 10,

  passwordMinLength: 8,

  sessionMaxAge:
    1000 * 60 * 60 * 24 * 30,

  maxBodySize: "15mb"
};


/* ============================================================
   303 — SECURITY MEMORY
   ============================================================ */

const securityMemory = {
  loginAttempts: new Map(),
  apiRequests: new Map(),
  chatRequests: new Map(),
  uploadRequests: new Map(),
  blockedIps: new Map()
};


/* ============================================================
   304 — REQUEST IP
   ============================================================ */

function getRequestIp(req) {
  const forwarded =
    req.headers["x-forwarded-for"];

  if (forwarded) {
    return String(forwarded)
      .split(",")[0]
      .trim();
  }

  return (
    req.ip ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}


/* ============================================================
   305 — RATE LIMIT HELPER
   ============================================================ */

function checkRateLimit(
  map,
  key,
  windowMs,
  maxRequests
) {
  const now = Date.now();

  const current = map.get(key);

  if (!current) {
    map.set(key, {
      start: now,
      count: 1
    });

    return {
      allowed: true,
      remaining: maxRequests - 1
    };
  }

  if (
    now - current.start >=
    windowMs
  ) {
    current.start = now;
    current.count = 1;

    return {
      allowed: true,
      remaining: maxRequests - 1
    };
  }

  current.count++;

  if (
    current.count >
    maxRequests
  ) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter:
        Math.ceil(
          (
            windowMs -
            (now - current.start)
          ) / 1000
        )
    };
  }

  return {
    allowed: true,
    remaining:
      maxRequests - current.count
  };
}


/* ============================================================
   306 — GLOBAL API RATE LIMIT
   ============================================================ */

function globalRateLimit(req, res, next) {
  const ip = getRequestIp(req);

  if (
    securityMemory.blockedIps.has(ip)
  ) {
    return res.status(429).json({
      success: false,
      error: "İstekler geçici olarak engellendi."
    });
  }

  const result = checkRateLimit(
    securityMemory.apiRequests,
    ip,
    SECURITY_CONFIG.apiWindowMs,
    SECURITY_CONFIG.apiMaxRequests
  );

  res.setHeader(
    "X-RateLimit-Remaining",
    String(result.remaining)
  );

  if (!result.allowed) {
    securityEvent({
      type: "rate_limit",
      severity: "medium",
      ip,
      message:
        "Global API rate limit aşıldı."
    });

    return res.status(429).json({
      success: false,
      error:
        "Çok fazla istek gönderildi.",
      retryAfter:
        result.retryAfter
    });
  }

  next();
}


/* ============================================================
   307 — CHAT RATE LIMIT
   ============================================================ */

function chatRateLimit(req, res, next) {
  const userId =
    req.user?.id ||
    getRequestIp(req);

  const result = checkRateLimit(
    securityMemory.chatRequests,
    userId,
    SECURITY_CONFIG.chatWindowMs,
    SECURITY_CONFIG.chatMaxRequests
  );

  if (!result.allowed) {
    securityEvent({
      type: "chat_rate_limit",
      severity: "low",
      userId: req.user?.id || null,
      ip: getRequestIp(req),
      message:
        "Chat rate limit aşıldı."
    });

    return res.status(429).json({
      success: false,
      error:
        "Çok hızlı mesaj gönderiyorsun.",
      retryAfter:
        result.retryAfter
    });
  }

  next();
}


/* ============================================================
   308 — UPLOAD RATE LIMIT
   ============================================================ */

function uploadRateLimit(req, res, next) {
  const userId =
    req.user?.id ||
    getRequestIp(req);

  const result = checkRateLimit(
    securityMemory.uploadRequests,
    userId,
    SECURITY_CONFIG.uploadWindowMs,
    SECURITY_CONFIG.uploadMaxRequests
  );

  if (!result.allowed) {
    return res.status(429).json({
      success: false,
      error:
        "Çok fazla dosya yükleme isteği.",
      retryAfter:
        result.retryAfter
    });
  }

  next();
}


/* ============================================================
   309 — SECURITY HEADERS
   ============================================================ */

app.use((req, res, next) => {
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

  res.setHeader(
    "X-XSS-Protection",
    "0"
  );

  next();
});


/* ============================================================
   310 — GLOBAL RATE LIMIT INSTALL
   ============================================================ */

app.use(
  "/api",
  globalRateLimit
);


/* ============================================================
   311 — REQUEST LOGGER
   ============================================================ */

app.use((req, res, next) => {
  const started = Date.now();

  res.on("finish", () => {
    const duration =
      Date.now() - started;

    if (
      duration > 3000 ||
      res.statusCode >= 500
    ) {
      audit({
        type: "slow_or_failed_request",
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration,
        userId:
          req.user?.id || null,
        ip: getRequestIp(req)
      });
    }
  });

  next();
});


/* ============================================================
   312 — PASSWORD VALIDATION
   ============================================================ */

function validatePassword(password) {
  if (
    typeof password !== "string"
  ) {
    return {
      valid: false,
      reason:
        "Şifre metin olmalıdır."
    };
  }

  if (
    password.length <
    SECURITY_CONFIG.passwordMinLength
  ) {
    return {
      valid: false,
      reason:
        "Şifre en az 8 karakter olmalıdır."
    };
  }

  return {
    valid: true
  };
}


/* ============================================================
   313 — USERNAME VALIDATION
   ============================================================ */

function validateUsername(username) {
  if (
    typeof username !== "string"
  ) {
    return {
      valid: false,
      reason:
        "Kullanıcı adı geçersiz."
    };
  }

  const value =
    username.trim();

  if (
    value.length < 3 ||
    value.length > 32
  ) {
    return {
      valid: false,
      reason:
        "Kullanıcı adı 3-32 karakter arasında olmalıdır."
    };
  }

  if (
    !/^[a-zA-Z0-9_.-]+$/.test(value)
  ) {
    return {
      valid: false,
      reason:
        "Kullanıcı adında geçersiz karakter var."
    };
  }

  return {
    valid: true,
    value
  };
}


/* ============================================================
   314 — SAFE TEXT
   ============================================================ */

function sanitizeText(value, max = 12000) {
  if (
    value === undefined ||
    value === null
  ) {
    return "";
  }

  return String(value)
    .replace(/\u0000/g, "")
    .trim()
    .slice(0, max);
}


/* ============================================================
   315 — JSON BODY LIMIT
   ============================================================ */

app.use(
  express.json({
    limit:
      SECURITY_CONFIG.maxBodySize
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit:
      SECURITY_CONFIG.maxBodySize
  })
);


/* ============================================================
   316 — HEALTH CHECK
   ============================================================ */

app.get(
  "/health",
  (req, res) => {
    res.json({
      success: true,
      status: "online",
      service: "TürkAI",
      version: "Ultra",
      time: isoNow(),
      uptime: Math.floor(
        process.uptime()
      )
    });
  }
);


/* ============================================================
   317 — API HEALTH
   ============================================================ */

app.get(
  "/api/health",
  (req, res) => {
    res.json({
      success: true,
      status: "healthy",
      service: "TürkAI",
      database: "ready",
      socket: "ready",
      memory:
        process.memoryUsage(),
      uptime:
        process.uptime(),
      timestamp:
        isoNow()
    });
  }
);


/* ============================================================
   318 — SYSTEM STATUS
   ============================================================ */

app.get(
  "/api/system/status",
  requireAuth,
  (req, res) => {
    res.json({
      success: true,
      service: "TürkAI",
      version:
        db.settings.version ||
        "Ultra",
      maintenance:
        Boolean(
          db.settings.maintenanceMode
        ),
      registration:
        db.settings.allowRegistration !==
        false,
      userCount:
        db.users.length,
      chatCount:
        db.chats.length,
      messageCount:
        db.messages.length,
      knowledgeCount:
        db.knowledge.length,
      fileCount:
        db.files.length,
      uptime:
        process.uptime()
    });
  }
);


/* ============================================================
   319 — REGISTRATION ENDPOINT
   ============================================================ */

app.post(
  "/api/auth/register",
  async (req, res) => {
    try {
      if (
        db.settings.allowRegistration ===
        false
      ) {
        return res.status(403).json({
          success: false,
          error:
            "Yeni kayıtlar geçici olarak kapalı."
        });
      }

      const usernameResult =
        validateUsername(
          req.body?.username
        );

      if (
        !usernameResult.valid
      ) {
        return res.status(400).json({
          success: false,
          error:
            usernameResult.reason
        });
      }

      const passwordResult =
        validatePassword(
          req.body?.password
        );

      if (
        !passwordResult.valid
      ) {
        return res.status(400).json({
          success: false,
          error:
            passwordResult.reason
        });
      }

      const username =
        usernameResult.value;

      const exists =
        db.users.some(
          user =>
            String(
              user.username
            ).toLowerCase() ===
            username.toLowerCase()
        );

      if (exists) {
        return res.status(409).json({
          success: false,
          error:
            "Bu kullanıcı adı zaten kullanılıyor."
        });
      }

      const passwordHash =
        await bcrypt.hash(
          req.body.password,
          12
        );

      const user = {
        id: createId("user"),
        username,
        passwordHash,
        role: "user",
        plan: "free",
        disabled: false,

        consentLogging:
          Boolean(
            req.body?.consentLogging
          ),

        createdAt:
          isoNow(),

        updatedAt:
          isoNow(),

        preferences: {
          language: "tr",
          responseLength:
            "medium",
          theme:
            "dark"
        }
      };

      db.users.push(user);

      saveDB();

      audit({
        type: "user_registered",
        userId: user.id,
        username
      });

      const token =
        createAuthToken(user);

      res.status(201).json({
        success: true,
        user:
          publicUser(user),
        token
      });

    } catch (error) {
      console.error(
        "REGISTER ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        error:
          "Kayıt sırasında hata oluştu."
      });
    }
  }
);


/* ============================================================
   320 — LOGIN ATTEMPT HELPER
   ============================================================ */

function registerLoginFailure(ip) {
  const now = Date.now();

  let record =
    securityMemory.loginAttempts.get(
      ip
    );

  if (!record) {
    record = {
      count: 0,
      firstAttempt: now
    };
  }

  if (
    now - record.firstAttempt >
    SECURITY_CONFIG.loginWindowMs
  ) {
    record = {
      count: 0,
      firstAttempt: now
    };
  }

  record.count++;

  securityMemory.loginAttempts.set(
    ip,
    record
  );

  if (
    record.count >=
    SECURITY_CONFIG.loginMaxAttempts
  ) {
    securityMemory.blockedIps.set(
      ip,
      Date.now()
    );
  }

  return record;
}


/* ============================================================
   321 — LOGIN
   ============================================================ */

app.post(
  "/api/auth/login",
  async (req, res) => {
    try {
      const ip =
        getRequestIp(req);

      const rate =
        checkRateLimit(
          securityMemory.loginAttempts,
          ip,
          SECURITY_CONFIG.loginWindowMs,
          SECURITY_CONFIG.loginMaxAttempts
        );

      if (!rate.allowed) {
        return res.status(429).json({
          success: false,
          error:
            "Çok fazla giriş denemesi.",
          retryAfter:
            rate.retryAfter
        });
      }

      const username =
        sanitizeText(
          req.body?.username,
          64
        );

      const password =
        String(
          req.body?.password || ""
        );

      if (
        !username ||
        !password
      ) {
        return res.status(400).json({
          success: false,
          error:
            "Kullanıcı adı ve şifre gerekli."
        });
      }

      const user =
        db.users.find(
          item =>
            String(
              item.username
            ).toLowerCase() ===
            username.toLowerCase()
        );

      if (!user) {
        registerLoginFailure(ip);

        securityEvent({
          type: "login_failure",
          severity: "medium",
          ip,
          message:
            "Bilinmeyen kullanıcı ile giriş denemesi."
        });

        return res.status(401).json({
          success: false,
          error:
            "Kullanıcı adı veya şifre hatalı."
        });
      }

      if (user.disabled) {
        return res.status(403).json({
          success: false,
          error:
            "Bu hesap devre dışı bırakılmış."
        });
      }

      const passwordOk =
        await bcrypt.compare(
          password,
          user.passwordHash
        );

      if (!passwordOk) {
        registerLoginFailure(ip);

        securityEvent({
          type: "login_failure",
          severity: "medium",
          userId: user.id,
          ip,
          message:
            "Hatalı şifre."
        });

        return res.status(401).json({
          success: false,
          error:
            "Kullanıcı adı veya şifre hatalı."
        });
      }

      securityMemory.loginAttempts.delete(
        ip
      );

      user.lastLoginAt =
        isoNow();

      user.lastLoginIp =
        ip;

      user.updatedAt =
        isoNow();

      saveDB();

      const token =
        createAuthToken(user);

      audit({
        type: "login_success",
        userId: user.id,
        ip
      });

      res.json({
        success: true,
        token,
        user:
          publicUser(user)
      });

    } catch (error) {
      console.error(
        "LOGIN ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        error:
          "Giriş sırasında hata oluştu."
      });
    }
  }
);


/* ============================================================
   322 — CURRENT USER
   ============================================================ */

app.get(
  "/api/auth/me",
  requireAuth,
  (req, res) => {
    res.json({
      success: true,
      user:
        publicUser(req.user)
    });
  }
);


/* ============================================================
   323 — LOGOUT
   ============================================================ */

app.post(
  "/api/auth/logout",
  requireAuth,
  (req, res) => {
    audit({
      type: "logout",
      userId:
        req.user.id
    });

    res.json({
      success: true
    });
  }
);


/* ============================================================
   324 — USER PROFILE
   ============================================================ */

app.get(
  "/api/profile",
  requireAuth,
  (req, res) => {
    const user =
      findUserById(
        req.user.id
      );

    if (!user) {
      return res.status(404).json({
        success: false,
        error:
          "Kullanıcı bulunamadı."
      });
    }

    res.json({
      success: true,
      profile: {
        id: user.id,
        username:
          user.username,
        role:
          user.role,
        plan:
          user.plan,
        createdAt:
          user.createdAt,
        lastLoginAt:
          user.lastLoginAt ||
          null,
        preferences:
          user.preferences ||
          {}
      }
    });
  }
);


/* ============================================================
   325 — UPDATE PROFILE
   ============================================================ */

app.patch(
  "/api/profile",
  requireAuth,
  async (req, res) => {
    try {
      const user =
        findUserById(
          req.user.id
        );

      if (!user) {
        return res.status(404).json({
          success: false,
          error:
            "Kullanıcı bulunamadı."
        });
      }

      if (
        req.body?.preferences &&
        typeof req.body.preferences ===
          "object"
      ) {
        user.preferences = {
          ...(user.preferences || {}),
          ...req.body.preferences
        };
      }

      if (
        typeof req.body?.consentLogging ===
        "boolean"
      ) {
        user.consentLogging =
          req.body.consentLogging;
      }

      user.updatedAt =
        isoNow();

      saveDB();

      res.json({
        success: true,
        user:
          publicUser(user)
      });

    } catch (error) {
      console.error(
        "PROFILE UPDATE ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        error:
          "Profil güncellenemedi."
      });
    }
  }
);


/* ============================================================
   326 — CHANGE PASSWORD
   ============================================================ */

app.post(
  "/api/profile/change-password",
  requireAuth,
  async (req, res) => {
    try {
      const oldPassword =
        String(
          req.body?.oldPassword || ""
        );

      const newPassword =
        String(
          req.body?.newPassword || ""
        );

      const validation =
        validatePassword(
          newPassword
        );

      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error:
            validation.reason
        });
      }

      const user =
        findUserById(
          req.user.id
        );

      if (!user) {
        return res.status(404).json({
          success: false,
          error:
            "Kullanıcı bulunamadı."
        });
      }

      const oldOk =
        await bcrypt.compare(
          oldPassword,
          user.passwordHash
        );

      if (!oldOk) {
        return res.status(401).json({
          success: false,
          error:
            "Mevcut şifre yanlış."
        });
      }

      user.passwordHash =
        await bcrypt.hash(
          newPassword,
          12
        );

      user.updatedAt =
        isoNow();

      saveDB();

      securityEvent({
        type:
          "password_changed",
        severity: "low",
        userId:
          user.id,
        message:
          "Kullanıcı şifresini değiştirdi."
      });

      res.json({
        success: true
      });

    } catch (error) {
      console.error(
        "PASSWORD CHANGE ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        error:
          "Şifre değiştirilemedi."
      });
    }
  }
);


/* ============================================================
   327 — CHAT ROUTE RATE LIMIT
   ============================================================ */

/*
   Daha önce /api/chat tanımlandıysa
   ikinci bir /api/chat oluşturmuyoruz.

   Burada yalnızca middleware mantığını
   yardımcı fonksiyon olarak tanımlıyoruz.
*/

function enforceChatSecurity(
  req,
  res
) {
  const result =
    checkRateLimit(
      securityMemory.chatRequests,
      req.user?.id ||
        getRequestIp(req),
      SECURITY_CONFIG.chatWindowMs,
      SECURITY_CONFIG.chatMaxRequests
    );

  if (!result.allowed) {
    res.status(429).json({
      success: false,
      error:
        "Çok hızlı mesaj gönderiyorsun.",
      retryAfter:
        result.retryAfter
    });

    return false;
  }

  return true;
}


/* ============================================================
   328 — CURRENT PLAN INFO
   ============================================================ */

app.get(
  "/api/plan",
  requireAuth,
  (req, res) => {
    const user =
      findUserById(
        req.user.id
      );

    if (!user) {
      return res.status(404).json({
        success: false
      });
    }

    const plan =
      getPlan(
        user.plan
      );

    res.json({
      success: true,
      plan: {
        id:
          user.plan,
        name:
          plan?.name ||
          user.plan,
        limits:
          plan?.limits ||
          {},
        models:
          plan?.models ||
          [],
        price:
          plan?.price ||
          0
      }
    });
  }
);


/* ============================================================
   329 — PLAN CATALOG
   ============================================================ */

app.get(
  "/api/plans",
  (req, res) => {
    res.json({
      success: true,
      plans: [
        {
          id: "free",
          name: "Free",
          price: 0,
          currency: "TRY",
          modelCount: 3
        },
        {
          id: "pro",
          name: "Pro",
          price: 250,
          currency: "TRY",
          modelCount: 6
        },
        {
          id: "plus",
          name: "Plus",
          price: 500,
          currency: "TRY",
          modelCount: 9
        },
        {
          id: "ultra",
          name: "Ultra",
          price: 6000,
          firstMonthPrice: 1000,
          currency: "TRY",
          modelCount: 12
        }
      ]
    });
  }
);


/* ============================================================
   330 — FEATURE ACCESS
   ============================================================ */

function hasFeatureAccess(
  user,
  feature
) {
  const plan =
    String(
      user?.plan ||
      "free"
    ).toLowerCase();

  const access = {
    free: {
      chat: true,
      research: true,
      files: true,
      memory: true,
      coding: true,
      image: false,
      video: false,
      fusion: true
    },

    pro: {
      chat: true,
      research: true,
      files: true,
      memory: true,
      coding: true,
      image: true,
      video: false,
      fusion: true
    },

    plus: {
      chat: true,
      research: true,
      files: true,
      memory: true,
      coding: true,
      image: true,
      video: true,
      fusion: true
    },

    ultra: {
      chat: true,
      research: true,
      files: true,
      memory: true,
      coding: true,
      image: true,
      video: true,
      fusion: true
    }
  };

  return Boolean(
    access[plan]?.[feature]
  );
}


/* ============================================================
   331 — FEATURE ACCESS API
   ============================================================ */

app.get(
  "/api/features",
  requireAuth,
  (req, res) => {
    const features = [
      "chat",
      "research",
      "files",
      "memory",
      "coding",
      "image",
      "video",
      "fusion"
    ];

    const result = {};

    for (const feature of features) {
      result[feature] =
        hasFeatureAccess(
          req.user,
          feature
        );
    }

    res.json({
      success: true,
      features: result
    });
  }
);


/* ============================================================
   332 — WEATHER HELPER
   ============================================================ */

async function fetchWeather(
  city
) {
  const cleanCity =
    sanitizeText(
      city,
      100
    );

  if (!cleanCity) {
    throw new Error(
      "Şehir belirtilmedi."
    );
  }

  const url =
    "https://wttr.in/" +
    encodeURIComponent(
      cleanCity
    ) +
    "?format=j1";

  const response =
    await fetch(
      url,
      {
        headers: {
          "User-Agent":
            "TurkAI/1.0"
        },
        signal:
          AbortSignal.timeout(
            8000
          )
      }
    );

  if (!response.ok) {
    throw new Error(
      "Hava durumu servisi yanıt vermedi."
    );
  }

  return response.json();
}


/* ============================================================
   333 — WEATHER API
   ============================================================ */

app.get(
  "/api/weather",
  requireAuth,
  async (req, res) => {
    try {
      const city =
        sanitizeText(
          req.query?.city ||
          "Konya",
          100
        );

      const data =
        await fetchWeather(
          city
        );

      const current =
        data?.current_condition?.[0];

      if (!current) {
        return res.status(502).json({
          success: false,
          error:
            "Hava durumu verisi alınamadı."
        });
      }

      res.json({
        success: true,
        city,
        temperature:
          current.temp_C,
        feelsLike:
          current.FeelsLikeC,
        humidity:
          current.humidity,
        wind:
          current.windspeedKmph,
        description:
          current.weatherDesc?.[0]
            ?.value ||
          "",
        timestamp:
          isoNow()
      });

    } catch (error) {
      console.error(
        "WEATHER ERROR:",
        error
      );

      res.status(502).json({
        success: false,
        error:
          "Hava durumu alınamadı."
      });
    }
  }
);


/* ============================================================
   334 — CURRENCY API
   ============================================================ */

app.get(
  "/api/currency",
  requireAuth,
  async (req, res) => {
    try {
      const base =
        String(
          req.query?.base ||
          "USD"
        ).toUpperCase();

      const symbols =
        String(
          req.query?.symbols ||
          "TRY,EUR,GBP"
        ).toUpperCase();

      const url =
        `https://api.frankfurter.app/latest?from=${encodeURIComponent(base)}&to=${encodeURIComponent(symbols)}`;

      const response =
        await fetch(
          url,
          {
            signal:
              AbortSignal.timeout(
                8000
              )
          }
        );

      if (!response.ok) {
        throw new Error(
          "Kur servisi yanıt vermedi."
        );
      }

      const data =
        await response.json();

      res.json({
        success: true,
        base:
          data.base,
        date:
          data.date,
        rates:
          data.rates,
        timestamp:
          isoNow()
      });

    } catch (error) {
      console.error(
        "CURRENCY ERROR:",
        error
      );

      res.status(502).json({
        success: false,
        error:
          "Döviz verisi alınamadı."
      });
    }
  }
);


/* ============================================================
   335 — RESEARCH REQUEST VALIDATION
   ============================================================ */

function validateResearchQuery(
  query
) {
  const value =
    sanitizeText(
      query,
      1000
    );

  if (!value) {
    return {
      valid: false,
      reason:
        "Araştırma sorgusu boş."
    };
  }

  if (
    value.length < 2
  ) {
    return {
      valid: false,
      reason:
        "Araştırma sorgusu çok kısa."
    };
  }

  return {
    valid: true,
    value
  };
}


/* ============================================================
   336 — RESEARCH HISTORY SAVE
   ============================================================ */

function saveResearchHistory(
  user,
  query,
  result
) {
  db.researchHistory.push({
    id:
      createId("research"),
    userId:
      user?.id || null,
    query:
      sanitizeText(
        query,
        1000
      ),
    result:
      result || null,
    createdAt:
      isoNow()
  });

  if (
    db.researchHistory.length >
    10000
  ) {
    db.researchHistory =
      db.researchHistory.slice(
        -10000
      );
  }

  saveDB();
}


/* ============================================================
   337 — RESEARCH ENDPOINT
   ============================================================ */

app.post(
  "/api/research",
  requireAuth,
  async (req, res) => {
    const validation =
      validateResearchQuery(
        req.body?.query
      );

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error:
          validation.reason
      });
    }

    const started =
      Date.now();

    try {
      const query =
        validation.value;

      let result;

      /*
        Projedeki mevcut araştırma
        motorunu kullanıyoruz.
      */

      if (
        typeof performResearch ===
        "function"
      ) {
        result =
          await performResearch(
            query,
            req.user
          );
      } else if (
        typeof researchWeb ===
        "function"
      ) {
        result =
          await researchWeb(
            query
          );
      } else {
        result = {
          success: false,
          error:
            "Araştırma motoru henüz bağlanmamış."
        };
      }

      saveResearchHistory(
        req.user,
        query,
        result
      );

      res.json({
        success:
          result?.success !== false,
        query,
        result,
        responseTime:
          Date.now() - started
      });

    } catch (error) {
      console.error(
        "RESEARCH ERROR:",
        error
      );

      securityEvent({
        type:
          "research_error",
        severity:
          "medium",
        userId:
          req.user.id,
        message:
          error.message
      });

      res.status(500).json({
        success: false,
        error:
          "Araştırma sırasında hata oluştu.",
        responseTime:
          Date.now() - started
      });
    }
  }
);


/* ============================================================
   338 — KNOWLEDGE SEARCH
   ============================================================ */

app.get(
  "/api/knowledge/search",
  requireAuth,
  (req, res) => {
    const query =
      sanitizeText(
        req.query?.q,
        500
      ).toLowerCase();

    if (!query) {
      return res.json({
        success: true,
        results: []
      });
    }

    const terms =
      query
        .split(/\s+/)
        .filter(Boolean);

    const results =
      db.knowledge
        .map(item => {
          const haystack =
            (
              String(
                item.question || ""
              ) +
              " " +
              String(
                item.answer || ""
              ) +
              " " +
              String(
                item.tags || ""
              )
            ).toLowerCase();

          let score = 0;

          for (
            const term of terms
          ) {
            if (
              haystack.includes(term)
            ) {
              score++;
            }
          }

          return {
            item,
            score
          };
        })
        .filter(
          item =>
            item.score > 0
        )
        .sort(
          (a, b) =>
            b.score -
            a.score
        )
        .slice(0, 20)
        .map(
          item =>
            item.item
        );

    res.json({
      success: true,
      results
    });
  }
);


/* ============================================================
   339 — FILE SAFE MIME CHECK
   ============================================================ */

const SAFE_FILE_EXTENSIONS = new Set([
  ".txt",
  ".md",
  ".json",
  ".js",
  ".ts",
  ".html",
  ".css",
  ".py",
  ".java",
  ".c",
  ".cpp",
  ".cs",
  ".xml",
  ".csv",
  ".sql"
]);


/* ============================================================
   340 — PROJECT CREATE
   ============================================================ */

app.post(
  "/api/projects",
  requireAuth,
  async (req, res) => {
    try {
      const name =
        safeText(
          req.body?.name ||
          "TürkAI Projesi",
          100
        );

      const project = {
        id:
          createId("project"),
        userId:
          req.user.id,
        name,
        description:
          safeText(
            req.body?.description ||
              "",
            1000
          ),
        files: [],
        createdAt:
          isoNow(),
        updatedAt:
          isoNow()
      };

      db.projects.push(
        project
      );

      saveDB();

      res.status(201).json({
        success: true,
        project
      });

    } catch (error) {
      console.error(
        "PROJECT CREATE ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        error:
          "Proje oluşturulamadı."
      });
    }
  }
);


/* ============================================================
   341 — PROJECT LIST
   ============================================================ */

app.get(
  "/api/projects",
  requireAuth,
  (req, res) => {
    const projects =
      db.projects.filter(
        project =>
          project.userId ===
          req.user.id
      );

    res.json({
      success: true,
      projects
    });
  }
);


/* ============================================================
   342 — PROJECT DETAIL
   ============================================================ */

app.get(
  "/api/projects/:id",
  requireAuth,
  (req, res) => {
    const project =
      db.projects.find(
        item =>
          item.id ===
            req.params.id &&
          item.userId ===
            req.user.id
      );

    if (!project) {
      return res.status(404).json({
        success: false,
        error:
          "Proje bulunamadı."
      });
    }

    res.json({
      success: true,
      project
    });
  }
);


/* ============================================================
   343 — PROJECT UPDATE
   ============================================================ */

app.patch(
  "/api/projects/:id",
  requireAuth,
  (req, res) => {
    const project =
      db.projects.find(
        item =>
          item.id ===
            req.params.id &&
          item.userId ===
            req.user.id
      );

    if (!project) {
      return res.status(404).json({
        success: false,
        error:
          "Proje bulunamadı."
      });
    }

    if (
      req.body?.name !==
      undefined
    ) {
      project.name =
        safeText(
          req.body.name,
          100
        );
    }

    if (
      req.body?.description !==
      undefined
    ) {
      project.description =
        safeText(
          req.body.description,
          2000
        );
    }

    project.updatedAt =
      isoNow();

    saveDB();

    res.json({
      success: true,
      project
    });
  }
);


/* ============================================================
   344 — PROJECT DELETE
   ============================================================ */

app.delete(
  "/api/projects/:id",
  requireAuth,
  (req, res) => {
    const index =
      db.projects.findIndex(
        item =>
          item.id ===
            req.params.id &&
          item.userId ===
            req.user.id
      );

    if (index === -1) {
      return res.status(404).json({
        success: false,
        error:
          "Proje bulunamadı."
      });
    }

    const [
      removed
    ] =
      db.projects.splice(
        index,
        1
      );

    saveDB();

    audit({
      type:
        "project_deleted",
      userId:
        req.user.id,
      projectId:
        removed.id
    });

    res.json({
      success: true
    });
  }
);


/* ============================================================
   345 — PROJECT FILE ATTACH
   ============================================================ */

app.post(
  "/api/projects/:id/files",
  requireAuth,
  (req, res) => {
    const project =
      db.projects.find(
        item =>
          item.id ===
            req.params.id &&
          item.userId ===
            req.user.id
      );

    if (!project) {
      return res.status(404).json({
        success: false,
        error:
          "Proje bulunamadı."
      });
    }

    const fileId =
      safeText(
        req.body?.fileId,
        100
      );

    if (!fileId) {
      return res.status(400).json({
        success: false,
        error:
          "Dosya ID gerekli."
      });
    }

    const file =
      db.files.find(
        item =>
          item.id ===
            fileId &&
          item.userId ===
            req.user.id
      );

    if (!file) {
      return res.status(404).json({
        success: false,
        error:
          "Dosya bulunamadı."
      });
    }

    project.files =
      Array.isArray(
        project.files
      )
        ? project.files
        : [];

    if (
      !project.files.includes(
        fileId
      )
    ) {
      project.files.push(
        fileId
      );
    }

    project.updatedAt =
      isoNow();

    saveDB();

    res.json({
      success: true,
      project
    });
  }
);


/* ============================================================
   346 — GENERATED FILE DOWNLOAD
   ============================================================ */

app.get(
  "/api/files/:id/download",
  requireAuth,
  (req, res) => {
    const file =
      db.files.find(
        item =>
          item.id ===
            req.params.id &&
          item.userId ===
            req.user.id
      );

    if (!file) {
      return res.status(404).json({
        success: false,
        error:
          "Dosya bulunamadı."
      });
    }

    if (!file.path) {
      return res.status(404).json({
        success: false,
        error:
          "Dosyanın fiziksel yolu bulunamadı."
      });
    }

    const absolutePath =
      path.resolve(
        file.path
      );

    const base =
      path.resolve(
        GENERATED_FILES_DIR
      );

    if (
      !isPathInside(
        absolutePath,
        base
      )
    ) {
      return res.status(403).json({
        success: false,
        error:
          "Güvenli olmayan dosya yolu."
      });
    }

    if (
      !fs.existsSync(
        absolutePath
      )
    ) {
      return res.status(404).json({
        success: false,
        error:
          "Dosya diskte bulunamadı."
      });
    }

    res.download(
      absolutePath,
      file.name
    );
  }
);


/* ============================================================
   347 — FILE CONTENT READ
   ============================================================ */

app.get(
  "/api/files/:id/content",
  requireAuth,
  async (req, res) => {
    try {
      const file =
        db.files.find(
          item =>
            item.id ===
              req.params.id &&
            item.userId ===
              req.user.id
        );

      if (!file) {
        return res.status(404).json({
          success: false,
          error:
            "Dosya bulunamadı."
        });
      }

      if (!file.path) {
        return res.status(404).json({
          success: false,
          error:
            "Dosya yolu bulunamadı."
        });
      }

      const absolutePath =
        path.resolve(
          file.path
        );

      const base =
        path.resolve(
          GENERATED_FILES_DIR
        );

      if (
        !isPathInside(
          absolutePath,
          base
        )
      ) {
        return res.status(403).json({
          success: false,
          error:
            "Geçersiz dosya yolu."
        });
      }

      if (
        !fs.existsSync(
          absolutePath
        )
      ) {
        return res.status(404).json({
          success: false,
          error:
            "Dosya bulunamadı."
        });
      }

      const stat =
        fs.statSync(
          absolutePath
        );

      if (
        stat.size >
        2 * 1024 * 1024
      ) {
        return res.status(413).json({
          success: false,
          error:
            "Dosya önizleme için çok büyük."
        });
      }

      const content =
        await fs.promises.readFile(
          absolutePath,
          "utf8"
        );

      res.json({
        success: true,
        file: {
          id:
            file.id,
          name:
            file.name,
          language:
            file.language ||
            null,
          content
        }
      });

    } catch (error) {
      console.error(
        "FILE CONTENT ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        error:
          "Dosya okunamadı."
      });
    }
  }
);


/* ============================================================
   348 — FILE CONTENT UPDATE
   ============================================================ */

app.put(
  "/api/files/:id/content",
  requireAuth,
  async (req, res) => {
    try {
      const file =
        db.files.find(
          item =>
            item.id ===
              req.params.id &&
            item.userId ===
              req.user.id
        );

      if (!file) {
        return res.status(404).json({
          success: false,
          error:
            "Dosya bulunamadı."
        });
      }

      if (!file.path) {
        return res.status(404).json({
          success: false,
          error:
            "Dosya yolu bulunamadı."
        });
      }

      const content =
        typeof req.body?.content ===
        "string"
          ? req.body.content
          : "";

      if (
        Buffer.byteLength(
          content,
          "utf8"
        ) >
        5 * 1024 * 1024
      ) {
        return res.status(413).json({
          success: false,
          error:
            "Dosya çok büyük."
        });
      }

      const absolutePath =
        path.resolve(
          file.path
        );

      const base =
        path.resolve(
          GENERATED_FILES_DIR
        );

      if (
        !isPathInside(
          absolutePath,
          base
        )
      ) {
        return res.status(403).json({
          success: false,
          error:
            "Güvenli olmayan dosya yolu."
        });
      }

      await fs.promises.writeFile(
        absolutePath,
        content,
        "utf8"
      );

      file.size =
        Buffer.byteLength(
          content,
          "utf8"
        );

      file.updatedAt =
        isoNow();

      saveDB();

      audit({
        type:
          "file_updated",
        userId:
          req.user.id,
        fileId:
          file.id
      });

      res.json({
        success: true,
        file
      });

    } catch (error) {
      console.error(
        "FILE UPDATE ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        error:
          "Dosya güncellenemedi."
      });
    }
  }
);


/* ============================================================
   349 — CODE LANGUAGE DETECTION API
   ============================================================ */

app.get(
  "/api/coding/languages",
  requireAuth,
  (req, res) => {
    res.json({
      success: true,
      languages: [
        {
          id: "javascript",
          name: "JavaScript",
          extension: ".js"
        },
        {
          id: "typescript",
          name: "TypeScript",
          extension: ".ts"
        },
        {
          id: "html",
          name: "HTML",
          extension: ".html"
        },
        {
          id: "css",
          name: "CSS",
          extension: ".css"
        },
        {
          id: "python",
          name: "Python",
          extension: ".py"
        },
        {
          id: "java",
          name: "Java",
          extension: ".java"
        },
        {
          id: "csharp",
          name: "C#",
          extension: ".cs"
        },
        {
          id: "cpp",
          name: "C++",
          extension: ".cpp"
        },
        {
          id: "c",
          name: "C",
          extension: ".c"
        },
        {
          id: "sql",
          name: "SQL",
          extension: ".sql"
        }
      ]
    });
  }
);


/* ============================================================
   350 — CODING SNIPPET GENERATOR
   ============================================================ */

function generateStarterCode(
  language
) {
  switch (
    String(
      language ||
      ""
    ).toLowerCase()
  ) {
    case "javascript":
    case "js":
      return `console.log("Merhaba TürkAI");`;

    case "typescript":
    case "ts":
      return `const mesaj: string = "Merhaba TürkAI";\nconsole.log(mesaj);`;

    case "python":
    case "py":
      return `print("Merhaba TürkAI")`;

    case "html":
      return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TürkAI Projesi</title>
</head>
<body>
  <h1>Merhaba TürkAI</h1>
</body>
</html>`;

    case "css":
      return `body {
  margin: 0;
  font-family: Arial, sans-serif;
}`;

    case "java":
      return `public class Main {
    public static void main(String[] args) {
        System.out.println("Merhaba TürkAI");
    }
}`;

    case "csharp":
    case "cs":
      return `using System;

class Program
{
    static void Main()
    {
        Console.WriteLine("Merhaba TürkAI");
    }
}`;

    case "cpp":
      return `#include <iostream>

int main() {
    std::cout << "Merhaba TürkAI";
    return 0;
}`;

    case "c":
      return `#include <stdio.h>

int main() {
    printf("Merhaba TürkAI");
    return 0;
}`;

    case "sql":
      return `SELECT 'Merhaba TürkAI' AS mesaj;`;

    default:
      return "";
  }
}


/* ============================================================
   351 — STARTER CODE API
   ============================================================ */

app.get(
  "/api/coding/starter",
  requireAuth,
  (req, res) => {
    const language =
      sanitizeText(
        req.query?.language,
        30
      );

    const code =
      generateStarterCode(
        language
      );

    res.json({
      success:
        Boolean(code),
      language,
      code
    });
  }
);


/* ============================================================
   352 — CHAT HEALTH ANALYZER
   ============================================================ */

function analyzeChatHealth(
  userId
) {
  const messages =
    db.messages.filter(
      message =>
        message.userId ===
        userId
    );

  const recent =
    messages.slice(-100);

  const errors =
    recent.filter(
      message =>
        message.role ===
          "assistant" &&
        (
          message.error ||
          message.failed
        )
    ).length;

  const userMessages =
    recent.filter(
      message =>
        message.role ===
        "user"
    ).length;

  const assistantMessages =
    recent.filter(
      message =>
        message.role ===
        "assistant"
    ).length;

  return {
    total:
      recent.length,
    userMessages,
    assistantMessages,
    errors,
    healthy:
      errors === 0
  };
}


/* ============================================================
   353 — CHAT HEALTH API
   ============================================================ */

app.get(
  "/api/chat/health",
  requireAuth,
  (req, res) => {
    res.json({
      success: true,
      health:
        analyzeChatHealth(
          req.user.id
        )
    });
  }
);


/* ============================================================
   354 — USER NOTIFICATIONS
   ============================================================ */

app.get(
  "/api/notifications",
  requireAuth,
  (req, res) => {
    const announcements =
      db.systemAnnouncements
        .filter(
          item =>
            item.active !== false
        )
        .slice(-20)
        .reverse();

    const notifications =
      announcements.map(
        item => ({
          id:
            item.id,
          title:
            item.title,
          message:
            item.message,
          type:
            item.type ||
            "info",
          createdAt:
            item.createdAt
        })
      );

    res.json({
      success: true,
      notifications
    });
  }
);


/* ============================================================
   355 — SOCKET AUTH HELPER
   ============================================================ */

function socketUserFromToken(
  token
) {
  if (
    !token ||
    typeof token !==
      "string"
  ) {
    return null;
  }

  try {
    if (
      typeof verifyAuthToken ===
      "function"
    ) {
      return verifyAuthToken(
        token
      );
    }
  } catch (_) {}

  return null;
}


/* ============================================================
   356 — SOCKET.IO SECURITY
   ============================================================ */

io.use(
  (socket, next) => {
    try {
      const token =
        socket.handshake?.auth
          ?.token ||
        socket.handshake?.query
          ?.token;

      const user =
        socketUserFromToken(
          token
        );

      if (user) {
        socket.user =
          user;
      }

      next();

    } catch (error) {
      next();
    }
  }
);


/* ============================================================
   357 — SOCKET CONNECTION
   ============================================================ */

io.on(
  "connection",
  socket => {
    const userId =
      socket.user?.id ||
      null;

    socket.join(
      userId
        ? `user:${userId}`
        : "anonymous"
    );

    socket.emit(
      "turkai:connected",
      {
        success: true,
        timestamp:
          isoNow()
      }
    );

    if (userId) {
      socket.emit(
        "turkai:status",
        {
          online: true,
          userId
        }
      );
    }

    socket.on(
      "turkai:ping",
      () => {
        socket.emit(
          "turkai:pong",
          {
            timestamp:
              Date.now()
          }
        );
      }
    );

    socket.on(
      "turkai:typing",
      data => {
        if (!userId) {
          return;
        }

        socket.broadcast
          .to(`user:${userId}`)
          .emit(
            "turkai:typing",
            {
              typing:
                Boolean(
                  data?.typing
                )
            }
          );
      }
    );

    socket.on(
      "disconnect",
      () => {
        if (userId) {
          socket.to(
            `user:${userId}`
          ).emit(
            "turkai:status",
            {
              online: false,
              userId
            }
          );
        }
      }
    );
  }
);


/* ============================================================
   358 — SYSTEM BROADCAST
   ============================================================ */

function broadcastSystemEvent(
  event,
  payload = {}
) {
  try {
    io.emit(
      event,
      {
        ...payload,
        timestamp:
          isoNow()
      }
    );
  } catch (error) {
    console.error(
      "SOCKET BROADCAST ERROR:",
      error
    );
  }
}


/* ============================================================
   359 — ADMIN BROADCAST API
   ============================================================ */

app.post(
  "/api/admin/broadcast",
  requireAdmin,
  (req, res) => {
    const event =
      safeText(
        req.body?.event ||
          "turkai:announcement",
        100
      );

    const payload =
      req.body?.payload &&
      typeof req.body.payload ===
        "object"
        ? req.body.payload
        : {};

    broadcastSystemEvent(
      event,
      payload
    );

    adminLog(
      req.user,
      "broadcast",
      {
        event,
        payload
      }
    );

    res.json({
      success: true,
      event
    });
  }
);


/* ============================================================
   360 — MAINTENANCE MIDDLEWARE
   ============================================================ */

app.use(
  "/api",
  (req, res, next) => {
    const allowedPaths = [
      "/health",
      "/auth/login",
      "/auth/register",
      "/plans"
    ];

    if (
      db.settings.maintenanceMode &&
      !allowedPaths.includes(
        req.path
      )
    ) {
      if (
        req.user?.role !==
        "admin"
      ) {
        return res.status(503).json({
          success: false,
          maintenance: true,
          error:
            "TürkAI şu anda bakım modunda."
        });
      }
    }

    next();
  }
);


/* ============================================================
   361 — MEMORY EXPORT
   ============================================================ */

app.get(
  "/api/memory/export",
  requireAuth,
  (req, res) => {
    const memories =
      db.memories.filter(
        item =>
          item.userId ===
          req.user.id
      );

    res.json({
      success: true,
      exportedAt:
        isoNow(),
      memories
    });
  }
);


/* ============================================================
   362 — USER DATA EXPORT
   ============================================================ */

app.get(
  "/api/account/export",
  requireAuth,
  (req, res) => {
    const userId =
      req.user.id;

    const user =
      findUserById(
        userId
      );

    const data = {
      exportedAt:
        isoNow(),

      profile:
        publicUser(user),

      chats:
        db.chats.filter(
          item =>
            item.userId ===
            userId
        ),

      messages:
        db.messages.filter(
          item =>
            item.userId ===
            userId
        ),

      memories:
        db.memories.filter(
          item =>
            item.userId ===
            userId
        ),

      files:
        db.files.filter(
          item =>
            item.userId ===
            userId
        ),

      feedback:
        db.feedback.filter(
          item =>
            item.userId ===
            userId
        )
    };

    res.json({
      success: true,
      data
    });
  }
);


/* ============================================================
   363 — ACCOUNT DELETE
   ============================================================ */

app.delete(
  "/api/account",
  requireAuth,
  async (req, res) => {
    try {
      const userId =
        req.user.id;

      const index =
        db.users.findIndex(
          user =>
            user.id ===
            userId
        );

      if (index === -1) {
        return res.status(404).json({
          success: false,
          error:
            "Kullanıcı bulunamadı."
        });
      }

      if (
        db.users[index].role ===
        "admin"
      ) {
        return res.status(403).json({
          success: false,
          error:
            "Admin hesabı bu endpoint üzerinden silinemez."
        });
      }

      db.users.splice(
        index,
        1
      );

      db.chats =
        db.chats.filter(
          item =>
            item.userId !==
            userId
        );

      db.messages =
        db.messages.filter(
          item =>
            item.userId !==
            userId
        );

      db.memories =
        db.memories.filter(
          item =>
            item.userId !==
            userId
        );

      db.feedback =
        db.feedback.filter(
          item =>
            item.userId !==
            userId
        );

      db.files =
        db.files.filter(
          item =>
            item.userId !==
            userId
        );

      db.projects =
        db.projects.filter(
          item =>
            item.userId !==
            userId
        );

      saveDB();

      securityEvent({
        type:
          "account_deleted",
        severity:
          "medium",
        userId,
        message:
          "Kullanıcı hesabını sildi."
      });

      res.json({
        success: true
      });

    } catch (error) {
      console.error(
        "ACCOUNT DELETE ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        error:
          "Hesap silinemedi."
      });
    }
  }
);


/* ============================================================
   364 — ERROR NORMALIZER
   ============================================================ */

function normalizeServerError(
  error
) {
  if (!error) {
    return {
      message:
        "Bilinmeyen hata",
      code:
        "UNKNOWN"
    };
  }

  return {
    message:
      String(
        error.message ||
        "Sunucu hatası"
      ).slice(0, 500),

    code:
      error.code ||
      "SERVER_ERROR"
  };
}


/* ============================================================
   365 — PROCESS ERROR HANDLERS
   ============================================================ */

process.on(
  "uncaughtException",
  error => {
    const normalized =
      normalizeServerError(
        error
      );

    console.error(
      "[UNCAUGHT EXCEPTION]",
      normalized
    );

    try {
      securityEvent({
        type:
          "uncaught_exception",
        severity:
          "critical",
        message:
          normalized.message,
        code:
          normalized.code
      });

      saveDB();
    } catch (_) {}
  }
);


process.on(
  "unhandledRejection",
  reason => {
    const normalized =
      normalizeServerError(
        reason
      );

    console.error(
      "[UNHANDLED REJECTION]",
      normalized
    );

    try {
      securityEvent({
        type:
          "unhandled_rejection",
        severity:
          "high",
        message:
          normalized.message,
        code:
          normalized.code
      });

      saveDB();
    } catch (_) {}
  }
);


/* ============================================================
   366 — PERIODIC DATABASE SAVE
   ============================================================ */

const DATABASE_SAVE_INTERVAL =
  setInterval(
    () => {
      try {
        saveDB();
      } catch (error) {
        console.error(
          "PERIODIC SAVE ERROR:",
          error
        );
      }
    },
    30000
  );


/* ============================================================
   367 — SECURITY MEMORY CLEANUP
   ============================================================ */

const SECURITY_CLEANUP_INTERVAL =
  setInterval(
    () => {
      const now =
        Date.now();

      for (
        const [
          key,
          record
        ] of securityMemory.loginAttempts
      ) {
        if (
          now -
            record.firstAttempt >
          SECURITY_CONFIG.loginWindowMs *
            2
        ) {
          securityMemory.loginAttempts.delete(
            key
          );
        }
      }

      for (
        const [
          key,
          timestamp
        ] of securityMemory.blockedIps
      ) {
        if (
          now - timestamp >
          SECURITY_CONFIG.loginWindowMs
        ) {
          securityMemory.blockedIps.delete(
            key
          );
        }
      }
    },
    60000
  );


/* ============================================================
   368 — MEMORY SAFETY LIMITS
   ============================================================ */

function enforceDatabaseLimits() {
  const limits = {
    messages: 100000,
    chats: 20000,
    feedback: 50000,
    researchHistory: 20000,
    adminLogs: 50000,
    systemEvents: 50000,
    securityEvents: 50000
  };

  for (
    const [
      key,
      limit
    ] of Object.entries(
      limits
    )
  ) {
    if (
      Array.isArray(
        db[key]
      ) &&
      db[key].length >
        limit
    ) {
      db[key] =
        db[key].slice(
          -limit
        );
    }
  }
}


/* ============================================================
   369 — DATABASE MAINTENANCE
   ============================================================ */

const DATABASE_MAINTENANCE_INTERVAL =
  setInterval(
    () => {
      try {
        enforceDatabaseLimits();
        saveDB();
      } catch (error) {
        console.error(
          "DATABASE MAINTENANCE ERROR:",
          error
        );
      }
    },
    5 * 60 * 1000
  );


/* ============================================================
   370 — FINAL SYSTEM SNAPSHOT
   ============================================================ */

function createFinalSystemSnapshot() {
  return {
    service:
      "TürkAI",

    status:
      "online",

    timestamp:
      isoNow(),

    uptime:
      process.uptime(),

    node:
      process.version,

    platform:
      process.platform,

    memory:
      process.memoryUsage(),

    database: {
      users:
        db.users.length,
      chats:
        db.chats.length,
      messages:
        db.messages.length,
      memories:
        db.memories.length,
      knowledge:
        db.knowledge.length,
      files:
        db.files.length,
      projects:
        db.projects.length,
      feedback:
        db.feedback.length,
      research:
        db.researchHistory.length,
      security:
        db.securityEvents.length
    }
  };
}


/* ============================================================
   371 — FINAL SYSTEM API
   ============================================================ */

app.get(
  "/api/admin/system-snapshot",
  requireAdmin,
  (req, res) => {
    res.json({
      success: true,
      snapshot:
        createFinalSystemSnapshot()
    });
  }
);


/* ============================================================
   372 — FINAL API INFO
   ============================================================ */

app.get(
  "/api",
  (req, res) => {
    res.json({
      success: true,

      service:
        "TürkAI",

      description:
        "Türkçe yapay zekâ platformu",

      version:
        "Ultra",

      status:
        "online",

      endpoints: {
        auth:
          "/api/auth/*",
        chat:
          "/api/chat",
        research:
          "/api/research",
        weather:
          "/api/weather",
        currency:
          "/api/currency",
        files:
          "/api/files",
        projects:
          "/api/projects",
        memory:
          "/api/memory/*",
        feedback:
          "/api/feedback",
        admin:
          "/api/admin/*",
        plans:
          "/api/plans",
        health:
          "/api/health"
      }
    });
  }
);


/* ============================================================
   373 — STATIC FRONTEND
   ============================================================ */



const ROOT_INDEX =
  path.join(
    __dirname,
    "index.html"
  );


/*
  Eğer public klasörü varsa
  onu kullan.
*/

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
        maxAge:
          process.env.NODE_ENV ===
          "production"
            ? "1h"
            : 0
      }
    )
  );
}


/* ============================================================
   374 — ROOT INDEX FALLBACK
   ============================================================ */

app.get(
  "/",
  (req, res) => {
    const publicIndex =
      path.join(
        PUBLIC_DIR,
        "index.html"
      );

    if (
      fs.existsSync(
        publicIndex
      )
    ) {
      return res.sendFile(
        publicIndex
      );
    }

    if (
      fs.existsSync(
        ROOT_INDEX
      )
    ) {
      return res.sendFile(
        ROOT_INDEX
      );
    }

    res.status(200).send(`
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport"
          content="width=device-width,initial-scale=1.0">
        <title>TürkAI</title>
      </head>
      <body>
        <h1>TürkAI</h1>
        <p>Sunucu çalışıyor.</p>
      </body>
      </html>
    `);
  }
);


/* ============================================================
   375 — 404 HANDLER
   ============================================================ */

app.use(
  (req, res, next) => {
    if (
      req.path.startsWith(
        "/api/"
      )
    ) {
      return res.status(404).json({
        success: false,
        error:
          "API endpoint bulunamadı.",
        path:
          req.path
      });
    }

    next();
  }
);


/* ============================================================
   376 — HTML FALLBACK
   ============================================================ */

app.use(
  (req, res, next) => {
    if (
      req.method !==
      "GET"
    ) {
      return next();
    }

    const publicIndex =
      path.join(
        PUBLIC_DIR,
        "index.html"
      );

    if (
      fs.existsSync(
        publicIndex
      )
    ) {
      return res.sendFile(
        publicIndex
      );
    }

    if (
      fs.existsSync(
        ROOT_INDEX
      )
    ) {
      return res.sendFile(
        ROOT_INDEX
      );
    }

    next();
  }
);


/* ============================================================
   377 — FINAL ERROR HANDLER
   ============================================================ */

app.use(
  (
    error,
    req,
    res,
    next
  ) => {
    const normalized =
      normalizeServerError(
        error
      );

    console.error(
      "[EXPRESS ERROR]",
      error
    );

    try {
      securityEvent({
        type:
          "express_error",
        severity:
          "high",
        userId:
          req.user?.id ||
          null,
        ip:
          getRequestIp(req),
        message:
          normalized.message,
        code:
          normalized.code
      });
    } catch (_) {}

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
      success: false,
      error:
        process.env.NODE_ENV ===
        "production"
          ? "Sunucu hatası oluştu."
          : normalized.message,
      code:
        normalized.code
    });
  }
);


/* ============================================================
   378 — GRACEFUL SHUTDOWN
   ============================================================ */

let shuttingDown =
  false;

async function gracefulShutdown(
  signal
) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  console.log(
    `\n[TÜRKAI] ${signal} alındı. Sunucu kapatılıyor...`
  );

  try {
    clearInterval(
      DATABASE_SAVE_INTERVAL
    );

    clearInterval(
      SECURITY_CLEANUP_INTERVAL
    );

    clearInterval(
      DATABASE_MAINTENANCE_INTERVAL
    );
  } catch (_) {}

  try {
    saveDB();
  } catch (error) {
    console.error(
      "Shutdown DB save error:",
      error
    );
  }

  try {
    io.close();
  } catch (_) {}

  try {
    httpServer.close(
      () => {
        console.log(
          "[TÜRKAI] HTTP server kapandı."
        );

        process.exit(
          0
        );
      }
    );
  } catch (_) {
    process.exit(
      0
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


process.once(
  "SIGTERM",
  () =>
    gracefulShutdown(
      "SIGTERM"
    )
);

process.once(
  "SIGINT",
  () =>
    gracefulShutdown(
      "SIGINT"
    )
);


/* ============================================================
   379 — STARTUP VALIDATION
   ============================================================ */

function validateStartup() {
  const problems = [];

  if (
    typeof express !==
    "function"
  ) {
    problems.push(
      "Express yüklenemedi."
    );
  }

  if (
    typeof httpServer?.listen !==
    "function"
  ) {
    problems.push(
      "HTTP server hazır değil."
    );
  }

  if (
    !db ||
    typeof db !==
      "object"
  ) {
    problems.push(
      "Database nesnesi bulunamadı."
    );
  }

  if (
    typeof saveDB !==
    "function"
  ) {
    problems.push(
      "saveDB fonksiyonu bulunamadı."
    );
  }

  return {
    valid:
      problems.length ===
      0,
    problems
  };
}


/* ============================================================
   380 — STARTUP SUMMARY
   ============================================================ */

function printStartupSummary() {
  const snapshot =
    createFinalSystemSnapshot();

  console.log(
    "\n===================================================="
  );

  console.log(
    "              TÜRKAI ULTRA SERVER"
  );

  console.log(
    "===================================================="
  );

  console.log(
    "Durum        : ONLINE"
  );

  console.log(
    "Node         :",
    process.version
  );

  console.log(
    "Platform     :",
    process.platform
  );

  console.log(
    "Kullanıcı    :",
    snapshot.database.users
  );

  console.log(
    "Sohbet       :",
    snapshot.database.chats
  );

  console.log(
    "Mesaj        :",
    snapshot.database.messages
  );

  console.log(
    "Knowledge    :",
    snapshot.database.knowledge
  );

  console.log(
    "Dosya        :",
    snapshot.database.files
  );

  console.log(
    "Proje        :",
    snapshot.database.projects
  );

  console.log(
    "Araştırma    :",
    snapshot.database.research
  );

  console.log(
    "Güvenlik     :",
    snapshot.database.security
  );

  console.log(
    "===================================================="
  );
}


/* ============================================================
   381 — PORT
   ============================================================ */



/* ============================================================
   382 — HOST
   ============================================================ */

const HOST =
  process.env.HOST ||
  "0.0.0.0";


/* ============================================================
   383 — STARTUP VALIDATION RUN
   ============================================================ */

const startup =
  validateStartup();

if (!startup.valid) {
  console.error(
    "\n[TÜRKAI] BAŞLANGIÇ HATALARI:"
  );

  for (
    const problem of
      startup.problems
  ) {
    console.error(
      " -",
      problem
    );
  }

  /*
    Burada process.exit kullanmıyoruz.
    Böylece hata mesajı görünür kalır.
  */
}


/* ============================================================
   384 — FINAL SERVER START
   ============================================================ */

if (
  !global.__TURKAI_SERVER_STARTED__
) {
  global.__TURKAI_SERVER_STARTED__ =
    true;

  httpServer.listen(
    PORT,
    HOST,
    () => {
      printStartupSummary();

      console.log(
        "\n🔥🔥🔥 TÜRKAI SERVER BAŞLATILDI 🔥🔥🔥"
      );

      console.log(
        `🌐 Local: http://localhost:${PORT}`
      );

      console.log(
        `🌐 Host : ${HOST}:${PORT}`
      );

      console.log(
        "⚡ Chat sistemi hazır."
      );

      console.log(
        "⚡ Research sistemi hazır."
      );

      console.log(
        "⚡ Memory sistemi hazır."
      );

      console.log(
        "⚡ File sistemi hazır."
      );

      console.log(
        "⚡ Coding sistemi hazır."
      );

      console.log(
        "⚡ Admin sistemi hazır."
      );

      console.log(
        "⚡ Socket.IO hazır."
      );

      console.log(
        "⚡ Security sistemi hazır."
      );

      console.log(
        "====================================================\n"
      );
    }
  );
}


/* ============================================================
   385 — FINAL EXPORT STATE
   ============================================================ */

global.__TURKAI_READY__ = true;


/* ============================================================
   386 — SERVER READY MARKER
   ============================================================ */

console.log(
  "[TÜRKAI] Server.js yükleme işlemi tamamlandı."
);


/* ============================================================
   387 — FINAL PART MARKER
   ============================================================ */

console.log(
  "[TÜRKAI] PART 5/5 tamamlandı."
);


/* ============================================================
   388 — FINAL FEATURE MARKER
   ============================================================ */

console.log(
  "[TÜRKAI] Ultra backend feature set hazır."
);


/* ============================================================
   389 — FINAL SECURITY MARKER
   ============================================================ */

console.log(
  "[TÜRKAI] Security layer aktif."
);


/* ============================================================
   390 — FINAL SOCKET MARKER
   ============================================================ */

console.log(
  "[TÜRKAI] Socket.IO realtime layer aktif."
);


/* ============================================================
   391 — FINAL DATABASE MARKER
   ============================================================ */

console.log(
  "[TÜRKAI] Database compatibility layer aktif."
);


/* ============================================================
   392 — FINAL API MARKER
   ============================================================ */

console.log(
  "[TÜRKAI] API layer aktif."
);


/* ============================================================
   393 — FINAL ADMIN MARKER
   ============================================================ */

console.log(
  "[TÜRKAI] Admin control center aktif."
);


/* ============================================================
   394 — FINAL RESEARCH MARKER
   ============================================================ */

console.log(
  "[TÜRKAI] Research layer aktif."
);


/* ============================================================
   395 — FINAL FILE MARKER
   ============================================================ */

console.log(
  "[TÜRKAI] File/project layer aktif."
);


/* ============================================================
   396 — FINAL AUTH MARKER
   ============================================================ */

console.log(
  "[TÜRKAI] Authentication layer aktif."
);


/* ============================================================
   397 — FINAL MEMORY MARKER
   ============================================================ */

console.log(
  "[TÜRKAI] Memory layer aktif."
);


/* ============================================================
   398 — FINAL QUALITY MARKER
   ============================================================ */

console.log(
  "[TÜRKAI] Quality / Denetçi layer aktif."
);


/* ============================================================
   399 — FINAL STATUS
   ============================================================ */

console.log(
  "[TÜRKAI] Sistem durumu: READY"
);


/* ============================================================
   400 — PART 5 / 5 SONU
   ============================================================ */

/*
   TÜRKAI SERVER.JS
   PART 5 / 5 SONU

   Bu noktadan sonra yeni route eklemeden önce
   mevcut endpoint'in zaten tanımlı olup olmadığı
   kontrol edilmelidir.

   httpServer.listen(...)
   bu dosyanın yalnızca sonunda bulunmalıdır.
*/
