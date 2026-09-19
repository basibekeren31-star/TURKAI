"use strict";

/* ============================================================================
   TÜRKAI PLAN MANAGER
   PART 1 / 3

   Görevler:
   - Free / Pro / Plus / Ultra / Developer planları
   - Kullanıcı planları
   - Günlük kullanım
   - Plan limitleri
   - Plan doğrulama
   - JSON kalıcı depolama
   - Kullanım kayıtları

   ÖNEMLİ:
   Server'da plan tanımları tutulmaz.
   Bu dosya plan sisteminin ana kaynağıdır.
============================================================================ */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

/* ============================================================================
   PATHS
============================================================================ */

const ROOT_DIR =
    path.resolve(
        __dirname,
        "../.."
    );

const DATA_DIR =
    path.join(
        ROOT_DIR,
        "data"
    );

const PLANS_DIR =
    path.join(
        DATA_DIR,
        "plans"
    );

const USERS_FILE =
    path.join(
        PLANS_DIR,
        "users.json"
    );

const USAGE_FILE =
    path.join(
        PLANS_DIR,
        "usage.json"
    );

const LOG_FILE =
    path.join(
        PLANS_DIR,
        "plan_events.jsonl"
    );

const BACKUP_DIR =
    path.join(
        PLANS_DIR,
        "backups"
    );

[
    DATA_DIR,
    PLANS_DIR,
    BACKUP_DIR
].forEach(
    (
        directory
    ) => {
        fs.mkdirSync(
            directory,
            {
                recursive:
                    true
            }
        );
    }
);

/* ============================================================================
   HELPERS
============================================================================ */

function text(
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
    } catch {
        return fallback;
    }
}

function clean(
    value,
    max = 5000
) {
    return text(
        value
    )
        .replace(
            /\u0000/g,
            ""
        )
        .trim()
        .slice(
            0,
            max
        );
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

function id(
    prefix = "plan"
) {
    return (
        prefix +
        "_" +
        Date.now().toString(
            36
        ) +
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

function today() {
    return new Date()
        .toISOString()
        .slice(
            0,
            10
        );
}

function timestamp() {
    return new Date()
        .toISOString();
}

function number(
    value,
    fallback = 0
) {
    const result =
        Number(
            value
        );

    return Number.isFinite(
        result
    )
        ? result
        : fallback;
}

/* ============================================================================
   JSON STORAGE
============================================================================ */

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
        return fallback;
    }
}

function writeJSON(
    file,
    value
) {
    try {
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

        const temp =
            file +
            ".tmp";

        fs.writeFileSync(
            temp,
            JSON.stringify(
                value,
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
    } catch (
        error
    ) {
        return false;
    }
}

function appendLog(
    event,
    data = {}
) {
    try {
        fs.appendFileSync(
            LOG_FILE,
            JSON.stringify(
                {
                    id:
                        id(
                            "event"
                        ),

                    event,

                    data:
                        clone(
                            data
                        ),

                    timestamp:
                        timestamp()
                }
            ) +
                "\n",
            "utf8"
        );
    } catch {}
}

/* ============================================================================
   PLAN DEFINITIONS
============================================================================ */

const PLANS = {
    free: {
        id:
            "free",

        name:
            "TürkAI Free",

        description:
            "Temel TürkAI kullanımı.",

        price:
            0,

        currency:
            "TRY",

        billing:
            "monthly",

        active:
            true,

        comingSoon:
            false,

        limits: {
            messagesPerDay:
                50,

            researchPerDay:
                5,

            imagesPerDay:
                0,

            videosPerDay:
                0,

            uploadsPerDay:
                10,

            maxFileSizeMB:
                10,

            maxTokens:
                2048,

            memory:
                true,

            research:
                true,

            image:
                false,

            video:
                false
        },

        models: [
            "turkai-local"
        ]
    },

    pro: {
        id:
            "pro",

        name:
            "TürkAI Pro",

        description:
            "Daha yüksek kullanım ve gelişmiş AI özellikleri.",

        price:
            250,

        currency:
            "TRY",

        billing:
            "monthly",

        active:
            true,

        comingSoon:
            false,

        limits: {
            messagesPerDay:
                100,

            researchPerDay:
                25,

            imagesPerDay:
                2,

            videosPerDay:
                0,

            uploadsPerDay:
                25,

            maxFileSizeMB:
                25,

            maxTokens:
                4096,

            memory:
                true,

            research:
                true,

            image:
                true,

            video:
                false
        },

        models: [
            "turkai-local",
            "groq-gpt-oss-20b",
            "gemini"
        ]
    },

    plus: {
        id:
            "plus",

        name:
            "TürkAI Plus",

        description:
            "Genişletilmiş AI, araştırma ve medya limitleri.",

        price:
            500,

        currency:
            "TRY",

        billing:
            "monthly",

        active:
            true,

        comingSoon:
            false,

        limits: {
            messagesPerDay:
                200,

            researchPerDay:
                75,

            imagesPerDay:
                4,

            videosPerDay:
                5,

            uploadsPerDay:
                50,

            maxFileSizeMB:
                50,

            maxTokens:
                8192,

            memory:
                true,

            research:
                true,

            image:
                true,

            video:
                true
        },

        models: [
            "turkai-local",
            "groq-gpt-oss-20b",
            "cerebras-gpt-oss-120b",
            "gemini"
        ]
    },

    ultra: {
        id:
            "ultra",

        name:
            "TürkAI Ultra",

        description:
            "En yüksek kullanım seviyesine yönelik premium plan.",

        price:
            1000,

        currency:
            "TRY",

        billing:
            "monthly",

        active:
            false,

        comingSoon:
            true,

        limits: {
            messagesPerDay:
                1000,

            researchPerDay:
                250,

            imagesPerDay:
                10,

            videosPerDay:
                20,

            uploadsPerDay:
                100,

            maxFileSizeMB:
                100,

            maxTokens:
                16384,

            memory:
                true,

            research:
                true,

            image:
                true,

            video:
                true,

            videoCall:
                true
        },

        models: [
            "turkai-local",
            "groq-gpt-oss-20b",
            "cerebras-gpt-oss-120b",
            "gemini",
            "turkai-ultra"
        ]
    },

    developer: {
        id:
            "developer",

        name:
            "TürkAI Developer",

        description:
            "Dahili geliştirici planı.",

        price:
            0,

        currency:
            "TRY",

        billing:
            "internal",

        active:
            true,

        comingSoon:
            false,

        internal:
            true,

        limits: {
            messagesPerDay:
                400,

            researchPerDay:
                1000,

            imagesPerDay:
                50,

            videosPerDay:
                50,

            uploadsPerDay:
                250,

            maxFileSizeMB:
                250,

            maxTokens:
                16384,

            memory:
                true,

            research:
                true,

            image:
                true,

            video:
                true,

            videoCall:
                true
        },

        models: [
            "turkai-local",
            "groq-gpt-oss-20b",
            "cerebras-gpt-oss-120b",
            "gemini",
            "turkai-ultra"
        ]
    }
};

/* ============================================================================
   USER STORAGE
============================================================================ */

let users =
    readJSON(
        USERS_FILE,
        {}
    );

if (
    !users ||
    typeof users !==
        "object" ||
    Array.isArray(
        users
    )
) {
    users =
        {};
}

let usage =
    readJSON(
        USAGE_FILE,
        {}
    );

if (
    !usage ||
    typeof usage !==
        "object" ||
    Array.isArray(
        usage
    )
) {
    usage =
        {};
}

/* ============================================================================
   USER ID
============================================================================ */

function normalizeUserId(
    userId
) {
    const result =
        clean(
            userId ||
                "anonymous",
            300
        );

    return (
        result ||
        "anonymous"
    );
}

/* ============================================================================
   USER RECORD
============================================================================ */

function defaultUser(
    userId
) {
    return {
        userId,

        plan:
            "free",

        active:
            true,

        createdAt:
            timestamp(),

        updatedAt:
            timestamp(),

        expiresAt:
            null,

        subscription:
            {
                status:
                    "free",

                source:
                    "default",

                transactionId:
                    null
            },

        features:
            {},

        metadata:
            {}
    };
}

function ensureUser(
    userId
) {
    const normalized =
        normalizeUserId(
            userId
        );

    if (
        !users[
            normalized
        ]
    ) {
        users[
            normalized
        ] =
            defaultUser(
                normalized
            );

        writeJSON(
            USERS_FILE,
            users
        );

        appendLog(
            "user_created",
            {
                userId:
                    normalized
            }
        );
    }

    return users[
        normalized
    ];
}

/* ============================================================================
   USAGE RECORD
============================================================================ */

function ensureUsage(
    userId,
    date = today()
) {
    const normalized =
        normalizeUserId(
            userId
        );

    if (
        !usage[
            date
        ]
    ) {
        usage[
            date
        ] =
            {};
    }

    if (
        !usage[
            date
        ][
            normalized
        ]
    ) {
        usage[
            date
        ][
            normalized
        ] = {
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

            tokens:
                0,

            lastActivity:
                null
        };
    }

    return usage[
        date
    ][
        normalized
    ];
}

/* ============================================================================
   PLAN VALIDATION
============================================================================ */

function normalizePlanId(
    plan
) {
    const value =
        clean(
            plan ||
                "free",
            50
        )
            .toLowerCase();

    return PLANS[
        value
    ]
        ? value
        : "free";
}

function getPlan(
    plan
) {
    const id =
        normalizePlanId(
            plan
        );

    return clone(
        PLANS[
            id
        ]
    );
}

function getPlanReference(
    plan
) {
    const id =
        normalizePlanId(
            plan
        );

    return PLANS[
        id
    ];
}
/* ============================================================================
   PLAN LIST
============================================================================ */

function listPlans(
    options = {}
) {
    const includeInternal =
        options.includeInternal ===
        true;

    return Object.values(
        PLANS
    )
        .filter(
            (
                plan
            ) =>
                includeInternal ||
                !plan.internal
        )
        .map(
            (
                plan
            ) =>
                clone(
                    plan
                )
        );
}

/* ============================================================================
   USER PLAN
============================================================================ */

function getUserPlan(
    userId
) {
    const user =
        ensureUser(
            userId
        );

    return getPlan(
        user.plan
    );
}

function getPlanForUser(
    userId
) {
    return getUserPlan(
        userId
    );
}

function getUserRecord(
    userId
) {
    return clone(
        ensureUser(
            userId
        )
    );
}

/* ============================================================================
   PLAN ID FOR USER
============================================================================ */

function getUserPlanId(
    userId
) {
    const user =
        ensureUser(
            userId
        );

    return normalizePlanId(
        user.plan
    );
}

/* ============================================================================
   PLAN ACTIVE CHECK
============================================================================ */

function isPlanActive(
    planId
) {
    const plan =
        getPlanReference(
            planId
        );

    if (
        !plan.active &&
        !plan.comingSoon
    ) {
        return false;
    }

    if (
        plan.comingSoon
    ) {
        return false;
    }

    return true;
}

/* ============================================================================
   SET USER PLAN
============================================================================ */

function setUserPlan(
    userId,
    planId,
    metadata = {}
) {
    const normalizedUser =
        normalizeUserId(
            userId
        );

    const normalizedPlan =
        normalizePlanId(
            planId
        );

    const plan =
        getPlanReference(
            normalizedPlan
        );

    if (
        plan.comingSoon
    ) {
        return {
            success:
                false,

            reason:
                "plan_coming_soon",

            plan:
                normalizedPlan
        };
    }

    if (
        plan.active ===
        false
    ) {
        return {
            success:
                false,

            reason:
                "plan_inactive",

            plan:
                normalizedPlan
        };
    }

    const user =
        ensureUser(
            normalizedUser
        );

    const previousPlan =
        user.plan;

    user.plan =
        normalizedPlan;

    user.updatedAt =
        timestamp();

    user.metadata = {
        ...(user.metadata || {}),

        ...clone(
            metadata
        )
    };

    user.subscription = {
        ...(user.subscription || {}),

        status:
            normalizedPlan ===
            "free"
                ? "free"
                : "active",

        source:
            metadata.source ||
            user.subscription?.source ||
            "system",

        transactionId:
            metadata.transactionId ||
            user.subscription?.transactionId ||
            null
    };

    users[
        normalizedUser
    ] =
        user;

    writeJSON(
        USERS_FILE,
        users
    );

    appendLog(
        "plan_changed",
        {
            userId:
                normalizedUser,

            previousPlan,

            newPlan:
                normalizedPlan,

            metadata
        }
    );

    return {
        success:
            true,

        userId:
            normalizedUser,

        previousPlan,

        plan:
            normalizedPlan,

        planInfo:
            getPlan(
                normalizedPlan
            )
    };
}

/* ============================================================================
   FREE RESET
============================================================================ */

function setFree(
    userId,
    metadata = {}
) {
    return setUserPlan(
        userId,
        "free",
        {
            ...metadata,

            source:
                metadata.source ||
                "system"
        }
    );
}

/* ============================================================================
   PRO CODE
============================================================================ */

const PRO_CODE =
    clean(
        process.env.TURKAI_PRO_CODE ||
        "",
        500
    );

function validateProCode(
    code
) {
    const supplied =
        clean(
            code,
            500
        );

    if (
        !PRO_CODE
    ) {
        return {
            valid:
                false,

            reason:
                "pro_code_not_configured"
        };
    }

    const a =
        Buffer.from(
            supplied
        );

    const b =
        Buffer.from(
            PRO_CODE
        );

    if (
        a.length !==
        b.length
    ) {
        return {
            valid:
                false,

            reason:
                "invalid_code"
        };
    }

    let different =
        0;

    for (
        let i = 0;
        i < a.length;
        i++
    ) {
        different |=
            a[i] ^
            b[i];
    }

    return {
        valid:
            different ===
            0,

        reason:
            different ===
            0
                ? "valid"
                : "invalid_code"
    };
}

/* ============================================================================
   PRO ACTIVATION
============================================================================ */

function activatePro(
    userId,
    code
) {
    const validation =
        validateProCode(
            code
        );

    if (
        !validation.valid
    ) {
        appendLog(
            "pro_activation_failed",
            {
                userId:
                    normalizeUserId(
                        userId
                    ),

                reason:
                    validation.reason
            }
        );

        return {
            success:
                false,

            activated:
                false,

            reason:
                validation.reason
        };
    }

    const result =
        setUserPlan(
            userId,
            "pro",
            {
                source:
                    "pro_code",

                activatedAt:
                    timestamp()
            }
        );

    return {
        ...result,

        activated:
            Boolean(
                result.success
            )
    };
}

/* ============================================================================
   PLAN FEATURE
============================================================================ */

function hasFeature(
    userId,
    feature
) {
    const plan =
        getUserPlan(
            userId
        );

    return Boolean(
        plan?.limits?.[
            feature
        ]
    );
}

function getLimit(
    userId,
    feature
) {
    const plan =
        getUserPlan(
            userId
        );

    return number(
        plan?.limits?.[
            feature
        ],
        0
    );
}

/* ============================================================================
   DAILY USAGE
============================================================================ */

function getDailyUsage(
    userId,
    date = today()
) {
    const record =
        ensureUsage(
            userId,
            date
        );

    return clone(
        record
    );
}

function getTodayUsage(
    userId
) {
    return getDailyUsage(
        userId,
        today()
    );
}

/* ============================================================================
   LIMIT CHECK
============================================================================ */

function checkLimit(
    userId,
    feature,
    amount = 1
) {
    const plan =
        getUserPlan(
            userId
        );

    const usage =
        getTodayUsage(
            userId
        );

    const requested =
        Math.max(
            0,
            number(
                amount,
                1
            )
        );

    const limit =
        plan?.limits?.[
            feature
        ];

    /*
      Feature boolean ise doğrudan izin kontrolü.
    */

    if (
        typeof limit ===
        "boolean"
    ) {
        return {
            allowed:
                limit,

            feature,

            limit,
            used:
                0,

            remaining:
                limit
                    ? Infinity
                    : 0,

            plan:
                plan.id
        };
    }

    const numericLimit =
        number(
            limit,
            0
        );

    const used =
        number(
            usage?.[
                feature
            ],
            0
        );

    /*
      0 limit = bu özellik planda yok.
    */

    if (
        numericLimit <=
        0
    ) {
        return {
            allowed:
                false,

            feature,

            limit:
                numericLimit,

            used,

            remaining:
                0,

            plan:
                plan.id,

            reason:
                "feature_limit_reached"
        };
    }

    const remaining =
        Math.max(
            0,
            numericLimit -
                used
        );

    return {
        allowed:
            requested <=
            remaining,

        feature,

        limit:
            numericLimit,

        used,

        requested,

        remaining,

        plan:
            plan.id,

        reason:
            requested <=
            remaining
                ? null
                : "daily_limit_reached"
    };
}

/* ============================================================================
   INCREMENT USAGE
============================================================================ */

function consume(
    userId,
    feature,
    amount = 1
) {
    const normalizedUser =
        normalizeUserId(
            userId
        );

    const requested =
        Math.max(
            0,
            number(
                amount,
                1
            )
        );

    const check =
        checkLimit(
            normalizedUser,
            feature,
            requested
        );

    if (
        !check.allowed
    ) {
        appendLog(
            "limit_blocked",
            {
                userId:
                    normalizedUser,

                feature,

                requested,

                plan:
                    check.plan,

                remaining:
                    check.remaining
            }
        );

        return {
            success:
                false,

            allowed:
                false,

            ...check
        };
    }

    const record =
        ensureUsage(
            normalizedUser
        );

    if (
        typeof record[
            feature
        ] !==
        "number"
    ) {
        record[
            feature
        ] =
            0;
    }

    record[
        feature
    ] +=
        requested;

    record.lastActivity =
        timestamp();

    usage[
        today()
    ][
        normalizedUser
    ] =
        record;

    writeJSON(
        USAGE_FILE,
        usage
    );

    appendLog(
        "usage_consumed",
        {
            userId:
                normalizedUser,

            feature,

            amount:
                requested
        }
    );

    return {
        success:
            true,

        allowed:
            true,

        feature,

        amount:
            requested,

        used:
            record[
                feature
            ],

        remaining:
            typeof check.limit ===
                "number"
                ? Math.max(
                      0,
                      check.limit -
                          record[
                              feature
                          ]
                  )
                : Infinity,

        plan:
            check.plan
    };
}
// ============================================================
// TÜRKAI PLAN MANAGER — PART 3 / 3
// Backup • Import • Export • Reset • Stats • Health • Shutdown
// ============================================================

function timestampFileName() {
    const d = new Date();

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");

    return `${yyyy}-${mm}-${dd}_${hh}-${mi}-${ss}`;
}

function backupUsers() {
    ensureDirectories();
    loadUsers();

    const fileName = `users-${timestampFileName()}.json`;
    const target = path.join(BACKUP_DIR, fileName);

    writeJSON(target, users);

    logEvent("backup_users", {
        file: fileName,
        count: Object.keys(users).length
    });

    return {
        success: true,
        file: target,
        count: Object.keys(users).length
    };
}

function backupUsage() {
    ensureDirectories();
    loadUsage();

    const fileName = `usage-${timestampFileName()}.json`;
    const target = path.join(BACKUP_DIR, fileName);

    writeJSON(target, usage);

    logEvent("backup_usage", {
        file: fileName,
        count: Object.keys(usage).length
    });

    return {
        success: true,
        file: target,
        count: Object.keys(usage).length
    };
}

function backupAll() {
    ensureDirectories();
    loadUsers();
    loadUsage();

    const stamp = timestampFileName();
    const usersTarget = path.join(BACKUP_DIR, `users-${stamp}.json`);
    const usageTarget = path.join(BACKUP_DIR, `usage-${stamp}.json`);

    writeJSON(usersTarget, users);
    writeJSON(usageTarget, usage);

    logEvent("backup_all", {
        stamp,
        users: Object.keys(users).length,
        usage: Object.keys(usage).length
    });

    return {
        success: true,
        usersFile: usersTarget,
        usageFile: usageTarget,
        usersCount: Object.keys(users).length,
        usageCount: Object.keys(usage).length
    };
}

function resetUserUsage(userId) {
    const id = safeString(userId).trim();

    if (!id) {
        return {
            success: false,
            error: "userId_required"
        };
    }

    loadUsage();

    const before = usage[id] || null;

    usage[id] = ensureUsageShape({
        userId: id
    });

    saveUsage();

    logEvent("usage_reset", {
        userId: id
    });

    return {
        success: true,
        userId: id,
        before,
        after: usage[id]
    };
}

function resetAllUsage() {
    loadUsage();

    const previousCount = Object.keys(usage).length;

    usage = {};

    saveUsage();

    logEvent("usage_reset_all", {
        previousCount
    });

    return {
        success: true,
        previousCount,
        currentCount: 0
    };
}

function resetUserToFree(userId) {
    const id = safeString(userId).trim();

    if (!id) {
        return {
            success: false,
            error: "userId_required"
        };
    }

    const result = setFree(id);

    if (result && result.success) {
        logEvent("user_reset_free", {
            userId: id
        });
    }

    return result;
}

function resetData(options = {}) {
    const resetUsers = options.users !== false;
    const resetUsageData = options.usage !== false;

    ensureDirectories();

    const result = {
        success: true,
        usersReset: false,
        usageReset: false
    };

    if (resetUsers) {
        users = {};
        saveUsers();
        result.usersReset = true;
    }

    if (resetUsageData) {
        usage = {};
        saveUsage();
        result.usageReset = true;
    }

    logEvent("data_reset", result);

    return result;
}


// ============================================================
// IMPORT / EXPORT
// ============================================================

function exportUsers() {
    loadUsers();

    return {
        version: 1,
        exportedAt: nowISO(),
        type: "users",
        data: clone(users)
    };
}

function exportUsage() {
    loadUsage();

    return {
        version: 1,
        exportedAt: nowISO(),
        type: "usage",
        data: clone(usage)
    };
}

function exportAll() {
    loadUsers();
    loadUsage();

    return {
        version: 1,
        exportedAt: nowISO(),
        type: "turkai-plan-manager",
        plans: clone(PLANS),
        users: clone(users),
        usage: clone(usage)
    };
}

function importUsers(data, options = {}) {
    ensureDirectories();

    let incoming = data;

    if (incoming && typeof incoming === "object" && incoming.data) {
        incoming = incoming.data;
    }

    if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) {
        return {
            success: false,
            error: "invalid_users_data"
        };
    }

    const replace = options.replace === true;

    loadUsers();

    const imported = {};

    for (const [userId, record] of Object.entries(incoming)) {
        const id = safeString(userId).trim();

        if (!id) continue;

        imported[id] = normalizeUserRecord({
            ...(record || {}),
            userId: id
        });
    }

    if (replace) {
        users = imported;
    } else {
        users = {
            ...users,
            ...imported
        };
    }

    saveUsers();

    logEvent("import_users", {
        replace,
        imported: Object.keys(imported).length
    });

    return {
        success: true,
        replace,
        imported: Object.keys(imported).length,
        total: Object.keys(users).length
    };
}

function importUsage(data, options = {}) {
    ensureDirectories();

    let incoming = data;

    if (incoming && typeof incoming === "object" && incoming.data) {
        incoming = incoming.data;
    }

    if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) {
        return {
            success: false,
            error: "invalid_usage_data"
        };
    }

    const replace = options.replace === true;

    loadUsage();

    const imported = {};

    for (const [userId, record] of Object.entries(incoming)) {
        const id = safeString(userId).trim();

        if (!id) continue;

        imported[id] = ensureUsageShape({
            ...(record || {}),
            userId: id
        });
    }

    if (replace) {
        usage = imported;
    } else {
        usage = {
            ...usage,
            ...imported
        };
    }

    saveUsage();

    logEvent("import_usage", {
        replace,
        imported: Object.keys(imported).length
    });

    return {
        success: true,
        replace,
        imported: Object.keys(imported).length,
        total: Object.keys(usage).length
    };
}

function importAll(data, options = {}) {
    if (!data || typeof data !== "object") {
        return {
            success: false,
            error: "invalid_import_data"
        };
    }

    const usersData = data.users || {};
    const usageData = data.usage || {};

    const userResult = importUsers(usersData, options);
    const usageResult = importUsage(usageData, options);

    return {
        success: userResult.success && usageResult.success,
        users: userResult,
        usage: usageResult
    };
}


// ============================================================
// CLONING / SNAPSHOT
// ============================================================

function snapshot() {
    loadUsers();
    loadUsage();

    return {
        plans: clone(PLANS),
        users: clone(users),
        usage: clone(usage),
        generatedAt: nowISO()
    };
}

function restoreSnapshot(snapshotData, options = {}) {
    if (!snapshotData || typeof snapshotData !== "object") {
        return {
            success: false,
            error: "invalid_snapshot"
        };
    }

    return importAll(snapshotData, {
        replace: options.replace !== false
    });
}


// ============================================================
// PLAN STATISTICS
// ============================================================

function getPlanCounts() {
    loadUsers();

    const counts = {};

    for (const planId of Object.keys(PLANS)) {
        counts[planId] = 0;
    }

    for (const user of Object.values(users)) {
        const planId = normalizePlanId(user.planId);

        if (counts[planId] === undefined) {
            counts[planId] = 0;
        }

        counts[planId]++;
    }

    return counts;
}

function getActivePlanCounts() {
    loadUsers();

    const counts = {};

    for (const planId of Object.keys(PLANS)) {
        counts[planId] = 0;
    }

    for (const user of Object.values(users)) {
        const planId = normalizePlanId(user.planId);

        if (!isPlanActive(user.userId)) {
            continue;
        }

        if (counts[planId] === undefined) {
            counts[planId] = 0;
        }

        counts[planId]++;
    }

    return counts;
}

function getRevenueEstimate() {
    loadUsers();

    let monthly = 0;

    for (const user of Object.values(users)) {
        const plan = getPlan(user.planId);

        if (!plan) continue;
        if (!isPlanActive(user.userId)) continue;

        const price = number(plan.price, 0);

        if (price > 0) {
            monthly += price;
        }
    }

    return {
        monthlyTRY: monthly,
        yearlyTRY: monthly * 12
    };
}

function getFeatureCounts() {
    const result = {};

    for (const plan of Object.values(PLANS)) {
        if (!plan || !plan.features) continue;

        for (const [feature, enabled] of Object.entries(plan.features)) {
            if (!result[feature]) {
                result[feature] = {
                    enabledPlans: 0,
                    disabledPlans: 0
                };
            }

            if (enabled) {
                result[feature].enabledPlans++;
            } else {
                result[feature].disabledPlans++;
            }
        }
    }

    return result;
}

function getUsageTotals() {
    loadUsage();

    const totals = {
        messages: 0,
        research: 0,
        images: 0,
        videos: 0,
        uploads: 0,
        allFeatures: 0
    };

    for (const record of Object.values(usage)) {
        const messages = number(record.messages, 0);
        const research = number(record.research, 0);
        const images = number(record.images, 0);
        const videos = number(record.videos, 0);
        const uploads = number(record.uploads, 0);

        totals.messages += messages;
        totals.research += research;
        totals.images += images;
        totals.videos += videos;
        totals.uploads += uploads;

        totals.allFeatures +=
            messages +
            research +
            images +
            videos +
            uploads;
    }

    return totals;
}

function stats() {
    loadUsers();
    loadUsage();

    const plans = listPlans({
        includeDeveloper: true,
        includeComingSoon: true
    });

    return {
        version: "1.0.0",
        generatedAt: nowISO(),

        users: {
            total: Object.keys(users).length,
            byPlan: getPlanCounts(),
            activeByPlan: getActivePlanCounts()
        },

        usage: {
            usersTracked: Object.keys(usage).length,
            totals: getUsageTotals()
        },

        plans: {
            total: plans.length,
            active: plans.filter(plan => plan.active).length,
            comingSoon: plans.filter(plan => plan.comingSoon).length
        },

        revenue: getRevenueEstimate(),

        features: getFeatureCounts(),

        limits: {
            free: clone(PLANS.free),
            pro: clone(PLANS.pro),
            plus: clone(PLANS.plus),
            ultra: clone(PLANS.ultra)
        }
    };
}


// ============================================================
// HEALTH / DIAGNOSTICS
// ============================================================

function fileExists(file) {
    try {
        return fs.existsSync(file);
    } catch {
        return false;
    }
}

function fileSize(file) {
    try {
        if (!fs.existsSync(file)) return 0;
        return fs.statSync(file).size;
    } catch {
        return 0;
    }
}

function health() {
    ensureDirectories();
    loadUsers();
    loadUsage();

    const checks = {
        dataDirectory: fileExists(PLANS_DIR),
        usersFile: fileExists(USERS_FILE),
        usageFile: fileExists(USAGE_FILE),
        logFileDirectory: fileExists(path.dirname(LOG_FILE)),
        backupDirectory: fileExists(BACKUP_DIR)
    };

    const healthy =
        Object.values(checks).every(Boolean);

    return {
        ok: healthy,

        module: "planManager",

        version: "1.0.0",

        timestamp: nowISO(),

        checks,

        files: {
            users: {
                path: USERS_FILE,
                size: fileSize(USERS_FILE)
            },

            usage: {
                path: USAGE_FILE,
                size: fileSize(USAGE_FILE)
            }
        },

        memory: {
            users: Object.keys(users).length,
            usage: Object.keys(usage).length
        },

        plans: {
            available: Object.keys(PLANS)
        }
    };
}

function fullHealth() {
    const h = health();
    const s = stats();

    return {
        ...h,
        stats: s
    };
}


// ============================================================
// PLAN MANAGER ADMIN UTILITIES
// ============================================================

function searchUsers(query = "") {
    loadUsers();

    const q = normalize(query);

    if (!q) {
        return Object.values(users).map(clone);
    }

    const result = [];

    for (const user of Object.values(users)) {
        const haystack = normalize([
            user.userId,
            user.email,
            user.name,
            user.planId
        ].join(" "));

        if (haystack.includes(q)) {
            result.push(clone(user));
        }
    }

    return result;
}

function listUsers(options = {}) {
    loadUsers();

    const result = Object.values(users).map(clone);

    const planId = options.planId
        ? normalizePlanId(options.planId)
        : null;

    const activeOnly = options.activeOnly === true;

    let filtered = result;

    if (planId) {
        filtered = filtered.filter(
            user => normalizePlanId(user.planId) === planId
        );
    }

    if (activeOnly) {
        filtered = filtered.filter(
            user => isPlanActive(user.userId)
        );
    }

    return filtered;
}

function countUsers() {
    loadUsers();
    return Object.keys(users).length;
}

function countUsageRecords() {
    loadUsage();
    return Object.keys(usage).length;
}


// ============================================================
// PLAN SERIALIZATION
// ============================================================

function serializePlan(planId) {
    const plan = getPlan(planId);

    if (!plan) {
        return null;
    }

    return clone(plan);
}

function serializeUser(userId) {
    const user = getUserRecord(userId);

    if (!user) {
        return null;
    }

    const plan = getPlan(user.planId);

    return {
        ...clone(user),
        plan: plan ? clone(plan) : null
    };
}


// ============================================================
// SAVE / REBUILD
// ============================================================

function rebuild() {
    ensureDirectories();

    loadUsers();
    loadUsage();

    // Eski / bozuk kayıtların normalize edilmesi
    for (const [userId, user] of Object.entries(users)) {
        users[userId] = normalizeUserRecord({
            ...(user || {}),
            userId
        });
    }

    for (const [userId, record] of Object.entries(usage)) {
        usage[userId] = ensureUsageShape({
            ...(record || {}),
            userId
        });
    }

    saveUsers();
    saveUsage();

    return {
        success: true,
        users: Object.keys(users).length,
        usage: Object.keys(usage).length,
        timestamp: nowISO()
    };
}

function saveAll() {
    saveUsers();
    saveUsage();

    return {
        success: true,
        usersFile: USERS_FILE,
        usageFile: USAGE_FILE,
        timestamp: nowISO()
    };
}

function save() {
    return saveAll();
}


// ============================================================
// SHUTDOWN
// ============================================================

let shuttingDown = false;

function shutdown() {
    if (shuttingDown) {
        return {
            success: true,
            alreadyShutdown: true
        };
    }

    shuttingDown = true;

    try {
        saveAll();
    } catch (error) {
        logEvent("shutdown_save_error", {
            error: error.message
        });
    }

    logEvent("shutdown", {
        timestamp: nowISO()
    });

    return {
        success: true,
        timestamp: nowISO()
    };
}


// ============================================================
// OTOMATİK TEMİZLİK
// ============================================================

function cleanupOldBackups(maxFiles = 50) {
    ensureDirectories();

    let files = [];

    try {
        files = fs.readdirSync(BACKUP_DIR)
            .filter(file => file.endsWith(".json"))
            .map(file => {
                const fullPath = path.join(BACKUP_DIR, file);

                let stat = null;

                try {
                    stat = fs.statSync(fullPath);
                } catch {
                    stat = { mtimeMs: 0 };
                }

                return {
                    file,
                    fullPath,
                    mtimeMs: stat.mtimeMs || 0
                };
            })
            .sort((a, b) => b.mtimeMs - a.mtimeMs);
    } catch {
        return {
            success: false,
            removed: 0
        };
    }

    const keep = Math.max(1, number(maxFiles, 50));

    const oldFiles = files.slice(keep);

    let removed = 0;

    for (const item of oldFiles) {
        try {
            fs.unlinkSync(item.fullPath);
            removed++;
        } catch {
            // devam
        }
    }

    return {
        success: true,
        totalBefore: files.length,
        kept: Math.min(files.length, keep),
        removed
    };
}


// ============================================================
// STARTUP / PROCESS HOOKS
// ============================================================

ensureDirectories();

try {
    loadUsers();
    loadUsage();
} catch (error) {
    logEvent("startup_load_error", {
        error: error.message
    });
}

process.once("beforeExit", () => {
    try {
        saveAll();
    } catch {
        // sessiz kapanış
    }
});


// ============================================================
// FINAL EXPORTS
// ============================================================

module.exports = {

    // PLANLAR
    listPlans,
    getPlan,
    getPlanReference,

    // USERS
    ensureUser,
    getUserPlan,
    getPlanForUser,
    getUserRecord,
    getUserPlanId,
    setUserPlan,
    setFree,
    setUserPlan: setUserPlan,

    // PLAN DURUMU
    isPlanActive,

    // PRO
    activatePro,

    // FEATURES / LIMITS
    hasFeature,
    getLimit,

    // USAGE
    getDailyUsage,
    getTodayUsage,
    checkLimit,
    consume,
    resetUserUsage,
    resetAllUsage,

    // ARAMA
    searchUsers,
    listUsers,
    countUsers,
    countUsageRecords,

    // EXPORT
    exportUsers,
    exportUsage,
    exportAll,

    // IMPORT
    importUsers,
    importUsage,
    importAll,

    // SNAPSHOT
    snapshot,
    restoreSnapshot,

    // BACKUP
    backupUsers,
    backupUsage,
    backupAll,
    cleanupOldBackups,

    // RESET
    resetUserToFree,
    resetData,

    // SERIALIZE
    serializePlan,
    serializeUser,

    // İSTATİSTİK
    getPlanCounts,
    getActivePlanCounts,
    getRevenueEstimate,
    getFeatureCounts,
    getUsageTotals,
    stats,

    // HEALTH
    health,
    fullHealth,

    // SAVE / REBUILD
    save,
    saveAll,
    rebuild,

    // SHUTDOWN
    shutdown
};

// ============================================================
// TÜRKAI PLAN MANAGER READY
// ============================================================

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("💳 TürkAI Plan Manager hazır");
console.log("📦 Planlar :", Object.keys(PLANS).join(", "));
console.log("👥 Kullanıcı:", Object.keys(users).length);
console.log("📊 Usage   :", Object.keys(usage).length);
console.log("❤️  Health  :", health().ok ? "OK" : "CHECK");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");