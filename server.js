"use strict";

/* ============================================================
   TÜRKAI 16.0
   SERVER.JS — PART 1 / 5

   TEMEL SİSTEM
   ├── Express
   ├── HTTP
   ├── Socket.IO
   ├── CORS
   ├── Helmet
   ├── Database
   ├── Users
   ├── Sessions
   ├── Chats
   ├── Messages
   ├── Memories
   ├── Knowledge
   ├── Projects
   ├── Files
   ├── Research
   ├── Payments
   ├── Notifications
   ├── Settings
   ├── Statistics
   └── API temel sistemi

   ÖNEMLİ:
   Bu dosyada server başlatılmaz.
   startServer() sadece PART 5'te çağrılacaktır.
   ============================================================ */

require("dotenv").config();

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const http = require("http");
const os = require("os");

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const {
    Server: SocketIOServer
} = require("socket.io");

/* ============================================================
   UYGULAMA BİLGİLERİ
   ============================================================ */

const TURKAI_APP_NAME = "TürkAI";

const TURKAI_APP_VERSION = "16.0.0";

const TURKAI_APP_DESCRIPTION =
    "Türkçe odaklı yapay zekâ platformu.";

const TURKAI_ENV =
    process.env.NODE_ENV ||
    "development";

const TURKAI_IS_PRODUCTION =
    TURKAI_ENV === "production";

const TURKAI_PORT =
    Number(process.env.PORT) ||
    10000;

const TURKAI_HOST =
    process.env.HOST ||
    "0.0.0.0";

const TURKAI_START_TIME =
    Date.now();

const TURKAI_SERVER_ID =
    crypto.randomUUID();

/* ============================================================
   EXPRESS / HTTP / SOCKET
   ============================================================ */

const turkaiApp =
    express();

const turkaiHttpServer =
    http.createServer(
        turkaiApp
    );

const turkaiIO =
    new SocketIOServer(
        turkaiHttpServer,
        {
            cors: {
                origin: true,
                credentials: true
            }
        }
    );

/* ============================================================
   DİZİNLER
   ============================================================ */

const TURKAI_ROOT_DIR =
    __dirname;

const TURKAI_PUBLIC_DIR =
    path.join(
        TURKAI_ROOT_DIR,
        "public"
    );

const TURKAI_DATA_DIR =
    path.join(
        TURKAI_ROOT_DIR,
        "data"
    );

const TURKAI_DATABASE_DIR =
    path.join(
        TURKAI_DATA_DIR,
        "database"
    );

const TURKAI_STORAGE_DIR =
    path.join(
        TURKAI_ROOT_DIR,
        "storage"
    );

const TURKAI_UPLOADS_DIR =
    path.join(
        TURKAI_STORAGE_DIR,
        "uploads"
    );

const TURKAI_GENERATED_DIR =
    path.join(
        TURKAI_STORAGE_DIR,
        "generated"
    );

const TURKAI_LOGS_DIR =
    path.join(
        TURKAI_ROOT_DIR,
        "logs"
    );

const TURKAI_CACHE_DIR =
    path.join(
        TURKAI_ROOT_DIR,
        "cache"
    );

const TURKAI_TEMP_DIR =
    path.join(
        TURKAI_ROOT_DIR,
        "temp"
    );

const TURKAI_BACKUP_DIR =
    path.join(
        TURKAI_ROOT_DIR,
        "backups"
    );

/* ============================================================
   DİZİNLERİ OLUŞTUR
   ============================================================ */

const TURKAI_REQUIRED_DIRECTORIES = [
    TURKAI_PUBLIC_DIR,
    TURKAI_DATA_DIR,
    TURKAI_DATABASE_DIR,
    TURKAI_STORAGE_DIR,
    TURKAI_UPLOADS_DIR,
    TURKAI_GENERATED_DIR,
    TURKAI_LOGS_DIR,
    TURKAI_CACHE_DIR,
    TURKAI_TEMP_DIR,
    TURKAI_BACKUP_DIR
];

for (
    const turkaiDirectory
    of TURKAI_REQUIRED_DIRECTORIES
) {
    try {
        fs.mkdirSync(
            turkaiDirectory,
            {
                recursive: true
            }
        );
    } catch (turkaiDirectoryError) {
        console.error(
            "[TÜRKAI] Directory error:",
            turkaiDirectoryError
        );
    }
}

/* ============================================================
   DATABASE DOSYALARI
   ============================================================ */

const TURKAI_DB_FILES = {
    users:
        "users.json",

    sessions:
        "sessions.json",

    chats:
        "chats.json",

    messages:
        "messages.json",

    memories:
        "memories.json",

    knowledge:
        "knowledge.json",

    projects:
        "projects.json",

    files:
        "files.json",

    research:
        "research.json",

    payments:
        "payments.json",

    notifications:
        "notifications.json",

    audit:
        "audit.json",

    security:
        "security.json",

    settings:
        "settings.json",

    statistics:
        "statistics.json"
};

/* ============================================================
   DATABASE DEFAULTLARI
   ============================================================ */

const TURKAI_DATABASE_DEFAULTS = {
    users: [],

    sessions: [],

    chats: [],

    messages: [],

    memories: [],

    knowledge: [],

    projects: [],

    files: [],

    research: [],

    payments: [],

    notifications: [],

    audit: [],

    security: [],

    settings: [],

    statistics: {
        serverStarts: 0,
        serverStops: 0,
        requests: 0,
        errors: 0,
        chatRequests: 0,
        chatErrors: 0,
        memoryCreated: 0,
        projectsCreated: 0,
        filesCreated: 0,
        researchRequests: 0,
        lastUpdated: null
    }
};

/* ============================================================
   DATABASE YOLU
   ============================================================ */

function turkaiDatabasePath(
    turkaiDatabaseName
) {
    const turkaiFileName =
        TURKAI_DB_FILES[
            turkaiDatabaseName
        ];

    if (!turkaiFileName) {
        throw new Error(
            "Bilinmeyen database: " +
            turkaiDatabaseName
        );
    }

    return path.join(
        TURKAI_DATABASE_DIR,
        turkaiFileName
    );
}

/* ============================================================
   DATABASE OLUŞTUR
   ============================================================ */

function turkaiEnsureDatabase(
    turkaiDatabaseName
) {
    const turkaiPath =
        turkaiDatabasePath(
            turkaiDatabaseName
        );

    if (!fs.existsSync(turkaiPath)) {
        const turkaiDefaultValue =
            TURKAI_DATABASE_DEFAULTS[
                turkaiDatabaseName
            ];

        fs.writeFileSync(
            turkaiPath,
            JSON.stringify(
                turkaiDefaultValue,
                null,
                2
            ),
            "utf8"
        );
    }

    return turkaiPath;
}

/* ============================================================
   DATABASE OKUMA
   ============================================================ */

function turkaiReadDatabase(
    turkaiDatabaseName
) {
    try {
        const turkaiPath =
            turkaiEnsureDatabase(
                turkaiDatabaseName
            );

        const turkaiRaw =
            fs.readFileSync(
                turkaiPath,
                "utf8"
            );

        if (!turkaiRaw.trim()) {
            return TURKAI_DATABASE_DEFAULTS[
                turkaiDatabaseName
            ];
        }

        return JSON.parse(
            turkaiRaw
        );

    } catch (turkaiReadError) {
        console.error(
            "[TÜRKAI] Database read error:",
            turkaiReadError
        );

        return TURKAI_DATABASE_DEFAULTS[
            turkaiDatabaseName
        ];
    }
}

/* ============================================================
   DATABASE YAZMA
   ============================================================ */

function turkaiWriteDatabase(
    turkaiDatabaseName,
    turkaiValue
) {
    const turkaiPath =
        turkaiEnsureDatabase(
            turkaiDatabaseName
        );

    const turkaiTemporaryPath =
        turkaiPath +
        ".tmp";

    fs.writeFileSync(
        turkaiTemporaryPath,
        JSON.stringify(
            turkaiValue,
            null,
            2
        ),
        "utf8"
    );

    fs.renameSync(
        turkaiTemporaryPath,
        turkaiPath
    );

    return true;
}

/* ============================================================
   DATABASELERİ GARANTİLE
   ============================================================ */

for (
    const turkaiDatabaseName
    of Object.keys(
        TURKAI_DB_FILES
    )
) {
    turkaiEnsureDatabase(
        turkaiDatabaseName
    );
}

/* ============================================================
   DATABASE GETTERLARI
   ============================================================ */

function turkaiGetUsers() {
    return turkaiReadDatabase(
        "users"
    );
}

function turkaiSaveUsers(
    turkaiData
) {
    return turkaiWriteDatabase(
        "users",
        turkaiData
    );
}

function turkaiGetSessions() {
    return turkaiReadDatabase(
        "sessions"
    );
}

function turkaiSaveSessions(
    turkaiData
) {
    return turkaiWriteDatabase(
        "sessions",
        turkaiData
    );
}

function turkaiGetChats() {
    return turkaiReadDatabase(
        "chats"
    );
}

function turkaiSaveChats(
    turkaiData
) {
    return turkaiWriteDatabase(
        "chats",
        turkaiData
    );
}

function turkaiGetMessages() {
    return turkaiReadDatabase(
        "messages"
    );
}

function turkaiSaveMessages(
    turkaiData
) {
    return turkaiWriteDatabase(
        "messages",
        turkaiData
    );
}

function turkaiGetMemories() {
    return turkaiReadDatabase(
        "memories"
    );
}

function turkaiSaveMemories(
    turkaiData
) {
    return turkaiWriteDatabase(
        "memories",
        turkaiData
    );
}

function turkaiGetKnowledge() {
    return turkaiReadDatabase(
        "knowledge"
    );
}

function turkaiSaveKnowledge(
    turkaiData
) {
    return turkaiWriteDatabase(
        "knowledge",
        turkaiData
    );
}

function turkaiGetProjects() {
    return turkaiReadDatabase(
        "projects"
    );
}

function turkaiSaveProjects(
    turkaiData
) {
    return turkaiWriteDatabase(
        "projects",
        turkaiData
    );
}

function turkaiGetFiles() {
    return turkaiReadDatabase(
        "files"
    );
}

function turkaiSaveFiles(
    turkaiData
) {
    return turkaiWriteDatabase(
        "files",
        turkaiData
    );
}

function turkaiGetResearch() {
    return turkaiReadDatabase(
        "research"
    );
}

function turkaiSaveResearch(
    turkaiData
) {
    return turkaiWriteDatabase(
        "research",
        turkaiData
    );
}

function turkaiGetPayments() {
    return turkaiReadDatabase(
        "payments"
    );
}

function turkaiSavePayments(
    turkaiData
) {
    return turkaiWriteDatabase(
        "payments",
        turkaiData
    );
}

function turkaiGetNotifications() {
    return turkaiReadDatabase(
        "notifications"
    );
}

function turkaiSaveNotifications(
    turkaiData
) {
    return turkaiWriteDatabase(
        "notifications",
        turkaiData
    );
}

function turkaiGetAudit() {
    return turkaiReadDatabase(
        "audit"
    );
}

function turkaiSaveAudit(
    turkaiData
) {
    return turkaiWriteDatabase(
        "audit",
        turkaiData
    );
}

function turkaiGetSecurity() {
    return turkaiReadDatabase(
        "security"
    );
}

function turkaiSaveSecurity(
    turkaiData
) {
    return turkaiWriteDatabase(
        "security",
        turkaiData
    );
}

function turkaiGetSettings() {
    return turkaiReadDatabase(
        "settings"
    );
}

function turkaiSaveSettings(
    turkaiData
) {
    return turkaiWriteDatabase(
        "settings",
        turkaiData
    );
}

function turkaiGetStatistics() {
    return turkaiReadDatabase(
        "statistics"
    );
}

function turkaiSaveStatistics(
    turkaiData
) {
    return turkaiWriteDatabase(
        "statistics",
        turkaiData
    );
}

/* ============================================================
   TEMEL YARDIMCI FONKSİYONLAR
   ============================================================ */

function turkaiNow() {
    return new Date().toISOString();
}

function turkaiId(
    turkaiPrefix = "id"
) {
    return (
        turkaiPrefix +
        "_" +
        crypto.randomUUID()
    );
}

function turkaiToken(
    turkaiBytes = 48
) {
    return crypto
        .randomBytes(
            turkaiBytes
        )
        .toString("hex");
}

function turkaiHash(
    turkaiValue
) {
    return crypto
        .createHash("sha256")
        .update(
            String(turkaiValue)
        )
        .digest("hex");
}

function turkaiClean(
    turkaiValue
) {
    if (
        turkaiValue === null ||
        turkaiValue === undefined
    ) {
        return "";
    }

    return String(
        turkaiValue
    ).trim();
}

function turkaiNormalize(
    turkaiValue
) {
    return turkaiClean(
        turkaiValue
    )
        .toLocaleLowerCase(
            "tr-TR"
        )
        .replace(
            /\s+/g,
            " "
        );
}

function turkaiNumber(
    turkaiValue,
    turkaiFallback = 0
) {
    const turkaiNumberValue =
        Number(
            turkaiValue
        );

    if (
        !Number.isFinite(
            turkaiNumberValue
        )
    ) {
        return turkaiFallback;
    }

    return turkaiNumberValue;
}

function turkaiClamp(
    turkaiValue,
    turkaiMinimum,
    turkaiMaximum
) {
    return Math.min(
        turkaiMaximum,
        Math.max(
            turkaiMinimum,
            turkaiNumber(
                turkaiValue,
                turkaiMinimum
            )
        )
    );
}

/* ============================================================
   LOG SİSTEMİ
   ============================================================ */

function turkaiWriteLog(
    turkaiLevel,
    turkaiMessage,
    turkaiData = null
) {
    const turkaiEntry = {
        timestamp:
            turkaiNow(),

        level:
            turkaiLevel,

        message:
            turkaiMessage,

        data:
            turkaiData
    };

    const turkaiLine =
        JSON.stringify(
            turkaiEntry
        );

    console.log(
        `[TÜRKAI ${turkaiLevel}]`,
        turkaiMessage,
        turkaiData || ""
    );

    try {
        const turkaiLogFile =
            path.join(
                TURKAI_LOGS_DIR,
                "turkai.log"
            );

        fs.appendFileSync(
            turkaiLogFile,
            turkaiLine +
            "\n",
            "utf8"
        );
    } catch (
        turkaiLogWriteError
    ) {
        console.error(
            "[TÜRKAI] Log write error:",
            turkaiLogWriteError
        );
    }

    return turkaiEntry;
}

function turkaiInfo(
    turkaiMessage,
    turkaiData
) {
    return turkaiWriteLog(
        "INFO",
        turkaiMessage,
        turkaiData
    );
}

function turkaiWarn(
    turkaiMessage,
    turkaiData
) {
    return turkaiWriteLog(
        "WARN",
        turkaiMessage,
        turkaiData
    );
}

function turkaiError(
    turkaiMessage,
    turkaiData
) {
    return turkaiWriteLog(
        "ERROR",
        turkaiMessage,
        turkaiData
    );
}

function turkaiSecurityLog(
    turkaiMessage,
    turkaiData
) {
    return turkaiWriteLog(
        "SECURITY",
        turkaiMessage,
        turkaiData
    );
}

/* ============================================================
   EXPRESS GÜVENLİK
   ============================================================ */

turkaiApp.disable(
    "x-powered-by"
);

turkaiApp.set(
    "trust proxy",
    1
);

turkaiApp.use(
    helmet({
        contentSecurityPolicy:
            false,
        crossOriginEmbedderPolicy:
            false
    })
);

turkaiApp.use(
    cors({
        origin: true,
        credentials: true
    })
);

turkaiApp.use(
    express.json({
        limit: "25mb"
    })
);

turkaiApp.use(
    express.urlencoded({
        extended: true,
        limit: "25mb"
    })
);

/* ============================================================
   REQUEST ID
   ============================================================ */

turkaiApp.use(
    (turkaiRequest, turkaiResponse, turkaiNext) => {
        const turkaiRequestId =
            turkaiRequest.headers[
                "x-request-id"
            ] ||
            turkaiId(
                "req"
            );

        turkaiRequest.turkaiRequestId =
            turkaiRequestId;

        turkaiResponse.setHeader(
            "x-request-id",
            turkaiRequestId
        );

        turkaiNext();
    }
);

/* ============================================================
   REQUEST LOGGER
   ============================================================ */

turkaiApp.use(
    (turkaiRequest, turkaiResponse, turkaiNext) => {
        const turkaiRequestStarted =
            Date.now();

        turkaiResponse.on(
            "finish",
            () => {
                const turkaiDuration =
                    Date.now() -
                    turkaiRequestStarted;

                try {
                    const turkaiStats =
                        turkaiGetStatistics();

                    turkaiStats.requests =
                        turkaiNumber(
                            turkaiStats.requests,
                            0
                        ) + 1;

                    turkaiStats.lastUpdated =
                        turkaiNow();

                    turkaiSaveStatistics(
                        turkaiStats
                    );
                } catch (
                    turkaiStatisticsError
                ) {
                    void turkaiStatisticsError;
                }

                turkaiInfo(
                    `${turkaiRequest.method} ${turkaiRequest.originalUrl}`,
                    {
                        status:
                            turkaiResponse.statusCode,

                        duration:
                            turkaiDuration,

                        requestId:
                            turkaiRequest.turkaiRequestId
                    }
                );
            }
        );

        turkaiNext();
    }
);

/* ============================================================
   TEMEL SAĞLIK ENDPOINTLERİ
   ============================================================ */

turkaiApp.get(
    "/api/health",
    (turkaiRequest, turkaiResponse) => {
        turkaiResponse.status(
            200
        ).json({
            success: true,

            name:
                TURKAI_APP_NAME,

            version:
                TURKAI_APP_VERSION,

            status:
                "online",

            environment:
                TURKAI_ENV,

            uptime:
                process.uptime(),

            timestamp:
                turkaiNow()
        });
    }
);

turkaiApp.get(
    "/api/status",
    (turkaiRequest, turkaiResponse) => {
        turkaiResponse.status(
            200
        ).json({
            success: true,

            server: {
                name:
                    TURKAI_APP_NAME,

                version:
                    TURKAI_APP_VERSION,

                id:
                    TURKAI_SERVER_ID,

                environment:
                    TURKAI_ENV,

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
                        TURKAI_START_TIME
                    ).toISOString()
            },

            timestamp:
                turkaiNow()
        });
    }
);

/* ============================================================
   ANA API
   ============================================================ */

turkaiApp.get(
    "/api",
    (turkaiRequest, turkaiResponse) => {
        turkaiResponse.json({
            success: true,

            name:
                TURKAI_APP_NAME,

            version:
                TURKAI_APP_VERSION,

            description:
                TURKAI_APP_DESCRIPTION,

            status:
                "online",

            endpoints: {
                health:
                    "/api/health",

                status:
                    "/api/status",

                chat:
                    "/api/chat",

                memory:
                    "/api/memory",

                research:
                    "/api/research",

                weather:
                    "/api/weather",

                plans:
                    "/api/plans",

                profile:
                    "/api/profile"
            },

            timestamp:
                turkaiNow()
        });
    }
);

/* ============================================================
   TEST ENDPOINT
   ============================================================ */

turkaiApp.get(
    "/api/test",
    (turkaiRequest, turkaiResponse) => {
        turkaiResponse.json({
            success: true,
            message:
                "TürkAI API çalışıyor.",
            server:
                TURKAI_SERVER_ID,
            timestamp:
                turkaiNow()
        });
    }
);

/* ============================================================
   BASİT KULLANICI SİSTEMİ
   ============================================================ */

function turkaiFindUserById(
    turkaiUserId
) {
    const turkaiUsers =
        turkaiGetUsers();

    return turkaiUsers.find(
        turkaiUser =>
            turkaiUser &&
            turkaiUser.id ===
                turkaiUserId
    ) || null;
}

function turkaiFindUserByEmail(
    turkaiEmail
) {
    const turkaiNormalizedEmail =
        turkaiNormalize(
            turkaiEmail
        );

    const turkaiUsers =
        turkaiGetUsers();

    return turkaiUsers.find(
        turkaiUser =>
            turkaiUser &&
            turkaiNormalize(
                turkaiUser.email
            ) ===
                turkaiNormalizedEmail
    ) || null;
}

function turkaiCreateUser(
    turkaiInput = {}
) {
    const turkaiUsers =
        turkaiGetUsers();

    const turkaiUser = {
        id:
            turkaiId(
                "user"
            ),

        name:
            turkaiClean(
                turkaiInput.name ||
                "TürkAI Kullanıcısı"
            ).slice(
                0,
                150
            ),

        email:
            turkaiClean(
                turkaiInput.email ||
                ""
            ).slice(
                0,
                250
            ),

        plan:
            "free",

        avatar:
            turkaiClean(
                turkaiInput.avatar ||
                ""
            ).slice(
                0,
                1000
            ),

        createdAt:
            turkaiNow(),

        updatedAt:
            turkaiNow(),

        active:
            true
    };

    turkaiUsers.push(
        turkaiUser
    );

    turkaiSaveUsers(
        turkaiUsers
    );

    return turkaiUser;
}

/* ============================================================
   GUEST USER
   ============================================================ */

function turkaiGetGuestUser() {
    let turkaiUsers =
        turkaiGetUsers();

    let turkaiGuest =
        turkaiUsers.find(
            turkaiUser =>
                turkaiUser &&
                turkaiUser.id ===
                    "guest"
        );

    if (!turkaiGuest) {
        turkaiGuest = {
            id:
                "guest",

            name:
                "Misafir",

            email:
                "",

            plan:
                "free",

            avatar:
                "",

            createdAt:
                turkaiNow(),

            updatedAt:
                turkaiNow(),

            active:
                true,

            system:
                true
        };

        turkaiUsers.push(
            turkaiGuest
        );

        turkaiSaveUsers(
            turkaiUsers
        );
    }

    return turkaiGuest;
}

/* ============================================================
   SESSION OLUŞTURMA
   ============================================================ */

function turkaiCreateSession(
    turkaiUserId
) {
    const turkaiSessions =
        turkaiGetSessions();

    const turkaiSession = {
        id:
            turkaiId(
                "session"
            ),

        token:
            turkaiToken(
                48
            ),

        userId:
            turkaiUserId,

        createdAt:
            turkaiNow(),

        expiresAt:
            new Date(
                Date.now() +
                1000 *
                60 *
                60 *
                24 *
                30
            ).toISOString()
    };

    turkaiSessions.push(
        turkaiSession
    );

    turkaiSaveSessions(
        turkaiSessions
    );

    return turkaiSession;
}

/* ============================================================
   SESSION BUL
   ============================================================ */

function turkaiFindSession(
    turkaiTokenValue
) {
    if (
        !turkaiTokenValue
    ) {
        return null;
    }

    const turkaiSessions =
        turkaiGetSessions();

    const turkaiSession =
        turkaiSessions.find(
            item =>
                item &&
                item.token ===
                    turkaiTokenValue
        );

    if (!turkaiSession) {
        return null;
    }

    if (
        turkaiSession.expiresAt &&
        new Date(
            turkaiSession.expiresAt
        ).getTime() <
            Date.now()
    ) {
        return null;
    }

    return turkaiSession;
}

/* ============================================================
   AUTH USER
   ============================================================ */

function turkaiGetRequestUser(
    turkaiRequest
) {
    const turkaiHeader =
        turkaiRequest.headers[
            "authorization"
        ] || "";

    if (
        !turkaiHeader
            .toLowerCase()
            .startsWith(
                "bearer "
            )
    ) {
        return null;
    }

    const turkaiTokenValue =
        turkaiHeader
            .slice(
                7
            )
            .trim();

    const turkaiSession =
        turkaiFindSession(
            turkaiTokenValue
        );

    if (!turkaiSession) {
        return null;
    }

    return turkaiFindUserById(
        turkaiSession.userId
    );
}

/* ============================================================
   OPTIONAL AUTH
   ============================================================ */

function turkaiOptionalAuth(
    turkaiRequest,
    turkaiResponse,
    turkaiNext
) {
    turkaiRequest.user =
        turkaiGetRequestUser(
            turkaiRequest
        );

    turkaiNext();
}

/* ============================================================
   AUTH LOGIN
   ============================================================ */

turkaiApp.post(
    "/api/auth/login",
    (turkaiRequest, turkaiResponse) => {
        try {
            const turkaiName =
                turkaiClean(
                    turkaiRequest.body?.name ||
                    ""
                ).slice(
                    0,
                    150
                );

            const turkaiEmail =
                turkaiClean(
                    turkaiRequest.body?.email ||
                    ""
                ).slice(
                    0,
                    250
                );

            if (
                !turkaiName &&
                !turkaiEmail
            ) {
                return turkaiResponse
                    .status(400)
                    .json({
                        success:
                            false,

                        error:
                            "Kullanıcı bilgisi gerekli."
                    });
            }

            let turkaiUser =
                turkaiEmail
                    ? turkaiFindUserByEmail(
                        turkaiEmail
                    )
                    : null;

            if (!turkaiUser) {
                turkaiUser =
                    turkaiCreateUser({
                        name:
                            turkaiName ||
                            "TürkAI Kullanıcısı",

                        email:
                            turkaiEmail
                    });
            }

            const turkaiSession =
                turkaiCreateSession(
                    turkaiUser.id
                );

            return turkaiResponse
                .status(200)
                .json({
                    success:
                        true,

                    user:
                        turkaiUser,

                    token:
                        turkaiSession.token,

                    expiresAt:
                        turkaiSession.expiresAt,

                    timestamp:
                        turkaiNow()
                });

        } catch (
            turkaiLoginError
        ) {
            turkaiError(
                "Login error",
                turkaiLoginError
            );

            return turkaiResponse
                .status(500)
                .json({
                    success:
                        false,

                    error:
                        "Giriş yapılamadı."
                });
        }
    }
);

/* ============================================================
   AUTH ME
   ============================================================ */

turkaiApp.get(
    "/api/me",
    turkaiOptionalAuth,
    (turkaiRequest, turkaiResponse) => {
        const turkaiUser =
            turkaiRequest.user ||
            turkaiGetGuestUser();

        turkaiResponse.json({
            success:
                true,

            authenticated:
                Boolean(
                    turkaiRequest.user
                ),

            user:
                turkaiUser,

            timestamp:
                turkaiNow()
        });
    }
);

/* ============================================================
   AUTH LOGOUT
   ============================================================ */

turkaiApp.post(
    "/api/auth/logout",
    turkaiOptionalAuth,
    (turkaiRequest, turkaiResponse) => {
        const turkaiHeader =
            turkaiRequest.headers[
                "authorization"
            ] || "";

        if (
            turkaiHeader
                .toLowerCase()
                .startsWith(
                    "bearer "
                )
        ) {
            const turkaiTokenValue =
                turkaiHeader
                    .slice(
                        7
                    )
                    .trim();

            const turkaiSessions =
                turkaiGetSessions();

            const turkaiFiltered =
                turkaiSessions.filter(
                    turkaiSession =>
                        turkaiSession.token !==
                        turkaiTokenValue
                );

            turkaiSaveSessions(
                turkaiFiltered
            );
        }

        turkaiResponse.json({
            success:
                true,

            message:
                "Oturum kapatıldı.",

            timestamp:
                turkaiNow()
        });
    }
);

/* ============================================================
   CHAT OLUŞTURMA
   ============================================================ */

function turkaiCreateChat(
    turkaiUserId,
    turkaiInput = {}
) {
    const turkaiChats =
        turkaiGetChats();

    const turkaiChat = {
        id:
            turkaiId(
                "chat"
            ),

        userId:
            turkaiUserId,

        title:
            turkaiClean(
                turkaiInput.title ||
                "Yeni sohbet"
            ).slice(
                0,
                200
            ),

        model:
            turkaiClean(
                turkaiInput.model ||
                "turkai-auto"
            ).slice(
                0,
                150
            ),

        createdAt:
            turkaiNow(),

        updatedAt:
            turkaiNow()
    };

    turkaiChats.unshift(
        turkaiChat
    );

    turkaiSaveChats(
        turkaiChats
    );

    return turkaiChat;
}

/* ============================================================
   CHAT LİSTESİ
   ============================================================ */

turkaiApp.get(
    "/api/chats",
    turkaiOptionalAuth,
    (turkaiRequest, turkaiResponse) => {
        const turkaiUser =
            turkaiRequest.user ||
            turkaiGetGuestUser();

        const turkaiChats =
            turkaiGetChats();

        const turkaiResult =
            turkaiChats.filter(
                turkaiChat =>
                    turkaiChat &&
                    turkaiChat.userId ===
                        turkaiUser.id
            );

        turkaiResponse.json({
            success:
                true,

            chats:
                turkaiResult,

            count:
                turkaiResult.length,

            timestamp:
                turkaiNow()
        });
    }
);

/* ============================================================
   CHAT GET
   ============================================================ */

turkaiApp.post(
    "/api/chats",
    turkaiOptionalAuth,
    (turkaiRequest, turkaiResponse) => {
        try {
            const turkaiUser =
                turkaiRequest.user ||
                turkaiGetGuestUser();

            const turkaiChat =
                turkaiCreateChat(
                    turkaiUser.id,
                    turkaiRequest.body ||
                    {}
                );

            turkaiResponse
                .status(201)
                .json({
                    success:
                        true,

                    chat:
                        turkaiChat
                });

        } catch (
            turkaiChatCreateError
        ) {
            turkaiError(
                "Chat create error",
                turkaiChatCreateError
            );

            turkaiResponse
                .status(500)
                .json({
                    success:
                        false,

                    error:
                        "Sohbet oluşturulamadı."
                });
        }
    }
);

/* ============================================================
   CHAT MESAJI KAYDET
   ============================================================ */

function turkaiSaveChatMessage(
    turkaiInput = {}
) {
    const turkaiMessages =
        turkaiGetMessages();

    const turkaiMessage = {
        id:
            turkaiId(
                "message"
            ),

        chatId:
            turkaiInput.chatId ||
            null,

        userId:
            turkaiInput.userId ||
            "guest",

        role:
            turkaiInput.role ||
            "user",

        content:
            turkaiClean(
                turkaiInput.content ||
                ""
            ).slice(
                0,
                50000
            ),

        model:
            turkaiClean(
                turkaiInput.model ||
                ""
            ).slice(
                0,
                150
            ),

        createdAt:
            turkaiNow()
    };

    turkaiMessages.push(
        turkaiMessage
    );

    /*
     * Sonsuz büyümeyi önlemek için
     * son 100000 kayıt tutulur.
     */

    const turkaiLimitedMessages =
        turkaiMessages.length >
        100000
            ? turkaiMessages.slice(
                -100000
            )
            : turkaiMessages;

    turkaiSaveMessages(
        turkaiLimitedMessages
    );

    return turkaiMessage;
}

/* ============================================================
   CHAT MESAJLARI
   ============================================================ */

turkaiApp.get(
    "/api/chats/:chatId/messages",
    turkaiOptionalAuth,
    (turkaiRequest, turkaiResponse) => {
        try {
            const turkaiUser =
                turkaiRequest.user ||
                turkaiGetGuestUser();

            const turkaiChatId =
                turkaiClean(
                    turkaiRequest.params.chatId
                );

            const turkaiChats =
                turkaiGetChats();

            const turkaiChat =
                turkaiChats.find(
                    turkaiItem =>
                        turkaiItem &&
                        turkaiItem.id ===
                            turkaiChatId
                );

            if (!turkaiChat) {
                return turkaiResponse
                    .status(404)
                    .json({
                        success:
                            false,

                        error:
                            "Sohbet bulunamadı."
                    });
            }

            if (
                turkaiChat.userId !==
                turkaiUser.id
            ) {
                return turkaiResponse
                    .status(403)
                    .json({
                        success:
                            false,

                        error:
                            "Bu sohbete erişim izniniz yok."
                    });
            }

            const turkaiMessages =
                turkaiGetMessages();

            const turkaiResult =
                turkaiMessages.filter(
                    turkaiMessage =>
                        turkaiMessage &&
                        turkaiMessage.chatId ===
                            turkaiChatId
                );

            return turkaiResponse.json({
                success:
                    true,

                chat:
                    turkaiChat,

                messages:
                    turkaiResult,

                count:
                    turkaiResult.length,

                timestamp:
                    turkaiNow()
            });

        } catch (
            turkaiMessageError
        ) {
            turkaiError(
                "Messages GET error",
                turkaiMessageError
            );

            return turkaiResponse
                .status(500)
                .json({
                    success:
                        false,

                    error:
                        "Mesajlar alınamadı."
                });
        }
    }
);

/* ============================================================
   STATISTICS
   ============================================================ */

function turkaiIncrementStatistic(
    turkaiName,
    turkaiAmount = 1
) {
    try {
        const turkaiStatistics =
            turkaiGetStatistics();

        turkaiStatistics[
            turkaiName
        ] =
            turkaiNumber(
                turkaiStatistics[
                    turkaiName
                ],
                0
            ) +
            turkaiNumber(
                turkaiAmount,
                1
            );

        turkaiStatistics.lastUpdated =
            turkaiNow();

        turkaiSaveStatistics(
            turkaiStatistics
        );

        return turkaiStatistics[
            turkaiName
        ];
    } catch (
        turkaiStatisticsError
    ) {
        turkaiError(
            "Statistic error",
            turkaiStatisticsError
        );

        return null;
    }
}

/* ============================================================
   STATISTICS API
   ============================================================ */

turkaiApp.get(
    "/api/statistics",
    (turkaiRequest, turkaiResponse) => {
        turkaiResponse.json({
            success:
                true,

            statistics:
                turkaiGetStatistics(),

            timestamp:
                turkaiNow()
        });
    }
);

/* ============================================================
   SYSTEM INFO
   ============================================================ */

turkaiApp.get(
    "/api/system",
    (turkaiRequest, turkaiResponse) => {
        const turkaiMemory =
            process.memoryUsage();

        turkaiResponse.json({
            success:
                true,

            application: {
                name:
                    TURKAI_APP_NAME,

                version:
                    TURKAI_APP_VERSION,

                environment:
                    TURKAI_ENV
            },

            process: {
                pid:
                    process.pid,

                node:
                    process.version,

                platform:
                    process.platform,

                architecture:
                    process.arch,

                uptime:
                    process.uptime()
            },

            memory: {
                rss:
                    turkaiMemory.rss,

                heapTotal:
                    turkaiMemory.heapTotal,

                heapUsed:
                    turkaiMemory.heapUsed,

                external:
                    turkaiMemory.external
            },

            cpu: {
                count:
                    os.cpus().length
            },

            timestamp:
                turkaiNow()
        });
    }
);

/* ============================================================
   EXPORTLAR
   ============================================================ */

/*
 * PART 2, 3, 4 ve 5 bu değişken/fonksiyonları
 * kullanacaktır.
 *
 * Henüz startServer çağrısı YOK.
 */

console.log(
    "[TürkAI] PART 1 hazır."
);

/* ============================================================
   PART 1 SONU
   ============================================================ */

/*
   PART 2 BURANIN ALTINA GELECEK.

   PART 2:
   ├── Local AI
   ├── Groq
   ├── Cerebras
   ├── OpenRouter
   ├── Gemini
   ├── AI fallback
   ├── model sistemi
   ├── /api/chat
   ├── memory engine
   ├── knowledge engine
   └── AI provider status
*/
/* ============================================================
   TÜRKAI 16.0 — SERVER.JS
   PART 2 / 5
   ============================================================
   AI ENGINE
   ├── Local AI
   ├── Knowledge
   ├── Memory
   ├── Groq
   ├── Cerebras
   ├── OpenRouter
   ├── Gemini
   ├── Fallback
   ├── Model selection
   ├── AI status
   ├── Chat API
   └── Provider diagnostics
   ============================================================ */

/* ============================================================
   AI RUNTIME
   ============================================================ */

const turkaiAIConfig = {
    localEnabled: true,

    groqEnabled:
        Boolean(
            process.env.GROQ_API_KEY
        ),

    cerebrasEnabled:
        Boolean(
            process.env.CEREBRAS_API_KEY
        ),

    openrouterEnabled:
        Boolean(
            process.env.OPENROUTER_API_KEY
        ),

    geminiEnabled:
        Boolean(
            process.env.GEMINI_API_KEY
        ),

    groqModel:
        process.env.GROQ_MODEL ||
        "openai/gpt-oss-20b",

    cerebrasModel:
        process.env.CEREBRAS_MODEL ||
        "gpt-oss-120b",

    openrouterModel:
        process.env.OPENROUTER_MODEL ||
        "openai/gpt-oss-20b",

    geminiModel:
        process.env.GEMINI_MODEL ||
        "gemini-2.0-flash",

    temperature:
        turkaiNumber(
            process.env.AI_TEMPERATURE,
            0.7
        ),

    maxTokens:
        turkaiNumber(
            process.env.AI_MAX_TOKENS,
            3000
        ),

    requestTimeout:
        turkaiNumber(
            process.env.AI_TIMEOUT,
            30000
        )
};

/* ============================================================
   AI SYSTEM PROMPT
   ============================================================ */

const turkaiSystemPrompt = `
Sen TürkAI'sın.

Türkçe konuşan kullanıcılar için geliştirilmiş
genel amaçlı bir yapay zekâ asistanısın.

Kurallar:

1. Kullanıcı Türkçe yazıyorsa Türkçe cevap ver.
2. Kullanıcı başka dil kullanıyorsa o dili anlayıp cevaplayabilirsin.
3. Gereksiz şekilde uzun cevap verme.
4. Kod istenirse çalışan ve düzenli kod üret.
5. Kod verirken dosya adını ve gerekli yerleşimi açıkça belirt.
6. Kullanıcının önceki konuşmalardaki bağlamını mümkün olduğunca koru.
7. Bilmediğin şeyi kesin gerçekmiş gibi söyleme.
8. Güncel bilgi gerekiyorsa araştırma sistemi kullanılabilir.
9. Siber güvenlik konularında güvenli ve yasal çerçevede yardımcı ol.
10. Kullanıcı "En hızlı kim?" diye sorarsa:
   "TürkAI ⚡🤖" şeklinde cevap ver.
11. Kullanıcıya yardımcı, açık ve doğal bir üslup kullan.
12. Gereksiz sistem ayrıntılarını kullanıcıya gösterme.
13. API anahtarlarını veya gizli değişkenleri asla kullanıcıya gösterme.
14. Kullanıcı doğrudan kod istiyorsa mümkün olduğunca
    tamamlanmış örnek sun.
`;

/* ============================================================
   PROVIDER DURUMU
   ============================================================ */

function turkaiAIProviderSummary() {
    return {
        local: {
            enabled:
                turkaiAIConfig.localEnabled,

            ready:
                true,

            model:
                "turkai-local"
        },

        groq: {
            enabled:
                turkaiAIConfig.groqEnabled,

            ready:
                turkaiAIConfig.groqEnabled,

            model:
                turkaiAIConfig.groqModel
        },

        cerebras: {
            enabled:
                turkaiAIConfig.cerebrasEnabled,

            ready:
                turkaiAIConfig.cerebrasEnabled,

            model:
                turkaiAIConfig.cerebrasModel
        },

        openrouter: {
            enabled:
                turkaiAIConfig.openrouterEnabled,

            ready:
                turkaiAIConfig.openrouterEnabled,

            model:
                turkaiAIConfig.openrouterModel
        },

        gemini: {
            enabled:
                turkaiAIConfig.geminiEnabled,

            ready:
                turkaiAIConfig.geminiEnabled,

            model:
                turkaiAIConfig.geminiModel
        }
    };
}

/* ============================================================
   AI PROVIDER STATUS API
   ============================================================ */

turkaiApp.get(
    "/api/ai/providers",
    (turkaiRequest, turkaiResponse) => {
        turkaiResponse.json({
            success: true,

            providers:
                turkaiAIProviderSummary(),

            timestamp:
                turkaiNow()
        });
    }
);

turkaiApp.get(
    "/api/ai/status",
    (turkaiRequest, turkaiResponse) => {
        turkaiResponse.json({
            success: true,

            online: true,

            local:
                turkaiAIConfig.localEnabled,

            providers:
                turkaiAIProviderSummary(),

            timestamp:
                turkaiNow()
        });
    }
);

/* ============================================================
   HTTP JSON YARDIMCISI
   ============================================================ */

function turkaiHttpJson(
    turkaiUrl,
    turkaiOptions = {}
) {
    return new Promise(
        (
            turkaiResolve,
            turkaiReject
        ) => {
            let turkaiURL;

            try {
                turkaiURL =
                    new URL(
                        turkaiUrl
                    );
            } catch (
                turkaiURLParseError
            ) {
                turkaiReject(
                    turkaiURLParseError
                );

                return;
            }

            const turkaiProtocol =
                turkaiURL.protocol ===
                "https:"
                    ? require("https")
                    : require("http");

            const turkaiRequestOptions = {
                method:
                    turkaiOptions.method ||
                    "GET",

                hostname:
                    turkaiURL.hostname,

                port:
                    turkaiURL.port ||
                    (
                        turkaiURL.protocol ===
                        "https:"
                            ? 443
                            : 80
                    ),

                path:
                    turkaiURL.pathname +
                    turkaiURL.search,

                headers:
                    turkaiOptions.headers ||
                    {},

                timeout:
                    turkaiOptions.timeout ||
                    turkaiAIConfig.requestTimeout
            };

            const turkaiRequest =
                turkaiProtocol.request(
                    turkaiRequestOptions,
                    turkaiResponse => {
                        let turkaiBody =
                            "";

                        turkaiResponse.on(
                            "data",
                            turkaiChunk => {
                                turkaiBody +=
                                    turkaiChunk;
                            }
                        );

                        turkaiResponse.on(
                            "end",
                            () => {
                                let turkaiParsed =
                                    turkaiBody;

                                try {
                                    turkaiParsed =
                                        JSON.parse(
                                            turkaiBody
                                        );
                                } catch (
                                    turkaiJSONError
                                ) {
                                    void turkaiJSONError;
                                }

                                turkaiResolve({
                                    status:
                                        turkaiResponse.statusCode,

                                    headers:
                                        turkaiResponse.headers,

                                    data:
                                        turkaiParsed
                                });
                            }
                        );
                    }
                );

            turkaiRequest.on(
                "timeout",
                () => {
                    turkaiRequest.destroy(
                        new Error(
                            "AI provider timeout"
                        )
                    );
                }
            );

            turkaiRequest.on(
                "error",
                turkaiReject
            );

            if (
                turkaiOptions.body
            ) {
                turkaiRequest.write(
                    turkaiOptions.body
                );
            }

            turkaiRequest.end();
        }
    );
}

/* ============================================================
   TEXT NORMALIZER
   ============================================================ */

function turkaiExtractText(
    turkaiValue
) {
    if (
        turkaiValue === null ||
        turkaiValue === undefined
    ) {
        return "";
    }

    if (
        typeof turkaiValue ===
        "string"
    ) {
        return turkaiValue;
    }

    if (
        Array.isArray(
            turkaiValue
        )
    ) {
        return turkaiValue
            .map(
                turkaiItem =>
                    turkaiExtractText(
                        turkaiItem
                    )
            )
            .filter(Boolean)
            .join("\n");
    }

    if (
        typeof turkaiValue ===
        "object"
    ) {
        if (
            typeof turkaiValue.text ===
            "string"
        ) {
            return turkaiValue.text;
        }

        if (
            typeof turkaiValue.content ===
            "string"
        ) {
            return turkaiValue.content;
        }

        if (
            Array.isArray(
                turkaiValue.content
            )
        ) {
            return turkaiExtractText(
                turkaiValue.content
            );
        }

        if (
            Array.isArray(
                turkaiValue.parts
            )
        ) {
            return turkaiExtractText(
                turkaiValue.parts
            );
        }
    }

    return "";
}

/* ============================================================
   MESSAGE NORMALIZATION
   ============================================================ */

function turkaiNormalizeMessages(
    turkaiMessages
) {
    if (
        !Array.isArray(
            turkaiMessages
        )
    ) {
        return [];
    }

    return turkaiMessages
        .map(
            turkaiMessage => {
                if (
                    !turkaiMessage ||
                    typeof turkaiMessage !==
                        "object"
                ) {
                    return null;
                }

                const turkaiRole =
                    [
                        "system",
                        "user",
                        "assistant"
                    ].includes(
                        turkaiMessage.role
                    )
                        ? turkaiMessage.role
                        : "user";

                const turkaiContent =
                    turkaiExtractText(
                        turkaiMessage.content ||
                        turkaiMessage.text ||
                        ""
                    );

                if (
                    !turkaiContent.trim()
                ) {
                    return null;
                }

                return {
                    role:
                        turkaiRole,

                    content:
                        turkaiContent.slice(
                            0,
                            30000
                        )
                };
            }
        )
        .filter(Boolean)
        .slice(-40);
}

/* ============================================================
   LOCAL AI — SPECIAL COMMANDS
   ============================================================ */

function turkaiLocalSpecialAnswer(
    turkaiMessage
) {
    const turkaiNormalized =
        turkaiNormalize(
            turkaiMessage
        );

    if (
        turkaiNormalized ===
            "en hızlı kim" ||
        turkaiNormalized ===
            "en hizli kim"
    ) {
        return "TürkAI ⚡🤖";
    }

    if (
        turkaiNormalized ===
            "selam" ||
        turkaiNormalized ===
            "merhaba" ||
        turkaiNormalized ===
            "sa"
    ) {
        return "Merhaba! Ben TürkAI. Sana nasıl yardımcı olabilirim?";
    }

    if (
        turkaiNormalized.includes(
            "sen kimsin"
        )
    ) {
        return "Ben TürkAI. Türkçe odaklı, kodlama, araştırma, eğitim ve günlük sorularda yardımcı olabilen bir yapay zekâ asistanıyım.";
    }

    if (
        turkaiNormalized.includes(
            "adın ne"
        )
    ) {
        return "Ben TürkAI.";
    }

    if (
        turkaiNormalized.includes(
            "hangi yapay zeka"
        ) ||
        turkaiNormalized.includes(
            "hangi ai"
        )
    ) {
        return "Ben TürkAI'nin AI motoruyum.";
    }

    if (
        turkaiNormalized.includes(
            "saat kaç"
        )
    ) {
        return (
            "Sunucunun mevcut zamanı: " +
            new Date().toLocaleString(
                "tr-TR",
                {
                    timeZone:
                        "Europe/Istanbul"
                }
            )
        );
    }

    if (
        turkaiNormalized.includes(
            "bugün günlerden ne"
        )
    ) {
        return (
            "Bugün " +
            new Date().toLocaleDateString(
                "tr-TR",
                {
                    weekday:
                        "long",
                    day:
                        "numeric",
                    month:
                        "long",
                    year:
                        "numeric",
                    timeZone:
                        "Europe/Istanbul"
                }
            ) +
            "."
        );
    }

    return null;
}

/* ============================================================
   LOCAL KNOWLEDGE SEARCH
   ============================================================ */

function turkaiSearchKnowledge(
    turkaiQuery
) {
    const turkaiKnowledge =
        turkaiGetKnowledge();

    if (
        !Array.isArray(
            turkaiKnowledge
        )
    ) {
        return null;
    }

    const turkaiNormalizedQuery =
        turkaiNormalize(
            turkaiQuery
        );

    if (
        !turkaiNormalizedQuery
    ) {
        return null;
    }

    let turkaiBest =
        null;

    let turkaiBestScore =
        0;

    for (
        const turkaiItem
        of turkaiKnowledge
    ) {
        if (
            !turkaiItem ||
            typeof turkaiItem !==
                "object"
        ) {
            continue;
        }

        const turkaiQuestion =
            turkaiNormalize(
                turkaiItem.question ||
                ""
            );

        const turkaiAnswer =
            turkaiClean(
                turkaiItem.answer ||
                ""
            );

        if (
            !turkaiQuestion ||
            !turkaiAnswer
        ) {
            continue;
        }

        let turkaiScore =
            0;

        if (
            turkaiQuestion ===
            turkaiNormalizedQuery
        ) {
            turkaiScore += 100;
        }

        if (
            turkaiNormalizedQuery.includes(
                turkaiQuestion
            )
        ) {
            turkaiScore += 60;
        }

        if (
            turkaiQuestion.includes(
                turkaiNormalizedQuery
            )
        ) {
            turkaiScore += 40;
        }

        const turkaiWords =
            turkaiNormalizedQuery
                .split(" ")
                .filter(
                    turkaiWord =>
                        turkaiWord.length >
                        2
                );

        for (
            const turkaiWord
            of turkaiWords
        ) {
            if (
                turkaiQuestion.includes(
                    turkaiWord
                )
            ) {
                turkaiScore += 3;
            }
        }

        if (
            turkaiScore >
            turkaiBestScore
        ) {
            turkaiBestScore =
                turkaiScore;

            turkaiBest =
                turkaiItem;
        }
    }

    if (
        turkaiBestScore < 10
    ) {
        return null;
    }

    return {
        answer:
            turkaiBest.answer,

        source:
            "knowledge",

        score:
            turkaiBestScore,

        item:
            turkaiBest
    };
}

/* ============================================================
   LOCAL KNOWLEDGE SAVE
   ============================================================ */

function turkaiSaveKnowledgeItem(
    turkaiQuestion,
    turkaiAnswer,
    turkaiSource = "local-ai"
) {
    if (
        !turkaiQuestion ||
        !turkaiAnswer
    ) {
        return null;
    }

    const turkaiKnowledge =
        turkaiGetKnowledge();

    const turkaiNormalizedQuestion =
        turkaiNormalize(
            turkaiQuestion
        );

    const turkaiExistingIndex =
        turkaiKnowledge.findIndex(
            turkaiItem =>
                turkaiItem &&
                turkaiNormalize(
                    turkaiItem.question ||
                    ""
                ) ===
                    turkaiNormalizedQuestion
        );

    const turkaiItem = {
        id:
            turkaiId(
                "knowledge"
            ),

        question:
            turkaiClean(
                turkaiQuestion
            ).slice(
                0,
                3000
            ),

        answer:
            turkaiClean(
                turkaiAnswer
            ).slice(
                0,
                12000
            ),

        source:
            turkaiClean(
                turkaiSource
            ).slice(
                0,
                200
            ),

        createdAt:
            turkaiNow(),

        updatedAt:
            turkaiNow()
    };

    if (
        turkaiExistingIndex >=
        0
    ) {
        turkaiKnowledge[
            turkaiExistingIndex
        ] = {
            ...turkaiKnowledge[
                turkaiExistingIndex
            ],

            answer:
                turkaiItem.answer,

            source:
                turkaiItem.source,

            updatedAt:
                turkaiItem.updatedAt
        };
    } else {
        turkaiKnowledge.unshift(
            turkaiItem
        );
    }

    turkaiSaveKnowledge(
        turkaiKnowledge.slice(
            0,
            10000
        )
    );

    turkaiIncrementStatistic(
        "knowledgeSaved",
        1
    );

    return turkaiItem;
}

/* ============================================================
   MEMORY SEARCH
   ============================================================ */

function turkaiSearchMemories(
    turkaiUserId,
    turkaiQuery
) {
    const turkaiMemories =
        turkaiGetMemories();

    if (
        !Array.isArray(
            turkaiMemories
        )
    ) {
        return [];
    }

    const turkaiNormalizedQuery =
        turkaiNormalize(
            turkaiQuery
        );

    return turkaiMemories
        .filter(
            turkaiMemory => {
                if (
                    !turkaiMemory ||
                    typeof turkaiMemory !==
                        "object"
                ) {
                    return false;
                }

                if (
                    turkaiMemory.userId !==
                        turkaiUserId &&
                    turkaiMemory.userId !==
                        "guest"
                ) {
                    return false;
                }

                const turkaiContent =
                    turkaiNormalize(
                        turkaiMemory.content ||
                        ""
                    );

                if (
                    !turkaiContent
                ) {
                    return false;
                }

                const turkaiWords =
                    turkaiNormalizedQuery
                        .split(" ")
                        .filter(
                            turkaiWord =>
                                turkaiWord.length >
                                2
                        );

                return turkaiWords.some(
                    turkaiWord =>
                        turkaiContent.includes(
                            turkaiWord
                        )
                );
            }
        )
        .slice(
            0,
            10
        );
}

/* ============================================================
   MEMORY CONTEXT
   ============================================================ */

function turkaiBuildMemoryContext(
    turkaiUserId,
    turkaiQuery
) {
    const turkaiMemories =
        turkaiSearchMemories(
            turkaiUserId,
            turkaiQuery
        );

    if (
        !turkaiMemories.length
    ) {
        return "";
    }

    return (
        "\n\nKULLANICI HAFIZASI:\n" +
        turkaiMemories
            .map(
                turkaiMemory =>
                    "- " +
                    turkaiClean(
                        turkaiMemory.content
                    )
            )
            .join("\n")
    );
}

/* ============================================================
   CONVERSATION CONTEXT
   ============================================================ */

function turkaiGetConversationContext(
    turkaiChatId
) {
    if (
        !turkaiChatId
    ) {
        return [];
    }

    const turkaiMessages =
        turkaiGetMessages();

    return turkaiMessages
        .filter(
            turkaiMessage =>
                turkaiMessage &&
                turkaiMessage.chatId ===
                    turkaiChatId
        )
        .slice(-20)
        .map(
            turkaiMessage => ({
                role:
                    turkaiMessage.role,

                content:
                    turkaiMessage.content
            })
        );
}

/* ============================================================
   LOCAL AI GENERATOR
   ============================================================ */

function turkaiGenerateLocalAI(
    turkaiInput = {}
) {
    const turkaiMessage =
        turkaiClean(
            turkaiInput.message ||
            ""
        );

    if (
        !turkaiMessage
    ) {
        return {
            answer:
                "Bir mesaj yazmalısın.",

            provider:
                "turkai-local",

            model:
                "turkai-local"
        };
    }

    const turkaiSpecial =
        turkaiLocalSpecialAnswer(
            turkaiMessage
        );

    if (
        turkaiSpecial
    ) {
        return {
            answer:
                turkaiSpecial,

            provider:
                "turkai-local",

            model:
                "turkai-local",

            source:
                "special"
        };
    }

    const turkaiKnowledge =
        turkaiSearchKnowledge(
            turkaiMessage
        );

    if (
        turkaiKnowledge
    ) {
        return {
            answer:
                turkaiKnowledge.answer,

            provider:
                "turkai-local",

            model:
                "turkai-local",

            source:
                "knowledge",

            score:
                turkaiKnowledge.score
        };
    }

    const turkaiNormalized =
        turkaiNormalize(
            turkaiMessage
        );

    if (
        turkaiNormalized.includes(
            "javascript"
        ) &&
        turkaiNormalized.includes(
            "nedir"
        )
    ) {
        return {
            answer:
                "JavaScript, web sayfalarına ve uygulamalara etkileşim ve programlama mantığı eklemek için kullanılan bir programlama dilidir.",

            provider:
                "turkai-local",

            model:
                "turkai-local",

            source:
                "builtin"
        };
    }

    if (
        turkaiNormalized.includes(
            "html"
        ) &&
        turkaiNormalized.includes(
            "nedir"
        )
    ) {
        return {
            answer:
                "HTML, web sayfasının yapısını oluşturan işaretleme dilidir. Başlıklar, butonlar, metinler, görseller ve diğer sayfa elemanları HTML ile tanımlanabilir.",

            provider:
                "turkai-local",

            model:
                "turkai-local",

            source:
                "builtin"
        };
    }

    if (
        turkaiNormalized.includes(
            "css"
        ) &&
        turkaiNormalized.includes(
            "nedir"
        )
    ) {
        return {
            answer:
                "CSS, HTML ile oluşturulan web arayüzünün görünümünü düzenler. Renkler, boyutlar, boşluklar, animasyonlar ve responsive tasarım CSS ile yapılabilir.",

            provider:
                "turkai-local",

            model:
                "turkai-local",

            source:
                "builtin"
        };
    }

    if (
        turkaiNormalized.includes(
            "node.js"
        ) ||
        turkaiNormalized.includes(
            "nodejs"
        )
    ) {
        return {
            answer:
                "Node.js, JavaScript'i tarayıcı dışında çalıştırmayı sağlayan bir JavaScript çalışma ortamıdır. TürkAI'nin backend tarafı için kullanılabilir.",

            provider:
                "turkai-local",

            model:
                "turkai-local",

            source:
                "builtin"
        };
    }

    if (
        turkaiNormalized.includes(
            "api nedir"
        )
    ) {
        return {
            answer:
                "API, uygulamaların birbiriyle kontrollü şekilde iletişim kurmasını sağlayan arayüzdür. TürkAI'nin index.html dosyası da backend ile API üzerinden konuşabilir.",

            provider:
                "turkai-local",

            model:
                "turkai-local",

            source:
                "builtin"
        };
    }

    return {
        answer:
            "Bu soruyu yerel bilgi sistemimde bulamadım. Yapılandırılmış bir AI sağlayıcısı aktifse TürkAI soruyu ona yönlendirebilir.",

        provider:
            "turkai-local",

        model:
            "turkai-local",

        source:
            "fallback"
    };
}

/* ============================================================
   GROQ
   ============================================================ */

async function turkaiCallGroq(
    turkaiMessages,
    turkaiOptions = {}
) {
    if (
        !turkaiAIConfig.groqEnabled
    ) {
        throw new Error(
            "Groq API key bulunamadı."
        );
    }

    const turkaiPayload = {
        model:
            turkaiOptions.model ||
            turkaiAIConfig.groqModel,

        messages:
            turkaiMessages,

        temperature:
            turkaiClamp(
                turkaiOptions.temperature ??
                    turkaiAIConfig.temperature,
                0,
                2
            ),

        max_tokens:
            turkaiClamp(
                turkaiOptions.maxTokens ??
                    turkaiAIConfig.maxTokens,
                1,
                16000
            )
    };

    const turkaiResponse =
        await turkaiHttpJson(
            "https://api.groq.com/openai/v1/chat/completions",
            {
                method:
                    "POST",

                timeout:
                    turkaiAIConfig.requestTimeout,

                headers: {
                    "Content-Type":
                        "application/json",

                    "Authorization":
                        "Bearer " +
                        process.env.GROQ_API_KEY
                },

                body:
                    JSON.stringify(
                        turkaiPayload
                    )
            }
        );

    if (
        turkaiResponse.status < 200 ||
        turkaiResponse.status >= 300
    ) {
        const turkaiProviderError =
            turkaiExtractText(
                turkaiResponse.data?.error
            ) ||
            `Groq HTTP ${turkaiResponse.status}`;

        throw new Error(
            turkaiProviderError
        );
    }

    const turkaiAnswer =
        turkaiResponse.data
            ?.choices
            ?.[0]
            ?.message
            ?.content;

    if (
        !turkaiAnswer
    ) {
        throw new Error(
            "Groq boş cevap döndürdü."
        );
    }

    return {
        answer:
            turkaiAnswer,

        provider:
            "groq",

        model:
            turkaiPayload.model,

        usage:
            turkaiResponse.data?.usage ||
            null
    };
}

/* ============================================================
   CEREBRAS
   ============================================================ */

async function turkaiCallCerebras(
    turkaiMessages,
    turkaiOptions = {}
) {
    if (
        !turkaiAIConfig.cerebrasEnabled
    ) {
        throw new Error(
            "Cerebras API key bulunamadı."
        );
    }

    const turkaiPayload = {
        model:
            turkaiOptions.model ||
            turkaiAIConfig.cerebrasModel,

        messages:
            turkaiMessages,

        temperature:
            turkaiClamp(
                turkaiOptions.temperature ??
                    turkaiAIConfig.temperature,
                0,
                2
            ),

        max_completion_tokens:
            turkaiClamp(
                turkaiOptions.maxTokens ??
                    turkaiAIConfig.maxTokens,
                1,
                16000
            )
    };

    const turkaiResponse =
        await turkaiHttpJson(
            "https://api.cerebras.ai/v1/chat/completions",
            {
                method:
                    "POST",

                timeout:
                    turkaiAIConfig.requestTimeout,

                headers: {
                    "Content-Type":
                        "application/json",

                    "Authorization":
                        "Bearer " +
                        process.env.CEREBRAS_API_KEY
                },

                body:
                    JSON.stringify(
                        turkaiPayload
                    )
            }
        );

    if (
        turkaiResponse.status < 200 ||
        turkaiResponse.status >= 300
    ) {
        const turkaiProviderError =
            turkaiExtractText(
                turkaiResponse.data?.error
            ) ||
            `Cerebras HTTP ${turkaiResponse.status}`;

        throw new Error(
            turkaiProviderError
        );
    }

    const turkaiAnswer =
        turkaiResponse.data
            ?.choices
            ?.[0]
            ?.message
            ?.content;

    if (
        !turkaiAnswer
    ) {
        throw new Error(
            "Cerebras boş cevap döndürdü."
        );
    }

    return {
        answer:
            turkaiAnswer,

        provider:
            "cerebras",

        model:
            turkaiPayload.model,

        usage:
            turkaiResponse.data?.usage ||
            null
    };
}

/* ============================================================
   OPENROUTER
   ============================================================ */

async function turkaiCallOpenRouter(
    turkaiMessages,
    turkaiOptions = {}
) {
    if (
        !turkaiAIConfig.openrouterEnabled
    ) {
        throw new Error(
            "OpenRouter API key bulunamadı."
        );
    }

    const turkaiPayload = {
        model:
            turkaiOptions.model ||
            turkaiAIConfig.openrouterModel,

        messages:
            turkaiMessages,

        temperature:
            turkaiClamp(
                turkaiOptions.temperature ??
                    turkaiAIConfig.temperature,
                0,
                2
            ),

        max_tokens:
            turkaiClamp(
                turkaiOptions.maxTokens ??
                    turkaiAIConfig.maxTokens,
                1,
                16000
            )
    };

    const turkaiResponse =
        await turkaiHttpJson(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                method:
                    "POST",

                timeout:
                    turkaiAIConfig.requestTimeout,

                headers: {
                    "Content-Type":
                        "application/json",

                    "Authorization":
                        "Bearer " +
                        process.env.OPENROUTER_API_KEY,

                    "HTTP-Referer":
                        process.env.TURKAI_SITE_URL ||
                        "http://localhost:10000",

                    "X-Title":
                        TURKAI_APP_NAME
                },

                body:
                    JSON.stringify(
                        turkaiPayload
                    )
            }
        );

    if (
        turkaiResponse.status < 200 ||
        turkaiResponse.status >= 300
    ) {
        const turkaiProviderError =
            turkaiExtractText(
                turkaiResponse.data?.error
            ) ||
            `OpenRouter HTTP ${turkaiResponse.status}`;

        throw new Error(
            turkaiProviderError
        );
    }

    const turkaiAnswer =
        turkaiResponse.data
            ?.choices
            ?.[0]
            ?.message
            ?.content;

    if (
        !turkaiAnswer
    ) {
        throw new Error(
            "OpenRouter boş cevap döndürdü."
        );
    }

    return {
        answer:
            turkaiAnswer,

        provider:
            "openrouter",

        model:
            turkaiPayload.model,

        usage:
            turkaiResponse.data?.usage ||
            null
    };
}

/* ============================================================
   GEMINI
   ============================================================ */

async function turkaiCallGemini(
    turkaiMessages,
    turkaiOptions = {}
) {
    if (
        !turkaiAIConfig.geminiEnabled
    ) {
        throw new Error(
            "Gemini API key bulunamadı."
        );
    }

    const turkaiModel =
        turkaiOptions.model ||
        turkaiAIConfig.geminiModel;

    const turkaiSystem =
        turkaiMessages.find(
            turkaiMessage =>
                turkaiMessage.role ===
                "system"
        );

    const turkaiContents =
        turkaiMessages
            .filter(
                turkaiMessage =>
                    turkaiMessage.role !==
                    "system"
            )
            .map(
                turkaiMessage => ({
                    role:
                        turkaiMessage.role ===
                        "assistant"
                            ? "model"
                            : "user",

                    parts: [
                        {
                            text:
                                turkaiMessage.content
                        }
                    ]
                })
            );

    const turkaiBody = {
        contents:
            turkaiContents,

        generationConfig: {
            temperature:
                turkaiClamp(
                    turkaiOptions.temperature ??
                        turkaiAIConfig.temperature,
                    0,
                    2
                ),

            maxOutputTokens:
                turkaiClamp(
                    turkaiOptions.maxTokens ??
                        turkaiAIConfig.maxTokens,
                    1,
                    16000
                )
        }
    };

    if (
        turkaiSystem
    ) {
        turkaiBody.systemInstruction = {
            parts: [
                {
                    text:
                        turkaiSystem.content
                }
            ]
        };
    }

    const turkaiURL =
        "https://generativelanguage.googleapis.com/v1beta/models/" +
        encodeURIComponent(
            turkaiModel
        ) +
        ":generateContent?key=" +
        encodeURIComponent(
            process.env.GEMINI_API_KEY
        );

    const turkaiResponse =
        await turkaiHttpJson(
            turkaiURL,
            {
                method:
                    "POST",

                timeout:
                    turkaiAIConfig.requestTimeout,

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify(
                        turkaiBody
                    )
            }
        );

    if (
        turkaiResponse.status < 200 ||
        turkaiResponse.status >= 300
    ) {
        const turkaiProviderError =
            turkaiExtractText(
                turkaiResponse.data?.error
            ) ||
            `Gemini HTTP ${turkaiResponse.status}`;

        throw new Error(
            turkaiProviderError
        );
    }

    const turkaiAnswer =
        turkaiResponse.data
            ?.candidates
            ?.[0]
            ?.content
            ?.parts
            ?.map(
                turkaiPart =>
                    turkaiPart.text ||
                    ""
            )
            .join("");

    if (
        !turkaiAnswer
    ) {
        throw new Error(
            "Gemini boş cevap döndürdü."
        );
    }

    return {
        answer:
            turkaiAnswer,

        provider:
            "gemini",

        model:
            turkaiModel,

        usage:
            turkaiResponse.data?.usageMetadata ||
            null
    };
}

/* ============================================================
   PROVIDER SIRASI
   ============================================================ */

function turkaiProviderOrder(
    turkaiRequestedProvider
) {
    const turkaiDefaultOrder = [
        "groq",
        "cerebras",
        "openrouter",
        "gemini"
    ];

    if (
        !turkaiRequestedProvider
    ) {
        return turkaiDefaultOrder;
    }

    const turkaiProvider =
        turkaiNormalize(
            turkaiRequestedProvider
        );

    const turkaiAllowed =
        [
            "groq",
            "cerebras",
            "openrouter",
            "gemini",
            "local"
        ];

    if (
        !turkaiAllowed.includes(
            turkaiProvider
        )
    ) {
        return turkaiDefaultOrder;
    }

    if (
        turkaiProvider ===
        "local"
    ) {
        return [
            "local"
        ];
    }

    return [
        turkaiProvider,
        ...turkaiDefaultOrder.filter(
            turkaiItem =>
                turkaiItem !==
                turkaiProvider
        )
    ];
}

/* ============================================================
   PROVIDER ÇALIŞTIRICI
   ============================================================ */

async function turkaiRunProvider(
    turkaiProvider,
    turkaiMessages,
    turkaiOptions
) {
    switch (
        turkaiProvider
    ) {
        case "groq":
            return turkaiCallGroq(
                turkaiMessages,
                turkaiOptions
            );

        case "cerebras":
            return turkaiCallCerebras(
                turkaiMessages,
                turkaiOptions
            );

        case "openrouter":
            return turkaiCallOpenRouter(
                turkaiMessages,
                turkaiOptions
            );

        case "gemini":
            return turkaiCallGemini(
                turkaiMessages,
                turkaiOptions
            );

        case "local":
            return turkaiGenerateLocalAI(
                turkaiOptions
            );

        default:
            throw new Error(
                "Bilinmeyen AI provider: " +
                turkaiProvider
            );
    }
}

/* ============================================================
   ANA AI MOTORU
   ============================================================ */

async function turkaiGenerateAI(
    turkaiInput = {}
) {
    const turkaiMessage =
        turkaiClean(
            turkaiInput.message ||
            ""
        );

    if (
        !turkaiMessage
    ) {
        return {
            success:
                false,

            answer:
                "Mesaj boş olamaz.",

            provider:
                "turkai-local",

            model:
                "turkai-local"
        };
    }

    const turkaiUser =
        turkaiInput.user ||
        null;

    const turkaiUserId =
        turkaiUser?.id ||
        "guest";

    const turkaiChatId =
        turkaiInput.chatId ||
        turkaiInput.conversationId ||
        null;

    const turkaiMemoryContext =
        turkaiBuildMemoryContext(
            turkaiUserId,
            turkaiMessage
        );

    const turkaiConversation =
        turkaiGetConversationContext(
            turkaiChatId
        );

    const turkaiMessages = [
        {
            role:
                "system",

            content:
                turkaiSystemPrompt +
                turkaiMemoryContext
        },

        ...turkaiConversation,

        {
            role:
                "user",

            content:
                turkaiMessage
        }
    ];

    const turkaiCleanMessages =
        turkaiNormalizeMessages(
            turkaiMessages
        );

    const turkaiRequestedProvider =
        turkaiInput.provider ||
        turkaiInput.ai ||
        null;

    const turkaiProviders =
        turkaiProviderOrder(
            turkaiRequestedProvider
        );

    const turkaiFailures = [];

    /*
     * Local cevapları önce kontrol ediyoruz.
     * Böylece basit sorular için API anahtarı gerekmez.
     */

    const turkaiLocal =
        turkaiGenerateLocalAI({
            message:
                turkaiMessage,

            user:
                turkaiUser
        });

    if (
        turkaiLocal &&
        (
            turkaiLocal.source ===
                "special" ||
            turkaiLocal.source ===
                "knowledge" ||
            turkaiLocal.source ===
                "builtin"
        )
    ) {
        turkaiIncrementStatistic(
            "chatRequests",
            1
        );

        return {
            success:
                true,

            ...turkaiLocal,

            latency:
                0,

            fallback:
                false,

            timestamp:
                turkaiNow()
        };
    }

    for (
        const turkaiProvider
        of turkaiProviders
    ) {
        if (
            turkaiProvider !==
            "local"
        ) {
            const turkaiSummary =
                turkaiAIProviderSummary()
                    [turkaiProvider];

            if (
                !turkaiSummary ||
                !turkaiSummary.enabled
            ) {
                continue;
            }
        }

        try {
            const turkaiResult =
                await turkaiRunProvider(
                    turkaiProvider,
                    turkaiCleanMessages,
                    {
                        ...turkaiInput,

                        message:
                            turkaiMessage,

                        user:
                            turkaiUser,

                        maxTokens:
                            turkaiInput.maxTokens ||
                            turkaiAIConfig.maxTokens,

                        temperature:
                            turkaiInput.temperature ??
                            turkaiAIConfig.temperature
                    }
                );

            if (
                turkaiResult &&
                turkaiResult.answer
            ) {
                turkaiIncrementStatistic(
                    "chatRequests",
                    1
                );

                /*
                 * API'den gelen cevapları knowledge
                 * sistemine otomatik olarak kaydetmiyoruz.
                 *
                 * Böylece yanlış / geçici cevapların
                 * bilgi tabanını kirletmesi engellenir.
                 */

                return {
                    success:
                        true,

                    ...turkaiResult,

                    fallback:
                        turkaiProvider !==
                        turkaiProviders[0],

                    failures:
                        turkaiFailures,

                    timestamp:
                        turkaiNow()
                };
            }

        } catch (
            turkaiProviderError
        ) {
            const turkaiFailure = {
                provider:
                    turkaiProvider,

                error:
                    turkaiProviderError?.message ||
                    String(
                        turkaiProviderError
                    ),

                time:
                    turkaiNow()
            };

            turkaiFailures.push(
                turkaiFailure
            );

            turkaiWarn(
                "AI provider başarısız",
                turkaiFailure
            );
        }
    }

    /*
     * Bütün providerlar başarısızsa local fallback.
     */

    const turkaiFallback =
        turkaiGenerateLocalAI({
            message:
                turkaiMessage,

            user:
                turkaiUser
        });

    turkaiIncrementStatistic(
        "chatErrors",
        1
    );

    return {
        success:
            true,

        answer:
            turkaiFallback.answer,

        provider:
            "turkai-local",

        model:
            "turkai-local",

        source:
            "fallback",

        fallback:
            true,

        failures:
            turkaiFailures,

        timestamp:
            turkaiNow()
    };
}

/* ============================================================
   CHAT API
   ============================================================ */

turkaiApp.post(
    "/api/chat",
    turkaiOptionalAuth,
    async (
        turkaiRequest,
        turkaiResponse
    ) => {
        const turkaiStarted =
            Date.now();

        try {
            const turkaiUser =
                turkaiRequest.user ||
                turkaiGetGuestUser();

            const turkaiMessage =
                turkaiClean(
                    turkaiRequest.body?.message ||
                    turkaiRequest.body?.prompt ||
                    turkaiRequest.body?.text ||
                    ""
                ).slice(
                    0,
                    30000
                );

            if (
                !turkaiMessage
            ) {
                return turkaiResponse
                    .status(400)
                    .json({
                        success:
                            false,

                        error:
                            "Mesaj boş olamaz."
                    });
            }

            let turkaiChatId =
                turkaiClean(
                    turkaiRequest.body?.chatId ||
                    turkaiRequest.body?.conversationId ||
                    ""
                );

            if (
                turkaiChatId
            ) {
                const turkaiChats =
                    turkaiGetChats();

                const turkaiChat =
                    turkaiChats.find(
                        turkaiItem =>
                            turkaiItem &&
                            turkaiItem.id ===
                                turkaiChatId
                    );

                if (
                    !turkaiChat
                ) {
                    turkaiChatId =
                        "";
                } else if (
                    turkaiChat.userId !==
                    turkaiUser.id
                ) {
                    return turkaiResponse
                        .status(403)
                        .json({
                            success:
                                false,

                            error:
                                "Bu sohbete erişim izniniz yok."
                        });
                }
            }

            if (
                !turkaiChatId
            ) {
                const turkaiChat =
                    turkaiCreateChat(
                        turkaiUser.id,
                        {
                            title:
                                turkaiMessage
                                    .slice(
                                        0,
                                        80
                                    )
                        }
                    );

                turkaiChatId =
                    turkaiChat.id;
            }

            /*
             * Kullanıcı mesajını kaydet.
             */

            const turkaiUserMessage =
                turkaiSaveChatMessage({
                    chatId:
                        turkaiChatId,

                    userId:
                        turkaiUser.id,

                    role:
                        "user",

                    content:
                        turkaiMessage
                });

            /*
             * AI.
             */

            const turkaiResult =
                await turkaiGenerateAI({
                    message:
                        turkaiMessage,

                    user:
                        turkaiUser,

                    chatId:
                        turkaiChatId,

                    provider:
                        turkaiRequest.body?.provider ||
                        null,

                    model:
                        turkaiRequest.body?.model ||
                        null,

                    temperature:
                        turkaiRequest.body?.temperature,

                    maxTokens:
                        turkaiRequest.body?.maxTokens
                });

            /*
             * AI cevabını kaydet.
             */

            const turkaiAssistantMessage =
                turkaiSaveChatMessage({
                    chatId:
                        turkaiChatId,

                    userId:
                        turkaiUser.id,

                    role:
                        "assistant",

                    content:
                        turkaiResult.answer,

                    model:
                        turkaiResult.model ||
                        turkaiResult.provider ||
                        "turkai-local"
                });

            /*
             * Socket üzerinden frontend'e
             * canlı event gönderiyoruz.
             */

            try {
                turkaiIO.emit(
                    "turkai:chat:completed",
                    {
                        chatId:
                            turkaiChatId,

                        message:
                            turkaiAssistantMessage,

                        timestamp:
                            turkaiNow()
                    }
                );
            } catch (
                turkaiSocketError
            ) {
                void turkaiSocketError;
            }

            return turkaiResponse.json({
                success:
                    true,

                chatId:
                    turkaiChatId,

                userMessage:
                    turkaiUserMessage,

                message:
                    turkaiAssistantMessage,

                answer:
                    turkaiResult.answer,

                provider:
                    turkaiResult.provider,

                model:
                    turkaiResult.model,

                fallback:
                    Boolean(
                        turkaiResult.fallback
                    ),

                failures:
                    turkaiResult.failures ||
                    [],

                latency:
                    Date.now() -
                    turkaiStarted,

                timestamp:
                    turkaiNow()
            });

        } catch (
            turkaiChatError
        ) {
            turkaiError(
                "CHAT API error",
                {
                    message:
                        turkaiChatError?.message ||
                        String(
                            turkaiChatError
                        ),

                    stack:
                        turkaiChatError?.stack ||
                        null
                }
            );

            turkaiIncrementStatistic(
                "chatErrors",
                1
            );

            return turkaiResponse
                .status(500)
                .json({
                    success:
                        false,

                    error:
                        "TürkAI cevap oluştururken bir hata oluştu.",

                    fallback:
                        true,

                    latency:
                        Date.now() -
                        turkaiStarted,

                    timestamp:
                        turkaiNow()
                });
        }
    }
);

/* ============================================================
   CHAT QUICK
   ============================================================ */

turkaiApp.post(
    "/api/chat/quick",
    turkaiOptionalAuth,
    async (
        turkaiRequest,
        turkaiResponse
    ) => {
        try {
            const turkaiUser =
                turkaiRequest.user ||
                turkaiGetGuestUser();

            const turkaiMessage =
                turkaiClean(
                    turkaiRequest.body?.message ||
                    ""
                ).slice(
                    0,
                    10000
                );

            if (
                !turkaiMessage
            ) {
                return turkaiResponse
                    .status(400)
                    .json({
                        success:
                            false,

                        error:
                            "Mesaj gerekli."
                    });
            }

            const turkaiResult =
                await turkaiGenerateAI({
                    message:
                        turkaiMessage,

                    user:
                        turkaiUser,

                    provider:
                        "local"
                });

            return turkaiResponse.json({
                success:
                    true,

                answer:
                    turkaiResult.answer,

                provider:
                    turkaiResult.provider,

                model:
                    turkaiResult.model,

                timestamp:
                    turkaiNow()
            });

        } catch (
            turkaiQuickError
        ) {
            turkaiError(
                "Quick chat error",
                turkaiQuickError
            );

            return turkaiResponse
                .status(500)
                .json({
                    success:
                        false,

                    error:
                        "Hızlı cevap alınamadı."
                });
        }
    }
);

/* ============================================================
   AI TEST
   ============================================================ */

turkaiApp.post(
    "/api/ai/test",
    async (
        turkaiRequest,
        turkaiResponse
    ) => {
        const turkaiMessage =
            turkaiClean(
                turkaiRequest.body?.message ||
                "Merhaba TürkAI"
            );

        const turkaiResult =
            await turkaiGenerateAI({
                message:
                    turkaiMessage,

                user:
                    turkaiGetGuestUser()
            });

        turkaiResponse.json({
            success:
                true,

            input:
                turkaiMessage,

            result:
                turkaiResult,

            timestamp:
                turkaiNow()
        });
    }
);

/* ============================================================
   KNOWLEDGE API
   ============================================================ */

turkaiApp.get(
    "/api/knowledge/search",
    (turkaiRequest, turkaiResponse) => {
        const turkaiQuery =
            turkaiClean(
                turkaiRequest.query.q ||
                turkaiRequest.query.query ||
                ""
            );

        if (
            !turkaiQuery
        ) {
            return turkaiResponse
                .status(400)
                .json({
                    success:
                        false,

                    error:
                        "Arama sorgusu gerekli."
                });
        }

        const turkaiResult =
            turkaiSearchKnowledge(
                turkaiQuery
            );

        return turkaiResponse.json({
            success:
                true,

            found:
                Boolean(
                    turkaiResult
                ),

            result:
                turkaiResult,

            timestamp:
                turkaiNow()
        });
    }
);

/* ============================================================
   MEMORY API
   ============================================================ */

turkaiApp.get(
    "/api/memory/search",
    turkaiOptionalAuth,
    (turkaiRequest, turkaiResponse) => {
        const turkaiUser =
            turkaiRequest.user ||
            turkaiGetGuestUser();

        const turkaiQuery =
            turkaiClean(
                turkaiRequest.query.q ||
                turkaiRequest.query.query ||
                ""
            );

        if (
            !turkaiQuery
        ) {
            return turkaiResponse
                .status(400)
                .json({
                    success:
                        false,

                    error:
                        "Arama sorgusu gerekli."
                });
        }

        const turkaiMemories =
            turkaiSearchMemories(
                turkaiUser.id,
                turkaiQuery
            );

        return turkaiResponse.json({
            success:
                true,

            memories:
                turkaiMemories,

            count:
                turkaiMemories.length,

            timestamp:
                turkaiNow()
        });
    }
);

/* ============================================================
   MEMORY CREATE
   ============================================================ */

turkaiApp.post(
    "/api/memory",
    turkaiOptionalAuth,
    (
        turkaiRequest,
        turkaiResponse
    ) => {
        try {
            const turkaiUser =
                turkaiRequest.user ||
                turkaiGetGuestUser();

            const turkaiContent =
                turkaiClean(
                    turkaiRequest.body?.content ||
                    turkaiRequest.body?.text ||
                    ""
                ).slice(
                    0,
                    10000
                );

            if (
                !turkaiContent
            ) {
                return turkaiResponse
                    .status(400)
                    .json({
                        success:
                            false,

                        error:
                            "Hafıza içeriği gerekli."
                    });
            }

            const turkaiMemories =
                turkaiGetMemories();

            const turkaiMemory = {
                id:
                    turkaiId(
                        "memory"
                    ),

                userId:
                    turkaiUser.id,

                content:
                    turkaiContent,

                category:
                    turkaiClean(
                        turkaiRequest.body?.category ||
                        "general"
                    ).slice(
                        0,
                        100
                    ),

                importance:
                    turkaiClamp(
                        turkaiRequest.body?.importance ||
                        5,
                        1,
                        10
                    ),

                createdAt:
                    turkaiNow(),

                updatedAt:
                    turkaiNow()
            };

            turkaiMemories.unshift(
                turkaiMemory
            );

            turkaiSaveMemories(
                turkaiMemories.slice(
                    0,
                    10000
                )
            );

            turkaiIncrementStatistic(
                "memoryCreated",
                1
            );

            return turkaiResponse
                .status(201)
                .json({
                    success:
                        true,

                    memory:
                        turkaiMemory
                });

        } catch (
            turkaiMemoryCreateError
        ) {
            turkaiError(
                "Memory create error",
                turkaiMemoryCreateError
            );

            return turkaiResponse
                .status(500)
                .json({
                    success:
                        false,

                    error:
                        "Hafıza kaydedilemedi."
                });
        }
    }
);

/* ============================================================
   AI EXPORTLARI — PART 3/4/5 KULLANACAK
   ============================================================ */

const turkaiAIEngine = {
    config:
        turkaiAIConfig,

    providers:
        turkaiAIProviderSummary,

    local:
        turkaiGenerateLocalAI,

    generate:
        turkaiGenerateAI,

    groq:
        turkaiCallGroq,

    cerebras:
        turkaiCallCerebras,

    openrouter:
        turkaiCallOpenRouter,

    gemini:
        turkaiCallGemini,

    searchKnowledge:
        turkaiSearchKnowledge,

    saveKnowledge:
        turkaiSaveKnowledgeItem,

    searchMemories:
        turkaiSearchMemories,

    buildMemoryContext:
        turkaiBuildMemoryContext
};

/* ============================================================
   PART 2 SONU
   ============================================================

   PART 3:
   ├── Research Engine
   ├── Weather
   ├── Web requests
   ├── File engine
   ├── Project engine
   ├── coding engine
   ├── security engine
   ├── upload
   └── advanced AI tools
   ============================================================ */

console.log(
    "[TürkAI] PART 2 hazır."
);
/* ============================================================
   TÜRKAI 15.0 — SERVER.JS
   PART 3 / 5
   RESEARCH • WEATHER • WEB • FILES • CODING • SECURITY
   ============================================================ */

"use strict";

/* ============================================================
   PART 3 GUARD
   ============================================================ */

if (typeof app === "undefined") {
    throw new Error(
        "TürkAI Part 3 başlatılamadı: Part 1 yüklenmeden Part 3 çalıştırılamaz."
    );
}

if (typeof fs === "undefined") {
    throw new Error("Node fs modülü bulunamadı.");
}

if (typeof path === "undefined") {
    throw new Error("Node path modülü bulunamadı.");
}

/* ============================================================
   1. RESEARCH ENGINE
   ============================================================ */

const TURKAI_RESEARCH = {
    enabled: true,

    maxResults: 8,

    timeout: 15000,

    currentKeywords: [
        "şu an",
        "şimdi",
        "bugün",
        "bugünkü",
        "güncel",
        "son dakika",
        "son durum",
        "en son",
        "latest",
        "current",
        "today",
        "şu anda",
        "kaç",
        "fiyat",
        "kur",
        "hava",
        "haber"
    ],

    sourceTypes: [
        "web",
        "knowledge",
        "local"
    ]
};

function turkaiResearchNeedsWeb(text) {

    const value = cleanText(text || "").toLowerCase();

    if (!value) {
        return false;
    }

    return TURKAI_RESEARCH.currentKeywords.some(keyword =>
        value.includes(keyword)
    );
}

function turkaiResearchNormalizeQuery(query) {

    return cleanText(query || "")
        .replace(/\s+/g, " ")
        .slice(0, 1000);
}

function turkaiResearchExtractDomain(url) {

    try {

        return new URL(url).hostname;

    } catch {

        return null;
    }
}

function turkaiResearchSafeURL(value) {

    try {

        const parsed = new URL(value);

        if (!["http:", "https:"].includes(parsed.protocol)) {
            return null;
        }

        return parsed.toString();

    } catch {

        return null;
    }
}

function turkaiResearchResult(item = {}) {

    return {

        id: item.id || createId("research_result"),

        title: cleanText(item.title || "Sonuç"),

        url: turkaiResearchSafeURL(item.url || "") || null,

        domain:
            item.domain ||
            turkaiResearchExtractDomain(item.url || "") ||
            null,

        snippet: cleanText(item.snippet || "").slice(0, 1200),

        source: item.source || "web",

        timestamp: nowISO()

    };
}

/* ============================================================
   2. GENERIC WEB FETCH
   ============================================================ */

async function turkaiWebFetch(url, options = {}) {

    const safeURL = turkaiResearchSafeURL(url);

    if (!safeURL) {
        throw new Error("Geçersiz web adresi.");
    }

    const timeout =
        Number(options.timeout) > 0
            ? Math.min(Number(options.timeout), 30000)
            : TURKAI_RESEARCH.timeout;

    const controller = new AbortController();

    const timer = setTimeout(() => {
        controller.abort();
    }, timeout);

    try {

        const response = await fetch(safeURL, {
            method: options.method || "GET",

            headers: {
                "User-Agent":
                    "TurkAI/15.0 (+https://erencanai-1.onrender.com)",
                "Accept":
                    options.accept ||
                    "text/html,application/json,text/plain;q=0.9,*/*;q=0.8"
            },

            signal: controller.signal,

            redirect: "follow"
        });

        const text = await response.text();

        return {

            ok: response.ok,

            status: response.status,

            url: response.url,

            contentType:
                response.headers.get("content-type") || "",

            text: text.slice(0, 100000)

        };

    } finally {

        clearTimeout(timer);
    }
}

/* ============================================================
   3. HTML TEXT EXTRACTION
   ============================================================ */

function turkaiStripHTML(html) {

    return String(html || "")

        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")

        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")

        .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")

        .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, " ")

        .replace(/<[^>]+>/g, " ")

        .replace(/&nbsp;/gi, " ")

        .replace(/&amp;/gi, "&")

        .replace(/&quot;/gi, '"')

        .replace(/&#39;/gi, "'")

        .replace(/&lt;/gi, "<")

        .replace(/&gt;/gi, ">")

        .replace(/\s+/g, " ")

        .trim()

        .slice(0, 15000);
}

function turkaiExtractTitle(html) {

    const match = String(html || "")
        .match(/<title[^>]*>([\s\S]*?)<\/title>/i);

    if (!match) {
        return "Web sonucu";
    }

    return turkaiStripHTML(match[1]).slice(0, 300);
}

/* ============================================================
   4. SIMPLE WEB SEARCH ENGINE
   ============================================================ */

async function turkaiSearchWeb(query) {

    const normalized = turkaiResearchNormalizeQuery(query);

    if (!normalized) {
        return [];
    }

    const encoded = encodeURIComponent(normalized);

    const candidates = [

        `https://www.google.com/search?q=${encoded}`,

        `https://www.bing.com/search?q=${encoded}`,

        `https://html.duckduckgo.com/html/?q=${encoded}`

    ];

    const results = [];

    for (const searchURL of candidates) {

        try {

            const response = await turkaiWebFetch(searchURL, {
                timeout: 8000
            });

            if (!response.ok) {
                continue;
            }

            const html = response.text;

            const links = [];

            const regex =
                /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

            let match;

            while (
                (match = regex.exec(html)) !== null &&
                links.length < TURKAI_RESEARCH.maxResults
            ) {

                const href = match[1];

                const title = turkaiStripHTML(match[2]);

                if (!title || title.length < 3) {
                    continue;
                }

                let url = href;

                if (href.startsWith("/url?q=")) {

                    try {
                        url =
                            new URL(
                                "https://www.google.com" + href
                            ).searchParams.get("q") || href;
                    } catch {}
                }

                const safeURL = turkaiResearchSafeURL(url);

                if (!safeURL) {
                    continue;
                }

                if (
                    safeURL.includes("google.com/search") ||
                    safeURL.includes("bing.com/search") ||
                    safeURL.includes("duckduckgo.com")
                ) {
                    continue;
                }

                links.push(
                    turkaiResearchResult({
                        title,
                        url: safeURL,
                        snippet: "",
                        source: "web-search"
                    })
                );
            }

            results.push(...links);

            if (results.length >= 5) {
                break;
            }

        } catch (error) {

            if (typeof logWarn === "function") {
                logWarn(
                    "Research search failed",
                    error.message
                );
            }
        }
    }

    const unique = [];

    const seen = new Set();

    for (const item of results) {

        if (!item.url) {
            continue;
        }

        if (seen.has(item.url)) {
            continue;
        }

        seen.add(item.url);

        unique.push(item);

        if (unique.length >= TURKAI_RESEARCH.maxResults) {
            break;
        }
    }

    return unique;
}

/* ============================================================
   5. RESEARCH PAGE READER
   ============================================================ */

async function turkaiReadResearchPage(result) {

    if (!result || !result.url) {
        return null;
    }

    try {

        const response = await turkaiWebFetch(result.url, {
            timeout: 10000
        });

        if (!response.ok) {
            return null;
        }

        const text =
            response.contentType.includes("html")
                ? turkaiStripHTML(response.text)
                : response.text;

        return {

            ...result,

            title:
                result.title ||
                turkaiExtractTitle(response.text),

            content: text.slice(0, 8000),

            fetchedAt: nowISO()

        };

    } catch {

        return null;
    }
}

/* ============================================================
   6. RESEARCH ENGINE MAIN
   ============================================================ */

async function turkaiResearch(query, options = {}) {

    const normalized = turkaiResearchNormalizeQuery(query);

    if (!normalized) {

        return {

            success: false,

            query: "",

            results: [],

            answer: "Araştırılacak bir konu belirtilmedi."

        };
    }

    const results =
        await turkaiSearchWeb(normalized);

    const pages = [];

    for (
        const result of results.slice(
            0,
            options.pages || 4
        )
    ) {

        const page =
            await turkaiReadResearchPage(result);

        if (page) {
            pages.push(page);
        }
    }

    let answer = "";

    if (pages.length > 0) {

        answer =
            pages
                .map(page => {

                    const snippet =
                        page.content
                            ? page.content.slice(0, 1200)
                            : page.snippet;

                    return (
                        `${page.title}\n` +
                        `${snippet}`
                    );

                })
                .join("\n\n");

    } else if (results.length > 0) {

        answer =
            results
                .map(item =>
                    `${item.title}\n${item.url}`
                )
                .join("\n\n");

    } else {

        answer =
            "Web üzerinde kullanılabilir bir sonuç bulunamadı.";
    }

    return {

        success: pages.length > 0 || results.length > 0,

        query: normalized,

        answer: answer.slice(0, 12000),

        results,

        pages,

        timestamp: nowISO()

    };
}

/* ============================================================
   7. RESEARCH API
   ============================================================ */

app.post("/api/research", optionalAuth, async (req, res) => {

    try {

        const query =
            turkaiResearchNormalizeQuery(
                req.body?.query ||
                req.body?.q ||
                ""
            );

        if (!query) {

            return res.status(400).json({
                success: false,
                error: "Araştırma konusu gerekli."
            });
        }

        const result =
            await turkaiResearch(query, {
                pages: 4
            });

        if (typeof incrementStatistic === "function") {
            incrementStatistic(
                "research_requests",
                1
            );
        }

        res.json(result);

    } catch (error) {

        if (typeof logError === "function") {
            logError(
                "Research API error",
                error
            );
        }

        res.status(500).json({
            success: false,
            error: "Araştırma sırasında hata oluştu."
        });
    }
});

/* ============================================================
   8. GET RESEARCH API
   ============================================================ */

app.get("/api/research", optionalAuth, async (req, res) => {

    try {

        const query =
            turkaiResearchNormalizeQuery(
                req.query?.q ||
                req.query?.query ||
                ""
            );

        if (!query) {

            return res.status(400).json({
                success: false,
                error: "q parametresi gerekli."
            });
        }

        const result =
            await turkaiResearch(query);

        res.json(result);

    } catch (error) {

        res.status(500).json({
            success: false,
            error: "Araştırma başarısız."
        });
    }
});

/* ============================================================
   9. WEATHER ENGINE
   ============================================================ */

const TURKAI_WEATHER = {

    cache: new Map(),

    cacheDuration: 5 * 60 * 1000

};

function turkaiWeatherCacheKey(city) {

    return cleanText(city || "")
        .toLowerCase()
        .trim();
}

function turkaiWeatherDescription(code) {

    const descriptions = {

        0: "Açık",

        1: "Çoğunlukla açık",

        2: "Parçalı bulutlu",

        3: "Kapalı",

        45: "Sisli",

        48: "Kırağılı sis",

        51: "Hafif çiseleme",

        53: "Orta çiseleme",

        55: "Yoğun çiseleme",

        61: "Hafif yağmur",

        63: "Orta yağmur",

        65: "Yoğun yağmur",

        71: "Hafif kar",

        73: "Orta kar",

        75: "Yoğun kar",

        80: "Hafif sağanak",

        81: "Orta sağanak",

        82: "Şiddetli sağanak",

        95: "Gök gürültülü fırtına",

        96: "Dolu ihtimalli fırtına",

        99: "Şiddetli dolulu fırtına"

    };

    return descriptions[code] || "Bilinmeyen hava durumu";
}

/* ============================================================
   10. CITY GEOCODING
   ============================================================ */

async function turkaiGeocodeCity(city) {

    const normalized =
        cleanText(city || "").slice(0, 100);

    if (!normalized) {
        return null;
    }

    const url =
        "https://geocoding-api.open-meteo.com/v1/search" +
        `?name=${encodeURIComponent(normalized)}` +
        "&count=1" +
        "&language=tr" +
        "&format=json";

    const response =
        await turkaiWebFetch(url, {
            timeout: 10000,
            accept: "application/json"
        });

    if (!response.ok) {
        return null;
    }

    let data;

    try {
        data = JSON.parse(response.text);
    } catch {
        return null;
    }

    const item =
        Array.isArray(data.results)
            ? data.results[0]
            : null;

    if (!item) {
        return null;
    }

    return {

        name: item.name,

        country:
            item.country || null,

        countryCode:
            item.country_code || null,

        latitude:
            Number(item.latitude),

        longitude:
            Number(item.longitude),

        timezone:
            item.timezone || null

    };
}

/* ============================================================
   11. WEATHER FETCH
   ============================================================ */

async function turkaiGetWeather(city) {

    const cacheKey =
        turkaiWeatherCacheKey(city);

    if (!cacheKey) {
        throw new Error("Şehir gerekli.");
    }

    const cached =
        TURKAI_WEATHER.cache.get(cacheKey);

    if (
        cached &&
        Date.now() - cached.timestamp <
            TURKAI_WEATHER.cacheDuration
    ) {

        return cached.data;
    }

    const location =
        await turkaiGeocodeCity(city);

    if (!location) {
        throw new Error("Şehir bulunamadı.");
    }

    const url =
        "https://api.open-meteo.com/v1/forecast" +
        `?latitude=${encodeURIComponent(location.latitude)}` +
        `&longitude=${encodeURIComponent(location.longitude)}` +
        "&current=temperature_2m,relative_humidity_2m," +
        "apparent_temperature,is_day,precipitation," +
        "weather_code,wind_speed_10m,wind_direction_10m" +
        "&hourly=temperature_2m,precipitation_probability," +
        "weather_code" +
        "&daily=temperature_2m_max,temperature_2m_min," +
        "precipitation_probability_max,weather_code" +
        "&timezone=auto" +
        "&forecast_days=7";

    const response =
        await turkaiWebFetch(url, {
            timeout: 12000,
            accept: "application/json"
        });

    if (!response.ok) {
        throw new Error(
            `Hava durumu servisi HTTP ${response.status}`
        );
    }

    let data;

    try {
        data = JSON.parse(response.text);
    } catch {

        throw new Error(
            "Hava durumu verisi okunamadı."
        );
    }

    const result = {

        success: true,

        location,

        current: {

            temperature:
                data.current?.temperature_2m ?? null,

            humidity:
                data.current?.relative_humidity_2m ?? null,

            feelsLike:
                data.current?.apparent_temperature ?? null,

            precipitation:
                data.current?.precipitation ?? null,

            windSpeed:
                data.current?.wind_speed_10m ?? null,

            windDirection:
                data.current?.wind_direction_10m ?? null,

            weatherCode:
                data.current?.weather_code ?? null,

            description:
                turkaiWeatherDescription(
                    data.current?.weather_code
                ),

            isDay:
                Boolean(data.current?.is_day)

        },

        daily: data.daily || null,

        units: {

            temperature:
                data.current_units?.temperature_2m || "°C",

            wind:
                data.current_units?.wind_speed_10m ||
                "km/h"

        },

        timestamp: nowISO()

    };

    TURKAI_WEATHER.cache.set(
        cacheKey,
        {
            timestamp: Date.now(),
            data: result
        }
    );

    return result;
}

/* ============================================================
   12. WEATHER ROUTES
   ============================================================ */

app.get("/api/weather", optionalAuth, async (req, res) => {

    try {

        const city =
            cleanText(
                req.query?.city ||
                req.query?.q ||
                ""
            );

        if (!city) {

            return res.status(400).json({
                success: false,
                error: "Şehir gerekli."
            });
        }

        const weather =
            await turkaiGetWeather(city);

        res.json(weather);

    } catch (error) {

        res.status(500).json({
            success: false,
            error:
                error.message ||
                "Hava durumu alınamadı."
        });
    }
});

app.post("/api/weather", optionalAuth, async (req, res) => {

    try {

        const city =
            cleanText(
                req.body?.city ||
                req.body?.q ||
                ""
            );

        if (!city) {

            return res.status(400).json({
                success: false,
                error: "Şehir gerekli."
            });
        }

        const weather =
            await turkaiGetWeather(city);

        res.json(weather);

    } catch (error) {

        res.status(500).json({
            success: false,
            error:
                error.message ||
                "Hava durumu alınamadı."
        });
    }
});

/* ============================================================
   13. CURRENCY ENGINE
   ============================================================ */

const TURKAI_CURRENCY = {

    cache: null,

    timestamp: 0,

    duration: 5 * 60 * 1000

};

async function turkaiGetCurrency(base = "TRY") {

    const normalizedBase =
        cleanText(base || "TRY")
            .toUpperCase();

    if (
        TURKAI_CURRENCY.cache &&
        Date.now() - TURKAI_CURRENCY.timestamp <
            TURKAI_CURRENCY.duration
    ) {

        return TURKAI_CURRENCY.cache;
    }

    const url =
        `https://api.frankfurter.app/latest?from=${encodeURIComponent(
            normalizedBase
        )}`;

    const response =
        await turkaiWebFetch(url, {
            timeout: 10000,
            accept: "application/json"
        });

    if (!response.ok) {
        throw new Error(
            "Kur servisine ulaşılamadı."
        );
    }

    let data;

    try {
        data = JSON.parse(response.text);
    } catch {
        throw new Error(
            "Kur verisi okunamadı."
        );
    }

    const result = {

        success: true,

        base:
            data.base || normalizedBase,

        date:
            data.date || null,

        rates:
            data.rates || {},

        timestamp:
            nowISO()

    };

    TURKAI_CURRENCY.cache = result;

    TURKAI_CURRENCY.timestamp =
        Date.now();

    return result;
}

app.get("/api/currency", optionalAuth, async (req, res) => {

    try {

        const base =
            cleanText(
                req.query?.base ||
                "TRY"
            );

        const data =
            await turkaiGetCurrency(base);

        res.json(data);

    } catch (error) {

        res.status(500).json({
            success: false,
            error:
                error.message ||
                "Döviz verisi alınamadı."
        });
    }
});

/* ============================================================
   14. FILE ENGINE
   ============================================================ */

const TURKAI_FILE_ENGINE = {

    maxSize:
        10 * 1024 * 1024,

    allowedExtensions: [

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
        ".log"

    ]

};

function turkaiSafeFilename(name) {

    return cleanText(name || "file")

        .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")

        .replace(/\.\./g, "_")

        .slice(0, 150);
}

function turkaiGetExtension(name) {

    return path
        .extname(name || "")
        .toLowerCase();
}

function turkaiIsAllowedFile(name) {

    const extension =
        turkaiGetExtension(name);

    return TURKAI_FILE_ENGINE
        .allowedExtensions
        .includes(extension);
}

function turkaiReadTextFile(filePath) {

    const stats =
        fs.statSync(filePath);

    if (
        stats.size >
        TURKAI_FILE_ENGINE.maxSize
    ) {

        throw new Error(
            "Dosya boyutu 10 MB sınırını aşıyor."
        );
    }

    return fs.readFileSync(
        filePath,
        "utf8"
    );
}

/* ============================================================
   15. MULTIPART-FREE UPLOAD ENDPOINT
   ============================================================ */

app.post("/api/upload/text", optionalAuth, async (req, res) => {

    try {

        const user =
            req.user ||
            getGuestUser();

        const filename =
            turkaiSafeFilename(
                req.body?.filename ||
                "upload.txt"
            );

        const content =
            String(
                req.body?.content ||
                ""
            );

        if (!content) {

            return res.status(400).json({
                success: false,
                error: "Dosya içeriği boş."
            });
        }

        if (!turkaiIsAllowedFile(filename)) {

            return res.status(400).json({
                success: false,
                error:
                    "Bu dosya türü desteklenmiyor."
            });
        }

        if (
            Buffer.byteLength(content, "utf8") >
            TURKAI_FILE_ENGINE.maxSize
        ) {

            return res.status(413).json({
                success: false,
                error:
                    "Dosya boyutu 10 MB sınırını aşıyor."
            });
        }

        const fileId =
            createId("file");

        const storedName =
            `${fileId}_${filename}`;

        const target =
            path.join(
                UPLOADS_DIR,
                storedName
            );

        fs.writeFileSync(
            target,
            content,
            "utf8"
        );

        const record = {

            id: fileId,

            userId:
                user?.id ||
                "guest",

            originalName:
                filename,

            storedName,

            size:
                Buffer.byteLength(
                    content,
                    "utf8"
                ),

            extension:
                turkaiGetExtension(filename),

            createdAt:
                nowISO()

        };

        const files =
            readJSON(DB_FILES.files, []);

        files.push(record);

        writeJSON(
            DB_FILES.files,
            files
        );

        res.json({

            success: true,

            file: record,

            preview:
                content.slice(0, 5000)

        });

    } catch (error) {

        res.status(500).json({
            success: false,
            error:
                error.message ||
                "Dosya yüklenemedi."
        });
    }
});

/* ============================================================
   16. FILE LIST
   ============================================================ */

app.get("/api/files", optionalAuth, (req, res) => {

    try {

        const user =
            req.user ||
            getGuestUser();

        const files =
            readJSON(
                DB_FILES.files,
                []
            );

        const own =
            files.filter(file =>
                file.userId ===
                (user?.id || "guest")
            );

        res.json({

            success: true,

            files:
                own.slice(-100).reverse()

        });

    } catch {

        res.status(500).json({
            success: false,
            error: "Dosyalar alınamadı."
        });
    }
});

/* ============================================================
   17. FILE CONTENT
   ============================================================ */

app.get("/api/files/:id", optionalAuth, (req, res) => {

    try {

        const id =
            cleanText(req.params.id);

        const files =
            readJSON(
                DB_FILES.files,
                []
            );

        const file =
            files.find(item =>
                item.id === id
            );

        if (!file) {

            return res.status(404).json({
                success: false,
                error: "Dosya bulunamadı."
            });
        }

        const target =
            path.join(
                UPLOADS_DIR,
                file.storedName
            );

        if (!fs.existsSync(target)) {

            return res.status(404).json({
                success: false,
                error:
                    "Dosyanın fiziksel içeriği bulunamadı."
            });
        }

        const content =
            turkaiReadTextFile(target);

        res.json({

            success: true,

            file,

            content

        });

    } catch (error) {

        res.status(500).json({
            success: false,
            error:
                error.message ||
                "Dosya okunamadı."
        });
    }
});

/* ============================================================
   18. CODE ENGINE
   ============================================================ */

const TURKAI_CODE_ENGINE = {

    languages: {

        javascript: {
            extensions: [".js", ".mjs", ".cjs"]
        },

        typescript: {
            extensions: [".ts"]
        },

        html: {
            extensions: [".html", ".htm"]
        },

        css: {
            extensions: [".css"]
        },

        python: {
            extensions: [".py"]
        },

        java: {
            extensions: [".java"]
        },

        csharp: {
            extensions: [".cs"]
        },

        cpp: {
            extensions: [".cpp", ".cc", ".hpp"]
        },

        c: {
            extensions: [".c", ".h"]
        },

        json: {
            extensions: [".json"]
        }

    }

};

function turkaiDetectLanguage(filename) {

    const extension =
        turkaiGetExtension(filename);

    for (const [language, info] of Object.entries(
        TURKAI_CODE_ENGINE.languages
    )) {

        if (
            info.extensions.includes(
                extension
            )
        ) {

            return language;
        }
    }

    return "text";
}

function turkaiCodeAnalysis(code, language) {

    const source =
        String(code || "");

    const result = {

        language:
            language || "text",

        lines:
            source
                ? source.split(/\r?\n/).length
                : 0,

        characters:
            source.length,

        functions: 0,

        imports: 0,

        warnings: [],

        suggestions: []

    };

    if (!source) {
        return result;
    }

    if (
        ["javascript", "typescript", "java", "csharp", "cpp", "c"]
            .includes(language)
    ) {

        result.functions =
            (
                source.match(
                    /\b(function|def|public|private|protected|static)\b/g
                ) || []
            ).length;
    }

    result.imports =
        (
            source.match(
                /\b(import|require|using|include)\b/g
            ) || []
        ).length;

    if (
        source.includes("eval(")
    ) {

        result.warnings.push(
            "eval() kullanımı güvenlik açısından dikkat gerektirir."
        );
    }

    if (
        source.includes("innerHTML")
    ) {

        result.warnings.push(
            "innerHTML kullanıcı verisiyle kullanılıyorsa XSS riski oluşturabilir."
        );
    }

    if (
        source.includes("child_process")
    ) {

        result.warnings.push(
            "child_process güçlü sistem erişimi sağlar; kullanıcı girdisini doğrudan aktarmayın."
        );
    }

    if (
        source.includes("process.env")
    ) {

        result.suggestions.push(
            "Gizli anahtarları doğrudan kod içine yazmak yerine environment variable kullanın."
        );
    }

    return result;
}

/* ============================================================
   19. CODE ANALYZE API
   ============================================================ */

app.post("/api/code/analyze", optionalAuth, (req, res) => {

    try {

        const code =
            String(
                req.body?.code ||
                ""
            ).slice(0, 100000);

        const language =
            cleanText(
                req.body?.language ||
                "text"
            );

        if (!code) {

            return res.status(400).json({
                success: false,
                error: "Kod gerekli."
            });
        }

        const analysis =
            turkaiCodeAnalysis(
                code,
                language
            );

        res.json({

            success: true,

            analysis

        });

    } catch (error) {

        res.status(500).json({
            success: false,
            error:
                error.message ||
                "Kod analiz edilemedi."
        });
    }
});

/* ============================================================
   20. CODE PROJECT API
   ============================================================ */

app.post("/api/code/project", optionalAuth, (req, res) => {

    try {

        const name =
            turkaiSafeFilename(
                req.body?.name ||
                "TürkAI Projesi"
            );

        const language =
            cleanText(
                req.body?.language ||
                "javascript"
            );

        const code =
            String(
                req.body?.code ||
                ""
            ).slice(0, 200000);

        const projectId =
            createId("project");

        const project = {

            id:
                projectId,

            name,

            language,

            code,

            createdAt:
                nowISO(),

            updatedAt:
                nowISO()

        };

        const projects =
            readJSON(
                DB_FILES.projects,
                []
            );

        projects.push(project);

        writeJSON(
            DB_FILES.projects,
            projects
        );

        res.json({

            success: true,

            project

        });

    } catch (error) {

        res.status(500).json({
            success: false,
            error:
                error.message ||
                "Proje oluşturulamadı."
        });
    }
});

/* ============================================================
   21. PROJECT LIST
   ============================================================ */

app.get("/api/code/projects", optionalAuth, (req, res) => {

    try {

        const projects =
            readJSON(
                DB_FILES.projects,
                []
            );

        res.json({

            success: true,

            projects:
                projects
                    .slice(-100)
                    .reverse()

        });

    } catch {

        res.status(500).json({
            success: false,
            error: "Projeler alınamadı."
        });
    }
});

/* ============================================================
   22. SECURITY ENGINE
   ============================================================ */

const TURKAI_SECURITY = {

    dangerousPatterns: [

        {
            pattern:
                /rm\s+-rf\s+[\/~]/i,

            name:
                "Tehlikeli dosya silme komutu",

            level:
                "critical"
        },

        {
            pattern:
                /format\s+[a-z]:/i,

            name:
                "Disk biçimlendirme komutu",

            level:
                "critical"
        },

        {
            pattern:
                /del\s+\/f\s+\/s/i,

            name:
                "Toplu Windows silme komutu",

            level:
                "critical"
        },

        {
            pattern:
                /powershell.*-enc/i,

            name:
                "Şifrelenmiş PowerShell komutu",

            level:
                "high"
        },

        {
            pattern:
                /javascript\s*:\s*/i,

            name:
                "JavaScript URL kullanımı",

            level:
                "medium"
        },

        {
            pattern:
                /eval\s*\(/i,

            name:
                "eval kullanımı",

            level:
                "medium"
        },

        {
            pattern:
                /document\.cookie/i,

            name:
                "Cookie erişimi",

            level:
                "medium"
        }

    ]

};

function turkaiSecurityScan(input) {

    const source =
        String(input || "")
            .slice(0, 200000);

    const findings = [];

    for (
        const rule of TURKAI_SECURITY.dangerousPatterns
    ) {

        if (rule.pattern.test(source)) {

            findings.push({

                name:
                    rule.name,

                level:
                    rule.level,

                message:
                    "Kodda güvenlik açısından incelenmesi gereken bir kalıp bulundu."

            });
        }
    }

    let score = 100;

    for (const finding of findings) {

        if (finding.level === "critical") {
            score -= 40;
        } else if (finding.level === "high") {
            score -= 25;
        } else if (finding.level === "medium") {
            score -= 10;
        }
    }

    score =
        Math.max(
            0,
            Math.min(100, score)
        );

    return {

        score,

        risk:
            score >= 85
                ? "düşük"
                : score >= 60
                    ? "orta"
                    : score >= 30
                        ? "yüksek"
                        : "kritik",

        findings,

        scannedAt:
            nowISO()

    };
}

/* ============================================================
   23. SECURITY SCAN API
   ============================================================ */

app.post("/api/security/scan", optionalAuth, (req, res) => {

    try {

        const input =
            String(
                req.body?.code ||
                req.body?.text ||
                ""
            );

        if (!input) {

            return res.status(400).json({
                success: false,
                error:
                    "Taranacak içerik gerekli."
            });
        }

        const result =
            turkaiSecurityScan(input);

        if (typeof logSecurity === "function") {

            logSecurity(
                "Security scan",
                {
                    risk: result.risk,
                    findings:
                        result.findings.length
                }
            );
        }

        res.json({

            success: true,

            result

        });

    } catch (error) {

        res.status(500).json({
            success: false,
            error:
                error.message ||
                "Güvenlik taraması başarısız."
        });
    }
});

/* ============================================================
   24. URL SECURITY CHECK
   ============================================================ */

app.post("/api/security/url", optionalAuth, async (req, res) => {

    try {

        const url =
            turkaiResearchSafeURL(
                req.body?.url ||
                ""
            );

        if (!url) {

            return res.status(400).json({
                success: false,
                error:
                    "Geçerli HTTP/HTTPS URL gerekli."
            });
        }

        const parsed =
            new URL(url);

        const warnings = [];

        if (
            parsed.protocol !== "https:"
        ) {

            warnings.push(
                "Site HTTPS kullanmıyor."
            );
        }

        if (
            parsed.username ||
            parsed.password
        ) {

            warnings.push(
                "URL içinde kullanıcı adı veya parola alanı bulunuyor."
            );
        }

        res.json({

            success: true,

            url,

            hostname:
                parsed.hostname,

            protocol:
                parsed.protocol,

            secure:
                parsed.protocol === "https:",

            warnings

        });

    } catch (error) {

        res.status(500).json({
            success: false,
            error:
                error.message ||
                "URL kontrol edilemedi."
        });
    }
});

/* ============================================================
   25. AI TOOL ROUTER
   ============================================================ */

async function turkaiRunTool(tool, payload = {}) {

    const normalized =
        cleanText(tool || "")
            .toLowerCase();

    switch (normalized) {

        case "research":

            return await turkaiResearch(
                payload.query || ""
            );

        case "weather":

            return await turkaiGetWeather(
                payload.city || ""
            );

        case "currency":

            return await turkaiGetCurrency(
                payload.base || "TRY"
            );

        case "security":

            return turkaiSecurityScan(
                payload.code ||
                payload.text ||
                ""
            );

        case "code":

            return turkaiCodeAnalysis(
                payload.code || "",
                payload.language || "text"
            );

        default:

            throw new Error(
                `Bilinmeyen TürkAI aracı: ${normalized}`
            );
    }
}

/* ============================================================
   26. TOOL ROUTE
   ============================================================ */

app.post("/api/tools/run", optionalAuth, async (req, res) => {

    try {

        const tool =
            cleanText(
                req.body?.tool ||
                ""
            );

        if (!tool) {

            return res.status(400).json({
                success: false,
                error:
                    "tool alanı gerekli."
            });
        }

        const result =
            await turkaiRunTool(
                tool,
                req.body?.payload || {}
            );

        res.json({

            success: true,

            tool,

            result,

            timestamp:
                nowISO()

        });

    } catch (error) {

        res.status(400).json({

            success: false,

            error:
                error.message ||
                "Araç çalıştırılamadı."

        });
    }
});

/* ============================================================
   27. AI AUTO-TOOL DETECTION
   ============================================================ */

function turkaiDetectTool(text) {

    const value =
        cleanText(text || "")
            .toLowerCase();

    if (!value) {
        return null;
    }

    if (
        value.includes("hava durumu") ||
        value.includes("hava nasıl") ||
        value.includes("sıcaklık kaç")
    ) {

        return "weather";
    }

    if (
        value.includes("dolar kaç") ||
        value.includes("euro kaç") ||
        value.includes("döviz") ||
        value.includes("kur ne")
    ) {

        return "currency";
    }

    if (
        value.includes("araştır") ||
        value.includes("internetten bak") ||
        value.includes("güncel bilgi") ||
        value.includes("şu an")
    ) {

        return "research";
    }

    if (
        value.includes("güvenlik tara") ||
        value.includes("kod güvenli mi") ||
        value.includes("siber güvenlik")
    ) {

        return "security";
    }

    return null;
}

/* ============================================================
   28. AUTO RESEARCH ROUTE
   ============================================================ */

app.post("/api/ai/auto-tool", optionalAuth, async (req, res) => {

    try {

        const text =
            String(
                req.body?.text ||
                req.body?.message ||
                ""
            );

        const tool =
            turkaiDetectTool(text);

        if (!tool) {

            return res.json({

                success: true,

                detected: false,

                tool: null,

                message:
                    "Özel bir araç gerektiren istek algılanmadı."

            });
        }

        let payload = {};

        if (tool === "research") {

            payload = {
                query: text
            };

        } else if (tool === "weather") {

            payload = {
                city:
                    req.body?.city ||
                    "Konya"
            };

        } else if (tool === "currency") {

            payload = {
                base:
                    req.body?.base ||
                    "TRY"
            };

        } else if (tool === "security") {

            payload = {
                code:
                    req.body?.code ||
                    text
            };
        }

        const result =
            await turkaiRunTool(
                tool,
                payload
            );

        res.json({

            success: true,

            detected: true,

            tool,

            result

        });

    } catch (error) {

        res.status(500).json({

            success: false,

            error:
                error.message ||
                "Otomatik araç çalıştırılamadı."

        });
    }
});

/* ============================================================
   29. AI CAPABILITIES
   ============================================================ */

app.get("/api/ai/capabilities", optionalAuth, (req, res) => {

    res.json({

        success: true,

        capabilities: {

            chat: true,

            memory: true,

            research: true,

            weather: true,

            currency: true,

            fileUpload: true,

            coding: true,

            securityScan: true,

            imageGeneration:
                true,

            videoGeneration:
                true,

            voiceChat:
                false,

            ultraVideoCall:
                true

        },

        tools: [

            "research",

            "weather",

            "currency",

            "security",

            "code"

        ],

        timestamp:
            nowISO()

    });
});

/* ============================================================
   30. SYSTEM TOOL HEALTH
   ============================================================ */

app.get("/api/tools/health", optionalAuth, async (req, res) => {

    const result = {

        research: true,

        weather: true,

        currency: true,

        files:
            fs.existsSync(UPLOADS_DIR),

        projects:
            fs.existsSync(
                path.dirname(
                    DB_FILES.projects
                )
            ),

        security: true,

        timestamp:
            nowISO()

    };

    res.json({

        success: true,

        tools: result

    });
});

/* ============================================================
   31. RESEARCH HISTORY
   ============================================================ */

function turkaiSaveResearch(record) {

    try {

        const data =
            readJSON(
                DB_FILES.research,
                []
            );

        data.push({

            id:
                record.id ||
                createId("research"),

            query:
                cleanText(
                    record.query || ""
                ),

            answer:
                cleanText(
                    record.answer || ""
                ).slice(0, 12000),

            createdAt:
                nowISO()

        });

        if (data.length > 500) {

            data.splice(
                0,
                data.length - 500
            );
        }

        writeJSON(
            DB_FILES.research,
            data
        );

        return true;

    } catch (error) {

        if (typeof logWarn === "function") {

            logWarn(
                "Research history save failed",
                error.message
            );
        }

        return false;
    }
}

app.get("/api/research/history", optionalAuth, (req, res) => {

    try {

        const data =
            readJSON(
                DB_FILES.research,
                []
            );

        res.json({

            success: true,

            history:
                data
                    .slice(-100)
                    .reverse()

        });

    } catch {

        res.status(500).json({

            success: false,

            error:
                "Araştırma geçmişi alınamadı."

        });
    }
});

/* ============================================================
   32. RESEARCH + SAVE
   ============================================================ */

app.post("/api/research/save", optionalAuth, async (req, res) => {

    try {

        const query =
            cleanText(
                req.body?.query ||
                ""
            );

        if (!query) {

            return res.status(400).json({
                success: false,
                error:
                    "query gerekli."
            });
        }

        const result =
            await turkaiResearch(query);

        turkaiSaveResearch(result);

        res.json({

            success: true,

            research: result

        });

    } catch (error) {

        res.status(500).json({

            success: false,

            error:
                error.message ||
                "Araştırma kaydedilemedi."

        });
    }
});

/* ============================================================
   33. UNIVERSAL AI CONTEXT BUILDER
   ============================================================ */

async function turkaiBuildToolContext(text) {

    const tool =
        turkaiDetectTool(text);

    if (!tool) {

        return {

            detected: false,

            tool: null,

            data: null

        };
    }

    try {

        let payload = {};

        if (tool === "research") {

            payload.query = text;

        } else if (tool === "weather") {

            payload.city = "Konya";

        } else if (tool === "currency") {

            payload.base = "TRY";

        } else if (tool === "security") {

            payload.code = text;
        }

        const data =
            await turkaiRunTool(
                tool,
                payload
            );

        return {

            detected: true,

            tool,

            data

        };

    } catch (error) {

        return {

            detected: true,

            tool,

            data: null,

            error:
                error.message

        };
    }
}

/* ============================================================
   34. INTERNAL EXPORT OBJECT
   ============================================================ */

const TURKAI_PART3 = {

    research:
        turkaiResearch,

    searchWeb:
        turkaiSearchWeb,

    weather:
        turkaiGetWeather,

    currency:
        turkaiGetCurrency,

    securityScan:
        turkaiSecurityScan,

    codeAnalysis:
        turkaiCodeAnalysis,

    runTool:
        turkaiRunTool,

    detectTool:
        turkaiDetectTool,

    buildToolContext:
        turkaiBuildToolContext

};

global.TURKAI_PART3 =
    TURKAI_PART3;

/* ============================================================
   PART 3 END
   ============================================================ */

/*
   PART 4:
   PLAN • USAGE • PRO • PLUS • ULTRA • PAYMENT • ADMIN
   SETTINGS • NOTIFICATIONS • AUDIT • RATE LIMIT
*/
/* ============================================================
   TÜRKAI 15.0 — SERVER.JS
   PART 4 / 5
   PLANS • USAGE • PRO • PLUS • ULTRA
   PAYMENTS • ADMIN • SETTINGS • SECURITY
   ============================================================ */

"use strict";

/* ============================================================
   1. PART 4 GUARD
   ============================================================ */

if (typeof app === "undefined") {
    throw new Error(
        "TürkAI Part 4 başlatılamadı: Part 1 önce yüklenmelidir."
    );
}

if (typeof readJSON !== "function") {
    throw new Error(
        "TürkAI database sistemi bulunamadı."
    );
}

if (typeof writeJSON !== "function") {
    throw new Error(
        "TürkAI database yazma sistemi bulunamadı."
    );
}

/* ============================================================
   2. PLAN ENGINE
   ============================================================ */

const TURKAI_PLANS = {

    free: {

        id: "free",

        name: "Free",

        priceMonthly: 0,

        currency: "TRY",

        messagesPerDay: 50,

        researchPerDay: 10,

        imagePerDay: 0,

        videoPerDay: 0,

        maxFileSize:
            10 * 1024 * 1024,

        memory: true,

        research: true,

        weather: true,

        coding: true,

        security: true,

        image: false,

        video: false,

        priority: false

    },

    pro: {

        id: "pro",

        name: "Pro",

        priceMonthly: 250,

        currency: "TRY",

        messagesPerDay: 100,

        researchPerDay: 30,

        imagePerDay: 2,

        videoPerDay: 0,

        maxFileSize:
            25 * 1024 * 1024,

        memory: true,

        research: true,

        weather: true,

        coding: true,

        security: true,

        image: true,

        video: false,

        priority: true

    },

    plus: {

        id: "plus",

        name: "Plus",

        priceMonthly: 500,

        currency: "TRY",

        messagesPerDay: 200,

        researchPerDay: 75,

        imagePerDay: 4,

        videoPerDay: 3,

        maxFileSize:
            50 * 1024 * 1024,

        memory: true,

        research: true,

        weather: true,

        coding: true,

        security: true,

        image: true,

        video: true,

        priority: true

    },

    ultra: {

        id: "ultra",

        name: "Ultra",

        priceMonthly: 1000,

        currency: "TRY",

        messagesPerDay: 500,

        researchPerDay: 200,

        imagePerDay: 10,

        videoPerDay: 10,

        maxFileSize:
            100 * 1024 * 1024,

        memory: true,

        research: true,

        weather: true,

        coding: true,

        security: true,

        image: true,

        video: true,

        priority: true,

        videoCall: true

    },

    developer: {

        id: "developer",

        name: "Developer",

        priceMonthly: 0,

        currency: "TRY",

        messagesPerDay: 400,

        researchPerDay: 500,

        imagePerDay: 20,

        videoPerDay: 20,

        maxFileSize:
            100 * 1024 * 1024,

        memory: true,

        research: true,

        weather: true,

        coding: true,

        security: true,

        image: true,

        video: true,

        priority: true,

        videoCall: true,

        developer: true

    }

};

/* ============================================================
   3. PLAN HELPERS
   ============================================================ */

function turkaiNormalizePlan(plan) {

    const value =
        cleanText(plan || "")
            .toLowerCase();

    if (
        Object.prototype.hasOwnProperty.call(
            TURKAI_PLANS,
            value
        )
    ) {

        return value;
    }

    return "free";
}

function turkaiGetPlan(plan) {

    return TURKAI_PLANS[
        turkaiNormalizePlan(plan)
    ];
}

function turkaiGetUserPlan(user) {

    if (!user) {
        return TURKAI_PLANS.free;
    }

    return turkaiGetPlan(
        user.plan || "free"
    );
}

function turkaiHasPlan(user, required) {

    const hierarchy = [
        "free",
        "pro",
        "plus",
        "ultra",
        "developer"
    ];

    const current =
        hierarchy.indexOf(
            turkaiNormalizePlan(
                user?.plan
            )
        );

    const target =
        hierarchy.indexOf(
            turkaiNormalizePlan(
                required
            )
        );

    return current >= target;
}

/* ============================================================
   4. PLAN API
   ============================================================ */

app.get("/api/plans", (req, res) => {

    res.json({

        success: true,

        plans:
            Object.values(
                TURKAI_PLANS
            )

    });
});

app.get("/api/plans/:id", (req, res) => {

    const id =
        turkaiNormalizePlan(
            req.params.id
        );

    res.json({

        success: true,

        plan:
            TURKAI_PLANS[id]

    });
});

/* ============================================================
   5. USAGE ENGINE
   ============================================================ */

function turkaiUsageDate() {

    const date =
        new Date();

    return date
        .toISOString()
        .slice(0, 10);
}

function turkaiEmptyUsage(userId) {

    return {

        userId,

        date:
            turkaiUsageDate(),

        messages: 0,

        research: 0,

        image: 0,

        video: 0,

        coding: 0,

        security: 0,

        weather: 0,

        currency: 0,

        lastUpdated:
            nowISO()

    };
}

function turkaiGetUsage(userId) {

    const data =
        readJSON(
            DB_FILES.usage,
            []
        );

    const today =
        turkaiUsageDate();

    let usage =
        data.find(item =>
            item.userId === userId &&
            item.date === today
        );

    if (!usage) {

        usage =
            turkaiEmptyUsage(
                userId
            );

        data.push(usage);

        writeJSON(
            DB_FILES.usage,
            data
        );
    }

    return usage;
}

function turkaiSaveUsage(usage) {

    const data =
        readJSON(
            DB_FILES.usage,
            []
        );

    const index =
        data.findIndex(item =>
            item.userId ===
                usage.userId &&
            item.date ===
                usage.date
        );

    usage.lastUpdated =
        nowISO();

    if (index >= 0) {

        data[index] =
            usage;

    } else {

        data.push(usage);
    }

    if (data.length > 5000) {

        data.splice(
            0,
            data.length - 5000
        );
    }

    writeJSON(
        DB_FILES.usage,
        data
    );

    return usage;
}

/* ============================================================
   6. USAGE LIMIT CHECK
   ============================================================ */

function turkaiFeatureLimit(
    plan,
    feature
) {

    const limits = {

        messages:
            plan.messagesPerDay,

        research:
            plan.researchPerDay,

        image:
            plan.imagePerDay,

        video:
            plan.videoPerDay,

        coding:
            plan.messagesPerDay,

        security:
            plan.messagesPerDay,

        weather:
            plan.messagesPerDay,

        currency:
            plan.messagesPerDay

    };

    return (
        limits[feature] ??
        Number.MAX_SAFE_INTEGER
    );
}

function turkaiCheckUsage(
    user,
    feature,
    amount = 1
) {

    const safeUser =
        user ||
        getGuestUser();

    const plan =
        turkaiGetUserPlan(
            safeUser
        );

    const usage =
        turkaiGetUsage(
            safeUser.id
        );

    const current =
        Number(
            usage[feature] || 0
        );

    const limit =
        turkaiFeatureLimit(
            plan,
            feature
        );

    return {

        allowed:
            current + amount <= limit,

        current,

        limit,

        remaining:
            Math.max(
                0,
                limit - current
            ),

        feature,

        plan:
            plan.id

    };
}

function turkaiConsumeUsage(
    user,
    feature,
    amount = 1
) {

    const safeUser =
        user ||
        getGuestUser();

    const check =
        turkaiCheckUsage(
            safeUser,
            feature,
            amount
        );

    if (!check.allowed) {

        return {

            success: false,

            ...check

        };
    }

    const usage =
        turkaiGetUsage(
            safeUser.id
        );

    usage[feature] =
        Number(
            usage[feature] || 0
        ) + amount;

    turkaiSaveUsage(
        usage
    );

    return {

        success: true,

        ...turkaiCheckUsage(
            safeUser,
            feature,
            0
        )

    };
}

/* ============================================================
   7. USAGE API
   ============================================================ */

app.get(
    "/api/usage",
    optionalAuth,
    (req, res) => {

        try {

            const user =
                req.user ||
                getGuestUser();

            const plan =
                turkaiGetUserPlan(
                    user
                );

            const usage =
                turkaiGetUsage(
                    user.id
                );

            res.json({

                success: true,

                plan,

                usage,

                limits: {

                    messages:
                        plan.messagesPerDay,

                    research:
                        plan.researchPerDay,

                    image:
                        plan.imagePerDay,

                    video:
                        plan.videoPerDay

                }

            });

        } catch (error) {

            res.status(500).json({

                success: false,

                error:
                    "Kullanım bilgileri alınamadı."

            });
        }
    }
);

/* ============================================================
   8. ACCOUNT PLAN
   ============================================================ */

app.get(
    "/api/account/plan",
    optionalAuth,
    (req, res) => {

        const user =
            req.user ||
            getGuestUser();

        const plan =
            turkaiGetUserPlan(
                user
            );

        res.json({

            success: true,

            user: {

                id:
                    user.id,

                email:
                    user.email ||
                    null,

                plan:
                    plan.id

            },

            plan

        });
    }
);

/* ============================================================
   9. PRO CODE
   ============================================================ */

const TURKAI_PRO_CODE =
    process.env.TURKAI_PRO_CODE ||
    "";

function turkaiValidatePlanCode(
    code
) {

    const input =
        cleanText(code || "");

    if (!input) {
        return false;
    }

    if (!TURKAI_PRO_CODE) {
        return false;
    }

    return (
        input ===
        TURKAI_PRO_CODE
    );
}

/* ============================================================
   10. PLAN ACTIVATION
   ============================================================ */

app.post(
    "/api/pro/activate",
    optionalAuth,
    (req, res) => {

        try {

            const code =
                cleanText(
                    req.body?.code ||
                    ""
                );

            const user =
                req.user ||
                getGuestUser();

            if (
                !turkaiValidatePlanCode(
                    code
                )
            ) {

                return res.status(403).json({

                    success: false,

                    error:
                        "Geçersiz aktivasyon kodu."

                });
            }

            if (
                user.id ===
                "guest"
            ) {

                return res.status(401).json({

                    success: false,

                    error:
                        "Plan aktivasyonu için hesap gerekli."

                });
            }

            const users =
                readJSON(
                    DB_FILES.users,
                    []
                );

            const index =
                users.findIndex(
                    item =>
                        item.id ===
                        user.id
                );

            if (index < 0) {

                return res.status(404).json({

                    success: false,

                    error:
                        "Kullanıcı bulunamadı."

                });
            }

            users[index].plan =
                "pro";

            users[index].planActivatedAt =
                nowISO();

            writeJSON(
                DB_FILES.users,
                users
            );

            res.json({

                success: true,

                plan:
                    TURKAI_PLANS.pro,

                message:
                    "Pro plan başarıyla etkinleştirildi."

            });

        } catch (error) {

            res.status(500).json({

                success: false,

                error:
                    "Pro aktivasyonu başarısız."

            });
        }
    }
);

/* ============================================================
   11. TEST PAYMENT
   ============================================================ */

app.post(
    "/api/test-payment",
    optionalAuth,
    (req, res) => {

        const user =
            req.user ||
            getGuestUser();

        const plan =
            turkaiNormalizePlan(
                req.body?.plan
            );

        if (
            plan === "free"
        ) {

            return res.status(400).json({

                success: false,

                error:
                    "Free plan için ödeme gerekmez."

            });
        }

        const payment = {

            id:
                createId("payment"),

            userId:
                user.id,

            plan,

            amount:
                TURKAI_PLANS[plan]
                    .priceMonthly,

            currency:
                "TRY",

            status:
                "test",

            provider:
                "test",

            createdAt:
                nowISO()

        };

        const payments =
            readJSON(
                DB_FILES.payments,
                []
            );

        payments.push(
            payment
        );

        writeJSON(
            DB_FILES.payments,
            payments
        );

        res.json({

            success: true,

            payment,

            message:
                "Test ödeme kaydı oluşturuldu."

        });
    }
);

/* ============================================================
   12. PAYMENT HISTORY
   ============================================================ */

app.get(
    "/api/payments",
    optionalAuth,
    (req, res) => {

        const user =
            req.user ||
            getGuestUser();

        const payments =
            readJSON(
                DB_FILES.payments,
                []
            );

        res.json({

            success: true,

            payments:
                payments
                    .filter(item =>
                        item.userId ===
                        user.id
                    )
                    .slice(-100)
                    .reverse()

        });
    }
);

/* ============================================================
   13. ADMIN ENGINE
   ============================================================ */

function turkaiIsAdmin(req) {

    const user =
        req.user;

    if (!user) {
        return false;
    }

    if (
        user.role ===
        "admin"
    ) {

        return true;
    }

    if (
        user.role ===
        "developer"
    ) {

        return true;
    }

    const adminEmail =
        process.env.TURKAI_ADMIN_EMAIL;

    if (
        adminEmail &&
        user.email &&
        user.email.toLowerCase() ===
            adminEmail.toLowerCase()
    ) {

        return true;
    }

    return false;
}

function turkaiRequireAdmin(
    req,
    res,
    next
) {

    if (!turkaiIsAdmin(req)) {

        return res.status(403).json({

            success: false,

            error:
                "Bu alan yalnızca yönetici içindir."

        });
    }

    next();
}

/* ============================================================
   14. ADMIN SUMMARY
   ============================================================ */

app.get(
    "/api/admin/summary",
    optionalAuth,
    turkaiRequireAdmin,
    (req, res) => {

        const users =
            readJSON(
                DB_FILES.users,
                []
            );

        const chats =
            readJSON(
                DB_FILES.chats,
                []
            );

        const messages =
            readJSON(
                DB_FILES.messages,
                []
            );

        const payments =
            readJSON(
                DB_FILES.payments,
                []
            );

        const statistics =
            readJSON(
                DB_FILES.statistics,
                {}
            );

        res.json({

            success: true,

            summary: {

                users:
                    users.length,

                chats:
                    chats.length,

                messages:
                    messages.length,

                payments:
                    payments.length,

                statistics

            }

        });
    }
);

/* ============================================================
   15. ADMIN USERS
   ============================================================ */

app.get(
    "/api/admin/users",
    optionalAuth,
    turkaiRequireAdmin,
    (req, res) => {

        const users =
            readJSON(
                DB_FILES.users,
                []
            );

        res.json({

            success: true,

            users:
                users.map(user => ({

                    id:
                        user.id,

                    email:
                        user.email ||
                        null,

                    name:
                        user.name ||
                        null,

                    plan:
                        user.plan ||
                        "free",

                    role:
                        user.role ||
                        "user",

                    createdAt:
                        user.createdAt ||
                        null,

                    lastLogin:
                        user.lastLogin ||
                        null

                }))

        });
    }
);

/* ============================================================
   16. ADMIN PLAN UPDATE
   ============================================================ */

app.patch(
    "/api/admin/users/:id/plan",
    optionalAuth,
    turkaiRequireAdmin,
    (req, res) => {

        const userId =
            cleanText(
                req.params.id
            );

        const plan =
            turkaiNormalizePlan(
                req.body?.plan
            );

        const users =
            readJSON(
                DB_FILES.users,
                []
            );

        const index =
            users.findIndex(
                user =>
                    user.id ===
                    userId
            );

        if (index < 0) {

            return res.status(404).json({

                success: false,

                error:
                    "Kullanıcı bulunamadı."

            });
        }

        users[index].plan =
            plan;

        users[index].planUpdatedAt =
            nowISO();

        writeJSON(
            DB_FILES.users,
            users
        );

        res.json({

            success: true,

            user:
                users[index]

        });
    }
);

/* ============================================================
   17. SETTINGS ENGINE
   ============================================================ */

const TURKAI_SETTINGS_DEFAULT = {

    theme:
        "dark",

    accent:
        "#20C7D6",

    language:
        "tr",

    compactMode:
        true,

    animations:
        true,

    autoResearch:
        true,

    memory:
        true,

    notifications:
        true

};

function turkaiGetUserSettings(
    userId
) {

    const settings =
        readJSON(
            DB_FILES.settings,
            []
        );

    const found =
        settings.find(
            item =>
                item.userId ===
                userId
        );

    if (found) {

        return {

            ...TURKAI_SETTINGS_DEFAULT,

            ...found

        };
    }

    return {

        ...TURKAI_SETTINGS_DEFAULT,

        userId

    };
}

function turkaiSaveUserSettings(
    userId,
    updates
) {

    const settings =
        readJSON(
            DB_FILES.settings,
            []
        );

    const index =
        settings.findIndex(
            item =>
                item.userId ===
                userId
        );

    const current =
        turkaiGetUserSettings(
            userId
        );

    const next = {

        ...current,

        ...updates,

        userId,

        updatedAt:
            nowISO()

    };

    if (index >= 0) {

        settings[index] =
            next;

    } else {

        settings.push(
            next
        );
    }

    writeJSON(
        DB_FILES.settings,
        settings
    );

    return next;
}

/* ============================================================
   18. SETTINGS GET
   ============================================================ */

app.get(
    "/api/settings",
    optionalAuth,
    (req, res) => {

        const user =
            req.user ||
            getGuestUser();

        res.json({

            success: true,

            settings:
                turkaiGetUserSettings(
                    user.id
                )

        });
    }
);

/* ============================================================
   19. SETTINGS UPDATE
   ============================================================ */

app.patch(
    "/api/settings",
    optionalAuth,
    (req, res) => {

        const user =
            req.user ||
            getGuestUser();

        const incoming =
            req.body || {};

        const allowed = {

            theme:
                cleanText(
                    incoming.theme ||
                    "dark"
                ),

            accent:
                cleanText(
                    incoming.accent ||
                    "#20C7D6"
                ),

            language:
                cleanText(
                    incoming.language ||
                    "tr"
                ),

            compactMode:
                Boolean(
                    incoming.compactMode
                ),

            animations:
                Boolean(
                    incoming.animations
                ),

            autoResearch:
                Boolean(
                    incoming.autoResearch
                ),

            memory:
                Boolean(
                    incoming.memory
                ),

            notifications:
                Boolean(
                    incoming.notifications
                )

        };

        const settings =
            turkaiSaveUserSettings(
                user.id,
                allowed
            );

        res.json({

            success: true,

            settings

        });
    }
);

/* ============================================================
   20. PROFILE UPDATE
   ============================================================ */

app.patch(
    "/api/profile",
    optionalAuth,
    (req, res) => {

        const user =
            req.user;

        if (!user || user.id === "guest") {

            return res.status(401).json({

                success: false,

                error:
                    "Profil güncellemek için giriş yapmalısınız."

            });
        }

        const users =
            readJSON(
                DB_FILES.users,
                []
            );

        const index =
            users.findIndex(
                item =>
                    item.id ===
                    user.id
            );

        if (index < 0) {

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

            users[index].name =
                cleanText(
                    req.body.name
                ).slice(0, 100);
        }

        users[index].updatedAt =
            nowISO();

        writeJSON(
            DB_FILES.users,
            users
        );

        res.json({

            success: true,

            user:
                users[index]

        });
    }
);

/* ============================================================
   21. NOTIFICATION ENGINE
   ============================================================ */

function turkaiCreateNotification(
    userId,
    title,
    message,
    type = "info"
) {

    const notifications =
        readJSON(
            DB_FILES.notifications,
            []
        );

    const notification = {

        id:
            createId("notification"),

        userId,

        title:
            cleanText(
                title
            ).slice(0, 200),

        message:
            cleanText(
                message
            ).slice(0, 1000),

        type:

            cleanText(
                type
            ).slice(0, 50),

        read:
            false,

        createdAt:
            nowISO()

    };

    notifications.push(
        notification
    );

    if (
        notifications.length >
        5000
    ) {

        notifications.splice(
            0,
            notifications.length - 5000
        );
    }

    writeJSON(
        DB_FILES.notifications,
        notifications
    );

    return notification;
}

/* ============================================================
   22. NOTIFICATIONS API
   ============================================================ */

app.get(
    "/api/notifications",
    optionalAuth,
    (req, res) => {

        const user =
            req.user ||
            getGuestUser();

        const notifications =
            readJSON(
                DB_FILES.notifications,
                []
            );

        const own =
            notifications
                .filter(item =>
                    item.userId ===
                    user.id
                )
                .slice(-100)
                .reverse();

        res.json({

            success: true,

            notifications: own,

            unread:
                own.filter(
                    item =>
                        !item.read
                ).length

        });
    }
);

/* ============================================================
   23. MARK NOTIFICATION READ
   ============================================================ */

app.patch(
    "/api/notifications/:id/read",
    optionalAuth,
    (req, res) => {

        const user =
            req.user ||
            getGuestUser();

        const id =
            cleanText(
                req.params.id
            );

        const notifications =
            readJSON(
                DB_FILES.notifications,
                []
            );

        const index =
            notifications.findIndex(
                item =>
                    item.id === id &&
                    item.userId ===
                        user.id
            );

        if (index < 0) {

            return res.status(404).json({

                success: false,

                error:
                    "Bildirim bulunamadı."

            });
        }

        notifications[index].read =
            true;

        notifications[index].readAt =
            nowISO();

        writeJSON(
            DB_FILES.notifications,
            notifications
        );

        res.json({

            success: true,

            notification:
                notifications[index]

        });
    }
);

/* ============================================================
   24. AUDIT ENGINE
   ============================================================ */

function turkaiAudit(
    action,
    req,
    details = {}
) {

    const audit =
        readJSON(
            DB_FILES.audit,
            []
        );

    audit.push({

        id:
            createId("audit"),

        action:
            cleanText(
                action
            ).slice(0, 200),

        userId:
            req?.user?.id ||
            "guest",

        ip:
            req?.ip ||
            null,

        userAgent:
            req?.headers?.["user-agent"] ||
            null,

        details,

        createdAt:
            nowISO()

    });

    if (
        audit.length >
        10000
    ) {

        audit.splice(
            0,
            audit.length - 10000
        );
    }

    writeJSON(
        DB_FILES.audit,
        audit
    );
}

/* ============================================================
   25. ADMIN AUDIT
   ============================================================ */

app.get(
    "/api/admin/audit",
    optionalAuth,
    turkaiRequireAdmin,
    (req, res) => {

        const audit =
            readJSON(
                DB_FILES.audit,
                []
            );

        res.json({

            success: true,

            audit:
                audit
                    .slice(-500)
                    .reverse()

        });
    }
);

/* ============================================================
   26. RATE LIMIT ENGINE
   ============================================================ */

const TURKAI_RATE_LIMIT = {

    windowMs:
        60 * 1000,

    max:
        120,

    buckets:
        new Map()

};

function turkaiRateLimitKey(
    req
) {

    return (
        req.ip ||
        req.headers["x-forwarded-for"] ||
        "unknown"
    );
}

function turkaiCheckRateLimit(
    req
) {

    const key =
        turkaiRateLimitKey(
            req
        );

    const now =
        Date.now();

    let bucket =
        TURKAI_RATE_LIMIT
            .buckets
            .get(key);

    if (
        !bucket ||
        now - bucket.start >
            TURKAI_RATE_LIMIT.windowMs
    ) {

        bucket = {

            start: now,

            count: 0

        };

        TURKAI_RATE_LIMIT
            .buckets
            .set(
                key,
                bucket
            );
    }

    bucket.count++;

    return {

        allowed:
            bucket.count <=
            TURKAI_RATE_LIMIT.max,

        remaining:
            Math.max(
                0,
                TURKAI_RATE_LIMIT.max -
                bucket.count
            ),

        reset:
            bucket.start +
            TURKAI_RATE_LIMIT.windowMs

    };
}

/* ============================================================
   27. RATE LIMIT MIDDLEWARE
   ============================================================ */

app.use(
    "/api/",
    (req, res, next) => {

        if (
            req.path ===
            "/health"
        ) {

            return next();
        }

        const result =
            turkaiCheckRateLimit(
                req
            );

        res.setHeader(
            "X-TürkAI-RateLimit-Remaining",
            String(
                result.remaining
            )
        );

        if (!result.allowed) {

            return res.status(429).json({

                success: false,

                error:
                    "Çok fazla istek gönderildi. Lütfen kısa süre bekleyin.",

                retryAfter:
                    Math.ceil(
                        (
                            result.reset -
                            Date.now()
                        ) / 1000
                    )

            });
        }

        next();
    }
);

/* ============================================================
   28. SECURITY STATUS
   ============================================================ */

app.get(
    "/api/security/status",
    optionalAuth,
    (req, res) => {

        res.json({

            success: true,

            security: {

                helmet:
                    true,

                cors:
                    true,

                rateLimit:
                    true,

                requestId:
                    true,

                audit:
                    true,

                inputLimit:
                    true,

                dangerousCommandScan:
                    true

            },

            timestamp:
                nowISO()

        });
    }
);

/* ============================================================
   29. ADMIN STATISTICS
   ============================================================ */

app.get(
    "/api/admin/statistics",
    optionalAuth,
    turkaiRequireAdmin,
    (req, res) => {

        const statistics =
            readJSON(
                DB_FILES.statistics,
                {}
            );

        res.json({

            success: true,

            statistics

        });
    }
);

/* ============================================================
   30. ADMIN HEALTH
   ============================================================ */

app.get(
    "/api/admin/health",
    optionalAuth,
    turkaiRequireAdmin,
    (req, res) => {

        const memory =
            process.memoryUsage();

        res.json({

            success: true,

            server: {

                uptime:
                    process.uptime(),

                pid:
                    process.pid,

                node:
                    process.version,

                platform:
                    process.platform,

                memory: {

                    rss:
                        memory.rss,

                    heapUsed:
                        memory.heapUsed,

                    heapTotal:
                        memory.heapTotal,

                    external:
                        memory.external

                }

            },

            timestamp:
                nowISO()

        });
    }
);

/* ============================================================
   31. SYSTEM CONFIG
   ============================================================ */

app.get(
    "/api/system/config",
    optionalAuth,
    (req, res) => {

        const user =
            req.user ||
            getGuestUser();

        const plan =
            turkaiGetUserPlan(
                user
            );

        res.json({

            success: true,

            app: {

                name:
                    "TürkAI",

                version:
                    "15.0.0",

                environment:
                    process.env.NODE_ENV ||
                    "development"

            },

            user: {

                id:
                    user.id,

                plan:
                    plan.id,

                role:
                    user.role ||
                    "user"

            },

            features: {

                memory:
                    plan.memory,

                research:
                    plan.research,

                weather:
                    plan.weather,

                coding:
                    plan.coding,

                security:
                    plan.security,

                image:
                    plan.image,

                video:
                    plan.video,

                videoCall:
                    Boolean(
                        plan.videoCall
                    )

            }

        });
    }
);

/* ============================================================
   32. CHAT LIMIT HELPER
   ============================================================ */

function turkaiEnforceMessageLimit(
    user
) {

    const result =
        turkaiCheckUsage(
            user,
            "messages",
            1
        );

    if (!result.allowed) {

        return {

            allowed: false,

            response: {

                success: false,

                code:
                    "DAILY_LIMIT",

                error:
                    "Günlük mesaj limitine ulaştın.",

                plan:
                    result.plan,

                limit:
                    result.limit,

                remaining:
                    result.remaining

            }

        };
    }

    return {

        allowed: true,

        response:
            null

    };
}

/* ============================================================
   33. LIMITED CHAT ROUTE
   ============================================================ */

app.post(
    "/api/chat/limited",
    optionalAuth,
    async (req, res) => {

        try {

            const user =
                req.user ||
                getGuestUser();

            const limit =
                turkaiEnforceMessageLimit(
                    user
                );

            if (!limit.allowed) {

                return res
                    .status(429)
                    .json(
                        limit.response
                    );
            }

            const consumed =
                turkaiConsumeUsage(
                    user,
                    "messages",
                    1
                );

            if (!consumed.success) {

                return res.status(429).json({

                    success: false,

                    code:
                        "DAILY_LIMIT",

                    error:
                        "Mesaj limitine ulaşıldı."

                });
            }

            if (
                typeof turkaiGenerateAI !==
                "function"
            ) {

                return res.status(503).json({

                    success: false,

                    error:
                        "AI motoru henüz hazır değil."

                });
            }

            const message =
                String(
                    req.body?.message ||
                    ""
                ).slice(0, 10000);

            const result =
                await turkaiGenerateAI(
                    message,
                    {
                        user,
                        messages:
                            req.body?.messages ||
                            []
                    }
                );

            res.json({

                success: true,

                result,

                usage:
                    turkaiGetUsage(
                        user.id
                    )

            });

        } catch (error) {

            res.status(500).json({

                success: false,

                error:
                    error.message ||
                    "AI isteği başarısız."

            });
        }
    }
);

/* ============================================================
   34. PLAN FEATURE CHECK
   ============================================================ */

app.post(
    "/api/account/check-feature",
    optionalAuth,
    (req, res) => {

        const user =
            req.user ||
            getGuestUser();

        const feature =
            cleanText(
                req.body?.feature ||
                ""
            );

        const plan =
            turkaiGetUserPlan(
                user
            );

        const allowed =
            Boolean(
                plan[feature]
            );

        res.json({

            success: true,

            feature,

            allowed,

            plan:
                plan.id

        });
    }
);

/* ============================================================
   35. IMAGE FEATURE CHECK
   ============================================================ */

app.post(
    "/api/image/check",
    optionalAuth,
    (req, res) => {

        const user =
            req.user ||
            getGuestUser();

        const result =
            turkaiCheckUsage(
                user,
                "image",
                1
            );

        res.json({

            success: true,

            allowed:
                result.allowed,

            remaining:
                result.remaining,

            limit:
                result.limit,

            plan:
                result.plan

        });
    }
);

/* ============================================================
   36. VIDEO FEATURE CHECK
   ============================================================ */

app.post(
    "/api/video/check",
    optionalAuth,
    (req, res) => {

        const user =
            req.user ||
            getGuestUser();

        const plan =
            turkaiGetUserPlan(
                user
            );

        const usage =
            turkaiCheckUsage(
                user,
                "video",
                1
            );

        res.json({

            success: true,

            allowed:
                Boolean(
                    plan.video &&
                    usage.allowed
                ),

            remaining:
                usage.remaining,

            limit:
                usage.limit,

            plan:
                plan.id

        });
    }
);

/* ============================================================
   37. IMAGE USAGE CONSUME
   ============================================================ */

app.post(
    "/api/image/consume",
    optionalAuth,
    (req, res) => {

        const user =
            req.user ||
            getGuestUser();

        const plan =
            turkaiGetUserPlan(
                user
            );

        if (!plan.image) {

            return res.status(403).json({

                success: false,

                code:
                    "PLAN_REQUIRED",

                error:
                    "Görsel oluşturma için Pro veya üzeri plan gerekir."

            });
        }

        const result =
            turkaiConsumeUsage(
                user,
                "image",
                1
            );

        if (!result.success) {

            return res.status(429).json({

                success: false,

                code:
                    "DAILY_LIMIT",

                error:
                    "Günlük görsel limitine ulaşıldı.",

                remaining:
                    result.remaining

            });
        }

        res.json({

            success: true,

            usage:
                turkaiGetUsage(
                    user.id
                )

        });
    }
);

/* ============================================================
   38. VIDEO USAGE CONSUME
   ============================================================ */

app.post(
    "/api/video/consume",
    optionalAuth,
    (req, res) => {

        const user =
            req.user ||
            getGuestUser();

        const plan =
            turkaiGetUserPlan(
                user
            );

        if (!plan.video) {

            return res.status(403).json({

                success: false,

                code:
                    "PLAN_REQUIRED",

                error:
                    "Video oluşturma için Plus veya üzeri plan gerekir."

            });
        }

        const result =
            turkaiConsumeUsage(
                user,
                "video",
                1
            );

        if (!result.success) {

            return res.status(429).json({

                success: false,

                code:
                    "DAILY_LIMIT",

                error:
                    "Günlük video limitine ulaşıldı."

            });
        }

        res.json({

            success: true,

            usage:
                turkaiGetUsage(
                    user.id
                )

        });
    }
);

/* ============================================================
   39. ULTRA VIDEO CALL CHECK
   ============================================================ */

app.get(
    "/api/ultra/video-call/check",
    optionalAuth,
    (req, res) => {

        const user =
            req.user ||
            getGuestUser();

        const plan =
            turkaiGetUserPlan(
                user
            );

        res.json({

            success: true,

            available:
                Boolean(
                    plan.videoCall
                ),

            plan:
                plan.id,

            message:
                plan.videoCall
                    ? "Ultra video-call özelliği kullanılabilir."
                    : "Ultra plan gereklidir."

        });
    }
);

/* ============================================================
   40. USAGE CLEANUP
   ============================================================ */

function turkaiCleanupUsage() {

    try {

        const data =
            readJSON(
                DB_FILES.usage,
                []
            );

        const cutoff =
            Date.now() -
            1000 *
            60 *
            60 *
            24 *
            45;

        const filtered =
            data.filter(item => {

                const time =
                    Date.parse(
                        item.date ||
                        ""
                    );

                if (
                    Number.isNaN(
                        time
                    )
                ) {

                    return true;
                }

                return time >= cutoff;
            });

        writeJSON(
            DB_FILES.usage,
            filtered
        );

    } catch (error) {

        if (
            typeof logWarn ===
            "function"
        ) {

            logWarn(
                "Usage cleanup failed",
                error.message
            );
        }
    }
}

/* ============================================================
   41. PLAN ENGINE EXPORT
   ============================================================ */

const TURKAI_PLAN_ENGINE = {

    plans:
        TURKAI_PLANS,

    normalize:
        turkaiNormalizePlan,

    get:
        turkaiGetPlan,

    getUserPlan:
        turkaiGetUserPlan,

    hasPlan:
        turkaiHasPlan,

    getUsage:
        turkaiGetUsage,

    saveUsage:
        turkaiSaveUsage,

    checkUsage:
        turkaiCheckUsage,

    consumeUsage:
        turkaiConsumeUsage,

    isAdmin:
        turkaiIsAdmin

};

global.TURKAI_PLAN_ENGINE =
    TURKAI_PLAN_ENGINE;

/* ============================================================
   42. PART 4 CLEANUP TIMER
   ============================================================ */

const TURKAI_USAGE_CLEANUP_TIMER =
    setInterval(
        turkaiCleanupUsage,
        1000 *
        60 *
        60 *
        12
    );

if (
    TURKAI_USAGE_CLEANUP_TIMER &&
    typeof TURKAI_USAGE_CLEANUP_TIMER.unref ===
        "function"
) {

    TURKAI_USAGE_CLEANUP_TIMER.unref();
}

/* ============================================================
   PART 4 END
   ============================================================ */

/*
   PART 5:
   FINAL API ROUTES
   IMAGE / VIDEO BRIDGE
   SPA / INDEX.HTML CONNECTION
   SOCKET.IO
   ERROR HANDLER
   404 HANDLER
   START SERVER
   SHUTDOWN
   RENDER DEPLOYMENT
*/
/* ============================================================
   TÜRKAI 15.0 — SERVER.JS
   PART 5 / 5
   FINAL ROUTES • INDEX CONNECTION • SOCKET.IO
   ERROR HANDLING • SPA • START • SHUTDOWN
   ============================================================ */

"use strict";

/* ============================================================
   1. FINAL GUARDS
   ============================================================ */

if (typeof app === "undefined") {
    throw new Error(
        "TürkAI Final Part: Express app bulunamadı."
    );
}

if (typeof httpServer === "undefined") {
    throw new Error(
        "TürkAI Final Part: HTTP server bulunamadı."
    );
}

if (typeof io === "undefined") {
    throw new Error(
        "TürkAI Final Part: Socket.IO bulunamadı."
    );
}

/* ============================================================
   2. RUNTIME CONFIG
   ============================================================ */

const TURKAI_RUNTIME = {

    name:
        "TürkAI",

    version:
        "15.0.0",

    environment:
        process.env.NODE_ENV ||
        "development",

    host:
        process.env.HOST ||
        "0.0.0.0",

    port:
        Number(
            process.env.PORT
        ) || 10000,

    startedAt:
        nowISO(),

    serverId:
        typeof SERVER_ID !==
        "undefined"
            ? SERVER_ID
            : createId("server"),

    shutdown:
        false

};

global.TURKAI_RUNTIME =
    TURKAI_RUNTIME;

/* ============================================================
   3. FRONTEND CONFIG
   ============================================================ */

const TURKAI_FRONTEND_CONFIG = {

    apiBase:
        "/api",

    socketPath:
        "/socket.io",

    appName:
        "TürkAI",

    version:
        "15.0.0",

    features: {

        chat:
            true,

        memory:
            true,

        research:
            true,

        weather:
            true,

        currency:
            true,

        files:
            true,

        coding:
            true,

        security:
            true,

        image:
            true,

        video:
            true,

        videoCall:
            true

    }

};

app.get(
    "/api/frontend/config",
    optionalAuth,
    (req, res) => {

        res.json({

            success:
                true,

            config:
                TURKAI_FRONTEND_CONFIG

        });

    }
);

/* ============================================================
   4. AI STATUS BRIDGE
   ============================================================ */

function turkaiGetProviderStatus() {

    const providers = {

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

    };

    return providers;
}

app.get(
    "/api/ai/status",
    optionalAuth,
    (req, res) => {

        res.json({

            success:
                true,

            ai: {

                local:
                    true,

                providers:
                    turkaiGetProviderStatus(),

                fallback:
                    true,

                research:
                    true,

                memory:
                    true

            },

            timestamp:
                nowISO()

        });

    }
);

/* ============================================================
   5. AI PROVIDER SUMMARY
   ============================================================ */

app.get(
    "/api/ai/providers",
    optionalAuth,
    (req, res) => {

        const status =
            turkaiGetProviderStatus();

        const providers = [

            {

                id:
                    "local",

                name:
                    "TürkAI Local",

                enabled:
                    true,

                type:
                    "local"

            },

            {

                id:
                    "groq",

                name:
                    "Groq",

                enabled:
                    status.groq,

                type:
                    "cloud"

            },

            {

                id:
                    "cerebras",

                name:
                    "Cerebras",

                enabled:
                    status.cerebras,

                type:
                    "cloud"

            },

            {

                id:
                    "openrouter",

                name:
                    "OpenRouter",

                enabled:
                    status.openrouter,

                type:
                    "cloud"

            },

            {

                id:
                    "gemini",

                name:
                    "Gemini",

                enabled:
                    status.gemini,

                type:
                    "cloud"

            }

        ];

        res.json({

            success:
                true,

            providers

        });

    }
);

/* ============================================================
   6. IMAGE ENGINE BRIDGE
   ============================================================ */

const TURKAI_IMAGE_ENGINE = {

    enabled:
        true,

    provider:
        process.env.IMAGE_PROVIDER ||
        "external",

    maxPrompt:
        5000,

    maxNegativePrompt:
        2000

};

function turkaiNormalizeImageRequest(
    body = {}
) {

    return {

        prompt:
            String(
                body.prompt ||
                ""
            )
            .trim()
            .slice(
                0,
                TURKAI_IMAGE_ENGINE.maxPrompt
            ),

        negativePrompt:
            String(
                body.negativePrompt ||
                ""
            )
            .trim()
            .slice(
                0,
                TURKAI_IMAGE_ENGINE.maxNegativePrompt
            ),

        width:
            Math.min(
                2048,
                Math.max(
                    256,
                    Number(
                        body.width
                    ) || 1024
                )
            ),

        height:
            Math.min(
                2048,
                Math.max(
                    256,
                    Number(
                        body.height
                    ) || 1024
                )
            ),

        style:
            cleanText(
                body.style ||
                "premium"
            ).slice(
                0,
                100
            )

    };
}

/* ============================================================
   7. IMAGE REQUEST
   ============================================================ */

app.post(
    "/api/image/generate",
    optionalAuth,
    async (req, res) => {

        try {

            const user =
                req.user ||
                getGuestUser();

            const plan =
                turkaiGetUserPlan(
                    user
                );

            if (!plan.image) {

                return res.status(403).json({

                    success:
                        false,

                    code:
                        "PLAN_REQUIRED",

                    error:
                        "Görsel oluşturma için Pro veya üzeri plan gerekir."

                });

            }

            const usage =
                turkaiCheckUsage(
                    user,
                    "image",
                    1
                );

            if (!usage.allowed) {

                return res.status(429).json({

                    success:
                        false,

                    code:
                        "DAILY_LIMIT",

                    error:
                        "Günlük görsel limitine ulaştın.",

                    remaining:
                        usage.remaining

                });

            }

            const request =
                turkaiNormalizeImageRequest(
                    req.body
                );

            if (!request.prompt) {

                return res.status(400).json({

                    success:
                        false,

                    error:
                        "Görsel açıklaması gerekli."

                });

            }

            /*
             * Burada gerçek görsel sağlayıcısı
             * daha sonra bağlanabilir.
             *
             * Backend sahte bir görsel üretmiş
             * gibi davranmaz.
             */

            const generation = {

                id:
                    createId("image"),

                prompt:
                    request.prompt,

                negativePrompt:
                    request.negativePrompt,

                width:
                    request.width,

                height:
                    request.height,

                style:
                    request.style,

                status:
                    "queued",

                provider:
                    TURKAI_IMAGE_ENGINE.provider,

                createdAt:
                    nowISO()

            };

            turkaiConsumeUsage(
                user,
                "image",
                1
            );

            const generated =
                readJSON(
                    DB_FILES.files,
                    []
                );

            generated.push({

                id:
                    generation.id,

                userId:
                    user.id,

                type:
                    "image-generation",

                prompt:
                    generation.prompt,

                status:
                    generation.status,

                createdAt:
                    generation.createdAt

            });

            writeJSON(
                DB_FILES.files,
                generated
            );

            res.status(202).json({

                success:
                    true,

                generation,

                message:
                    "Görsel isteği kuyruğa alındı."

            });

        } catch (error) {

            if (
                typeof logError ===
                "function"
            ) {

                logError(
                    "Image generation error",
                    error
                );

            }

            res.status(500).json({

                success:
                    false,

                error:
                    "Görsel isteği oluşturulamadı."

            });

        }

    }
);

/* ============================================================
   8. VIDEO ENGINE
   ============================================================ */

const TURKAI_VIDEO_ENGINE = {

    enabled:
        true,

    maxPrompt:
        5000,

    maxDuration:
        60

};

function turkaiNormalizeVideoRequest(
    body = {}
) {

    return {

        prompt:
            String(
                body.prompt ||
                ""
            )
            .trim()
            .slice(
                0,
                TURKAI_VIDEO_ENGINE.maxPrompt
            ),

        duration:
            Math.min(
                TURKAI_VIDEO_ENGINE.maxDuration,
                Math.max(
                    1,
                    Number(
                        body.duration
                    ) || 5
                )
            ),

        aspectRatio:
            cleanText(
                body.aspectRatio ||
                "16:9"
            ),

        style:
            cleanText(
                body.style ||
                "cinematic"
            ).slice(
                0,
                100
            )

    };
}

/* ============================================================
   9. VIDEO REQUEST
   ============================================================ */

app.post(
    "/api/video/generate",
    optionalAuth,
    async (req, res) => {

        try {

            const user =
                req.user ||
                getGuestUser();

            const plan =
                turkaiGetUserPlan(
                    user
                );

            if (!plan.video) {

                return res.status(403).json({

                    success:
                        false,

                    code:
                        "PLAN_REQUIRED",

                    error:
                        "Video oluşturma için Plus veya üzeri plan gerekir."

                });

            }

            const usage =
                turkaiCheckUsage(
                    user,
                    "video",
                    1
                );

            if (!usage.allowed) {

                return res.status(429).json({

                    success:
                        false,

                    code:
                        "DAILY_LIMIT",

                    error:
                        "Günlük video limitine ulaştın."

                });

            }

            const request =
                turkaiNormalizeVideoRequest(
                    req.body
                );

            if (!request.prompt) {

                return res.status(400).json({

                    success:
                        false,

                    error:
                        "Video açıklaması gerekli."

                });

            }

            const generation = {

                id:
                    createId("video"),

                prompt:
                    request.prompt,

                duration:
                    request.duration,

                aspectRatio:
                    request.aspectRatio,

                style:
                    request.style,

                status:
                    "queued",

                provider:
                    process.env.VIDEO_PROVIDER ||
                    "external",

                createdAt:
                    nowISO()

            };

            turkaiConsumeUsage(
                user,
                "video",
                1
            );

            res.status(202).json({

                success:
                    true,

                generation,

                message:
                    "Video isteği kuyruğa alındı."

            });

        } catch (error) {

            res.status(500).json({

                success:
                    false,

                error:
                    "Video isteği oluşturulamadı."

            });

        }

    }
);

/* ============================================================
   10. GENERATION STATUS
   ============================================================ */

const TURKAI_GENERATION_MEMORY =
    new Map();

app.get(
    "/api/generation/:id",
    optionalAuth,
    (req, res) => {

        const id =
            cleanText(
                req.params.id
            );

        const item =
            TURKAI_GENERATION_MEMORY.get(
                id
            );

        if (!item) {

            return res.status(404).json({

                success:
                    false,

                error:
                    "Üretim kaydı bulunamadı."

            });

        }

        res.json({

            success:
                true,

            generation:
                item

        });

    }
);

/* ============================================================
   11. SEARCH ROUTE
   ============================================================ */

app.post(
    "/api/search",
    optionalAuth,
    async (req, res) => {

        try {

            const query =
                cleanText(
                    req.body?.query ||
                    req.body?.q ||
                    ""
                );

            if (!query) {

                return res.status(400).json({

                    success:
                        false,

                    error:
                        "Arama sorgusu gerekli."

                });

            }

            const results =
                await turkaiSearchWeb(
                    query
                );

            res.json({

                success:
                    true,

                query,

                results

            });

        } catch (error) {

            res.status(500).json({

                success:
                    false,

                error:
                    "Arama yapılamadı."

            });

        }

    }
);

/* ============================================================
   12. UNIVERSAL CHAT BRIDGE
   ============================================================ */

app.post(
    "/api/chat",
    optionalAuth,
    async (req, res) => {

        try {

            const user =
                req.user ||
                getGuestUser();

            const message =
                String(
                    req.body?.message ||
                    ""
                )
                .trim()
                .slice(
                    0,
                    20000
                );

            if (!message) {

                return res.status(400).json({

                    success:
                        false,

                    error:
                        "Mesaj boş olamaz."

                });

            }

            const usage =
                turkaiCheckUsage(
                    user,
                    "messages",
                    1
                );

            if (!usage.allowed) {

                return res.status(429).json({

                    success:
                        false,

                    code:
                        "DAILY_LIMIT",

                    error:
                        "Günlük mesaj limitine ulaştın.",

                    remaining:
                        usage.remaining,

                    limit:
                        usage.limit

                });

            }

            turkaiConsumeUsage(
                user,
                "messages",
                1
            );

            let toolContext =
                null;

            if (
                typeof turkaiBuildToolContext ===
                "function"
            ) {

                try {

                    toolContext =
                        await turkaiBuildToolContext(
                            message
                        );

                } catch {

                    toolContext =
                        null;

                }

            }

            if (
                typeof turkaiGenerateAI !==
                "function"
            ) {

                return res.status(503).json({

                    success:
                        false,

                    error:
                        "AI motoru hazır değil."

                });

            }

            const result =
                await turkaiGenerateAI(
                    message,
                    {

                        user,

                        messages:
                            req.body?.messages ||
                            [],

                        toolContext,

                        chatId:
                            req.body?.chatId ||
                            null

                    }
                );

            res.json({

                success:
                    true,

                answer:
                    result?.answer ||
                    result?.text ||
                    String(
                        result || ""
                    ),

                result,

                toolContext,

                usage:
                    turkaiGetUsage(
                        user.id
                    ),

                timestamp:
                    nowISO()

            });

        } catch (error) {

            if (
                typeof logError ===
                "function"
            ) {

                logError(
                    "Chat route error",
                    error
                );

            }

            res.status(500).json({

                success:
                    false,

                error:
                    "Mesaj işlenirken bir hata oluştu."

            });

        }

    }
);

/* ============================================================
   13. QUICK CHAT
   ============================================================ */

app.post(
    "/api/chat/quick",
    optionalAuth,
    async (req, res) => {

        try {

            const message =
                String(
                    req.body?.message ||
                    ""
                )
                .trim()
                .slice(
                    0,
                    10000
                );

            if (!message) {

                return res.status(400).json({

                    success:
                        false,

                    error:
                        "Mesaj gerekli."

                });

            }

            let answer = null;

            if (
                typeof turkaiLocalSpecialAnswer ===
                "function"
            ) {

                answer =
                    turkaiLocalSpecialAnswer(
                        message
                    );

            }

            if (!answer) {

                answer =
                    "TürkAI isteğini aldı. Daha ayrıntılı cevap için normal sohbet modunu kullanabilirsin.";

            }

            res.json({

                success:
                    true,

                answer,

                provider:
                    "local",

                timestamp:
                    nowISO()

            });

        } catch (error) {

            res.status(500).json({

                success:
                    false,

                error:
                    "Quick chat başarısız."

            });

        }

    }
);

/* ============================================================
   14. MEMORY BRIDGE
   ============================================================ */

app.post(
    "/api/memory",
    optionalAuth,
    (req, res) => {

        try {

            const user =
                req.user ||
                getGuestUser();

            const text =
                cleanText(
                    req.body?.text ||
                    req.body?.memory ||
                    ""
                )
                .slice(
                    0,
                    3000
                );

            if (!text) {

                return res.status(400).json({

                    success:
                        false,

                    error:
                        "Kaydedilecek bilgi gerekli."

                });

            }

            if (
                typeof turkaiSaveMemories ===
                "function"
            ) {

                const memory =
                    turkaiSaveMemories(
                        user.id,
                        text
                    );

                return res.json({

                    success:
                        true,

                    memory

                });

            }

            res.status(503).json({

                success:
                    false,

                error:
                    "Memory engine hazır değil."

            });

        } catch (error) {

            res.status(500).json({

                success:
                    false,

                error:
                    "Bellek kaydedilemedi."

            });

        }

    }
);

/* ============================================================
   15. MEMORY SEARCH BRIDGE
   ============================================================ */

app.get(
    "/api/memory/search",
    optionalAuth,
    (req, res) => {

        try {

            const user =
                req.user ||
                getGuestUser();

            const query =
                cleanText(
                    req.query?.q ||
                    ""
                );

            if (
                typeof turkaiSearchMemories ===
                "function"
            ) {

                const memories =
                    turkaiSearchMemories(
                        user.id,
                        query
                    );

                return res.json({

                    success:
                        true,

                    memories

                });

            }

            res.json({

                success:
                    true,

                memories: []

            });

        } catch (error) {

            res.status(500).json({

                success:
                    false,

                error:
                    "Bellek aranamadı."

            });

        }

    }
);

/* ============================================================
   16. INDEX/API CONNECTION INFO
   ============================================================ */

app.get(
    "/api",
    (req, res) => {

        res.json({

            success:
                true,

            name:
                "TürkAI API",

            version:
                TURKAI_RUNTIME.version,

            endpoints: {

                health:
                    "/api/health",

                status:
                    "/api/status",

                chat:
                    "/api/chat",

                quickChat:
                    "/api/chat/quick",

                research:
                    "/api/research",

                weather:
                    "/api/weather",

                currency:
                    "/api/currency",

                upload:
                    "/api/upload/text",

                files:
                    "/api/files",

                memory:
                    "/api/memory",

                plans:
                    "/api/plans",

                usage:
                    "/api/usage",

                settings:
                    "/api/settings",

                image:
                    "/api/image/generate",

                video:
                    "/api/video/generate",

                security:
                    "/api/security/scan",

                code:
                    "/api/code/analyze"

            }

        });

    }
);

/* ============================================================
   17. API DOCS
   ============================================================ */

app.get(
    "/api/docs",
    (req, res) => {

        res.json({

            success:
                true,

            name:
                "TürkAI API",

            version:
                TURKAI_RUNTIME.version,

            method:
                "JSON REST API",

            authentication:
                "Bearer token veya guest",

            examples: {

                chat: {

                    method:
                        "POST",

                    path:
                        "/api/chat",

                    body: {

                        message:
                            "Merhaba TürkAI"

                    }

                },

                weather: {

                    method:
                        "GET",

                    path:
                        "/api/weather?city=Konya"

                },

                research: {

                    method:
                        "POST",

                    path:
                        "/api/research",

                    body: {

                        query:
                            "Türkiye'deki güncel teknoloji gelişmeleri"

                    }

                }

            }

        });

    }
);

/* ============================================================
   18. SOCKET.IO AUTH
   ============================================================ */

io.use(
    async (socket, next) => {

        try {

            const token =
                socket.handshake?.auth?.token ||
                socket.handshake?.headers?.authorization ||
                null;

            if (!token) {

                socket.user =
                    getGuestUser();

                return next();

            }

            const cleanToken =
                String(
                    token
                )
                .replace(
                    /^Bearer\s+/i,
                    ""
                )
                .trim();

            if (
                typeof getSessionByToken ===
                "function"
            ) {

                const session =
                    getSessionByToken(
                        cleanToken
                    );

                if (session) {

                    socket.user =
                        session.user ||
                        getGuestUser();

                } else {

                    socket.user =
                        getGuestUser();

                }

            } else {

                socket.user =
                    getGuestUser();

            }

            next();

        } catch (error) {

            next(
                new Error(
                    "Socket authentication failed."
                )
            );

        }

    }
);

/* ============================================================
   19. SOCKET.IO CONNECTION
   ============================================================ */

io.on(
    "connection",
    socket => {

        const user =
            socket.user ||
            getGuestUser();

        socket.join(
            `user:${user.id}`
        );

        socket.emit(
            "turkai:connected",
            {

                success:
                    true,

                serverId:
                    TURKAI_RUNTIME.serverId,

                userId:
                    user.id,

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
            "chat:typing",
            payload => {

                socket.emit(
                    "chat:typing:ack",
                    {

                        active:
                            Boolean(
                                payload?.active
                            ),

                        timestamp:
                            nowISO()

                    }
                );

            }
        );

        socket.on(
            "disconnect",
            reason => {

                if (
                    typeof logInfo ===
                    "function"
                ) {

                    logInfo(
                        "Socket disconnected",
                        {
                            socketId:
                                socket.id,

                            userId:
                                user.id,

                            reason
                        }
                    );

                }

            }
        );

    }
);

/* ============================================================
   20. SOCKET BROADCAST HELPER
   ============================================================ */

function turkaiBroadcastUser(
    userId,
    event,
    payload
) {

    if (
        !userId ||
        !event
    ) {

        return false;

    }

    io.to(
        `user:${userId}`
    ).emit(
        event,
        {

            ...payload,

            timestamp:
                nowISO()

        }
    );

    return true;
}

global.TURKAI_SOCKET = {

    broadcastUser:
        turkaiBroadcastUser

};

/* ============================================================
   21. STATUS STREAM
   ============================================================ */

app.get(
    "/api/live/status",
    optionalAuth,
    (req, res) => {

        res.json({

            success:
                true,

            status: {

                online:
                    !TURKAI_RUNTIME.shutdown,

                serverId:
                    TURKAI_RUNTIME.serverId,

                uptime:
                    process.uptime(),

                timestamp:
                    nowISO()

            }

        });

    }
);

/* ============================================================
   22. METRICS
   ============================================================ */

app.get(
    "/api/metrics",
    optionalAuth,
    (req, res) => {

        const memory =
            process.memoryUsage();

        res.json({

            success:
                true,

            metrics: {

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

                node:
                    process.version,

                platform:
                    process.platform,

                pid:
                    process.pid,

                timestamp:
                    nowISO()

            }

        });

    }
);

/* ============================================================
   23. FRONTEND STATIC FILES
   ============================================================ */

if (
    typeof PUBLIC_DIR !==
    "undefined" &&
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
                    process.env.NODE_ENV ===
                    "production"
                        ? "1h"
                        : 0

            }
        )
    );

}

/* ============================================================
   24. SAFE SPA FALLBACK
   ============================================================ */

/*
 * Express 5'te app.get("*") gibi wildcard
 * kullanımlarından kaçınıyoruz.
 *
 * Böylece Render'da route parser kaynaklı
 * path-to-regexp hataları oluşmaz.
 */

app.use(
    (req, res, next) => {

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
            typeof PUBLIC_DIR ===
            "undefined"
        ) {

            return next();

        }

        const indexPath =
            path.join(
                PUBLIC_DIR,
                "index.html"
            );

        if (
            !fs.existsSync(
                indexPath
            )
        ) {

            return next();

        }

        return res.sendFile(
            indexPath
        );

    }
);

/* ============================================================
   25. 404 HANDLER
   ============================================================ */

app.use(
    (req, res) => {

        const acceptsHTML =
            String(
                req.headers.accept ||
                ""
            ).includes(
                "text/html"
            );

        if (
            req.path.startsWith(
                "/api/"
            ) ||
            !acceptsHTML
        ) {

            return res.status(404).json({

                success:
                    false,

                error:
                    "Endpoint bulunamadı.",

                path:
                    req.path,

                method:
                    req.method,

                requestId:
                    req.requestId ||
                    null

            });

        }

        res.status(404).send(
            "<!doctype html>" +
            "<html lang='tr'>" +
            "<head>" +
            "<meta charset='utf-8'>" +
            "<meta name='viewport' content='width=device-width,initial-scale=1'>" +
            "<title>TürkAI — 404</title>" +
            "</head>" +
            "<body>" +
            "<main style='font-family:system-ui;padding:40px'>" +
            "<h1>TürkAI</h1>" +
            "<p>Sayfa bulunamadı.</p>" +
            "</main>" +
            "</body>" +
            "</html>"
        );

    }
);

/* ============================================================
   26. GLOBAL ERROR HANDLER
   ============================================================ */

app.use(
    (error, req, res, next) => {

        if (
            error?.type ===
            "entity.too.large"
        ) {

            return res.status(413).json({

                success:
                    false,

                error:
                    "İstek boyutu çok büyük.",

                requestId:
                    req.requestId ||
                    null

            });

        }

        if (
            error?.name ===
            "SyntaxError"
        ) {

            return res.status(400).json({

                success:
                    false,

                error:
                    "Geçersiz JSON verisi.",

                requestId:
                    req.requestId ||
                    null

            });

        }

        if (
            typeof logError ===
            "function"
        ) {

            logError(
                "Unhandled Express error",
                error
            );

        }

        if (
            res.headersSent
        ) {

            return next(
                error
            );

        }

        res.status(500).json({

            success:
                false,

            error:
                process.env.NODE_ENV ===
                "production"
                    ? "Sunucu hatası oluştu."
                    : (
                        error?.message ||
                        "Sunucu hatası."
                    ),

            requestId:
                req.requestId ||
                null

        });

    }
);

/* ============================================================
   27. GRACEFUL SHUTDOWN
   ============================================================ */

let turkaiShutdownStarted =
    false;

async function turkaiShutdown(
    signal
) {

    if (
        turkaiShutdownStarted
    ) {

        return;

    }

    turkaiShutdownStarted =
        true;

    TURKAI_RUNTIME.shutdown =
        true;

    if (
        typeof logInfo ===
        "function"
    ) {

        logInfo(
            "TürkAI shutdown başladı",
            {
                signal
            }
        );

    }

    try {

        if (
            typeof TURKAI_USAGE_CLEANUP_TIMER !==
            "undefined"
        ) {

            clearInterval(
                TURKAI_USAGE_CLEANUP_TIMER
            );

        }

    } catch {}

    try {

        io.close();

    } catch {}

    try {

        await new Promise(
            resolve => {

                httpServer.close(
                    () => resolve()
                );

            }
        );

    } catch {}

    if (
        typeof logInfo ===
        "function"
    ) {

        logInfo(
            "TürkAI shutdown tamamlandı"
        );

    }

    process.exit(
        0
    );

}

/* ============================================================
   28. PROCESS SIGNALS
   ============================================================ */

process.once(
    "SIGTERM",
    () => {

        turkaiShutdown(
            "SIGTERM"
        );

    }
);

process.once(
    "SIGINT",
    () => {

        turkaiShutdown(
            "SIGINT"
        );

    }
);

/* ============================================================
   29. UNCAUGHT EXCEPTION
   ============================================================ */

process.on(
    "uncaughtException",
    error => {

        if (
            typeof logError ===
            "function"
        ) {

            logError(
                "UNCAUGHT EXCEPTION",
                error
            );

        } else {

            console.error(
                "[UNCAUGHT EXCEPTION]",
                error
            );

        }

        /*
         * Sunucuyu burada otomatik kapatmıyoruz.
         * Render'ın process yönetimi devreye
         * girmeden önce log alınması sağlanır.
         */

    }
);

/* ============================================================
   30. UNHANDLED REJECTION
   ============================================================ */

process.on(
    "unhandledRejection",
    reason => {

        if (
            typeof logError ===
            "function"
        ) {

            logError(
                "UNHANDLED REJECTION",
                reason
            );

        } else {

            console.error(
                "[UNHANDLED REJECTION]",
                reason
            );

        }

    }
);

/* ============================================================
   31. START SERVER
   ============================================================ */

async function startServer() {

    if (
        TURKAI_RUNTIME.shutdown
    ) {

        throw new Error(
            "Server shutdown modunda."
        );

    }

    if (
        TURKAI_RUNTIME.started
    ) {

        return;

    }

    await new Promise(
        (resolve, reject) => {

            const onError =
                error => {

                    httpServer.off(
                        "listening",
                        onListening
                    );

                    reject(
                        error
                    );

                };

            const onListening =
                () => {

                    httpServer.off(
                        "error",
                        onError
                    );

                    resolve();

                };

            httpServer.once(
                "error",
                onError
            );

            httpServer.once(
                "listening",
                onListening
            );

            httpServer.listen(
                TURKAI_RUNTIME.port,
                TURKAI_RUNTIME.host
            );

        }
    );

    TURKAI_RUNTIME.started =
        true;

    TURKAI_RUNTIME.address =
        httpServer.address();

    if (
        typeof incrementStatistic ===
        "function"
    ) {

        incrementStatistic(
            "server_starts",
            1
        );

    }

    if (
        typeof logInfo ===
        "function"
    ) {

        logInfo(
            "TürkAI server started",
            {

                name:
                    TURKAI_RUNTIME.name,

                version:
                    TURKAI_RUNTIME.version,

                environment:
                    TURKAI_RUNTIME.environment,

                host:
                    TURKAI_RUNTIME.host,

                port:
                    TURKAI_RUNTIME.port,

                serverId:
                    TURKAI_RUNTIME.serverId

            }
        );

    }

    console.log(
        "\n" +
        "============================================\n" +
        "              TÜRKAI SERVER                 \n" +
        "============================================\n" +
        `Version    : ${TURKAI_RUNTIME.version}\n` +
        `Environment: ${TURKAI_RUNTIME.environment}\n` +
        `Host       : ${TURKAI_RUNTIME.host}\n` +
        `Port       : ${TURKAI_RUNTIME.port}\n` +
        `Server ID  : ${TURKAI_RUNTIME.serverId}\n` +
        `Node       : ${process.version}\n` +
        "Local AI   : READY\n" +
        `Groq       : ${process.env.GROQ_API_KEY ? "ON" : "OFF"}\n` +
        `Cerebras   : ${process.env.CEREBRAS_API_KEY ? "ON" : "OFF"}\n` +
        `OpenRouter : ${process.env.OPENROUTER_API_KEY ? "ON" : "OFF"}\n` +
        `Gemini     : ${process.env.GEMINI_API_KEY ? "ON" : "OFF"}\n` +
        "Health     : /api/health\n" +
        "Status     : /api/status\n" +
        "API        : /api\n" +
        "Docs       : /api/docs\n" +
        "============================================\n"
    );

}

/* ============================================================
   32. STARTUP VALIDATION
   ============================================================ */

function turkaiStartupValidation() {

    const required = [

        "app",

        "httpServer",

        "io",

        "readJSON",

        "writeJSON",

        "nowISO",

        "createId"

    ];

    const missing =
        required.filter(
            name => {

                if (
                    name === "app"
                ) {
                    return typeof app ===
                        "undefined";
                }

                if (
                    name === "httpServer"
                ) {
                    return typeof httpServer ===
                        "undefined";
                }

                if (
                    name === "io"
                ) {
                    return typeof io ===
                        "undefined";
                }

                if (
                    name === "readJSON"
                ) {
                    return typeof readJSON !==
                        "function";
                }

                if (
                    name === "writeJSON"
                ) {
                    return typeof writeJSON !==
                        "function";
                }

                if (
                    name === "nowISO"
                ) {
                    return typeof nowISO !==
                        "function";
                }

                if (
                    name === "createId"
                ) {
                    return typeof createId !==
                        "function";
                }

                return true;

            }
        );

    if (
        missing.length
    ) {

        throw new Error(
            "Eksik server bileşenleri: " +
            missing.join(", ")
        );

    }

    return true;

}

/* ============================================================
   33. FINAL ENGINE
   ============================================================ */

const TURKAI_FINAL_ENGINE = {

    runtime:
        TURKAI_RUNTIME,

    frontend:
        TURKAI_FRONTEND_CONFIG,

    image:
        TURKAI_IMAGE_ENGINE,

    video:
        TURKAI_VIDEO_ENGINE,

    start:
        startServer,

    shutdown:
        turkaiShutdown,

    validate:
        turkaiStartupValidation,

    providers:
        turkaiGetProviderStatus

};

global.TURKAI_FINAL_ENGINE =
    TURKAI_FINAL_ENGINE;

/* ============================================================
   34. STARTUP
   ============================================================ */

if (
    require.main ===
    module
) {

    try {

        turkaiStartupValidation();

        startServer()
            .catch(
                error => {

                    console.error(
                        "[TÜRKAI START ERROR]",
                        error
                    );

                    process.exit(
                        1
                    );

                }
            );

    } catch (error) {

        console.error(
            "[TÜRKAI VALIDATION ERROR]",
            error
        );

        process.exit(
            1
        );

    }

}

/* ============================================================
   35. MODULE EXPORT
   ============================================================ */

module.exports = {

    app,

    httpServer,

    io,

    startServer,

    shutdown:
        turkaiShutdown,

    runtime:
        TURKAI_RUNTIME,

    plans:
        typeof TURKAI_PLANS !==
        "undefined"
            ? TURKAI_PLANS
            : {},

    frontend:
        TURKAI_FRONTEND_CONFIG

};

/* ============================================================
   TÜRKAI 15.0 SERVER.JS
   5/5 — END
   ============================================================ */
