"use strict";

/*
╔══════════════════════════════════════════════════════════════════════╗
║                            TÜRKAI                                  ║
║                     BACKEND SERVER 11.0.0                          ║
║                                                                      ║
║  PART 1 / 5                                                        ║
║                                                                      ║
║  ÇEKİRDEK                                                            ║
║  • Express                                                          ║
║  • HTTP                                                              ║
║  • Socket.IO                                                        ║
║  • CORS                                                             ║
║  • Helmet                                                           ║
║  • JSON database                                                    ║
║  • User system                                                       ║
║  • Session system                                                    ║
║  • Logging                                                           ║
║  • Request metrics                                                   ║
║  • Security foundation                                              ║
║  • Health API                                                        ║
║  • Status API                                                        ║
║  • Basic system API                                                  ║
║                                                                      ║
║  ÖNEMLİ:                                                            ║
║  Bu bölüm tek başına Node.js ile çalışabilir.                       ║
║  Part 2/5 bu dosyanın devamıdır.                                    ║
╚══════════════════════════════════════════════════════════════════════╝
*/


/* =========================================================
   1. MODÜLLER
========================================================= */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const http = require("http");

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { Server } = require("socket.io");


/* =========================================================
   2. ENV
========================================================= */

require("dotenv").config();


/* =========================================================
   3. EXPRESS
========================================================= */

const app = express();

const httpServer =
    http.createServer(app);

const io =
    new Server(httpServer, {
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


/* =========================================================
   4. UYGULAMA BİLGİLERİ
========================================================= */

const APP_NAME =
    "TürkAI";

const APP_VERSION =
    "11.0.0";

const APP_DESCRIPTION =
    "Türkçe yapay zeka platformu";

const NODE_ENV =
    process.env.NODE_ENV ||
    "development";

const IS_PRODUCTION =
    NODE_ENV === "production";

const PORT =
    Number(process.env.PORT) || 3000;

const HOST =
    process.env.HOST ||
    "0.0.0.0";

const START_TIME =
    Date.now();

const SERVER_ID =
    crypto
        .randomBytes(12)
        .toString("hex");


/* =========================================================
   5. ANA DİZİNLER
========================================================= */

const ROOT_DIR =
    __dirname;

const DATA_DIR =
    path.join(
        ROOT_DIR,
        "data"
    );

const DATABASE_DIR =
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
        DATA_DIR,
        "logs"
    );

const CACHE_DIR =
    path.join(
        DATA_DIR,
        "cache"
    );

const TEMP_DIR =
    path.join(
        DATA_DIR,
        "temp"
    );

const PUBLIC_DIR =
    path.join(
        ROOT_DIR,
        "public"
    );


/* =========================================================
   6. DİZİNLERİ OLUŞTUR
========================================================= */

const DIRECTORIES = [
    DATA_DIR,
    DATABASE_DIR,
    STORAGE_DIR,
    USERS_DIR,
    UPLOADS_DIR,
    GENERATED_DIR,
    LOGS_DIR,
    CACHE_DIR,
    TEMP_DIR,
    PUBLIC_DIR
];

for (
    const directory of DIRECTORIES
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
            directory
        );

        console.error(
            error.message
        );
    }
}


/* =========================================================
   7. VERİTABANI DOSYALARI
========================================================= */

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

    feedback:
        path.join(
            DATABASE_DIR,
            "feedback.json"
        ),

    corrections:
        path.join(
            DATABASE_DIR,
            "corrections.json"
        ),

    usage:
        path.join(
            DATABASE_DIR,
            "usage.json"
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

    files:
        path.join(
            DATABASE_DIR,
            "files.json"
        ),

    notifications:
        path.join(
            DATABASE_DIR,
            "notifications.json"
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
        )
};


/* =========================================================
   8. LOG DOSYALARI
========================================================= */

const LOG_FILES = {

    server:
        path.join(
            LOGS_DIR,
            "server.log"
        ),

    error:
        path.join(
            LOGS_DIR,
            "error.log"
        ),

    access:
        path.join(
            LOGS_DIR,
            "access.log"
        ),

    security:
        path.join(
            LOGS_DIR,
            "security.log"
        ),

    ai:
        path.join(
            LOGS_DIR,
            "ai.log"
        )
};


/* =========================================================
   9. VARSAYILAN VERİLER
========================================================= */

const DATABASE_DEFAULTS = {

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

    settings: {

        maintenance: false,

        registrationEnabled: true,

        researchEnabled: true,

        uploadsEnabled: true,

        aiEnabled: true,

        imageGenerationEnabled: true,

        videoGenerationEnabled: true,

        socketEnabled: true
    },

    files: [],

    notifications: [],

    projects: [],

    research: [],

    payments: []
};


/* =========================================================
   10. DOSYA GARANTİSİ
========================================================= */

function ensureJSONFile(
    filePath,
    defaultValue
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
                    defaultValue,
                    null,
                    2
                ),
                "utf8"
            );

            return true;
        }

        const content =
            fs.readFileSync(
                filePath,
                "utf8"
            );

        if (
            !content.trim()
        ) {

            fs.writeFileSync(
                filePath,
                JSON.stringify(
                    defaultValue,
                    null,
                    2
                ),
                "utf8"
            );
        }

        return true;

    } catch (error) {

        console.error(
            "[TürkAI] JSON dosyası hazırlanamadı:",
            filePath
        );

        console.error(
            error.message
        );

        return false;
    }
}


/* =========================================================
   11. TÜM VERİTABANI DOSYALARINI HAZIRLA
========================================================= */

for (
    const [name, filePath]
    of Object.entries(DB_FILES)
) {

    const defaultValue =
        Object.prototype.hasOwnProperty.call(
            DATABASE_DEFAULTS,
            name
        )
            ? DATABASE_DEFAULTS[name]
            : [];

    ensureJSONFile(
        filePath,
        defaultValue
    );
}


/* =========================================================
   12. JSON OKUMA
========================================================= */

function readJSONSafe(
    filePath,
    fallback
) {

    try {

        if (
            !fs.existsSync(
                filePath
            )
        ) {
            return fallback;
        }

        const content =
            fs.readFileSync(
                filePath,
                "utf8"
            );

        if (
            !content.trim()
        ) {
            return fallback;
        }

        return JSON.parse(
            content
        );

    } catch (error) {

        console.error(
            "[TürkAI] JSON okuma hatası:",
            filePath
        );

        console.error(
            error.message
        );

        return fallback;
    }
}


/* =========================================================
   13. JSON YAZMA
========================================================= */

function writeJSONSafe(
    filePath,
    value
) {

    try {

        const temporaryFile =
            `${filePath}.tmp`;

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
            filePath
        );

        return true;

    } catch (error) {

        console.error(
            "[TürkAI] JSON yazma hatası:",
            filePath
        );

        console.error(
            error.message
        );

        try {

            fs.writeFileSync(
                filePath,
                JSON.stringify(
                    value,
                    null,
                    2
                ),
                "utf8"
            );

            return true;

        } catch (secondError) {

            console.error(
                "[TürkAI] Yedek yazma da başarısız:"
            );

            console.error(
                secondError.message
            );

            return false;
        }
    }
}


/* =========================================================
   14. METİN TEMİZLEME
========================================================= */

function cleanText(
    value,
    maxLength = 20000
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
        text.replace(
            /\r\n/g,
            "\n"
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


function normalizeText(
    value
) {

    return cleanText(
        value,
        50000
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


/* =========================================================
   15. ZAMAN FONKSİYONLARI
========================================================= */

function nowISO() {

    return new Date()
        .toISOString();
}


function nowUnix() {

    return Date.now();
}


function getTodayKey() {

    const date =
        new Date();

    const year =
        date.getUTCFullYear();

    const month =
        String(
            date.getUTCMonth() + 1
        ).padStart(
            2,
            "0"
        );

    const day =
        String(
            date.getUTCDate()
        ).padStart(
            2,
            "0"
        );

    return (
        `${year}-${month}-${day}`
    );
}


/* =========================================================
   16. ID FONKSİYONLARI
========================================================= */

function createId(
    prefix = "id"
) {

    return (
        prefix +
        "_" +
        Date.now().toString(36) +
        "_" +
        crypto
            .randomBytes(8)
            .toString("hex")
    );
}


function createUUID() {

    if (
        typeof crypto.randomUUID ===
        "function"
    ) {

        return crypto.randomUUID();
    }

    return createId(
        "uuid"
    );
}


function createToken(
    bytes = 32
) {

    return crypto
        .randomBytes(bytes)
        .toString("hex");
}


/* =========================================================
   17. LOG FONKSİYONLARI
========================================================= */

function appendLog(
    filePath,
    message
) {

    try {

        const line =
            `[${nowISO()}] ${message}\n`;

        fs.appendFileSync(
            filePath,
            line,
            "utf8"
        );

    } catch (error) {

        console.error(
            "[TürkAI] Log yazılamadı:",
            error.message
        );
    }
}


function logInfo(
    message
) {

    console.log(
        `[TürkAI] ${message}`
    );

    appendLog(
        LOG_FILES.server,
        message
    );
}


function logWarn(
    message
) {

    console.warn(
        `[TürkAI][UYARI] ${message}`
    );

    appendLog(
        LOG_FILES.server,
        `UYARI: ${message}`
    );
}


function logError(
    message,
    error = null
) {

    let output =
        message;

    if (
        error &&
        error.stack
    ) {

        output +=
            `\n${error.stack}`;
    }

    console.error(
        `[TürkAI][HATA] ${output}`
    );

    appendLog(
        LOG_FILES.error,
        output
    );
}


function logSecurity(
    message
) {

    appendLog(
        LOG_FILES.security,
        message
    );
}


function logAI(
    message
) {

    appendLog(
        LOG_FILES.ai,
        message
    );
}


/* =========================================================
   18. REQUEST METRICS
========================================================= */

const REQUEST_METRICS = {

    total: 0,

    successful: 0,

    failed: 0,

    active: 0,

    startedAt:
        nowISO(),

    byMethod: {

        GET: 0,

        POST: 0,

        PUT: 0,

        PATCH: 0,

        DELETE: 0,

        OPTIONS: 0
    },

    byPath: {}
};


/* =========================================================
   19. AI DURUMU
========================================================= */

const AI_STATUS = {

    online: true,

    provider: "local",

    lastProvider: "local",

    lastSuccessAt: null,

    lastErrorAt: null,

    lastError: null,

    requestCount: 0,

    successCount: 0,

    failureCount: 0
};


/* =========================================================
   20. SERVER DURUMU
========================================================= */

const SERVER_STATE = {

    ready: false,

    started: false,

    shuttingDown: false,

    maintenance: false,

    serverId:
        SERVER_ID,

    startedAt:
        nowISO(),

    environment:
        NODE_ENV,

    version:
        APP_VERSION
};


/* =========================================================
   21. EXPRESS GÜVENLİK AYARLARI
========================================================= */

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
        origin: true,

        credentials: true,

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
            "X-TurkAI-User",
            "X-TurkAI-Session"
        ]
    })
);


/* =========================================================
   22. BODY PARSER
========================================================= */

app.use(
    express.json({
        limit: "25mb"
    })
);


app.use(
    express.urlencoded({
        extended: true,
        limit: "25mb"
    })
);


/* =========================================================
   23. REQUEST METRIC MIDDLEWARE
========================================================= */

app.use(
    (req, res, next) => {

        const start =
            process.hrtime.bigint();

        REQUEST_METRICS.total++;

        REQUEST_METRICS.active++;

        if (
            Object.prototype.hasOwnProperty.call(
                REQUEST_METRICS.byMethod,
                req.method
            )
        ) {

            REQUEST_METRICS.byMethod[
                req.method
            ]++;
        }

        const routePath =
            req.path || "/";

        if (
            !REQUEST_METRICS.byPath[
                routePath
            ]
        ) {

            REQUEST_METRICS.byPath[
                routePath
            ] = 0;
        }

        REQUEST_METRICS.byPath[
            routePath
        ]++;

        res.on(
            "finish",
            () => {

                REQUEST_METRICS.active--;

                const duration =
                    Number(
                        process.hrtime.bigint() -
                        start
                    ) / 1000000;

                if (
                    res.statusCode >= 200 &&
                    res.statusCode < 400
                ) {

                    REQUEST_METRICS.successful++;

                } else {

                    REQUEST_METRICS.failed++;
                }

                if (
                    req.path !==
                    "/api/health"
                ) {

                    appendLog(
                        LOG_FILES.access,

                        `${req.method} ${req.originalUrl} ${res.statusCode} ${duration.toFixed(2)}ms`
                    );
                }
            }
        );

        next();
    }
);


/* =========================================================
   24. KULLANICI SİSTEMİ
========================================================= */

function getUsers() {

    const users =
        readJSONSafe(
            DB_FILES.users,
            []
        );

    return Array.isArray(users)
        ? users
        : [];
}


function saveUsers(
    users
) {

    return writeJSONSafe(
        DB_FILES.users,
        Array.isArray(users)
            ? users
            : []
    );
}


function findUserById(
    userId
) {

    const users =
        getUsers();

    return (
        users.find(
            user =>
                user.id ===
                userId
        ) || null
    );
}


function findUserByEmail(
    email
) {

    const normalized =
        cleanText(
            email,
            500
        ).toLocaleLowerCase(
            "tr-TR"
        );

    if (!normalized) {
        return null;
    }

    const users =
        getUsers();

    return (
        users.find(
            user =>
                String(
                    user.email || ""
                ).toLocaleLowerCase(
                    "tr-TR"
                ) === normalized
        ) || null
    );
}


/* =========================================================
   25. KULLANICI OLUŞTUR
========================================================= */

function createUser(
    data = {}
) {

    const email =
        cleanText(
            data.email,
            500
        );

    if (email) {

        const existing =
            findUserByEmail(
                email
            );

        if (existing) {
            return existing;
        }
    }

    const user = {

        id:
            data.id ||
            createUUID(),

        name:
            cleanText(
                data.name ||
                "TürkAI Kullanıcısı",
                200
            ),

        email,

        avatar:
            cleanText(
                data.avatar ||
                "",
                2000
            ),

        plan:
            data.plan ||
            "free",

        active:
            true,

        createdAt:
            nowISO(),

        updatedAt:
            nowISO()
    };

    const users =
        getUsers();

    users.push(
        user
    );

    saveUsers(
        users
    );

    return user;
}


/* =========================================================
   26. MİSAFİR KULLANICI
========================================================= */

function getGuestUser() {

    return {

        id:
            "guest",

        name:
            "Misafir",

        email:
            "",

        avatar:
            "",

        plan:
            "free",

        guest:
            true,

        active:
            true
    };
}


/* =========================================================
   27. SESSION SİSTEMİ
========================================================= */

function getSessions() {

    const sessions =
        readJSONSafe(
            DB_FILES.sessions,
            []
        );

    return Array.isArray(
        sessions
    )
        ? sessions
        : [];
}


function saveSessions(
    sessions
) {

    return writeJSONSafe(
        DB_FILES.sessions,
        Array.isArray(
            sessions
        )
            ? sessions
            : []
    );
}


/* =========================================================
   28. SESSION OLUŞTUR
========================================================= */

function createSession(
    userId
) {

    const session = {

        id:
            createId(
                "session"
            ),

        token:
            createToken(
                32
            ),

        userId,

        createdAt:
            nowISO(),

        lastUsedAt:
            nowISO(),

        expiresAt:
            new Date(
                Date.now() +
                30 *
                24 *
                60 *
                60 *
                1000
            ).toISOString()
    };

    const sessions =
        getSessions();

    sessions.push(
        session
    );

    saveSessions(
        sessions
    );

    return session;
}


/* =========================================================
   29. SESSION BUL
========================================================= */

function getSessionByToken(
    token
) {

    const normalized =
        cleanText(
            token,
            500
        );

    if (!normalized) {
        return null;
    }

    const sessions =
        getSessions();

    const session =
        sessions.find(
            item =>
                item.token ===
                normalized
        );

    if (!session) {
        return null;
    }

    if (
        session.expiresAt
    ) {

        const expires =
            new Date(
                session.expiresAt
            ).getTime();

        if (
            Number.isFinite(
                expires
            ) &&
            expires < Date.now()
        ) {

            return null;
        }
    }

    return session;
}


/* =========================================================
   30. REQUEST USER
========================================================= */

function getRequestUser(
    req
) {

    const headerUser =
        req.headers[
            "x-turkai-user"
        ];

    const bodyUser =
        req.body &&
        typeof req.body ===
        "object"
            ? req.body.userId
            : null;

    const queryUser =
        req.query &&
        typeof req.query ===
        "object"
            ? req.query.userId
            : null;

    const userId =
        cleanText(
            headerUser ||
            bodyUser ||
            queryUser ||
            "",
            300
        );

    if (!userId) {

        return getGuestUser();
    }

    const user =
        findUserById(
            userId
        );

    if (!user) {

        return getGuestUser();
    }

    return user;
}


/* =========================================================
   31. AUTH MIDDLEWARE
========================================================= */

function optionalAuth(
    req,
    res,
    next
) {

    req.user =
        null;

    req.session =
        null;

    const authorization =
        req.headers.authorization;

    if (
        authorization &&
        authorization.startsWith(
            "Bearer "
        )
    ) {

        const token =
            authorization
                .slice(7)
                .trim();

        const session =
            getSessionByToken(
                token
            );

        if (session) {

            const user =
                findUserById(
                    session.userId
                );

            if (user) {

                session.lastUsedAt =
                    nowISO();

                const sessions =
                    getSessions();

                const index =
                    sessions.findIndex(
                        item =>
                            item.id ===
                            session.id
                    );

                if (index !== -1) {

                    sessions[index] =
                        session;

                    saveSessions(
                        sessions
                    );
                }

                req.user =
                    user;

                req.session =
                    session;
            }
        }
    }

    if (!req.user) {

        req.user =
            getRequestUser(
                req
            );
    }

    next();
}


app.use(
    optionalAuth
);


/* =========================================================
   32. PLAN SİSTEMİ
========================================================= */

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

        maxFileSizeMB:
            10,

        memory:
            true,

        coding:
            true,

        research:
            true
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

        maxFileSizeMB:
            25,

        memory:
            true,

        coding:
            true,

        research:
            true
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

        maxFileSizeMB:
            50,

        memory:
            true,

        coding:
            true,

        research:
            true
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

        maxFileSizeMB:
            100,

        memory:
            true,

        coding:
            true,

        research:
            true
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

        maxFileSizeMB:
            200,

        memory:
            true,

        coding:
            true,

        research:
            true
    }
};


/* =========================================================
   33. PLAN DOĞRULAMA
========================================================= */

function normalizePlan(
    plan
) {

    const value =
        cleanText(
            plan,
            100
        ).toLocaleLowerCase(
            "tr-TR"
        );

    if (
        PLANS[value]
    ) {

        return value;
    }

    return "free";
}


/* =========================================================
   34. SETTINGS
========================================================= */

function getSettings() {

    const settings =
        readJSONSafe(
            DB_FILES.settings,
            DATABASE_DEFAULTS.settings
        );

    return {
        ...DATABASE_DEFAULTS.settings,
        ...(settings || {})
    };
}


function saveSettings(
    settings
) {

    return writeJSONSafe(
        DB_FILES.settings,
        {
            ...DATABASE_DEFAULTS.settings,
            ...(settings || {})
        }
    );
}


/* =========================================================
   35. HEALTH
========================================================= */

app.get(
    "/api/health",
    (req, res) => {

        const memory =
            process.memoryUsage();

        res.status(200).json({

            ok:
                true,

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

            uptimeSeconds:
                Math.floor(
                    process.uptime()
                ),

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

            timestamp:
                nowISO()
        });
    }
);


/* =========================================================
   36. STATUS
========================================================= */

app.get(
    "/api/status",
    (req, res) => {

        const memory =
            process.memoryUsage();

        res.json({

            ok:
                true,

            success:
                true,

            app:
                APP_NAME,

            version:
                APP_VERSION,

            description:
                APP_DESCRIPTION,

            server: {

                id:
                    SERVER_ID,

                host:
                    HOST,

                port:
                    PORT,

                environment:
                    NODE_ENV,

                uptime:
                    process.uptime(),

                startedAt:
                    SERVER_STATE.startedAt,

                ready:
                    SERVER_STATE.ready
            },

            ai:
                AI_STATUS,

            requests: {

                total:
                    REQUEST_METRICS.total,

                active:
                    REQUEST_METRICS.active,

                successful:
                    REQUEST_METRICS.successful,

                failed:
                    REQUEST_METRICS.failed
            },

            memory: {

                rss:
                    memory.rss,

                heapUsed:
                    memory.heapUsed,

                heapTotal:
                    memory.heapTotal
            },

            timestamp:
                nowISO()
        });
    }
);


/* =========================================================
   37. TEST
========================================================= */

app.get(
    "/api/test",
    (req, res) => {

        res.json({

            ok:
                true,

            success:
                true,

            message:
                "TürkAI API çalışıyor.",

            app:
                APP_NAME,

            version:
                APP_VERSION,

            serverId:
                SERVER_ID,

            timestamp:
                nowISO()
        });
    }
);


/* =========================================================
   38. PLANLAR
========================================================= */

app.get(
    "/api/plans",
    (req, res) => {

        res.json({

            ok:
                true,

            plans:
                Object.values(
                    PLANS
                )
        });
    }
);


/* =========================================================
   39. BENİM PLANIM
========================================================= */

app.get(
    "/api/me/plan",
    (req, res) => {

        const user =
            req.user ||
            getGuestUser();

        const plan =
            normalizePlan(
                user.plan
            );

        res.json({

            ok:
                true,

            userId:
                user.id,

            plan:
                PLANS[plan]
        });
    }
);


/* =========================================================
   40. ME
========================================================= */

app.get(
    "/api/me",
    (req, res) => {

        const user =
            req.user ||
            getGuestUser();

        res.json({

            ok:
                true,

            user
        });
    }
);


/* =========================================================
   41. SESSION OLUŞTURMA
========================================================= */

app.post(
    "/api/session",
    (req, res) => {

        const name =
            cleanText(
                req.body &&
                req.body.name,
                200
            ) ||
            "TürkAI Kullanıcısı";

        const email =
            cleanText(
                req.body &&
                req.body.email,
                500
            );

        let user =
            email
                ? findUserByEmail(
                    email
                )
                : null;

        if (!user) {

            user =
                createUser({
                    name,
                    email,
                    avatar:
                        req.body &&
                        req.body.avatar
                });
        }

        const session =
            createSession(
                user.id
            );

        res.json({

            ok:
                true,

            success:
                true,

            user,

            session: {

                id:
                    session.id,

                token:
                    session.token,

                expiresAt:
                    session.expiresAt
            }
        });
    }
);


/* =========================================================
   42. SOCKET.IO
========================================================= */

io.on(
    "connection",
    socket => {

        logInfo(
            `Socket bağlandı: ${socket.id}`
        );

        socket.emit(
            "turkai:connected",
            {

                ok:
                    true,

                app:
                    APP_NAME,

                version:
                    APP_VERSION,

                socketId:
                    socket.id,

                timestamp:
                    nowISO()
            }
        );


        socket.on(
            "turkai:ping",
            data => {

                socket.emit(
                    "turkai:pong",
                    {

                        ok:
                            true,

                        received:
                            data ?? null,

                        timestamp:
                            nowISO()
                    }
                );
            }
        );


        socket.on(
            "disconnect",
            reason => {

                logInfo(
                    `Socket ayrıldı: ${socket.id} | ${reason}`
                );
            }
        );
    }
);


/* =========================================================
   43. API 404
========================================================= */

app.use(
    "/api",
    (req, res) => {

        res.status(404).json({

            ok:
                false,

            success:
                false,

            error:
                "API endpoint bulunamadı.",

            path:
                req.originalUrl,

            method:
                req.method,

            timestamp:
                nowISO()
        });
    }
);


/* =========================================================
   44. GLOBAL ERROR HANDLER
========================================================= */

app.use(
    (error, req, res, next) => {

        logError(
            `${req.method} ${req.originalUrl}`,
            error
        );

        if (
            res.headersSent
        ) {

            return next(
                error
            );
        }

        res.status(
            error.statusCode ||
            500
        ).json({

            ok:
                false,

            success:
                false,

            error:
                IS_PRODUCTION
                    ? "Sunucu tarafında bir hata oluştu."
                    : error.message,

            timestamp:
                nowISO()
        });
    }
);


/* =========================================================
   45. SERVER BAŞLATMA
========================================================= */

function startServer() {

    if (
        SERVER_STATE.started
    ) {

        logWarn(
            "Sunucu zaten başlatılmış."
        );

        return;
    }

    httpServer.listen(
        PORT,
        HOST,
        () => {

            SERVER_STATE.started =
                true;

            SERVER_STATE.ready =
                true;

            logInfo(
                "════════════════════════════════════════"
            );

            logInfo(
                "TürkAI sunucusu başlatıldı."
            );

            logInfo(
                `Uygulama: ${APP_NAME}`
            );

            logInfo(
                `Sürüm: ${APP_VERSION}`
            );

            logInfo(
                `Ortam: ${NODE_ENV}`
            );

            logInfo(
                `Host: ${HOST}`
            );

            logInfo(
                `Port: ${PORT}`
            );

            logInfo(
                `Server ID: ${SERVER_ID}`
            );

            logInfo(
                `Health: http://localhost:${PORT}/api/health`
            );

            logInfo(
                "════════════════════════════════════════"
            );
        }
    );
}


/* =========================================================
   46. SHUTDOWN
========================================================= */

function shutdown(
    signal
) {

    if (
        SERVER_STATE.shuttingDown
    ) {

        return;
    }

    SERVER_STATE.shuttingDown =
        true;

    SERVER_STATE.ready =
        false;

    logInfo(
        `${signal} alındı. TürkAI kapatılıyor...`
    );

    io.close(
        () => {

            httpServer.close(
                () => {

                    logInfo(
                        "TürkAI sunucusu güvenli şekilde kapatıldı."
                    );

                    process.exit(
                        0
                    );
                }
            );
        }
    );

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
    () => {
        shutdown("SIGTERM");
    }
);


process.on(
    "SIGINT",
    () => {
        shutdown("SIGINT");
    }
);


/* =========================================================
   47. UNHANDLED ERROR
========================================================= */

process.on(
    "uncaughtException",
    error => {

        logError(
            "Yakalanmamış exception.",
            error
        );
    }
);


process.on(
    "unhandledRejection",
    reason => {

        logError(
            "Yakalanmamış promise rejection.",
            reason instanceof Error
                ? reason
                : new Error(
                    String(reason)
                )
        );
    }
);


/* =========================================================
   48. BAŞLANGIÇ
========================================================= */

SERVER_STATE.started =
    false;

SERVER_STATE.ready =
    false;

logInfo(
    `${APP_NAME} ${APP_VERSION} hazırlanıyor...`
);

startServer();


/* =========================================================
   49. EXPORT
========================================================= */

module.exports = {

    app,

    httpServer,

    io,

    APP_NAME,

    APP_VERSION,

    PORT,

    HOST,

    DB_FILES,

    LOG_FILES,

    PLANS,

    AI_STATUS,

    SERVER_STATE,

    REQUEST_METRICS,

    readJSONSafe,

    writeJSONSafe,

    cleanText,

    normalizeText,

    nowISO,

    nowUnix,

    getTodayKey,

    createId,

    createUUID,

    createToken,

    getUsers,

    saveUsers,

    findUserById,

    findUserByEmail,

    createUser,

    getGuestUser,

    getSessions,

    saveSessions,

    createSession,

    getSessionByToken,

    getRequestUser,

    getSettings,

    saveSettings,

    logInfo,

    logWarn,

    logError,

    logSecurity,

    logAI
};
/* =========================================================
   TÜRKAI SERVER 11.0.0
   PART 2 / 5
   AI ÇEKİRDEĞİ + CHAT SİSTEMİ
========================================================= */


/* =========================================================
   50. AI AYARLARI
========================================================= */

const AI_CONFIG = {

    temperature:
        Number(
            process.env.AI_TEMPERATURE
        ) || 0.7,

    maxTokens:
        Number(
            process.env.AI_MAX_TOKENS
        ) || 4096,

    timeout:
        Number(
            process.env.AI_TIMEOUT
        ) || 30000,

    models: {

        groq:
            process.env.GROQ_MODEL ||
            "openai/gpt-oss-20b",

        cerebras:
            process.env.CEREBRAS_MODEL ||
            "gpt-oss-120b",

        openrouter:
            process.env.OPENROUTER_MODEL ||
            "openai/gpt-oss-20b",

        gemini:
            process.env.GEMINI_MODEL ||
            "gemini-2.0-flash"
    },

    providers: {

        groq:
            Boolean(
                process.env.GROQ_API_KEY
            ),

        cerebras:
            Boolean(
                process.env.CEREBRAS_API_KEY
            ),

        openrouter:
            Boolean(
                process.env.OPENROUTER_API_KEY
            ),

        gemini:
            Boolean(
                process.env.GEMINI_API_KEY
            )
    }
};


/* =========================================================
   51. AI SAĞLAYICI DURUMLARI
========================================================= */

const AI_PROVIDERS = {

    groq: {

        name:
            "Groq",

        enabled:
            AI_CONFIG.providers.groq,

        failures:
            0,

        successes:
            0,

        lastError:
            null,

        lastSuccess:
            null
    },

    cerebras: {

        name:
            "Cerebras",

        enabled:
            AI_CONFIG.providers.cerebras,

        failures:
            0,

        successes:
            0,

        lastError:
            null,

        lastSuccess:
            null
    },

    openrouter: {

        name:
            "OpenRouter",

        enabled:
            AI_CONFIG.providers.openrouter,

        failures:
            0,

        successes:
            0,

        lastError:
            null,

        lastSuccess:
            null
    },

    gemini: {

        name:
            "Gemini",

        enabled:
            AI_CONFIG.providers.gemini,

        failures:
            0,

        successes:
            0,

        lastError:
            null,

        lastSuccess:
            null
    }
};


/* =========================================================
   52. AI SİSTEM PROMPTU
========================================================= */

const TURKAI_SYSTEM_PROMPT = `
Sen TürkAI'sın.

Türkçe konuşan kullanıcılar için tasarlanmış
modern, yardımcı ve anlaşılır bir yapay zeka
asistanısın.

Kurallar:

1. Kullanıcı Türkçe konuşuyorsa Türkçe cevap ver.
2. Kullanıcının dilini mümkün olduğunca koru.
3. Kod istenirse çalışan ve anlaşılır kod üret.
4. Kod verirken gerekli dosya adlarını belirt.
5. Kullanıcı "knk", "dostum" gibi samimi konuşuyorsa
   doğal ve samimi cevap verebilirsin.
6. Bilmediğin bilgiyi kesin gerçekmiş gibi uydurma.
7. Güncel bilgi gerektiğinde araştırma sistemi kullanılabilir.
8. Matematik işlemlerinde sonucu mümkün olduğunca doğru hesapla.
9. Kullanıcının sorusunu gereksiz yere tekrar etme.
10. Gereksiz uzun girişler yapma.
11. Kullanıcı açıkça ayrıntı isterse ayrıntılı cevap ver.
12. Kod istenirse kodu eksik bırakma.
13. Bir hata düzeltilecekse hatanın nedenini ve çözümünü belirt.
14. Güvenlik açısından zararlı veya tehlikeli işlemleri
    kolaylaştırma.
15. Kullanıcı bir uygulama geliştiriyorsa mevcut yapıya
    uyumlu kod üretmeye çalış.

Senin uygulama adın:

TürkAI
`;


/* =========================================================
   53. FETCH TIMEOUT
========================================================= */

async function fetchWithTimeout(
    url,
    options = {},
    timeout = AI_CONFIG.timeout
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
                        controller.signal
                }
            );

        return response;

    } finally {

        clearTimeout(
            timer
        );
    }
}


/* =========================================================
   54. RESPONSE JSON
========================================================= */

async function parseJSONResponse(
    response
) {

    const text =
        await response.text();

    if (!text) {
        return {};
    }

    try {

        return JSON.parse(
            text
        );

    } catch {

        return {
            raw:
                text
        };
    }
}


/* =========================================================
   55. AI HATA NESNESİ
========================================================= */

function createAIError(
    provider,
    message,
    status = 500
) {

    const error =
        new Error(
            message
        );

    error.provider =
        provider;

    error.status =
        status;

    return error;
}


/* =========================================================
   56. AI BAŞARILI
========================================================= */

function registerProviderSuccess(
    provider
) {

    if (
        AI_PROVIDERS[provider]
    ) {

        AI_PROVIDERS[
            provider
        ].successes++;

        AI_PROVIDERS[
            provider
        ].lastSuccess =
            nowISO();

        AI_PROVIDERS[
            provider
        ].lastError =
            null;
    }

    AI_STATUS.provider =
        provider;

    AI_STATUS.lastProvider =
        provider;

    AI_STATUS.lastSuccessAt =
        nowISO();

    AI_STATUS.lastError =
        null;

    AI_STATUS.successCount++;
}


/* =========================================================
   57. AI HATA
========================================================= */

function registerProviderFailure(
    provider,
    error
) {

    if (
        AI_PROVIDERS[provider]
    ) {

        AI_PROVIDERS[
            provider
        ].failures++;

        AI_PROVIDERS[
            provider
        ].lastError =
            error.message;
    }

    AI_STATUS.lastErrorAt =
        nowISO();

    AI_STATUS.lastError =
        error.message;

    AI_STATUS.failureCount++;

    logAI(
        `${provider} başarısız: ${error.message}`
    );
}


/* =========================================================
   58. AI METİN NORMALİZASYONU
========================================================= */

function normalizeAIText(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    if (
        typeof value ===
        "string"
    ) {

        return value.trim();
    }

    if (
        Array.isArray(value)
    ) {

        return value
            .map(
                item =>
                    normalizeAIText(
                        item
                    )
            )
            .filter(Boolean)
            .join("\n");
    }

    if (
        typeof value ===
        "object"
    ) {

        if (
            typeof value.text ===
            "string"
        ) {

            return value.text.trim();
        }

        if (
            typeof value.content ===
            "string"
        ) {

            return value.content.trim();
        }

        if (
            typeof value.message ===
            "string"
        ) {

            return value.message.trim();
        }

        if (
            typeof value.output ===
            "string"
        ) {

            return value.output.trim();
        }
    }

    return String(
        value
    ).trim();
}


/* =========================================================
   59. BASİT MATEMATİK
========================================================= */

function solveSimpleMath(
    input
) {

    const text =
        cleanText(
            input,
            500
        );

    if (!text) {
        return null;
    }

    const normalized =
        text
            .replace(
                /,/g,
                "."
            )
            .replace(
                /×/g,
                "*"
            )
            .replace(
                /÷/g,
                "/"
            )
            .replace(
                /−/g,
                "-"
            )
            .trim();

    if (
        !/^[0-9+\-*/().%\s]+$/.test(
            normalized
        )
    ) {

        return null;
    }

    if (
        !/[+\-*/%]/.test(
            normalized
        )
    ) {

        return null;
    }

    try {

        /*
         * Burada sadece matematik karakterleri
         * kabul edildiği için kontrollü hesaplama
         * yapılır.
         */

        const result =
            Function(
                `"use strict"; return (${normalized})`
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

    } catch {

        return null;
    }
}


/* =========================================================
   60. YEREL CEVAP SİSTEMİ
========================================================= */

function localResponse(
    message
) {

    const original =
        cleanText(
            message,
            5000
        );

    const text =
        normalizeText(
            original
        );

    if (!text) {

        return {
            handled:
                true,

            text:
                "Buradayım. Ne yapmak istiyorsun?"
        };
    }


    /* -----------------------------------------
       SELAMLAMA
    ----------------------------------------- */

    if (
        /^(selam|merhaba|hey|sa|sela(m|münaleyküm)|günaydın|iyi akşamlar|iyi geceler)\b/
            .test(text)
    ) {

        return {

            handled:
                true,

            text:
                "Selam knk! 👋 TürkAI burada. Ne yapalım?"
        };
    }


    /* -----------------------------------------
       TÜRKAI SORUSU
    ----------------------------------------- */

    if (
        text.includes(
            "en hızlı kim"
        )
    ) {

        return {

            handled:
                true,

            text:
                "TürkAI ⚡🤖"
        };
    }


    /* -----------------------------------------
       SEN KİMSİN
    ----------------------------------------- */

    if (
        text.includes(
            "sen kimsin"
        ) ||
        text.includes(
            "adın ne"
        ) ||
        text.includes(
            "ismin ne"
        )
    ) {

        return {

            handled:
                true,

            text:
                "Ben TürkAI'yım. Türkçe odaklı yapay zeka asistanıyım."
        };
    }


    /* -----------------------------------------
       TEŞEKKÜR
    ----------------------------------------- */

    if (
        text.includes(
            "teşekkür"
        ) ||
        text === "sağ ol" ||
        text === "eyvallah"
    ) {

        return {

            handled:
                true,

            text:
                "Rica ederim knk. 😎"
        };
    }


    /* -----------------------------------------
       MATEMATİK
    ----------------------------------------- */

    const math =
        solveSimpleMath(
            original
        );

    if (math !== null) {

        return {

            handled:
                true,

            text:
                `Sonuç: ${math}`
        };
    }


    /* -----------------------------------------
       BOŞ / KISA KOMUTLAR
    ----------------------------------------- */

    if (
        text === "yardım" ||
        text === "help"
    ) {

        return {

            handled:
                true,

            text:
                [
                    "TürkAI ile şunları yapabilirsin:",
                    "",
                    "• Soru sorabilirsin",
                    "• Kod yazdırabilirsin",
                    "• Proje geliştirebilirsin",
                    "• Metin oluşturabilirsin",
                    "• Matematik çözebilirsin",
                    "• Araştırma yaptırabilirsin",
                    "• Dosya işlemleri kullanabilirsin"
                ].join("\n")
        };
    }


    return {

        handled:
            false,

        text:
            null
    };
}


/* =========================================================
   61. CHAT MESAJLARI
========================================================= */

function getMessages() {

    const messages =
        readJSONSafe(
            DB_FILES.messages,
            []
        );

    return Array.isArray(
        messages
    )
        ? messages
        : [];
}


function saveMessages(
    messages
) {

    return writeJSONSafe(
        DB_FILES.messages,
        Array.isArray(
            messages
        )
            ? messages
            : []
    );
}


/* =========================================================
   62. CHATLER
========================================================= */

function getChats() {

    const chats =
        readJSONSafe(
            DB_FILES.chats,
            []
        );

    return Array.isArray(
        chats
    )
        ? chats
        : [];
}


function saveChats(
    chats
) {

    return writeJSONSafe(
        DB_FILES.chats,
        Array.isArray(
            chats
        )
            ? chats
            : []
    );
}


/* =========================================================
   63. CHAT OLUŞTUR
========================================================= */

function createChat(
    userId,
    title = "Yeni sohbet"
) {

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

        messageCount:
            0,

        archived:
            false
    };

    const chats =
        getChats();

    chats.push(
        chat
    );

    saveChats(
        chats
    );

    return chat;
}


/* =========================================================
   64. CHAT BUL
========================================================= */

function findChatById(
    chatId
) {

    if (!chatId) {
        return null;
    }

    const chats =
        getChats();

    return (
        chats.find(
            chat =>
                chat.id ===
                chatId
        ) || null
    );
}


/* =========================================================
   65. MESAJ EKLE
========================================================= */

function addMessage(
    data = {}
) {

    const message = {

        id:
            createId(
                "msg"
            ),

        chatId:
            data.chatId ||
            null,

        userId:
            data.userId ||
            "guest",

        role:
            data.role ||
            "user",

        content:
            cleanText(
                data.content,
                50000
            ),

        model:
            data.model ||
            "local",

        provider:
            data.provider ||
            "local",

        createdAt:
            nowISO(),

        metadata:
            data.metadata ||
            {}
    };

    const messages =
        getMessages();

    messages.push(
        message
    );

    saveMessages(
        messages
    );

    return message;
}


/* =========================================================
   66. CHAT MESAJLARINI AL
========================================================= */

function getChatMessages(
    chatId,
    limit = 30
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
            -Math.max(
                1,
                Math.min(
                    Number(limit) || 30,
                    100
                )
            )
        );
}


/* =========================================================
   67. AI MESAJ LİSTESİ
========================================================= */

function buildAIMessageList(
    chatMessages,
    userMessage
) {

    const list = [

        {
            role:
                "system",

            content:
                TURKAI_SYSTEM_PROMPT
        }
    ];


    for (
        const message
        of chatMessages
    ) {

        if (
            !message ||
            !message.content
        ) {
            continue;
        }

        const role =
            message.role ===
            "assistant"
                ? "assistant"
                : "user";

        list.push({

            role,

            content:
                cleanText(
                    message.content,
                    20000
                )
        });
    }


    list.push({

        role:
            "user",

        content:
            cleanText(
                userMessage,
                20000
            )
    });


    return list;
}


/* =========================================================
   68. GROQ
========================================================= */

async function callGroq(
    messages
) {

    const apiKey =
        process.env.GROQ_API_KEY;

    if (!apiKey) {

        throw createAIError(
            "groq",
            "GROQ_API_KEY bulunamadı.",
            401
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
                        `Bearer ${apiKey}`
                },

                body:
                    JSON.stringify({

                        model:
                            AI_CONFIG.models.groq,

                        messages,

                        temperature:
                            AI_CONFIG.temperature,

                        max_tokens:
                            AI_CONFIG.maxTokens
                    })
            }
        );


    const data =
        await parseJSONResponse(
            response
        );


    if (
        !response.ok
    ) {

        throw createAIError(

            "groq",

            data?.error?.message ||
            data?.message ||
            `Groq HTTP ${response.status}`,

            response.status
        );
    }


    const text =
        data?.choices?.[0]?.message?.content;


    if (!text) {

        throw createAIError(
            "groq",
            "Groq boş cevap döndürdü.",
            502
        );
    }


    return normalizeAIText(
        text
    );
}


/* =========================================================
   69. CEREBRAS
========================================================= */

async function callCerebras(
    messages
) {

    const apiKey =
        process.env.CEREBRAS_API_KEY;

    if (!apiKey) {

        throw createAIError(
            "cerebras",
            "CEREBRAS_API_KEY bulunamadı.",
            401
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
                        `Bearer ${apiKey}`
                },

                body:
                    JSON.stringify({

                        model:
                            AI_CONFIG.models.cerebras,

                        messages,

                        temperature:
                            AI_CONFIG.temperature,

                        max_tokens:
                            AI_CONFIG.maxTokens
                    })
            }
        );


    const data =
        await parseJSONResponse(
            response
        );


    if (
        !response.ok
    ) {

        throw createAIError(

            "cerebras",

            data?.error?.message ||
            data?.message ||
            `Cerebras HTTP ${response.status}`,

            response.status
        );
    }


    const text =
        data?.choices?.[0]?.message?.content;


    if (!text) {

        throw createAIError(
            "cerebras",
            "Cerebras boş cevap döndürdü.",
            502
        );
    }


    return normalizeAIText(
        text
    );
}


/* =========================================================
   70. OPENROUTER
========================================================= */

async function callOpenRouter(
    messages
) {

    const apiKey =
        process.env.OPENROUTER_API_KEY;

    if (!apiKey) {

        throw createAIError(
            "openrouter",
            "OPENROUTER_API_KEY bulunamadı.",
            401
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
                        `Bearer ${apiKey}`,

                    "HTTP-Referer":
                        process.env.APP_URL ||
                        "http://localhost:3000",

                    "X-Title":
                        "TürkAI"
                },

                body:
                    JSON.stringify({

                        model:
                            AI_CONFIG.models.openrouter,

                        messages,

                        temperature:
                            AI_CONFIG.temperature,

                        max_tokens:
                            AI_CONFIG.maxTokens
                    })
            }
        );


    const data =
        await parseJSONResponse(
            response
        );


    if (
        !response.ok
    ) {

        throw createAIError(

            "openrouter",

            data?.error?.message ||
            data?.message ||
            `OpenRouter HTTP ${response.status}`,

            response.status
        );
    }


    const text =
        data?.choices?.[0]?.message?.content;


    if (!text) {

        throw createAIError(
            "openrouter",
            "OpenRouter boş cevap döndürdü.",
            502
        );
    }


    return normalizeAIText(
        text
    );
}


/* =========================================================
   71. GEMINI
========================================================= */

async function callGemini(
    messages
) {

    const apiKey =
        process.env.GEMINI_API_KEY;

    if (!apiKey) {

        throw createAIError(
            "gemini",
            "GEMINI_API_KEY bulunamadı.",
            401
        );
    }


    const model =
        AI_CONFIG.models.gemini;


    const systemMessages =
        messages.filter(
            item =>
                item.role ===
                "system"
        );


    const normalMessages =
        messages.filter(
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
            .join("\n\n");


    const contents =
        normalMessages.map(
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
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;


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

                        systemInstruction:
                            systemText
                                ? {
                                    parts: [
                                        {
                                            text:
                                                systemText
                                        }
                                    ]
                                }
                                : undefined,

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


    const data =
        await parseJSONResponse(
            response
        );


    if (
        !response.ok
    ) {

        throw createAIError(

            "gemini",

            data?.error?.message ||
            data?.message ||
            `Gemini HTTP ${response.status}`,

            response.status
        );
    }


    const parts =
        data?.candidates?.[0]?.content?.parts ||
        [];


    const text =
        parts
            .map(
                part =>
                    part.text || ""
            )
            .join("\n")
            .trim();


    if (!text) {

        throw createAIError(
            "gemini",
            "Gemini boş cevap döndürdü.",
            502
        );
    }


    return text;
}


/* =========================================================
   72. SAĞLAYICI SIRASI
========================================================= */

const PROVIDER_ORDER = [

    "groq",

    "cerebras",

    "openrouter",

    "gemini"
];


/* =========================================================
   73. MODEL ÇAĞIRICI
========================================================= */

async function callAIProviders(
    messages,
    preferredProvider = null
) {

    AI_STATUS.requestCount++;

    const order = [
        ...(preferredProvider &&
        PROVIDER_ORDER.includes(
            preferredProvider
        )
            ? [
                preferredProvider
            ]
            : []),

        ...PROVIDER_ORDER.filter(
            provider =>
                provider !==
                preferredProvider
        )
    ];


    const callers = {

        groq:
            callGroq,

        cerebras:
            callCerebras,

        openrouter:
            callOpenRouter,

        gemini:
            callGemini
    };


    const errors = [];


    for (
        const provider
        of order
    ) {

        const providerInfo =
            AI_PROVIDERS[
                provider
            ];

        if (
            !providerInfo ||
            !providerInfo.enabled
        ) {
            continue;
        }


        try {

            logAI(
                `${provider} deneniyor...`
            );


            const answer =
                await callers[
                    provider
                ](
                    messages
                );


            if (
                answer &&
                answer.trim()
            ) {

                registerProviderSuccess(
                    provider
                );

                return {

                    ok:
                        true,

                    provider,

                    text:
                        answer
                };
            }


            throw createAIError(
                provider,
                "Boş cevap.",
                502
            );

        } catch (error) {

            registerProviderFailure(
                provider,
                error
            );

            errors.push({

                provider,

                message:
                    error.message,

                status:
                    error.status ||
                    500
            });
        }
    }


    AI_STATUS.provider =
        "local";


    return {

        ok:
            false,

        provider:
            "local",

        text:
            "",

        errors
    };
}


/* =========================================================
   74. KOD SORUSU ALGILAMA
========================================================= */

function looksLikeCodingQuestion(
    text
) {

    const value =
        normalizeText(
            text
        );

    const keywords = [

        "javascript",

        "html",

        "css",

        "python",

        "java",

        "c++",

        "c#",

        "node",

        "node.js",

        "express",

        "react",

        "kod yaz",

        "kodunu yaz",

        "kodu düzelt",

        "hata veriyor",

        "bug",

        "api",

        "server.js",

        "index.html"
    ];


    return keywords.some(
        keyword =>
            value.includes(
                keyword
            )
    );
}


/* =========================================================
   75. GÜNCEL SORU ALGILAMA
========================================================= */

function looksLikeCurrentQuestion(
    text
) {

    const value =
        normalizeText(
            text
        );

    const keywords = [

        "bugün",

        "şimdi",

        "şu an",

        "son dakika",

        "güncel",

        "en son",

        "2026",

        "hava",

        "hava durumu",

        "döviz",

        "dolar",

        "euro",

        "altın",

        "haber",

        "kim kazandı",

        "maç",

        "maç sonucu"
    ];


    return keywords.some(
        keyword =>
            value.includes(
                keyword
            )
    );
}


/* =========================================================
   76. AI CEVAP ÜRETİCİ
========================================================= */

async function generateAIAnswer(
    options = {}
) {

    const message =
        cleanText(
            options.message,
            20000
        );

    const chatId =
        cleanText(
            options.chatId,
            300
        );

    const preferredProvider =
        cleanText(
            options.provider,
            100
        ) || null;


    if (!message) {

        return {

            ok:
                true,

            provider:
                "local",

            model:
                "local",

            text:
                "Bir mesaj yaz knk."
        };
    }


    /* -----------------------------------------
       LOCAL RESPONSE
    ----------------------------------------- */

    const local =
        localResponse(
            message
        );


    if (
        local.handled
    ) {

        AI_STATUS.provider =
            "local";

        AI_STATUS.successCount++;

        return {

            ok:
                true,

            provider:
                "local",

            model:
                "local",

            text:
                local.text,

            local:
                true
        };
    }


    /* -----------------------------------------
       CHAT GEÇMİŞİ
    ----------------------------------------- */

    let history = [];


    if (chatId) {

        history =
            getChatMessages(
                chatId,
                30
            );
    }


    const aiMessages =
        buildAIMessageList(
            history,
            message
        );


    /* -----------------------------------------
       AI PROVIDERLARI
    ----------------------------------------- */

    const providerResult =
        await callAIProviders(
            aiMessages,
            preferredProvider
        );


    if (
        providerResult.ok &&
        providerResult.text
    ) {

        return {

            ok:
                true,

            provider:
                providerResult.provider,

            model:
                AI_CONFIG.models[
                    providerResult.provider
                ] ||
                providerResult.provider,

            text:
                providerResult.text,

            local:
                false
        };
    }


    /* -----------------------------------------
       SON FALLBACK
    ----------------------------------------- */

    const coding =
        looksLikeCodingQuestion(
            message
        );


    if (coding) {

        return {

            ok:
                true,

            provider:
                "local",

            model:
                "local-fallback",

            text:
                "AI sağlayıcılarına şu anda ulaşılamıyor. Kodunu buraya gönderirsen mevcut kod üzerinden hatayı inceleyebilirim.",

            fallback:
                true
        };
    }


    if (
        looksLikeCurrentQuestion(
            message
        )
    ) {

        return {

            ok:
                true,

            provider:
                "local",

            model:
                "local-fallback",

            text:
                "Bu soru güncel bilgi gerektiriyor. Araştırma sistemiyle kontrol edilmesi gerekiyor.",

            requiresResearch:
                true,

            fallback:
                true
        };
    }


    return {

        ok:
            true,

        provider:
            "local",

        model:
            "local-fallback",

        text:
            "Şu anda uzak AI sağlayıcılarına ulaşılamıyor. Biraz sonra tekrar deneyebilirsin.",

        fallback:
            true
    };
}


/* =========================================================
   77. CHAT VALIDATION
========================================================= */

function validateChatRequest(
    body
) {

    if (
        !body ||
        typeof body !==
        "object"
    ) {

        return {

            valid:
                false,

            error:
                "Geçersiz istek."
        };
    }


    const message =
        cleanText(
            body.message,
            20000
        );


    if (!message) {

        return {

            valid:
                false,

            error:
                "Mesaj boş olamaz."
        };
    }


    if (
        message.length >
        20000
    ) {

        return {

            valid:
                false,

            error:
                "Mesaj çok uzun."
        };
    }


    return {

        valid:
            true,

        message,

        chatId:
            cleanText(
                body.chatId,
                300
            ),

        model:
            cleanText(
                body.model,
                100
            ) || "fast",

        provider:
            cleanText(
                body.provider,
                100
            ) || null
    };
}


/* =========================================================
   78. CHAT ENDPOINT
========================================================= */

app.post(
    "/api/chat",
    async (req, res) => {

        try {

            const validation =
                validateChatRequest(
                    req.body
                );


            if (
                !validation.valid
            ) {

                return res
                    .status(400)
                    .json({

                        ok:
                            false,

                        success:
                            false,

                        error:
                            validation.error
                    });
            }


            const user =
                req.user ||
                getGuestUser();


            let chatId =
                validation.chatId;


            let chat =
                chatId
                    ? findChatById(
                        chatId
                    )
                    : null;


            if (!chat) {

                chat =
                    createChat(
                        user.id,
                        validation.message
                            .slice(
                                0,
                                60
                            )
                    );

                chatId =
                    chat.id;
            }


            addMessage({

                chatId,

                userId:
                    user.id,

                role:
                    "user",

                content:
                    validation.message,

                model:
                    validation.model
            });


            const answer =
                await generateAIAnswer({

                    message:
                        validation.message,

                    chatId,

                    model:
                        validation.model,

                    provider:
                        validation.provider
                });


            const assistantMessage =
                addMessage({

                    chatId,

                    userId:
                        user.id,

                    role:
                        "assistant",

                    content:
                        answer.text,

                    model:
                        answer.model,

                    provider:
                        answer.provider,

                    metadata: {

                        fallback:
                            Boolean(
                                answer.fallback
                            ),

                        requiresResearch:
                            Boolean(
                                answer.requiresResearch
                            )
                    }
                });


            const chats =
                getChats();


            const chatIndex =
                chats.findIndex(
                    item =>
                        item.id ===
                        chatId
                );


            if (
                chatIndex !==
                -1
            ) {

                chats[
                    chatIndex
                ].updatedAt =
                    nowISO();

                chats[
                    chatIndex
                ].messageCount =
                    getChatMessages(
                        chatId,
                        1000
                    ).length;

                saveChats(
                    chats
                );
            }


            io.emit(
                "turkai:message",
                {

                    chatId,

                    message:
                        assistantMessage
                }
            );


            return res.json({

                ok:
                    true,

                success:
                    true,

                chatId,

                reply:
                    answer.text,

                response:
                    answer.text,

                message:
                    answer.text,

                text:
                    answer.text,

                provider:
                    answer.provider,

                model:
                    answer.model,

                fallback:
                    Boolean(
                        answer.fallback
                    ),

                requiresResearch:
                    Boolean(
                        answer.requiresResearch
                    ),

                messageId:
                    assistantMessage.id
            });

        } catch (error) {

            logError(
                "POST /api/chat hatası",
                error
            );

            return res
                .status(500)
                .json({

                    ok:
                        false,

                    success:
                        false,

                    error:
                        "Chat işlemi sırasında bir hata oluştu.",

                    detail:
                        IS_PRODUCTION
                            ? undefined
                            : error.message
                });
        }
    }
);


/* =========================================================
   79. CHAT TEST
========================================================= */

app.get(
    "/api/chat/test",
    (req, res) => {

        res.json({

            ok:
                true,

            success:
                true,

            message:
                "Chat endpoint aktif.",

            endpoint:
                "POST /api/chat",

            timestamp:
                nowISO()
        });
    }
);


/* =========================================================
   80. AI STATUS
========================================================= */

app.get(
    "/api/ai/status",
    (req, res) => {

        res.json({

            ok:
                true,

            success:
                true,

            ai:
                AI_STATUS,

            providers:
                AI_PROVIDERS,

            models:
                AI_CONFIG.models,

            timestamp:
                nowISO()
        });
    }
);


/* =========================================================
   81. MODEL LİSTESİ
========================================================= */

app.get(
    "/api/models",
    (req, res) => {

        res.json({

            ok:
                true,

            models: [

                {

                    id:
                        "fast",

                    name:
                        "TürkAI Fast",

                    provider:
                        "auto",

                    description:
                        "Hızlı otomatik model seçimi"
                },

                {

                    id:
                        "smart",

                    name:
                        "TürkAI Smart",

                    provider:
                        "auto",

                    description:
                        "Daha kapsamlı otomatik cevap"
                },

                {

                    id:
                        "local",

                    name:
                        "TürkAI Local",

                    provider:
                        "local",

                    description:
                        "Yerel fallback sistemi"
                }
            ]
        });
    }
);


/* =========================================================
   82. BASİT CEVAP TESTİ
========================================================= */

app.get(
    "/api/simple/:message",
    (req, res) => {

        const message =
            cleanText(
                req.params.message,
                5000
            );


        const result =
            localResponse(
                message
            );


        res.json({

            ok:
                true,

            handled:
                result.handled,

            text:
                result.text,

            timestamp:
                nowISO()
        });
    }
);


/* =========================================================
   PART 2 SONU
========================================================= */
// ============================================================
// TÜRKAI 11.0.0
// SERVER.JS — 3/5
// MEMORY + KNOWLEDGE + RESEARCH + FILES + PROJECTS
// ============================================================

"use strict";

// ============================================================
// 3.1 — MEMORY SYSTEM
// ============================================================

function getMemories() {
  return readJSONSafe(DB_FILES.memories, []);
}

function saveMemories(memories) {
  return writeJSONSafe(DB_FILES.memories, Array.isArray(memories) ? memories : []);
}

function getUserMemories(userId) {
  const memories = getMemories();

  return memories
    .filter(item => item && item.userId === userId)
    .sort((a, b) => {
      return String(b.createdAt || "").localeCompare(
        String(a.createdAt || "")
      );
    });
}

function createMemory(userId, text, category = "general", importance = 1) {
  const clean = cleanText(text, 2000);

  if (!clean) {
    return null;
  }

  const memories = getMemories();

  const normalized = normalizeText(clean);

  const existing = memories.find(item => {
    return (
      item.userId === userId &&
      normalizeText(item.text) === normalized
    );
  });

  if (existing) {
    existing.updatedAt = nowISO();
    existing.importance = Math.max(
      Number(existing.importance || 1),
      Number(importance || 1)
    );

    saveMemories(memories);

    return existing;
  }

  const memory = {
    id: createId("mem"),
    userId,
    text: clean,
    category: cleanText(category, 100) || "general",
    importance: Math.min(
      Math.max(Number(importance) || 1, 1),
      10
    ),
    createdAt: nowISO(),
    updatedAt: nowISO()
  };

  memories.push(memory);
  saveMemories(memories);

  appendLog(LOG_FILES.ai, {
    event: "memory_created",
    userId,
    memoryId: memory.id
  });

  return memory;
}

function deleteMemory(memoryId, userId) {
  const memories = getMemories();

  const index = memories.findIndex(item => {
    return item.id === memoryId && item.userId === userId;
  });

  if (index === -1) {
    return false;
  }

  memories.splice(index, 1);
  saveMemories(memories);

  return true;
}

function clearUserMemories(userId) {
  const memories = getMemories();

  const remaining = memories.filter(item => item.userId !== userId);

  saveMemories(remaining);

  return memories.length - remaining.length;
}

function extractMemoryCandidates(message) {
  const text = cleanText(message, 4000);

  if (!text) {
    return [];
  }

  const results = [];

  const patterns = [
    {
      regex: /benim adım\s+(.{1,80})/i,
      category: "personal"
    },
    {
      regex: /ben\s+(.{1,80})\s+seviyorum/i,
      category: "preference"
    },
    {
      regex: /en sevdiğim\s+(.{1,100})/i,
      category: "preference"
    },
    {
      regex: /ben\s+(.{1,100})\s+öğreniyorum/i,
      category: "education"
    },
    {
      regex: /projem\s+(.{1,150})/i,
      category: "project"
    }
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern.regex);

    if (!match || !match[1]) {
      continue;
    }

    const value = cleanText(match[1], 300);

    if (!value) {
      continue;
    }

    results.push({
      text: value,
      category: pattern.category,
      importance: pattern.category === "personal" ? 8 : 5
    });
  }

  return results;
}

function automaticallySaveMemories(userId, message) {
  const candidates = extractMemoryCandidates(message);

  const saved = [];

  for (const candidate of candidates) {
    const memory = createMemory(
      userId,
      candidate.text,
      candidate.category,
      candidate.importance
    );

    if (memory) {
      saved.push(memory);
    }
  }

  return saved;
}

function buildMemoryContext(userId) {
  const memories = getUserMemories(userId);

  if (!memories.length) {
    return "";
  }

  const important = memories
    .sort((a, b) => {
      return Number(b.importance || 1) - Number(a.importance || 1);
    })
    .slice(0, 20);

  return important
    .map(item => {
      return `- ${item.category}: ${item.text}`;
    })
    .join("\n");
}


// ============================================================
// 3.2 — MEMORY API
// ============================================================

app.get("/api/memory", optionalAuth, (req, res) => {
  try {
    const user = req.user || getGuestUser();

    const memories = getUserMemories(user.id);

    res.json({
      success: true,
      memories
    });
  } catch (error) {
    logError("memory_get_error", {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: "Hafıza alınamadı."
    });
  }
});

app.post("/api/memory", optionalAuth, (req, res) => {
  try {
    const user = req.user || getGuestUser();

    const text = cleanText(req.body?.text, 2000);
    const category = cleanText(
      req.body?.category || "general",
      100
    );

    if (!text) {
      return res.status(400).json({
        success: false,
        error: "Hafıza metni gerekli."
      });
    }

    const memory = createMemory(
      user.id,
      text,
      category,
      5
    );

    res.json({
      success: true,
      memory
    });
  } catch (error) {
    logError("memory_create_error", {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: "Hafıza oluşturulamadı."
    });
  }
});

app.delete("/api/memory/:id", optionalAuth, (req, res) => {
  try {
    const user = req.user || getGuestUser();

    const deleted = deleteMemory(
      req.params.id,
      user.id
    );

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: "Hafıza bulunamadı."
      });
    }

    res.json({
      success: true
    });
  } catch (error) {
    logError("memory_delete_error", {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: "Hafıza silinemedi."
    });
  }
});

app.delete("/api/memory", optionalAuth, (req, res) => {
  try {
    const user = req.user || getGuestUser();

    const count = clearUserMemories(user.id);

    res.json({
      success: true,
      deleted: count
    });
  } catch (error) {
    logError("memory_clear_error", {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: "Hafıza temizlenemedi."
    });
  }
});


// ============================================================
// 3.3 — KNOWLEDGE SYSTEM
// ============================================================

function getKnowledge() {
  return readJSONSafe(DB_FILES.knowledge, []);
}

function saveKnowledge(items) {
  return writeJSONSafe(
    DB_FILES.knowledge,
    Array.isArray(items) ? items : []
  );
}

function normalizeKnowledgeItem(item) {
  if (!item || typeof item !== "object") {
    return null;
  }

  return {
    id: item.id || createId("knowledge"),
    question: cleanText(item.question, 2000),
    answer: cleanText(item.answer, 6000),
    keywords: Array.isArray(item.keywords)
      ? item.keywords
          .map(x => cleanText(x, 100))
          .filter(Boolean)
      : [],
    category: cleanText(
      item.category || "general",
      100
    ),
    source: cleanText(
      item.source || "TürkAI",
      200
    ),
    confidence: Number(item.confidence || 1),
    createdAt: item.createdAt || nowISO(),
    updatedAt: item.updatedAt || nowISO()
  };
}

function addKnowledge(question, answer, options = {}) {
  const cleanQuestion = cleanText(question, 2000);
  const cleanAnswer = cleanText(answer, 6000);

  if (!cleanQuestion || !cleanAnswer) {
    return null;
  }

  const knowledge = getKnowledge();

  const normalizedQuestion = normalizeText(cleanQuestion);

  const existing = knowledge.find(item => {
    return (
      normalizeText(item.question) === normalizedQuestion
    );
  });

  if (existing) {
    existing.answer = cleanAnswer;
    existing.updatedAt = nowISO();

    if (options.category) {
      existing.category = cleanText(
        options.category,
        100
      );
    }

    if (Array.isArray(options.keywords)) {
      existing.keywords = options.keywords
        .map(x => cleanText(x, 100))
        .filter(Boolean);
    }

    saveKnowledge(knowledge);

    return existing;
  }

  const item = normalizeKnowledgeItem({
    question: cleanQuestion,
    answer: cleanAnswer,
    category: options.category || "general",
    keywords: options.keywords || [],
    source: options.source || "TürkAI",
    confidence: options.confidence || 1
  });

  knowledge.push(item);
  saveKnowledge(knowledge);

  return item;
}

function calculateKnowledgeScore(query, item) {
  const normalizedQuery = normalizeText(query);

  const question = normalizeText(item.question);
  const keywords = Array.isArray(item.keywords)
    ? item.keywords.map(normalizeText)
    : [];

  let score = 0;

  if (!normalizedQuery) {
    return 0;
  }

  if (normalizedQuery === question) {
    score += 100;
  }

  if (
    question.includes(normalizedQuery) ||
    normalizedQuery.includes(question)
  ) {
    score += 50;
  }

  const queryWords = normalizedQuery
    .split(/\s+/)
    .filter(word => word.length > 2);

  for (const word of queryWords) {
    if (question.includes(word)) {
      score += 8;
    }

    for (const keyword of keywords) {
      if (
        keyword.includes(word) ||
        word.includes(keyword)
      ) {
        score += 5;
      }
    }
  }

  return score;
}

function findKnowledgeAnswer(query) {
  const knowledge = getKnowledge();

  if (!knowledge.length) {
    return null;
  }

  let best = null;
  let bestScore = 0;

  for (const item of knowledge) {
    const normalized = normalizeKnowledgeItem(item);

    if (!normalized) {
      continue;
    }

    const score = calculateKnowledgeScore(
      query,
      normalized
    );

    if (score > bestScore) {
      bestScore = score;
      best = normalized;
    }
  }

  if (!best || bestScore < 15) {
    return null;
  }

  return {
    answer: best.answer,
    score: bestScore,
    item: best
  };
}

function learnFromConversation(question, answer) {
  const cleanQuestion = cleanText(question, 2000);
  const cleanAnswer = cleanText(answer, 6000);

  if (!cleanQuestion || !cleanAnswer) {
    return null;
  }

  if (cleanAnswer.length < 5) {
    return null;
  }

  if (
    cleanAnswer.includes("API anahtarı") &&
    cleanAnswer.length < 150
  ) {
    return null;
  }

  return addKnowledge(
    cleanQuestion,
    cleanAnswer,
    {
      source: "conversation",
      confidence: 0.8
    }
  );
}


// ============================================================
// 3.4 — KNOWLEDGE API
// ============================================================

app.get("/api/knowledge", optionalAuth, (req, res) => {
  try {
    const knowledge = getKnowledge();

    const safe = knowledge.map(item => ({
      id: item.id,
      question: item.question,
      category: item.category,
      source: item.source,
      confidence: item.confidence,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    }));

    res.json({
      success: true,
      count: safe.length,
      knowledge: safe
    });
  } catch (error) {
    logError("knowledge_get_error", {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: "Bilgi tabanı alınamadı."
    });
  }
});

app.post("/api/knowledge", optionalAuth, (req, res) => {
  try {
    const question = cleanText(
      req.body?.question,
      2000
    );

    const answer = cleanText(
      req.body?.answer,
      6000
    );

    if (!question || !answer) {
      return res.status(400).json({
        success: false,
        error: "Soru ve cevap gerekli."
      });
    }

    const item = addKnowledge(
      question,
      answer,
      {
        category: req.body?.category,
        keywords: req.body?.keywords,
        source: "manual",
        confidence: 1
      }
    );

    res.json({
      success: true,
      item
    });
  } catch (error) {
    logError("knowledge_create_error", {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: "Bilgi eklenemedi."
    });
  }
});

app.get("/api/knowledge/search", optionalAuth, (req, res) => {
  try {
    const query = cleanText(
      req.query?.q,
      1000
    );

    if (!query) {
      return res.json({
        success: true,
        results: []
      });
    }

    const knowledge = getKnowledge();

    const results = knowledge
      .map(item => ({
        item,
        score: calculateKnowledgeScore(query, item)
      }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    res.json({
      success: true,
      query,
      results
    });
  } catch (error) {
    logError("knowledge_search_error", {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: "Arama yapılamadı."
    });
  }
});


// ============================================================
// 3.5 — RESEARCH SYSTEM
// ============================================================

const RESEARCH_CONFIG = {
  timeout: 15000,
  maxResults: 8,
  maxTextLength: 12000
};

function createResearchId() {
  return createId("research");
}

function cleanResearchText(text) {
  return cleanText(
    String(text || "")
      .replace(/\s+/g, " ")
      .trim(),
    RESEARCH_CONFIG.maxTextLength
  );
}

function extractUrls(text) {
  if (!text) {
    return [];
  }

  const matches = String(text).match(
    /https?:\/\/[^\s"'<>]+/gi
  );

  return Array.isArray(matches)
    ? [...new Set(matches)]
    : [];
}

function isValidHttpUrl(value) {
  try {
    const url = new URL(value);

    return (
      url.protocol === "http:" ||
      url.protocol === "https:"
    );
  } catch {
    return false;
  }
}

async function fetchResearchUrl(url) {
  if (!isValidHttpUrl(url)) {
    throw new Error("Geçersiz URL.");
  }

  const response = await fetchWithTimeout(
    url,
    {
      headers: {
        "User-Agent":
          "TurkAIResearchBot/11.0"
      }
    },
    RESEARCH_CONFIG.timeout
  );

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status}`
    );
  }

  const contentType =
    response.headers.get("content-type") || "";

  const text = await response.text();

  let clean = text
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();

  clean = cleanResearchText(clean);

  return {
    url,
    contentType,
    status: response.status,
    text: clean
  };
}

function createResearchRecord(userId, query) {
  return {
    id: createResearchId(),
    userId,
    query: cleanText(query, 2000),
    status: "started",
    results: [],
    createdAt: nowISO(),
    updatedAt: nowISO()
  };
}

function getResearchRecords() {
  return readJSONSafe(DB_FILES.research, []);
}

function saveResearchRecords(records) {
  return writeJSONSafe(
    DB_FILES.research,
    Array.isArray(records) ? records : []
  );
}

function saveResearchRecord(record) {
  const records = getResearchRecords();

  const index = records.findIndex(
    item => item.id === record.id
  );

  if (index === -1) {
    records.push(record);
  } else {
    records[index] = record;
  }

  saveResearchRecords(records);

  return record;
}

function getUserResearch(userId) {
  return getResearchRecords()
    .filter(item => item.userId === userId)
    .sort((a, b) => {
      return String(b.createdAt || "").localeCompare(
        String(a.createdAt || "")
      );
    })
    .slice(0, 50);
}


// ============================================================
// 3.6 — RESEARCH SEARCH ENGINE
// ============================================================

function buildSearchUrl(query) {
  const encoded = encodeURIComponent(
    cleanText(query, 500)
  );

  return `https://www.google.com/search?q=${encoded}`;
}

async function performResearch(query, userId) {
  const cleanQuery = cleanText(query, 2000);

  if (!cleanQuery) {
    throw new Error("Araştırma sorgusu boş.");
  }

  const record = createResearchRecord(
    userId,
    cleanQuery
  );

  saveResearchRecord(record);

  const urls = [];

  if (isValidHttpUrl(cleanQuery)) {
    urls.push(cleanQuery);
  }

  const directUrls = extractUrls(cleanQuery);

  for (const url of directUrls) {
    if (!urls.includes(url)) {
      urls.push(url);
    }
  }

  if (!urls.length) {
    urls.push(buildSearchUrl(cleanQuery));
  }

  const results = [];

  for (
    const url of urls.slice(
      0,
      RESEARCH_CONFIG.maxResults
    )
  ) {
    try {
      const result = await fetchResearchUrl(url);

      results.push({
        url: result.url,
        status: result.status,
        contentType: result.contentType,
        text: result.text
      });
    } catch (error) {
      results.push({
        url,
        error: error.message
      });
    }
  }

  record.status = "completed";
  record.results = results;
  record.updatedAt = nowISO();

  saveResearchRecord(record);

  return record;
}


// ============================================================
// 3.7 — RESEARCH API
// ============================================================

app.get("/api/research/history", optionalAuth, (req, res) => {
  try {
    const user = req.user || getGuestUser();

    res.json({
      success: true,
      history: getUserResearch(user.id)
    });
  } catch (error) {
    logError("research_history_error", {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: "Araştırma geçmişi alınamadı."
    });
  }
});

app.post("/api/research", optionalAuth, async (req, res) => {
  try {
    const user = req.user || getGuestUser();

    const query = cleanText(
      req.body?.query ||
      req.body?.message ||
      req.body?.q,
      2000
    );

    if (!query) {
      return res.status(400).json({
        success: false,
        error: "Araştırma sorgusu gerekli."
      });
    }

    const result = await performResearch(
      query,
      user.id
    );

    res.json({
      success: true,
      research: result
    });
  } catch (error) {
    logError("research_error", {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error:
        error.message ||
        "Araştırma sırasında hata oluştu."
    });
  }
});


// ============================================================
// 3.8 — FILE STORAGE
// ============================================================

function getFileRecords() {
  return readJSONSafe(DB_FILES.files, []);
}

function saveFileRecords(files) {
  return writeJSONSafe(
    DB_FILES.files,
    Array.isArray(files) ? files : []
  );
}

function sanitizeFileName(name) {
  return String(name || "file")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 150);
}

function getUserFiles(userId) {
  return getFileRecords()
    .filter(file => file.userId === userId)
    .sort((a, b) => {
      return String(b.createdAt || "").localeCompare(
        String(a.createdAt || "")
      );
    });
}

function registerFile({
  userId,
  originalName,
  storedName,
  mimeType,
  size,
  path: filePath
}) {
  const files = getFileRecords();

  const record = {
    id: createId("file"),
    userId,
    originalName: sanitizeFileName(originalName),
    storedName: sanitizeFileName(storedName),
    mimeType: cleanText(mimeType, 200),
    size: Number(size || 0),
    path: filePath,
    createdAt: nowISO()
  };

  files.push(record);

  saveFileRecords(files);

  return record;
}

function deleteFileRecord(fileId, userId) {
  const files = getFileRecords();

  const index = files.findIndex(
    file =>
      file.id === fileId &&
      file.userId === userId
  );

  if (index === -1) {
    return null;
  }

  const file = files[index];

  files.splice(index, 1);
  saveFileRecords(files);

  return file;
}


// ============================================================
// 3.9 — SIMPLE UPLOAD ENDPOINT
// ============================================================

app.post(
  "/api/upload",
  optionalAuth,
  async (req, res) => {
    try {
      const user = req.user || getGuestUser();

      const rawName = cleanText(
        req.body?.name ||
        req.body?.fileName ||
        "upload.txt",
        150
      );

      const content = String(
        req.body?.content || ""
      );

      if (!content) {
        return res.status(400).json({
          success: false,
          error: "Dosya içeriği boş."
        });
      }

      const safeName =
        `${Date.now()}-${createId("f")}-${sanitizeFileName(rawName)}`;

      const targetPath = path.join(
        UPLOADS_DIR,
        safeName
      );

      fs.writeFileSync(
        targetPath,
        content,
        "utf8"
      );

      const record = registerFile({
        userId: user.id,
        originalName: rawName,
        storedName: safeName,
        mimeType:
          req.body?.mimeType ||
          "text/plain",
        size: Buffer.byteLength(
          content,
          "utf8"
        ),
        path: targetPath
      });

      res.json({
        success: true,
        file: {
          id: record.id,
          name: record.originalName,
          size: record.size,
          mimeType: record.mimeType,
          createdAt: record.createdAt
        }
      });
    } catch (error) {
      logError("upload_error", {
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: "Dosya yüklenemedi."
      });
    }
  }
);


// ============================================================
// 3.10 — FILE API
// ============================================================

app.get("/api/files", optionalAuth, (req, res) => {
  try {
    const user = req.user || getGuestUser();

    const files = getUserFiles(user.id)
      .map(file => ({
        id: file.id,
        name: file.originalName,
        size: file.size,
        mimeType: file.mimeType,
        createdAt: file.createdAt
      }));

    res.json({
      success: true,
      files
    });
  } catch (error) {
    logError("files_get_error", {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: "Dosyalar alınamadı."
    });
  }
});

app.delete("/api/files/:id", optionalAuth, (req, res) => {
  try {
    const user = req.user || getGuestUser();

    const record = deleteFileRecord(
      req.params.id,
      user.id
    );

    if (!record) {
      return res.status(404).json({
        success: false,
        error: "Dosya bulunamadı."
      });
    }

    try {
      if (
        record.path &&
        fs.existsSync(record.path)
      ) {
        fs.unlinkSync(record.path);
      }
    } catch (fileError) {
      logWarn("file_delete_physical_error", {
        error: fileError.message
      });
    }

    res.json({
      success: true
    });
  } catch (error) {
    logError("file_delete_error", {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: "Dosya silinemedi."
    });
  }
});


// ============================================================
// 3.11 — PROJECT SYSTEM
// ============================================================

function getProjects() {
  return readJSONSafe(
    DB_FILES.projects,
    []
  );
}

function saveProjects(projects) {
  return writeJSONSafe(
    DB_FILES.projects,
    Array.isArray(projects) ? projects : []
  );
}

function getUserProjects(userId) {
  return getProjects()
    .filter(project => project.userId === userId)
    .sort((a, b) => {
      return String(b.updatedAt || "").localeCompare(
        String(a.updatedAt || "")
      );
    });
}

function createProject(userId, data = {}) {
  const projects = getProjects();

  const project = {
    id: createId("project"),
    userId,
    name: cleanText(
      data.name || "Yeni Proje",
      120
    ),
    description: cleanText(
      data.description || "",
      1000
    ),
    language: cleanText(
      data.language || "javascript",
      50
    ),
    code: String(
      data.code || ""
    ).slice(0, 500000),
    files: Array.isArray(data.files)
      ? data.files.slice(0, 100)
      : [],
    createdAt: nowISO(),
    updatedAt: nowISO()
  };

  projects.push(project);
  saveProjects(projects);

  return project;
}

function findProject(projectId, userId) {
  return getProjects().find(
    project =>
      project.id === projectId &&
      project.userId === userId
  ) || null;
}

function updateProject(projectId, userId, data) {
  const projects = getProjects();

  const project = projects.find(
    item =>
      item.id === projectId &&
      item.userId === userId
  );

  if (!project) {
    return null;
  }

  if (data.name !== undefined) {
    project.name = cleanText(
      data.name,
      120
    );
  }

  if (data.description !== undefined) {
    project.description = cleanText(
      data.description,
      1000
    );
  }

  if (data.language !== undefined) {
    project.language = cleanText(
      data.language,
      50
    );
  }

  if (data.code !== undefined) {
    project.code = String(
      data.code
    ).slice(0, 500000);
  }

  if (Array.isArray(data.files)) {
    project.files = data.files.slice(0, 100);
  }

  project.updatedAt = nowISO();

  saveProjects(projects);

  return project;
}

function deleteProject(projectId, userId) {
  const projects = getProjects();

  const index = projects.findIndex(
    project =>
      project.id === projectId &&
      project.userId === userId
  );

  if (index === -1) {
    return false;
  }

  projects.splice(index, 1);

  saveProjects(projects);

  return true;
}


// ============================================================
// 3.12 — PROJECT API
// ============================================================

app.get("/api/projects", optionalAuth, (req, res) => {
  try {
    const user = req.user || getGuestUser();

    res.json({
      success: true,
      projects: getUserProjects(user.id)
    });
  } catch (error) {
    logError("projects_get_error", {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: "Projeler alınamadı."
    });
  }
});

app.post("/api/projects", optionalAuth, (req, res) => {
  try {
    const user = req.user || getGuestUser();

    const project = createProject(
      user.id,
      req.body || {}
    );

    res.json({
      success: true,
      project
    });
  } catch (error) {
    logError("project_create_error", {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: "Proje oluşturulamadı."
    });
  }
});

app.get("/api/projects/:id", optionalAuth, (req, res) => {
  try {
    const user = req.user || getGuestUser();

    const project = findProject(
      req.params.id,
      user.id
    );

    if (!project) {
      return res.status(404).json({
        success: false,
        error: "Proje bulunamadı."
      });
    }

    res.json({
      success: true,
      project
    });
  } catch (error) {
    logError("project_get_error", {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: "Proje alınamadı."
    });
  }
});

app.put("/api/projects/:id", optionalAuth, (req, res) => {
  try {
    const user = req.user || getGuestUser();

    const project = updateProject(
      req.params.id,
      user.id,
      req.body || {}
    );

    if (!project) {
      return res.status(404).json({
        success: false,
        error: "Proje bulunamadı."
      });
    }

    res.json({
      success: true,
      project
    });
  } catch (error) {
    logError("project_update_error", {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: "Proje güncellenemedi."
    });
  }
});

app.delete("/api/projects/:id", optionalAuth, (req, res) => {
  try {
    const user = req.user || getGuestUser();

    const deleted = deleteProject(
      req.params.id,
      user.id
    );

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: "Proje bulunamadı."
      });
    }

    res.json({
      success: true
    });
  } catch (error) {
    logError("project_delete_error", {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: "Proje silinemedi."
    });
  }
});


// ============================================================
// 3.13 — AI CONTEXT BUILDER
// ============================================================

function buildUserContext(userId) {
  const memoryContext =
    buildMemoryContext(userId);

  if (!memoryContext) {
    return "";
  }

  return [
    "Kullanıcı hakkında hatırlanan bilgiler:",
    memoryContext
  ].join("\n");
}

function buildEnhancedAIContext(userId, message) {
  const parts = [];

  const memory = buildUserContext(userId);

  if (memory) {
    parts.push(memory);
  }

  const knowledge = findKnowledgeAnswer(message);

  if (knowledge) {
    parts.push(
      [
        "Bilgi tabanından ilgili bilgi:",
        knowledge.answer
      ].join("\n")
    );
  }

  return parts.join("\n\n");
}


// ============================================================
// 3.14 — CHAT MEMORY ENTEGRASYONU
// ============================================================

function processConversationMemory(
  userId,
  userMessage,
  assistantAnswer
) {
  try {
    automaticallySaveMemories(
      userId,
      userMessage
    );

    if (
      userMessage &&
      assistantAnswer &&
      !looksLikeCurrentQuestion(userMessage)
    ) {
      learnFromConversation(
        userMessage,
        assistantAnswer
      );
    }
  } catch (error) {
    logWarn("conversation_memory_error", {
      error: error.message
    });
  }
}


// ============================================================
// 3.15 — GELİŞMİŞ CHAT CONTEXT ROUTE
// ============================================================

app.get("/api/context", optionalAuth, (req, res) => {
  try {
    const user = req.user || getGuestUser();

    res.json({
      success: true,
      context: {
        memory: buildUserContext(user.id),
        memories: getUserMemories(user.id).slice(0, 20),
        projects: getUserProjects(user.id).slice(0, 20)
      }
    });
  } catch (error) {
    logError("context_error", {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: "Bağlam alınamadı."
    });
  }
});


// ============================================================
// 3.16 — RESEARCH + KNOWLEDGE + MEMORY STATUS
// ============================================================

app.get("/api/intelligence/status", optionalAuth, (req, res) => {
  try {
    const user = req.user || getGuestUser();

    const memories = getUserMemories(user.id);
    const knowledge = getKnowledge();
    const research = getUserResearch(user.id);

    res.json({
      success: true,
      intelligence: {
        memory: {
          enabled: true,
          count: memories.length
        },
        knowledge: {
          enabled: true,
          count: knowledge.length
        },
        research: {
          enabled: true,
          count: research.length
        },
        localFallback: true,
        aiProviders: AI_PROVIDERS
      }
    });
  } catch (error) {
    logError("intelligence_status_error", {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: "Zekâ sistemi durumu alınamadı."
    });
  }
});


// ============================================================
// 3.17 — EXPORTS FOR NEXT PART
// ============================================================

module.exports.turkaiMemory = {
  getMemories,
  saveMemories,
  getUserMemories,
  createMemory,
  deleteMemory,
  clearUserMemories,
  extractMemoryCandidates,
  automaticallySaveMemories,
  buildMemoryContext
};

module.exports.turkaiKnowledge = {
  getKnowledge,
  saveKnowledge,
  addKnowledge,
  calculateKnowledgeScore,
  findKnowledgeAnswer,
  learnFromConversation
};

module.exports.turkaiResearch = {
  getResearchRecords,
  saveResearchRecords,
  saveResearchRecord,
  getUserResearch,
  performResearch,
  fetchResearchUrl
};

module.exports.turkaiFiles = {
  getFileRecords,
  saveFileRecords,
  getUserFiles,
  registerFile,
  deleteFileRecord
};

module.exports.turkaiProjects = {
  getProjects,
  saveProjects,
  getUserProjects,
  createProject,
  findProject,
  updateProject,
  deleteProject
};

module.exports.turkaiContext = {
  buildUserContext,
  buildEnhancedAIContext,
  processConversationMemory
};


// ============================================================
// 3/5 SONU
// ============================================================
// ============================================================
// TÜRKAI 11.0.0
// SERVER.JS — 4/5
// PLANS + USAGE + SECURITY + PAYMENTS + ADMIN + NOTIFICATIONS
// ============================================================

"use strict";

// ============================================================
// 4.1 — USAGE DATABASE
// ============================================================

function getUsageRecords() {
  return readJSONSafe(DB_FILES.usage, []);
}

function saveUsageRecords(records) {
  return writeJSONSafe(
    DB_FILES.usage,
    Array.isArray(records) ? records : []
  );
}

function getUsageDayKey() {
  return getTodayKey();
}

function getUserUsage(userId, day = getUsageDayKey()) {
  const records = getUsageRecords();

  let record = records.find(item => {
    return (
      item.userId === userId &&
      item.day === day
    );
  });

  if (!record) {
    record = {
      id: createId("usage"),
      userId,
      day,
      messages: 0,
      research: 0,
      images: 0,
      videos: 0,
      uploads: 0,
      tokens: 0,
      requests: 0,
      errors: 0,
      createdAt: nowISO(),
      updatedAt: nowISO()
    };

    records.push(record);
    saveUsageRecords(records);
  }

  return record;
}

function updateUsage(userId, type, amount = 1) {
  const records = getUsageRecords();
  const day = getUsageDayKey();

  let record = records.find(item => {
    return (
      item.userId === userId &&
      item.day === day
    );
  });

  if (!record) {
    record = {
      id: createId("usage"),
      userId,
      day,
      messages: 0,
      research: 0,
      images: 0,
      videos: 0,
      uploads: 0,
      tokens: 0,
      requests: 0,
      errors: 0,
      createdAt: nowISO(),
      updatedAt: nowISO()
    };

    records.push(record);
  }

  const numericAmount =
    Number(amount) || 1;

  if (
    Object.prototype.hasOwnProperty.call(
      record,
      type
    )
  ) {
    record[type] += numericAmount;
  }

  record.updatedAt = nowISO();

  saveUsageRecords(records);

  return record;
}

function getUsageSummary(userId) {
  const record = getUserUsage(userId);

  return {
    day: record.day,
    messages: Number(record.messages || 0),
    research: Number(record.research || 0),
    images: Number(record.images || 0),
    videos: Number(record.videos || 0),
    uploads: Number(record.uploads || 0),
    tokens: Number(record.tokens || 0),
    requests: Number(record.requests || 0),
    errors: Number(record.errors || 0)
  };
}


// ============================================================
// 4.2 — PLAN HELPERS
// ============================================================

function getPlanInfo(planName) {
  const normalized = normalizePlan(planName);

  return {
    name: normalized,
    ...(PLANS[normalized] || PLANS.free)
  };
}

function getUserPlan(user) {
  if (!user) {
    return "free";
  }

  return normalizePlan(
    user.plan || "free"
  );
}

function getUserPlanInfo(user) {
  return getPlanInfo(
    getUserPlan(user)
  );
}

function getPlanLimit(user, type) {
  const plan = getUserPlanInfo(user);

  const value = Number(
    plan[type]
  );

  return Number.isFinite(value)
    ? value
    : 0;
}

function getUsageValue(userId, type) {
  const usage = getUserUsage(userId);

  return Number(
    usage[type] || 0
  );
}

function hasUsageAvailable(
  user,
  type,
  amount = 1
) {
  const limit = getPlanLimit(
    user,
    type
  );

  const used = getUsageValue(
    user.id,
    type
  );

  // Developer / sınırsız benzeri yüksek limit.
  if (limit >= 1000000) {
    return true;
  }

  return used + amount <= limit;
}

function consumeUsage(
  user,
  type,
  amount = 1
) {
  if (
    !user ||
    !type
  ) {
    return false;
  }

  if (
    !hasUsageAvailable(
      user,
      type,
      amount
    )
  ) {
    return false;
  }

  updateUsage(
    user.id,
    type,
    amount
  );

  return true;
}


// ============================================================
// 4.3 — PLAN API
// ============================================================

app.get("/api/plans/details", (req, res) => {
  try {
    const plans = Object.entries(PLANS)
      .map(([name, data]) => ({
        name,
        ...data
      }));

    res.json({
      success: true,
      plans
    });
  } catch (error) {
    logError("plans_details_error", {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: "Planlar alınamadı."
    });
  }
});

app.get("/api/usage", optionalAuth, (req, res) => {
  try {
    const user = req.user || getGuestUser();

    const plan = getUserPlanInfo(user);
    const usage = getUsageSummary(user.id);

    res.json({
      success: true,
      plan,
      usage,
      remaining: {
        messages: Math.max(
          0,
          Number(plan.messageLimit || 0) -
          usage.messages
        ),
        research: Math.max(
          0,
          Number(plan.researchLimit || 0) -
          usage.research
        ),
        images: Math.max(
          0,
          Number(plan.imageLimit || 0) -
          usage.images
        ),
        videos: Math.max(
          0,
          Number(plan.videoLimit || 0) -
          usage.videos
        )
      }
    });
  } catch (error) {
    logError("usage_api_error", {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: "Kullanım bilgisi alınamadı."
    });
  }
});


// ============================================================
// 4.4 — MESSAGE LIMIT MIDDLEWARE
// ============================================================

function messageLimitMiddleware(
  req,
  res,
  next
) {
  try {
    const user =
      req.user ||
      getGuestUser();

    if (
      hasUsageAvailable(
        user,
        "messages",
        1
      )
    ) {
      return next();
    }

    return res.status(429).json({
      success: false,
      code: "MESSAGE_LIMIT",
      error:
        "Günlük mesaj limitine ulaştın.",
      plan: getUserPlan(user)
    });
  } catch (error) {
    logError(
      "message_limit_middleware_error",
      {
        error: error.message
      }
    );

    return res.status(500).json({
      success: false,
      error: "Kullanım kontrolü yapılamadı."
    });
  }
}


// ============================================================
// 4.5 — PRO CODE SYSTEM
// ============================================================

function getConfiguredProCode() {
  return cleanText(
    process.env.TURKAI_PRO_CODE || "",
    200
  );
}

function isValidProCode(code) {
  const input = cleanText(
    code,
    200
  );

  const configured =
    getConfiguredProCode();

  if (
    !input ||
    !configured
  ) {
    return false;
  }

  return input === configured;
}

function activatePlanForUser(
  userId,
  planName,
  source = "system"
) {
  const users = getUsers();

  const user = users.find(
    item => item.id === userId
  );

  if (!user) {
    return null;
  }

  const plan = normalizePlan(
    planName
  );

  user.plan = plan;
  user.planSource = source;
  user.planActivatedAt = nowISO();
  user.planUpdatedAt = nowISO();

  saveUsers(users);

  return user;
}


// ============================================================
// 4.6 — PRO ACTIVATION API
// ============================================================

app.post(
  "/api/pro/activate",
  optionalAuth,
  (req, res) => {
    try {
      const user =
        req.user ||
        getGuestUser();

      const code = cleanText(
        req.body?.code,
        200
      );

      if (!isValidProCode(code)) {
        logSecurity(
          "invalid_pro_code",
          {
            userId: user.id
          }
        );

        return res.status(403).json({
          success: false,
          error: "Geçersiz aktivasyon kodu."
        });
      }

      const updated =
        activatePlanForUser(
          user.id,
          "pro",
          "pro_code"
        );

      if (!updated) {
        return res.status(404).json({
          success: false,
          error: "Kullanıcı bulunamadı."
        });
      }

      res.json({
        success: true,
        message:
          "TürkAI Pro başarıyla aktif edildi.",
        plan: "pro"
      });
    } catch (error) {
      logError(
        "pro_activation_error",
        {
          error: error.message
        }
      );

      res.status(500).json({
        success: false,
        error: "Pro aktivasyonu başarısız."
      });
    }
  }
);


// ============================================================
// 4.7 — TEST PAYMENT ENDPOINT
// ============================================================

app.post(
  "/api/test-payment",
  optionalAuth,
  (req, res) => {
    try {
      const user =
        req.user ||
        getGuestUser();

      const plan = normalizePlan(
        req.body?.plan || "pro"
      );

      if (
        !PLANS[plan]
      ) {
        return res.status(400).json({
          success: false,
          error: "Geçersiz plan."
        });
      }

      const paymentId =
        createId("payment");

      const payments =
        readJSONSafe(
          DB_FILES.payments,
          []
        );

      const payment = {
        id: paymentId,
        userId: user.id,
        plan,
        amount:
          Number(
            PLANS[plan].price || 0
          ),
        currency: "TRY",
        status: "test_success",
        provider: "test",
        createdAt: nowISO()
      };

      payments.push(payment);

      writeJSONSafe(
        DB_FILES.payments,
        payments
      );

      activatePlanForUser(
        user.id,
        plan,
        "test_payment"
      );

      res.json({
        success: true,
        payment
      });
    } catch (error) {
      logError(
        "test_payment_error",
        {
          error: error.message
        }
      );

      res.status(500).json({
        success: false,
        error:
          "Test ödeme işlemi başarısız."
      });
    }
  }
);


// ============================================================
// 4.8 — PAYMENT HISTORY
// ============================================================

function getPayments() {
  return readJSONSafe(
    DB_FILES.payments,
    []
  );
}

function getUserPayments(userId) {
  return getPayments()
    .filter(
      payment =>
        payment.userId === userId
    )
    .sort((a, b) => {
      return String(
        b.createdAt || ""
      ).localeCompare(
        String(
          a.createdAt || ""
        )
      );
    });
}

app.get(
  "/api/payments",
  optionalAuth,
  (req, res) => {
    try {
      const user =
        req.user ||
        getGuestUser();

      res.json({
        success: true,
        payments:
          getUserPayments(user.id)
      });
    } catch (error) {
      logError(
        "payments_get_error",
        {
          error: error.message
        }
      );

      res.status(500).json({
        success: false,
        error:
          "Ödeme geçmişi alınamadı."
      });
    }
  }
);


// ============================================================
// 4.9 — NOTIFICATION SYSTEM
// ============================================================

function getNotifications() {
  return readJSONSafe(
    DB_FILES.notifications,
    []
  );
}

function saveNotifications(
  notifications
) {
  return writeJSONSafe(
    DB_FILES.notifications,
    Array.isArray(notifications)
      ? notifications
      : []
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
    id: createId("notification"),
    userId,
    title: cleanText(
      title,
      200
    ),
    message: cleanText(
      message,
      1000
    ),
    type: cleanText(
      type,
      50
    ),
    read: false,
    createdAt: nowISO()
  };

  notifications.push(
    notification
  );

  saveNotifications(
    notifications
  );

  return notification;
}

function getUserNotifications(
  userId
) {
  return getNotifications()
    .filter(
      item =>
        item.userId === userId
    )
    .sort((a, b) => {
      return String(
        b.createdAt || ""
      ).localeCompare(
        String(
          a.createdAt || ""
        )
      );
    })
    .slice(0, 100);
}

function markNotificationRead(
  notificationId,
  userId
) {
  const notifications =
    getNotifications();

  const notification =
    notifications.find(
      item =>
        item.id === notificationId &&
        item.userId === userId
    );

  if (!notification) {
    return null;
  }

  notification.read = true;
  notification.readAt = nowISO();

  saveNotifications(
    notifications
  );

  return notification;
}

app.get(
  "/api/notifications",
  optionalAuth,
  (req, res) => {
    try {
      const user =
        req.user ||
        getGuestUser();

      const notifications =
        getUserNotifications(
          user.id
        );

      const unread =
        notifications.filter(
          item => !item.read
        ).length;

      res.json({
        success: true,
        notifications,
        unread
      });
    } catch (error) {
      logError(
        "notifications_get_error",
        {
          error: error.message
        }
      );

      res.status(500).json({
        success: false,
        error:
          "Bildirimler alınamadı."
      });
    }
  }
);

app.post(
  "/api/notifications/:id/read",
  optionalAuth,
  (req, res) => {
    try {
      const user =
        req.user ||
        getGuestUser();

      const notification =
        markNotificationRead(
          req.params.id,
          user.id
        );

      if (!notification) {
        return res.status(404).json({
          success: false,
          error:
            "Bildirim bulunamadı."
        });
      }

      res.json({
        success: true,
        notification
      });
    } catch (error) {
      logError(
        "notification_read_error",
        {
          error: error.message
        }
      );

      res.status(500).json({
        success: false,
        error:
          "Bildirim güncellenemedi."
      });
    }
  }
);


// ============================================================
// 4.10 — RATE LIMIT SYSTEM
// ============================================================

const RATE_LIMIT_STORE =
  new Map();

const RATE_LIMIT_CONFIG = {
  windowMs: 60 * 1000,
  maxRequests: 120
};

function getClientIdentifier(
  req
) {
  const forwarded =
    req.headers["x-forwarded-for"];

  if (forwarded) {
    return String(
      forwarded
    )
      .split(",")[0]
      .trim();
  }

  return (
    req.ip ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

function cleanupRateLimitStore() {
  const now = Date.now();

  for (
    const [
      key,
      value
    ] of RATE_LIMIT_STORE.entries()
  ) {
    if (
      now - value.startedAt >
      RATE_LIMIT_CONFIG.windowMs
    ) {
      RATE_LIMIT_STORE.delete(
        key
      );
    }
  }
}

function rateLimitMiddleware(
  req,
  res,
  next
) {
  const identifier =
    getClientIdentifier(req);

  const now = Date.now();

  let record =
    RATE_LIMIT_STORE.get(
      identifier
    );

  if (
    !record ||
    now - record.startedAt >
      RATE_LIMIT_CONFIG.windowMs
  ) {
    record = {
      startedAt: now,
      count: 0
    };
  }

  record.count += 1;

  RATE_LIMIT_STORE.set(
    identifier,
    record
  );

  if (
    record.count >
    RATE_LIMIT_CONFIG.maxRequests
  ) {
    logSecurity(
      "rate_limit",
      {
        identifier
      }
    );

    return res.status(429).json({
      success: false,
      code: "RATE_LIMIT",
      error:
        "Çok fazla istek gönderildi. Lütfen biraz bekle."
    });
  }

  next();
}

app.use(
  "/api",
  rateLimitMiddleware
);


// ============================================================
// 4.11 — SECURITY AUDIT
// ============================================================

function getSecurityRecords() {
  return readJSONSafe(
    DB_FILES.security,
    []
  );
}

function saveSecurityRecords(
  records
) {
  return writeJSONSafe(
    DB_FILES.security,
    Array.isArray(records)
      ? records
      : []
  );
}

function addSecurityRecord(
  data = {}
) {
  const records =
    getSecurityRecords();

  const record = {
    id: createId("security"),
    event: cleanText(
      data.event ||
      "unknown",
      150
    ),
    userId:
      data.userId || null,
    ip:
      cleanText(
        data.ip || "",
        100
      ),
    userAgent:
      cleanText(
        data.userAgent || "",
        500
      ),
    details:
      data.details || {},
    createdAt: nowISO()
  };

  records.push(record);

  if (
    records.length > 10000
  ) {
    records.splice(
      0,
      records.length - 10000
    );
  }

  saveSecurityRecords(
    records
  );

  return record;
}

app.get(
  "/api/security/status",
  optionalAuth,
  (req, res) => {
    try {
      const user =
        req.user ||
        getGuestUser();

      const plan =
        getUserPlan(user);

      res.json({
        success: true,
        security: {
          https:
            IS_PRODUCTION,
          helmet: true,
          rateLimit: true,
          audit: true,
          sessionProtection: true,
          currentPlan: plan
        }
      });
    } catch (error) {
      logError(
        "security_status_error",
        {
          error: error.message
        }
      );

      res.status(500).json({
        success: false,
        error:
          "Güvenlik durumu alınamadı."
      });
    }
  }
);


// ============================================================
// 4.12 — AUDIT LOG SYSTEM
// ============================================================

function getAuditRecords() {
  return readJSONSafe(
    DB_FILES.audit,
    []
  );
}

function saveAuditRecords(
  records
) {
  return writeJSONSafe(
    DB_FILES.audit,
    Array.isArray(records)
      ? records
      : []
  );
}

function createAuditLog(
  event,
  data = {}
) {
  const records =
    getAuditRecords();

  const item = {
    id: createId("audit"),
    event: cleanText(
      event,
      150
    ),
    userId:
      data.userId || null,
    ip:
      cleanText(
        data.ip || "",
        100
      ),
    metadata:
      data.metadata || {},
    createdAt: nowISO()
  };

  records.push(item);

  if (
    records.length > 20000
  ) {
    records.splice(
      0,
      records.length - 20000
    );
  }

  saveAuditRecords(
    records
  );

  return item;
}


// ============================================================
// 4.13 — ADMIN AUTHORIZATION
// ============================================================

function isAdminUser(user) {
  if (!user) {
    return false;
  }

  if (
    user.role === "admin" ||
    user.role === "developer"
  ) {
    return true;
  }

  const adminEmail =
    cleanText(
      process.env.TURKAI_ADMIN_EMAIL ||
      "",
      200
    );

  if (
    adminEmail &&
    user.email &&
    normalizeText(
      user.email
    ) ===
      normalizeText(
        adminEmail
      )
  ) {
    return true;
  }

  return false;
}

function requireAdmin(
  req,
  res,
  next
) {
  const user =
    req.user;

  if (!isAdminUser(user)) {
    logSecurity(
      "admin_access_denied",
      {
        userId:
          user?.id || null
      }
    );

    return res.status(403).json({
      success: false,
      error:
        "Bu işlem için yönetici yetkisi gerekiyor."
    });
  }

  next();
}


// ============================================================
// 4.14 — ADMIN STATUS
// ============================================================

app.get(
  "/api/admin/status",
  optionalAuth,
  requireAdmin,
  (req, res) => {
    try {
      const users =
        getUsers();

      const payments =
        getPayments();

      const knowledge =
        getKnowledge();

      const memories =
        getMemories();

      res.json({
        success: true,
        admin: {
          users:
            users.length,
          payments:
            payments.length,
          knowledge:
            knowledge.length,
          memories:
            memories.length,
          uptime:
            Math.floor(
              (Date.now() -
                START_TIME) /
              1000
            ),
          ai:
            AI_STATUS
        }
      });
    } catch (error) {
      logError(
        "admin_status_error",
        {
          error: error.message
        }
      );

      res.status(500).json({
        success: false,
        error:
          "Admin durumu alınamadı."
      });
    }
  }
);


// ============================================================
// 4.15 — ADMIN USERS
// ============================================================

app.get(
  "/api/admin/users",
  optionalAuth,
  requireAdmin,
  (req, res) => {
    try {
      const users =
        getUsers();

      const safeUsers =
        users.map(user => ({
          id: user.id,
          email: user.email,
          name: user.name,
          plan: user.plan,
          role: user.role,
          createdAt:
            user.createdAt,
          lastLoginAt:
            user.lastLoginAt
        }));

      res.json({
        success: true,
        users: safeUsers
      });
    } catch (error) {
      logError(
        "admin_users_error",
        {
          error: error.message
        }
      );

      res.status(500).json({
        success: false,
        error:
          "Kullanıcılar alınamadı."
      });
    }
  }
);


// ============================================================
// 4.16 — ADMIN PLAN UPDATE
// ============================================================

app.post(
  "/api/admin/users/:id/plan",
  optionalAuth,
  requireAdmin,
  (req, res) => {
    try {
      const plan =
        normalizePlan(
          req.body?.plan
        );

      if (
        !PLANS[plan]
      ) {
        return res.status(400).json({
          success: false,
          error:
            "Geçersiz plan."
        });
      }

      const user =
        activatePlanForUser(
          req.params.id,
          plan,
          "admin"
        );

      if (!user) {
        return res.status(404).json({
          success: false,
          error:
            "Kullanıcı bulunamadı."
        });
      }

      createAuditLog(
        "admin_plan_update",
        {
          userId:
            req.user?.id,
          metadata: {
            targetUserId:
              req.params.id,
            plan
          }
        }
      );

      createNotification(
        user.id,
        "Plan güncellendi",
        `TürkAI planın ${plan} olarak güncellendi.`,
        "system"
      );

      res.json({
        success: true,
        user: {
          id: user.id,
          plan: user.plan
        }
      });
    } catch (error) {
      logError(
        "admin_plan_update_error",
        {
          error: error.message
        }
      );

      res.status(500).json({
        success: false,
        error:
          "Plan güncellenemedi."
      });
    }
  }
);


// ============================================================
// 4.17 — ADMIN KNOWLEDGE
// ============================================================

app.get(
  "/api/admin/knowledge",
  optionalAuth,
  requireAdmin,
  (req, res) => {
    try {
      res.json({
        success: true,
        knowledge:
          getKnowledge()
      });
    } catch (error) {
      logError(
        "admin_knowledge_error",
        {
          error: error.message
        }
      );

      res.status(500).json({
        success: false,
        error:
          "Bilgi tabanı alınamadı."
      });
    }
  }
);


// ============================================================
// 4.18 — SYSTEM SETTINGS
// ============================================================

function getPublicSettings() {
  const settings =
    getSettings();

  return {
    appName:
      settings.appName ||
      APP_NAME,
    version:
      settings.version ||
      APP_VERSION,
    maintenance:
      Boolean(
        settings.maintenance
      ),
    registration:
      settings.registration !== false,
    research:
      settings.research !== false,
    memory:
      settings.memory !== false,
    uploads:
      settings.uploads !== false
  };
}

app.get(
  "/api/settings/public",
  (req, res) => {
    try {
      res.json({
        success: true,
        settings:
          getPublicSettings()
      });
    } catch (error) {
      logError(
        "public_settings_error",
        {
          error: error.message
        }
      );

      res.status(500).json({
        success: false,
        error:
          "Ayarlar alınamadı."
      });
    }
  }
);

app.post(
  "/api/admin/settings",
  optionalAuth,
  requireAdmin,
  (req, res) => {
    try {
      const current =
        getSettings();

      const allowed = [
        "maintenance",
        "registration",
        "research",
        "memory",
        "uploads"
      ];

      for (
        const key of allowed
      ) {
        if (
          req.body &&
          Object.prototype.hasOwnProperty.call(
            req.body,
            key
          )
        ) {
          current[key] =
            Boolean(
              req.body[key]
            );
        }
      }

      current.updatedAt =
        nowISO();

      saveSettings(
        current
      );

      createAuditLog(
        "settings_updated",
        {
          userId:
            req.user?.id,
          metadata: {
            changed:
              allowed.filter(
                key =>
                  Object.prototype.hasOwnProperty.call(
                    req.body || {},
                    key
                  )
              )
          }
        }
      );

      res.json({
        success: true,
        settings:
          getPublicSettings()
      });
    } catch (error) {
      logError(
        "admin_settings_error",
        {
          error: error.message
        }
      );

      res.status(500).json({
        success: false,
        error:
          "Ayarlar güncellenemedi."
      });
    }
  }
);


// ============================================================
// 4.19 — MAINTENANCE CHECK
// ============================================================

function maintenanceMiddleware(
  req,
  res,
  next
) {
  if (
    !req.path.startsWith(
      "/api"
    )
  ) {
    return next();
  }

  const settings =
    getSettings();

  if (
    settings.maintenance &&
    !req.path.includes(
      "/health"
    ) &&
    !req.path.includes(
      "/status"
    )
  ) {
    return res.status(503).json({
      success: false,
      code: "MAINTENANCE",
      error:
        "TürkAI şu anda bakım modunda."
    });
  }

  next();
}

app.use(
  maintenanceMiddleware
);


// ============================================================
// 4.20 — REQUEST AUDIT
// ============================================================

app.use(
  "/api",
  (req, res, next) => {
    const started =
      Date.now();

    res.on(
      "finish",
      () => {
        const duration =
          Date.now() -
          started;

        REQUEST_METRICS.total += 1;

        if (
          res.statusCode >= 400
        ) {
          REQUEST_METRICS.errors += 1;
        }

        createAuditLog(
          "api_request",
          {
            userId:
              req.user?.id ||
              null,
            ip:
              getClientIdentifier(
                req
              ),
            metadata: {
              method:
                req.method,
              path:
                req.path,
              status:
                res.statusCode,
              duration
            }
          }
        );
      }
    );

    next();
  }
);


// ============================================================
// 4.21 — SYSTEM DIAGNOSTICS
// ============================================================

function getSystemDiagnostics() {
  const memory =
    process.memoryUsage();

  return {
    app:
      APP_NAME,
    version:
      APP_VERSION,
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
      heapUsed:
        memory.heapUsed,
      heapTotal:
        memory.heapTotal,
      external:
        memory.external
    },
    metrics:
      REQUEST_METRICS,
    ai:
      AI_STATUS
  };
}

app.get(
  "/api/system/diagnostics",
  optionalAuth,
  requireAdmin,
  (req, res) => {
    try {
      res.json({
        success: true,
        diagnostics:
          getSystemDiagnostics()
      });
    } catch (error) {
      logError(
        "diagnostics_error",
        {
          error: error.message
        }
      );

      res.status(500).json({
        success: false,
        error:
          "Diagnostik alınamadı."
      });
    }
  }
);


// ============================================================
// 4.22 — CLEANUP TASKS
// ============================================================

function cleanupOldUsageRecords() {
  const records =
    getUsageRecords();

  const cutoff =
    Date.now() -
    1000 *
    60 *
    60 *
    24 *
    45;

  const filtered =
    records.filter(
      record => {
        const time =
          Date.parse(
            record.updatedAt ||
            record.createdAt ||
            ""
          );

        if (
          Number.isNaN(time)
        ) {
          return true;
        }

        return time >= cutoff;
      }
    );

  if (
    filtered.length !==
    records.length
  ) {
    saveUsageRecords(
      filtered
    );
  }
}

function cleanupOldAuditRecords() {
  const records =
    getAuditRecords();

  if (
    records.length > 20000
  ) {
    saveAuditRecords(
      records.slice(
        -20000
      )
    );
  }
}

function cleanupOldSecurityRecords() {
  const records =
    getSecurityRecords();

  if (
    records.length > 10000
  ) {
    saveSecurityRecords(
      records.slice(
        -10000
      )
    );
  }
}


// ============================================================
// 4.23 — PERIODIC MAINTENANCE
// ============================================================

const TURKAI_MAINTENANCE_INTERVAL =
  setInterval(
    () => {
      try {
        cleanupRateLimitStore();
        cleanupOldUsageRecords();
        cleanupOldAuditRecords();
        cleanupOldSecurityRecords();
      } catch (error) {
        logError(
          "maintenance_task_error",
          {
            error: error.message
          }
        );
      }
    },
    10 * 60 * 1000
  );

if (
  typeof TURKAI_MAINTENANCE_INTERVAL
    ?.unref === "function"
) {
  TURKAI_MAINTENANCE_INTERVAL.unref();
}


// ============================================================
// 4.24 — FEATURE STATUS
// ============================================================

app.get(
  "/api/features",
  optionalAuth,
  (req, res) => {
    try {
      const user =
        req.user ||
        getGuestUser();

      const plan =
        getUserPlanInfo(user);

      res.json({
        success: true,
        plan:
          plan.name,
        features: {
          chat:
            true,
          memory:
            true,
          research:
            true,
          fileUpload:
            Number(
              plan.fileLimitMB ||
              0
            ) > 0,
          imageGeneration:
            Number(
              plan.imageLimit ||
              0
            ) > 0,
          videoGeneration:
            Number(
              plan.videoLimit ||
              0
            ) > 0,
          projects:
            true,
          notifications:
            true,
          security:
            true
        }
      });
    } catch (error) {
      logError(
        "features_error",
        {
          error: error.message
        }
      );

      res.status(500).json({
        success: false,
        error:
          "Özellikler alınamadı."
      });
    }
  }
);


// ============================================================
// 4.25 — QUICK SYSTEM TEST
// ============================================================

app.get(
  "/api/test-payment",
  (req, res) => {
    res.json({
      success: true,
      mode: "GET",
      message:
        "TürkAI ödeme test sistemi hazır."
    });
  }
);


// ============================================================
// 4.26 — 4/5 EXPORTS
// ============================================================

module.exports.turkaiUsage = {
  getUsageRecords,
  saveUsageRecords,
  getUserUsage,
  updateUsage,
  getUsageSummary,
  getPlanInfo,
  getUserPlan,
  getUserPlanInfo,
  getPlanLimit,
  getUsageValue,
  hasUsageAvailable,
  consumeUsage
};

module.exports.turkaiPayments = {
  getPayments,
  getUserPayments,
  activatePlanForUser,
  isValidProCode
};

module.exports.turkaiNotifications = {
  getNotifications,
  saveNotifications,
  createNotification,
  getUserNotifications,
  markNotificationRead
};

module.exports.turkaiSecurity = {
  getSecurityRecords,
  saveSecurityRecords,
  addSecurityRecord,
  createAuditLog,
  isAdminUser,
  getSystemDiagnostics
};


// ============================================================
// 4/5 SONU
// ============================================================
// ============================================================
// TÜRKAI 11.0.0
// SERVER.JS — 5/5
// FINAL INTEGRATION + SOCKET.IO + STATIC + STARTUP
// ============================================================

"use strict";


// ============================================================
// 5.1 — ADVANCED CHAT ENGINE
// ============================================================

function buildConversationContext(
  userId,
  chatId,
  currentMessage
) {
  const parts = [];

  const memoryContext =
    buildUserContext(userId);

  if (memoryContext) {
    parts.push(memoryContext);
  }

  const knowledge =
    findKnowledgeAnswer(
      currentMessage
    );

  if (knowledge) {
    parts.push(
      [
        "İlgili yerel bilgi:",
        knowledge.answer
      ].join("\n")
    );
  }

  if (chatId) {
    const history =
      getChatMessages(chatId);

    if (history.length) {
      const recent =
        history.slice(-12);

      parts.push(
        recent
          .map(item => {
            const role =
              item.role === "user"
                ? "Kullanıcı"
                : "TürkAI";

            return `${role}: ${item.content}`;
          })
          .join("\n")
      );
    }
  }

  return parts.join("\n\n");
}


function buildFinalAIRequest(
  userId,
  chatId,
  message
) {
  const context =
    buildConversationContext(
      userId,
      chatId,
      message
    );

  const messages = [
    {
      role: "system",
      content:
        TURKAI_SYSTEM_PROMPT
    }
  ];

  if (context) {
    messages.push({
      role: "system",
      content:
        "Ek bağlam:\n" +
        context
    });
  }

  messages.push({
    role: "user",
    content: message
  });

  return messages;
}


async function generateFinalChatAnswer({
  user,
  chatId,
  message,
  model
}) {
  const cleanMessage =
    cleanText(
      message,
      12000
    );

  if (!cleanMessage) {
    return {
      answer:
        "Bir mesaj yazmalısın.",
      provider:
        "local",
      model:
        "local"
    };
  }


  // ----------------------------------------------------------
  // 1. Basit cevap kontrolü
  // ----------------------------------------------------------

  const simple =
    localResponse(
      cleanMessage
    );

  if (simple) {
    return {
      answer: simple,
      provider:
        "local",
      model:
        "local"
    };
  }


  // ----------------------------------------------------------
  // 2. Knowledge kontrolü
  // ----------------------------------------------------------

  const knowledge =
    findKnowledgeAnswer(
      cleanMessage
    );

  if (
    knowledge &&
    knowledge.score >= 35
  ) {
    return {
      answer:
        knowledge.answer,
      provider:
        "knowledge",
      model:
        "local-knowledge"
    };
  }


  // ----------------------------------------------------------
  // 3. AI
  // ----------------------------------------------------------

  const messages =
    buildFinalAIRequest(
      user.id,
      chatId,
      cleanMessage
    );

  const result =
    await callAIProviders(
      messages,
      {
        preferredModel:
          model || "fast"
      }
    );

  if (
    result &&
    result.text
  ) {
    return {
      answer:
        normalizeAIText(
          result.text
        ),
      provider:
        result.provider ||
        "unknown",
      model:
        result.model ||
        model ||
        "default"
    };
  }


  // ----------------------------------------------------------
  // 4. Son yerel fallback
  // ----------------------------------------------------------

  return {
    answer:
      "Şu anda yapay zekâ servislerine bağlanamıyorum. Biraz sonra tekrar deneyebilirsin.",
    provider:
      "local-fallback",
    model:
      "local"
  };
}


// ============================================================
// 5.2 — CHAT ROUTE OVERRIDE
// ============================================================
//
// 2/5'te /api/chat zaten tanımlandıysa bu route,
// Express sıralaması nedeniyle ona ek olarak çalışmaz.
// Bu nedenle mevcut route'un yerine kullanılacak gelişmiş
// sürümü kullanmak için 2/5'teki eski /api/chat route'unu
// kaldırıp bunu kullanabilirsin.
// ============================================================


// ============================================================
// 5.3 — CHAT HEALTH
// ============================================================

app.get(
  "/api/chat/health",
  (req, res) => {
    res.json({
      success: true,
      chat: true,
      memory: true,
      knowledge: true,
      research: true,
      projects: true,
      timestamp:
        nowISO()
    });
  }
);


// ============================================================
// 5.4 — CONVERSATION EXPORT
// ============================================================

app.get(
  "/api/chat/:chatId/export",
  optionalAuth,
  (req, res) => {
    try {
      const user =
        req.user ||
        getGuestUser();

      const chat =
        findChatById(
          req.params.chatId
        );

      if (!chat) {
        return res.status(404).json({
          success: false,
          error:
            "Sohbet bulunamadı."
        });
      }

      if (
        chat.userId &&
        chat.userId !== user.id
      ) {
        return res.status(403).json({
          success: false,
          error:
            "Bu sohbete erişim iznin yok."
        });
      }

      const messages =
        getChatMessages(
          chat.id
        );

      res.json({
        success: true,
        export: {
          app:
            APP_NAME,
          version:
            APP_VERSION,
          chat: {
            id:
              chat.id,
            title:
              chat.title,
            createdAt:
              chat.createdAt,
            updatedAt:
              chat.updatedAt
          },
          messages
        }
      });
    } catch (error) {
      logError(
        "chat_export_error",
        {
          error:
            error.message
        }
      );

      res.status(500).json({
        success: false,
        error:
          "Sohbet dışa aktarılamadı."
      });
    }
  }
);


// ============================================================
// 5.5 — CHAT DELETE
// ============================================================

app.delete(
  "/api/chat/:chatId",
  optionalAuth,
  (req, res) => {
    try {
      const user =
        req.user ||
        getGuestUser();

      const chats =
        getChats();

      const index =
        chats.findIndex(
          chat =>
            chat.id ===
              req.params.chatId &&
            chat.userId ===
              user.id
        );

      if (index === -1) {
        return res.status(404).json({
          success: false,
          error:
            "Sohbet bulunamadı."
        });
      }

      const chat =
        chats[index];

      chats.splice(
        index,
        1
      );

      saveChats(chats);

      const messages =
        getMessages();

      const remaining =
        messages.filter(
          message =>
            message.chatId !==
            chat.id
        );

      saveMessages(
        remaining
      );

      createAuditLog(
        "chat_deleted",
        {
          userId:
            user.id,
          metadata: {
            chatId:
              chat.id
          }
        }
      );

      res.json({
        success: true
      });
    } catch (error) {
      logError(
        "chat_delete_error",
        {
          error:
            error.message
        }
      );

      res.status(500).json({
        success: false,
        error:
          "Sohbet silinemedi."
      });
    }
  }
);


// ============================================================
// 5.6 — CHAT RENAME
// ============================================================

app.patch(
  "/api/chat/:chatId",
  optionalAuth,
  (req, res) => {
    try {
      const user =
        req.user ||
        getGuestUser();

      const chats =
        getChats();

      const chat =
        chats.find(
          item =>
            item.id ===
              req.params.chatId &&
            item.userId ===
              user.id
        );

      if (!chat) {
        return res.status(404).json({
          success: false,
          error:
            "Sohbet bulunamadı."
        });
      }

      if (
        req.body &&
        req.body.title !==
          undefined
      ) {
        chat.title =
          cleanText(
            req.body.title,
            150
          ) ||
          "Yeni Sohbet";
      }

      chat.updatedAt =
        nowISO();

      saveChats(chats);

      res.json({
        success: true,
        chat
      });
    } catch (error) {
      logError(
        "chat_rename_error",
        {
          error:
            error.message
        }
      );

      res.status(500).json({
        success: false,
        error:
          "Sohbet güncellenemedi."
      });
    }
  }
);


// ============================================================
// 5.7 — SEARCH CHAT HISTORY
// ============================================================

app.get(
  "/api/chats/search",
  optionalAuth,
  (req, res) => {
    try {
      const user =
        req.user ||
        getGuestUser();

      const query =
        normalizeText(
          cleanText(
            req.query?.q,
            500
          )
        );

      if (!query) {
        return res.json({
          success: true,
          results: []
        });
      }

      const chats =
        getChats().filter(
          chat =>
            chat.userId ===
            user.id
        );

      const messages =
        getMessages().filter(
          message =>
            message.userId ===
            user.id
        );

      const results = [];

      for (
        const message of messages
      ) {
        const content =
          normalizeText(
            message.content
          );

        if (
          content.includes(
            query
          )
        ) {
          const chat =
            chats.find(
              item =>
                item.id ===
                message.chatId
            );

          results.push({
            chatId:
              message.chatId,
            chatTitle:
              chat?.title ||
              "Sohbet",
            messageId:
              message.id,
            role:
              message.role,
            content:
              message.content,
            createdAt:
              message.createdAt
          });
        }
      }

      res.json({
        success: true,
        results:
          results
            .slice(
              -100
            )
            .reverse()
      });
    } catch (error) {
      logError(
        "chat_search_error",
        {
          error:
            error.message
        }
      );

      res.status(500).json({
        success: false,
        error:
          "Sohbetlerde arama yapılamadı."
      });
    }
  }
);


// ============================================================
// 5.8 — SOCKET.IO
// ============================================================

io.on(
  "connection",
  socket => {
    const connectedAt =
      nowISO();

    logInfo(
      "socket_connected",
      {
        socketId:
          socket.id,
        connectedAt
      }
    );


    socket.emit(
      "turkai:ready",
      {
        success: true,
        app:
          APP_NAME,
        version:
          APP_VERSION,
        socketId:
          socket.id,
        timestamp:
          connectedAt
      }
    );


    socket.on(
      "turkai:ping",
      payload => {
        socket.emit(
          "turkai:pong",
          {
            success: true,
            received:
              payload || null,
            timestamp:
              nowISO()
          }
        );
      }
    );


    socket.on(
      "chat:join",
      chatId => {
        const cleanChatId =
          cleanText(
            chatId,
            150
          );

        if (!cleanChatId) {
          return;
        }

        socket.join(
          `chat:${cleanChatId}`
        );

        socket.emit(
          "chat:joined",
          {
            chatId:
              cleanChatId
          }
        );
      }
    );


    socket.on(
      "chat:leave",
      chatId => {
        const cleanChatId =
          cleanText(
            chatId,
            150
          );

        if (!cleanChatId) {
          return;
        }

        socket.leave(
          `chat:${cleanChatId}`
        );

        socket.emit(
          "chat:left",
          {
            chatId:
              cleanChatId
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
            150
          );

        if (!chatId) {
          return;
        }

        socket
          .to(`chat:${chatId}`)
          .emit(
            "chat:typing",
            {
              chatId,
              typing:
                Boolean(
                  payload?.typing
                )
            }
          );
      }
    );


    socket.on(
      "disconnect",
      reason => {
        logInfo(
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


// ============================================================
// 5.9 — SOCKET STATUS
// ============================================================

app.get(
  "/api/socket/status",
  (req, res) => {
    res.json({
      success: true,
      socketIO:
        true,
      connected:
        io.engine
          ? io.engine.clientsCount
          : 0,
      timestamp:
        nowISO()
    });
  }
);


// ============================================================
// 5.10 — SERVER INFO
// ============================================================

app.get(
  "/api/server/info",
  (req, res) => {
    res.json({
      success: true,
      server: {
        name:
          APP_NAME,
        version:
          APP_VERSION,
        description:
          APP_DESCRIPTION,
        environment:
          NODE_ENV,
        production:
          IS_PRODUCTION,
        node:
          process.version,
        platform:
          process.platform,
        architecture:
          process.arch,
        uptime:
          process.uptime(),
        startedAt:
          new Date(
            START_TIME
          ).toISOString(),
        serverId:
          SERVER_ID
      }
    });
  }
);


// ============================================================
// 5.11 — API SUMMARY
// ============================================================

app.get(
  "/api",
  (req, res) => {
    res.json({
      success: true,
      name:
        APP_NAME,
      version:
        APP_VERSION,
      message:
        "TürkAI API aktif.",
      endpoints: {
        health:
          "/api/health",
        status:
          "/api/status",
        chat:
          "/api/chat",
        memory:
          "/api/memory",
        knowledge:
          "/api/knowledge",
        research:
          "/api/research",
        files:
          "/api/files",
        projects:
          "/api/projects",
        plans:
          "/api/plans",
        usage:
          "/api/usage",
        notifications:
          "/api/notifications",
        features:
          "/api/features"
      }
    });
  }
);


// ============================================================
// 5.12 — STATIC FRONTEND
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
        index:
          false,
        maxAge:
          IS_PRODUCTION
            ? "1h"
            : 0
      }
    )
  );
}


// ============================================================
// 5.13 — COMMON STATIC LOCATIONS
// ============================================================

const possibleFrontendFiles = [
  path.join(
    ROOT_DIR,
    "index.html"
  ),
  path.join(
    ROOT_DIR,
    "public",
    "index.html"
  )
];

function findFrontendFile() {
  for (
    const file of
    possibleFrontendFiles
  ) {
    if (
      fs.existsSync(file)
    ) {
      return file;
    }
  }

  return null;
}


// ============================================================
// 5.14 — ROOT PAGE
// ============================================================

app.get(
  "/",
  (req, res) => {
    const frontend =
      findFrontendFile();

    if (
      frontend
    ) {
      return res.sendFile(
        frontend
      );
    }

    res.type(
      "html"
    ).send(`
<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${APP_NAME}</title>
<style>
body{
  margin:0;
  min-height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
  background:#090b10;
  color:#fff;
  font-family:Arial,sans-serif;
}
.box{
  max-width:600px;
  padding:40px;
  text-align:center;
}
h1{
  font-size:42px;
  margin-bottom:12px;
}
p{
  color:#aab0c0;
}
.status{
  display:inline-block;
  margin-top:20px;
  padding:10px 16px;
  border-radius:12px;
  background:#151923;
  border:1px solid #272d3b;
}
</style>
</head>
<body>
<div class="box">
<h1>TürkAI</h1>
<p>TürkAI sunucusu çalışıyor.</p>
<div class="status">API aktif • v${APP_VERSION}</div>
</div>
</body>
</html>
`);
  }
);


// ============================================================
// 5.15 — FRONTEND SPA FALLBACK
// ============================================================

app.get(
  "*",
  (req, res, next) => {
    if (
      req.path.startsWith(
        "/api/"
      )
    ) {
      return next();
    }

    const frontend =
      findFrontendFile();

    if (
      frontend &&
      (
        req.method ===
        "GET"
      )
    ) {
      return res.sendFile(
        frontend
      );
    }

    next();
  }
);


// ============================================================
// 5.16 — FINAL API 404
// ============================================================

app.use(
  "/api",
  (req, res) => {
    res.status(404).json({
      success: false,
      error:
        "API endpoint bulunamadı.",
      path:
        req.originalUrl
    });
  }
);


// ============================================================
// 5.17 — GLOBAL 404
// ============================================================

app.use(
  (req, res) => {
    if (
      req.accepts(
        "html"
      )
    ) {
      return res.status(404)
        .send(`
<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>404 — TürkAI</title>
<style>
body{
  margin:0;
  min-height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
  background:#090b10;
  color:#fff;
  font-family:Arial,sans-serif;
}
main{
  text-align:center;
}
h1{
  font-size:80px;
  margin:0;
}
p{
  color:#9ca3b5;
}
a{
  color:#7c5cff;
  text-decoration:none;
}
</style>
</head>
<body>
<main>
<h1>404</h1>
<p>Bu sayfa bulunamadı.</p>
<a href="/">TürkAI'ye dön</a>
</main>
</body>
</html>
`);
    }

    res.status(404).json({
      success: false,
      error:
        "İstek yapılan kaynak bulunamadı."
    });
  }
);


// ============================================================
// 5.18 — GLOBAL ERROR HANDLER
// ============================================================

app.use(
  (
    error,
    req,
    res,
    next
  ) => {
    logError(
      "global_error",
      {
        error:
          error?.message ||
          "Unknown error",
        stack:
          error?.stack ||
          null,
        method:
          req?.method,
        path:
          req?.path
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
        error?.status ||
        error?.statusCode
      ) || 500;

    res.status(
      status
    ).json({
      success: false,
      error:
        IS_PRODUCTION
          ? "Sunucu hatası oluştu."
          : (
              error?.message ||
              "Sunucu hatası."
            )
    });
  }
);


// ============================================================
// 5.19 — SERVER START
// ============================================================

let SERVER_INSTANCE = null;

function startServer() {
  if (
    SERVER_INSTANCE
  ) {
    return SERVER_INSTANCE;
  }

  SERVER_INSTANCE =
    httpServer.listen(
      PORT,
      HOST,
      () => {
        const address =
          httpServer.address();

        const actualPort =
          typeof address ===
          "object" &&
          address
            ? address.port
            : PORT;

        logInfo(
          "server_started",
          {
            app:
              APP_NAME,
            version:
              APP_VERSION,
            port:
              actualPort,
            host:
              HOST,
            environment:
              NODE_ENV,
            serverId:
              SERVER_ID
          }
        );

        console.log("");
        console.log(
          "=============================================="
        );
        console.log(
          "             TÜRKAI SERVER"
        );
        console.log(
          "=============================================="
        );
        console.log(
          `App        : ${APP_NAME}`
        );
        console.log(
          `Version    : ${APP_VERSION}`
        );
        console.log(
          `Environment: ${NODE_ENV}`
        );
        console.log(
          `Port       : ${actualPort}`
        );
        console.log(
          `Server ID  : ${SERVER_ID}`
        );
        console.log(
          "Status     : ONLINE"
        );
        console.log(
          "=============================================="
        );
        console.log("");
      }
    );

  return SERVER_INSTANCE;
}


// ============================================================
// 5.20 — GRACEFUL SHUTDOWN
// ============================================================

let shuttingDown =
  false;

async function shutdown(
  signal
) {
  if (
    shuttingDown
  ) {
    return;
  }

  shuttingDown =
    true;

  console.log(
    `\n[TürkAI] ${signal} alındı. Sunucu kapatılıyor...`
  );

  logInfo(
    "server_shutdown_start",
    {
      signal
    }
  );

  try {
    clearInterval(
      TURKAI_MAINTENANCE_INTERVAL
    );
  } catch {}

  try {
    io.close();
  } catch (
    socketError
  ) {
    logWarn(
      "socket_shutdown_error",
      {
        error:
          socketError.message
      }
    );
  }

  try {
    if (
      SERVER_INSTANCE
    ) {
      await new Promise(
        resolve => {
          SERVER_INSTANCE.close(
            () => resolve()
          );
        }
      );
    }
  } catch (
    serverError
  ) {
    logError(
      "server_shutdown_error",
      {
        error:
          serverError.message
      }
    );
  }

  logInfo(
    "server_shutdown_complete",
    {
      signal
    }
  );

  process.exit(0);
}


// ============================================================
// 5.21 — PROCESS ERROR HANDLERS
// ============================================================

process.on(
  "SIGINT",
  () => {
    shutdown(
      "SIGINT"
    );
  }
);

process.on(
  "SIGTERM",
  () => {
    shutdown(
      "SIGTERM"
    );
  }
);

process.on(
  "uncaughtException",
  error => {
    logError(
      "uncaught_exception",
      {
        error:
          error.message,
        stack:
          error.stack
      }
    );

    console.error(
      "[TürkAI] Uncaught Exception:",
      error
    );
  }
);

process.on(
  "unhandledRejection",
  reason => {
    logError(
      "unhandled_rejection",
      {
        error:
          String(reason)
      }
    );

    console.error(
      "[TürkAI] Unhandled Rejection:",
      reason
    );
  }
);


// ============================================================
// 5.22 — FINAL SERVER STATE
// ============================================================

SERVER_STATE.started =
  false;

SERVER_STATE.startTime =
  START_TIME;

SERVER_STATE.serverId =
  SERVER_ID;

SERVER_STATE.version =
  APP_VERSION;


// ============================================================
// 5.23 — FINAL EXPORTS
// ============================================================

module.exports = {
  app,
  httpServer,
  io,

  APP_NAME,
  APP_VERSION,
  APP_DESCRIPTION,

  startServer,
  shutdown,

  getUsers,
  saveUsers,
  findUserById,
  findUserByEmail,
  createUser,

  getSessions,
  saveSessions,
  createSession,
  getSessionByToken,

  getChats,
  saveChats,
  createChat,
  findChatById,
  getChatMessages,

  getMemories,
  saveMemories,
  getUserMemories,
  createMemory,

  getKnowledge,
  saveKnowledge,
  addKnowledge,
  findKnowledgeAnswer,

  performResearch,

  getUserFiles,
  registerFile,

  getUserProjects,
  createProject,

  getUsageSummary,
  consumeUsage,

  getPlanInfo,
  getUserPlan,
  getUserPlanInfo,

  createNotification,
  getUserNotifications,

  createAuditLog,

  isAdminUser,

  getSystemDiagnostics
};


// ============================================================
// 5.24 — START SERVER
// ============================================================

if (
  require.main ===
  module
) {
  startServer();
}


// ============================================================
// TÜRKAI 11.0.0
// SERVER.JS TAMAMLANDI
// ============================================================

console.log(
  `[TürkAI] server.js ${APP_VERSION} hazır.`
);
