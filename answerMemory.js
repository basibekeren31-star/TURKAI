"use strict";

/*
============================================================
TürkAI Answer Memory Engine
Version: 5.0.0
Part: 1/5
============================================================

Amaç:
- Sorular ve cevapları kalıcı olarak saklamak
- Kullanıcı bazlı hafıza
- Benzer soru bulma
- Tekrar cevapları azaltma
- Sıklık / kalite / güncellik takibi
- JSON tabanlı güvenli depolama
- Arama indeksi
- İstatistik
- Export / Import
- Cache
- Maintenance
- TürkAI backend ile kolay entegrasyon

Harici paket kullanılmaz.
Node.js built-in modülleri yeterlidir.
============================================================
*/

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

/* =========================================================
   1.1 - ROOT CONFIG
========================================================= */

const ANSWER_MEMORY_VERSION = "5.0.0";

const ANSWER_MEMORY_ROOT =
    path.join(
        __dirname,
        "data",
        "answer-memory"
    );

const ANSWER_MEMORY_ANSWERS_DIR =
    path.join(
        ANSWER_MEMORY_ROOT,
        "answers"
    );

const ANSWER_MEMORY_BACKUP_DIR =
    path.join(
        ANSWER_MEMORY_ROOT,
        "backups"
    );

const ANSWER_MEMORY_EXPORT_DIR =
    path.join(
        ANSWER_MEMORY_ROOT,
        "exports"
    );

const ANSWER_MEMORY_TEMP_DIR =
    path.join(
        ANSWER_MEMORY_ROOT,
        "temp"
    );

const ANSWER_MEMORY_LOG_DIR =
    path.join(
        ANSWER_MEMORY_ROOT,
        "logs"
    );

const ANSWER_MEMORY_FILES = {
    records:
        path.join(
            ANSWER_MEMORY_ROOT,
            "records.json"
        ),

    index:
        path.join(
            ANSWER_MEMORY_ROOT,
            "index.json"
        ),

    stats:
        path.join(
            ANSWER_MEMORY_ROOT,
            "stats.json"
        ),

    history:
        path.join(
            ANSWER_MEMORY_ROOT,
            "history.json"
        ),

    config:
        path.join(
            ANSWER_MEMORY_ROOT,
            "config.json"
        ),

    users:
        path.join(
            ANSWER_MEMORY_ROOT,
            "users.json"
        ),

    cache:
        path.join(
            ANSWER_MEMORY_ROOT,
            "cache.json"
        )
};

/* =========================================================
   1.2 - DEFAULT CONFIG
========================================================= */

const DEFAULT_ANSWER_MEMORY_CONFIG = {
    version:
        ANSWER_MEMORY_VERSION,

    enabled:
        true,

    autoSave:
        true,

    autoLearn:
        true,

    duplicateSimilarity:
        0.92,

    minimumQuestionLength:
        4,

    minimumAnswerLength:
        2,

    maximumQuestionLength:
        10000,

    maximumAnswerLength:
        30000,

    maximumRecords:
        100000,

    maximumHistory:
        50000,

    maximumSearchResults:
        20,

    defaultTopK:
        8,

    cacheEnabled:
        true,

    cacheTTL:
        1000 * 60 * 15,

    recencyHalfLife:
        1000 * 60 * 60 * 24 * 30,

    qualityDefault:
        0.70,

    frequencyWeight:
        0.15,

    similarityWeight:
        0.60,

    recencyWeight:
        0.15,

    qualityWeight:
        0.10,

    exactMatchBonus:
        0.20,

    phraseMatchBonus:
        0.10,

    userMatchBonus:
        0.10,

    globalMatchBonus:
        0.03,

    minimumScoreToReturn:
        0.35,

    normalizeTurkishChars:
        true,

    keepOriginalText:
        true,

    indexEnabled:
        true,

    autoBackup:
        true,

    backupEveryWrites:
        100,

    maxBackupFiles:
        20,

    historyEnabled:
        true,

    loggingEnabled:
        true,

    privacyMode:
        false,

    defaultUserId:
        "system",

    defaultUserName:
        "TürkAI",

    allowAnonymous:
        true,

    anonymousUserId:
        "anonymous"
};

/* =========================================================
   1.3 - BASIC HELPERS
========================================================= */

function answerMemoryNowISO() {
    return new Date().toISOString();
}

function answerMemoryTimestamp() {
    return Date.now();
}

function answerMemoryCreateId(prefix = "am") {
    const random =
        crypto.randomBytes(10).toString("hex");

    return (
        prefix +
        "_" +
        Date.now().toString(36) +
        "_" +
        random
    );
}

function answerMemoryHash(value) {
    return crypto
        .createHash("sha256")
        .update(
            String(
                value === undefined ||
                value === null
                    ? ""
                    : value
            ),
            "utf8"
        )
        .digest("hex");
}

function answerMemorySafeString(
    value,
    fallback = ""
) {
    if (
        value === undefined ||
        value === null
    ) {
        return fallback;
    }

    if (
        typeof value === "string"
    ) {
        return value;
    }

    if (
        typeof value === "number" ||
        typeof value === "boolean" ||
        typeof value === "bigint"
    ) {
        return String(value);
    }

    try {
        return JSON.stringify(value);
    } catch {
        return fallback;
    }
}

function answerMemoryClamp(
    number,
    min,
    max
) {
    const n =
        Number(number);

    if (
        !Number.isFinite(n)
    ) {
        return min;
    }

    return Math.min(
        max,
        Math.max(min, n)
    );
}

function answerMemoryEnsureArray(
    value
) {
    return Array.isArray(value)
        ? value
        : [];
}

function answerMemoryEnsureObject(
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

/* =========================================================
   1.4 - DIRECTORY INITIALIZATION
========================================================= */

function answerMemoryEnsureDirectories() {
    const directories = [
        ANSWER_MEMORY_ROOT,
        ANSWER_MEMORY_ANSWERS_DIR,
        ANSWER_MEMORY_BACKUP_DIR,
        ANSWER_MEMORY_EXPORT_DIR,
        ANSWER_MEMORY_TEMP_DIR,
        ANSWER_MEMORY_LOG_DIR
    ];

    for (
        const directory
        of directories
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
                "[AnswerMemory] Directory error:",
                directory,
                error.message
            );
        }
    }
}

/* =========================================================
   1.5 - JSON STORAGE HELPERS
========================================================= */

function answerMemoryReadJSON(
    filePath,
    fallback
) {
    try {
        if (
            !fs.existsSync(filePath)
        ) {
            return fallback;
        }

        const raw =
            fs.readFileSync(
                filePath,
                "utf8"
            );

        if (
            !raw.trim()
        ) {
            return fallback;
        }

        return JSON.parse(raw);
    } catch (error) {
        console.warn(
            "[AnswerMemory] Read failed:",
            filePath,
            error.message
        );

        return fallback;
    }
}

function answerMemoryWriteJSON(
    filePath,
    data
) {
    try {
        const directory =
            path.dirname(
                filePath
            );

        fs.mkdirSync(
            directory,
            {
                recursive: true
            }
        );

        const temporaryFile =
            filePath +
            ".tmp-" +
            process.pid +
            "-" +
            Date.now();

        fs.writeFileSync(
            temporaryFile,
            JSON.stringify(
                data,
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
            "[AnswerMemory] Write failed:",
            filePath,
            error.message
        );

        return false;
    }
}

function answerMemoryAppendJSONL(
    filePath,
    data
) {
    try {
        fs.mkdirSync(
            path.dirname(filePath),
            {
                recursive: true
            }
        );

        fs.appendFileSync(
            filePath,
            JSON.stringify(data) +
                "\n",
            "utf8"
        );

        return true;
    } catch {
        return false;
    }
}

/* =========================================================
   1.6 - MAIN CLASS
========================================================= */

class AnswerMemory {
    constructor(
        options = {}
    ) {
        answerMemoryEnsureDirectories();

        this.config =
            Object.assign(
                {},
                DEFAULT_ANSWER_MEMORY_CONFIG,
                answerMemoryEnsureObject(
                    options.config
                )
            );

        this.records = {};
        this.index = {};
        this.userIndex = {};
        this.stats = {};
        this.history = [];
        this.cache = {};
        this.writeCount = 0;
        this.startedAt =
            answerMemoryNowISO();

        this.loaded =
            false;

        this.lastLoadError =
            null;

        this.lastWriteAt =
            null;

        this.searchCount =
            0;

        this.hitCount =
            0;

        this.missCount =
            0;

        this.initialize();
    }

    /* =====================================================
       INITIALIZE
    ===================================================== */

    initialize() {
        answerMemoryEnsureDirectories();

        this.loadConfig();
        this.loadRecords();
        this.loadIndex();
        this.loadUsers();
        this.loadStats();
        this.loadHistory();
        this.loadCache();

        this.rebuildIndexesIfNeeded();

        this.loaded = true;

        this.log(
            "initialized",
            {
                version:
                    ANSWER_MEMORY_VERSION,
                records:
                    Object.keys(
                        this.records
                    ).length
            }
        );

        return this;
    }

    /* =====================================================
       CONFIG
    ===================================================== */

    loadConfig() {
        const stored =
            answerMemoryReadJSON(
                ANSWER_MEMORY_FILES.config,
                {}
            );

        this.config =
            Object.assign(
                {},
                DEFAULT_ANSWER_MEMORY_CONFIG,
                answerMemoryEnsureObject(
                    stored
                )
            );

        return this.config;
    }

    saveConfig(
        patch = {}
    ) {
        this.config =
            Object.assign(
                {},
                this.config,
                answerMemoryEnsureObject(
                    patch
                )
            );

        answerMemoryWriteJSON(
            ANSWER_MEMORY_FILES.config,
            this.config
        );

        return this.config;
    }

    getConfig() {
        return {
            ...this.config
        };
    }

    /* =====================================================
       RECORDS
    ===================================================== */

    loadRecords() {
        const data =
            answerMemoryReadJSON(
                ANSWER_MEMORY_FILES.records,
                {}
            );

        this.records =
            answerMemoryEnsureObject(
                data
            );

        return this.records;
    }

    loadIndex() {
        const data =
            answerMemoryReadJSON(
                ANSWER_MEMORY_FILES.index,
                {}
            );

        this.index =
            answerMemoryEnsureObject(
                data.index
            );

        this.userIndex =
            answerMemoryEnsureObject(
                data.userIndex
            );

        return this.index;
    }

    loadUsers() {
        const data =
            answerMemoryReadJSON(
                ANSWER_MEMORY_FILES.users,
                {}
            );

        this.userIndex =
            answerMemoryEnsureObject(
                data
            );

        return this.userIndex;
    }

    loadStats() {
        const defaultStats = {
            totalEntries: 0,
            totalReads: 0,
            totalWrites: 0,
            totalHits: 0,
            totalMisses: 0,
            duplicates: 0,
            updates: 0,
            deletions: 0,
            searches: 0,
            cacheHits: 0,
            cacheMisses: 0,
            imports: 0,
            exports: 0,
            rebuilds: 0,
            backups: 0,
            errors: 0,
            lastWrite: null,
            lastRead: null,
            lastHit: null,
            lastMiss: null,
            lastSearch: null,
            lastMaintenance: null,
            lastBackup: null
        };

        const stored =
            answerMemoryReadJSON(
                ANSWER_MEMORY_FILES.stats,
                {}
            );

        this.stats =
            Object.assign(
                {},
                defaultStats,
                answerMemoryEnsureObject(
                    stored
                )
            );

        return this.stats;
    }

    loadHistory() {
        const stored =
            answerMemoryReadJSON(
                ANSWER_MEMORY_FILES.history,
                []
            );

        this.history =
            Array.isArray(stored)
                ? stored
                : [];

        if (
            this.history.length >
            this.config.maximumHistory
        ) {
            this.history =
                this.history.slice(
                    -this.config.maximumHistory
                );
        }

        return this.history;
    }

    loadCache() {
        const stored =
            answerMemoryReadJSON(
                ANSWER_MEMORY_FILES.cache,
                {}
            );

        this.cache =
            answerMemoryEnsureObject(
                stored
            );

        return this.cache;
    }

    /* =====================================================
       SAVE CORE STORAGE
    ===================================================== */

    persist(
        options = {}
    ) {
        answerMemoryWriteJSON(
            ANSWER_MEMORY_FILES.records,
            this.records
        );

        answerMemoryWriteJSON(
            ANSWER_MEMORY_FILES.index,
            {
                index:
                    this.index,
                userIndex:
                    this.userIndex
            }
        );

        answerMemoryWriteJSON(
            ANSWER_MEMORY_FILES.users,
            this.userIndex
        );

        answerMemoryWriteJSON(
            ANSWER_MEMORY_FILES.stats,
            this.stats
        );

        if (
            this.config.historyEnabled
        ) {
            answerMemoryWriteJSON(
                ANSWER_MEMORY_FILES.history,
                this.history
            );
        }

        if (
            this.config.cacheEnabled
        ) {
            answerMemoryWriteJSON(
                ANSWER_MEMORY_FILES.cache,
                this.cache
            );
        }

        this.lastWriteAt =
            answerMemoryNowISO();

        this.writeCount++;

        if (
            options.backup === true
        ) {
            this.createBackup();
        } else if (
            this.config.autoBackup &&
            this.writeCount >=
                this.config.backupEveryWrites
        ) {
            this.createBackup();
            this.writeCount = 0;
        }

        return true;
    }

    /* =====================================================
       SIMPLE API
    ===================================================== */

    save(
        question,
        answer,
        options = {}
    ) {
        return this.saveAnswer(
            question,
            answer,
            options
        );
    }

    remember(
        question,
        answer,
        options = {}
    ) {
        return this.saveAnswer(
            question,
            answer,
            options
        );
    }

    find(
        question,
        options = {}
    ) {
        return this.search(
            question,
            options
        );
    }

    getStats() {
        this.stats.totalEntries =
            Object.keys(
                this.records
            ).length;

        return {
            ...this.stats
        };
    }

    health() {
        return {
            ok:
                this.loaded === true &&
                this.config.enabled === true,

            enabled:
                this.config.enabled,

            loaded:
                this.loaded,

            version:
                ANSWER_MEMORY_VERSION,

            records:
                Object.keys(
                    this.records
                ).length,

            indexedTokens:
                Object.keys(
                    this.index
                ).length,

            uptimeSeconds:
                Math.max(
                    0,
                    (
                        Date.now() -
                        new Date(
                            this.startedAt
                        ).getTime()
                    ) /
                        1000
                ),

            lastWrite:
                this.stats.lastWrite,

            lastRead:
                this.stats.lastRead,

            lastHit:
                this.stats.lastHit,

            lastMiss:
                this.stats.lastMiss,

            error:
                this.lastLoadError
        };
    }
}

module.exports = {
    AnswerMemory,
    ANSWER_MEMORY_VERSION,
    DEFAULT_ANSWER_MEMORY_CONFIG,
    ANSWER_MEMORY_ROOT,
    ANSWER_MEMORY_FILES
};
/* ============================================================
   TÜRKAI ANSWER MEMORY ENGINE 5.0
   PART 2 / 5
   NORMALIZATION + TOKENIZATION + SIMILARITY
   + RECORD ENGINE + DUPLICATE DETECTION
============================================================ */

/* ============================================================
   2.0 - TEXT NORMALIZATION CORE
============================================================ */

function answerMemoryNormalizeTurkish(
    text
) {
    let value =
        answerMemorySafeString(
            text,
            ""
        );

    if (!value) {
        return "";
    }

    try {
        value =
            value.normalize(
                "NFKC"
            );
    } catch {
        // Unicode normalize desteklenmezse
        // orijinal metin kullanılmaya devam eder.
    }

    value =
        value.replace(
            /\u00A0/g,
            " "
        );

    value =
        value.replace(
            /[\u200B-\u200D\uFEFF]/g,
            ""
        );

    /*
    ------------------------------------------------------------
    Türkçe karakterleri bozmadan küçük harfe çeviriyoruz.
    ------------------------------------------------------------
    */

    try {
        value =
            value.toLocaleLowerCase(
                "tr-TR"
            );
    } catch {
        value =
            value.toLowerCase();
    }

    value =
        value
            .replace(
                /“|”|„|‟|«|»/g,
                '"'
            )
            .replace(
                /‘|’|‚|‛|‹|›/g,
                "'"
            );

    value =
        value.replace(
            /\r\n/g,
            "\n"
        );

    value =
        value.replace(
            /\r/g,
            "\n"
        );

    value =
        value.replace(
            /\t+/g,
            " "
        );

    value =
        value.replace(
            / +/g,
            " "
        );

    value =
        value
            .split("\n")
            .map(
                line =>
                    line.trim()
            )
            .filter(
                line =>
                    line.length > 0
            )
            .join("\n");

    return value.trim();
}


/* ============================================================
   2.1 - SEARCH NORMALIZATION
============================================================ */

function answerMemorySearchNormalize(
    text
) {
    let value =
        answerMemoryNormalizeTurkish(
            text
        );

    if (!value) {
        return "";
    }

    /*
    ------------------------------------------------------------
    URL'leri arama metninden çıkar.
    ------------------------------------------------------------
    */

    value =
        value.replace(
            /https?:\/\/[^\s]+/gi,
            " "
        );

    value =
        value.replace(
            /www\.[^\s]+/gi,
            " "
        );

    /*
    ------------------------------------------------------------
    Mention / hashtag
    ------------------------------------------------------------
    */

    value =
        value.replace(
            /[@#][\p{L}\p{N}_-]+/gu,
            " "
        );

    /*
    ------------------------------------------------------------
    Noktalama işaretlerini temizle.
    Türkçe harfler korunur.
    ------------------------------------------------------------
    */

    value =
        value.replace(
            /[^\p{L}\p{N}\s']/gu,
            " "
        );

    /*
    ------------------------------------------------------------
    Tekrarlayan boşlukları toparla.
    ------------------------------------------------------------
    */

    value =
        value.replace(
            /\s+/g,
            " "
        );

    return value.trim();
}


/* ============================================================
   2.2 - TOKENIZATION
============================================================ */

function answerMemoryTokenize(
    text
) {
    const normalized =
        answerMemorySearchNormalize(
            text
        );

    if (!normalized) {
        return [];
    }

    return normalized
        .split(/\s+/)
        .map(
            token =>
                token.trim()
        )
        .filter(
            token =>
                token.length > 0
        );
}


/* ============================================================
   2.3 - UNIQUE ARRAY
============================================================ */

function answerMemoryUniqueArray(
    array
) {
    if (
        !Array.isArray(array)
    ) {
        return [];
    }

    return [
        ...new Set(
            array
                .map(
                    value =>
                        String(
                            value
                        )
                )
                .filter(
                    value =>
                        value.length > 0
                )
        )
    ];
}


/* ============================================================
   2.4 - TOKEN SET
============================================================ */

function answerMemoryCreateTokenSet(
    textOrTokens
) {
    if (
        textOrTokens instanceof Set
    ) {
        return new Set(
            textOrTokens
        );
    }

    if (
        Array.isArray(
            textOrTokens
        )
    ) {
        return new Set(
            textOrTokens
        );
    }

    return new Set(
        answerMemoryTokenize(
            textOrTokens
        )
    );
}


/* ============================================================
   2.5 - INTERSECTION COUNT
============================================================ */

function answerMemoryIntersectionCount(
    setA,
    setB
) {
    const a =
        answerMemoryCreateTokenSet(
            setA
        );

    const b =
        answerMemoryCreateTokenSet(
            setB
        );

    if (
        a.size === 0 ||
        b.size === 0
    ) {
        return 0;
    }

    let count = 0;

    /*
    Daha küçük olan kümeden dolaşmak
    performansı artırır.
    */

    const smaller =
        a.size <= b.size
            ? a
            : b;

    const larger =
        a.size <= b.size
            ? b
            : a;

    for (
        const token
        of smaller
    ) {
        if (
            larger.has(
                token
            )
        ) {
            count++;
        }
    }

    return count;
}


/* ============================================================
   2.6 - JACCARD SIMILARITY
============================================================ */

function answerMemoryJaccardSimilarity(
    a,
    b
) {
    const setA =
        answerMemoryCreateTokenSet(
            a
        );

    const setB =
        answerMemoryCreateTokenSet(
            b
        );

    if (
        setA.size === 0 &&
        setB.size === 0
    ) {
        return 1;
    }

    if (
        setA.size === 0 ||
        setB.size === 0
    ) {
        return 0;
    }

    const intersection =
        answerMemoryIntersectionCount(
            setA,
            setB
        );

    const union =
        setA.size +
        setB.size -
        intersection;

    if (
        union <= 0
    ) {
        return 0;
    }

    return answerMemoryClamp(
        intersection / union,
        0,
        1
    );
}


/* ============================================================
   2.7 - DICE SIMILARITY
============================================================ */

function answerMemoryDiceSimilarity(
    a,
    b
) {
    const setA =
        answerMemoryCreateTokenSet(
            a
        );

    const setB =
        answerMemoryCreateTokenSet(
            b
        );

    if (
        setA.size === 0 &&
        setB.size === 0
    ) {
        return 1;
    }

    if (
        setA.size === 0 ||
        setB.size === 0
    ) {
        return 0;
    }

    const intersection =
        answerMemoryIntersectionCount(
            setA,
            setB
        );

    return answerMemoryClamp(
        (
            2 *
            intersection
        ) /
        (
            setA.size +
            setB.size
        ),
        0,
        1
    );
}


/* ============================================================
   2.8 - OVERLAP SCORE
============================================================ */

function answerMemoryTokenOverlap(
    queryTokens,
    candidateTokens
) {
    const query =
        answerMemoryCreateTokenSet(
            queryTokens
        );

    const candidate =
        answerMemoryCreateTokenSet(
            candidateTokens
        );

    if (
        query.size === 0 ||
        candidate.size === 0
    ) {
        return 0;
    }

    const intersection =
        answerMemoryIntersectionCount(
            query,
            candidate
        );

    return answerMemoryClamp(
        intersection /
            Math.max(
                1,
                query.size
            ),
        0,
        1
    );
}


/* ============================================================
   2.9 - PRECISION SCORE
============================================================ */

function answerMemoryPrecision(
    queryTokens,
    candidateTokens
) {
    const query =
        answerMemoryCreateTokenSet(
            queryTokens
        );

    const candidate =
        answerMemoryCreateTokenSet(
            candidateTokens
        );

    if (
        candidate.size === 0
    ) {
        return 0;
    }

    const intersection =
        answerMemoryIntersectionCount(
            query,
            candidate
        );

    return answerMemoryClamp(
        intersection /
            Math.max(
                1,
                candidate.size
            ),
        0,
        1
    );
}


/* ============================================================
   2.10 - RECALL SCORE
============================================================ */

function answerMemoryRecall(
    queryTokens,
    candidateTokens
) {
    const query =
        answerMemoryCreateTokenSet(
            queryTokens
        );

    const candidate =
        answerMemoryCreateTokenSet(
            candidateTokens
        );

    if (
        query.size === 0
    ) {
        return 0;
    }

    const intersection =
        answerMemoryIntersectionCount(
            query,
            candidate
        );

    return answerMemoryClamp(
        intersection /
            Math.max(
                1,
                query.size
            ),
        0,
        1
    );
}


/* ============================================================
   2.11 - F1 SCORE
============================================================ */

function answerMemoryF1(
    queryTokens,
    candidateTokens
) {
    const precision =
        answerMemoryPrecision(
            queryTokens,
            candidateTokens
        );

    const recall =
        answerMemoryRecall(
            queryTokens,
            candidateTokens
        );

    if (
        precision === 0 &&
        recall === 0
    ) {
        return 0;
    }

    return answerMemoryClamp(
        (
            2 *
            precision *
            recall
        ) /
        (
            precision +
            recall
        ),
        0,
        1
    );
}


/* ============================================================
   2.12 - CHARACTER N-GRAM
============================================================ */

function answerMemoryCharacterNgrams(
    text,
    size = 3
) {
    const normalized =
        answerMemorySearchNormalize(
            text
        );

    if (
        !normalized
    ) {
        return [];
    }

    const compact =
        normalized.replace(
            /\s+/g,
            " "
        );

    const n =
        Math.max(
            1,
            Number(size) || 3
        );

    const result = [];

    if (
        compact.length <= n
    ) {
        return [
            compact
        ];
    }

    for (
        let i = 0;
        i <=
            compact.length -
                n;
        i++
    ) {
        result.push(
            compact.slice(
                i,
                i + n
            )
        );
    }

    return answerMemoryUniqueArray(
        result
    );
}


/* ============================================================
   2.13 - CHARACTER N-GRAM SIMILARITY
============================================================ */

function answerMemoryNgramSimilarity(
    a,
    b,
    size = 3
) {
    const gramsA =
        answerMemoryCharacterNgrams(
            a,
            size
        );

    const gramsB =
        answerMemoryCharacterNgrams(
            b,
            size
        );

    return answerMemoryJaccardSimilarity(
        gramsA,
        gramsB
    );
}


/* ============================================================
   2.14 - EXACT TEXT SCORE
============================================================ */

function answerMemoryExactScore(
    a,
    b
) {
    const normalizedA =
        answerMemorySearchNormalize(
            a
        );

    const normalizedB =
        answerMemorySearchNormalize(
            b
        );

    if (
        !normalizedA ||
        !normalizedB
    ) {
        return 0;
    }

    if (
        normalizedA ===
        normalizedB
    ) {
        return 1;
    }

    return 0;
}


/* ============================================================
   2.15 - CONTAINS SCORE
============================================================ */

function answerMemoryContainsScore(
    a,
    b
) {
    const normalizedA =
        answerMemorySearchNormalize(
            a
        );

    const normalizedB =
        answerMemorySearchNormalize(
            b
        );

    if (
        !normalizedA ||
        !normalizedB
    ) {
        return 0;
    }

    if (
        normalizedA.includes(
            normalizedB
        )
    ) {
        return answerMemoryClamp(
            normalizedB.length /
                normalizedA.length,
            0,
            1
        );
    }

    if (
        normalizedB.includes(
            normalizedA
        )
    ) {
        return answerMemoryClamp(
            normalizedA.length /
                normalizedB.length,
            0,
            1
        );
    }

    return 0;
}


/* ============================================================
   2.16 - WORD ORDER SCORE
============================================================ */

function answerMemoryWordOrderScore(
    query,
    candidate
) {
    const queryTokens =
        answerMemoryTokenize(
            query
        );

    const candidateTokens =
        answerMemoryTokenize(
            candidate
        );

    if (
        queryTokens.length ===
        0 ||
        candidateTokens.length ===
        0
    ) {
        return 0;
    }

    let samePosition = 0;

    const max =
        Math.min(
            queryTokens.length,
            candidateTokens.length
        );

    for (
        let i = 0;
        i < max;
        i++
    ) {
        if (
            queryTokens[i] ===
            candidateTokens[i]
        ) {
            samePosition++;
        }
    }

    return answerMemoryClamp(
        samePosition /
            Math.max(
                queryTokens.length,
                candidateTokens.length
            ),
        0,
        1
    );
}


/* ============================================================
   2.17 - PHRASE MATCH SCORE
============================================================ */

function answerMemoryPhraseMatchScore(
    query,
    candidate
) {
    const normalizedQuery =
        answerMemorySearchNormalize(
            query
        );

    const normalizedCandidate =
        answerMemorySearchNormalize(
            candidate
        );

    if (
        !normalizedQuery ||
        !normalizedCandidate
    ) {
        return 0;
    }

    if (
        normalizedQuery ===
        normalizedCandidate
    ) {
        return 1;
    }

    const queryTokens =
        answerMemoryTokenize(
            normalizedQuery
        );

    const candidateTokens =
        answerMemoryTokenize(
            normalizedCandidate
        );

    if (
        queryTokens.length < 2 ||
        candidateTokens.length < 2
    ) {
        return 0;
    }

    let best = 0;

    const maxPhraseLength =
        Math.min(
            8,
            queryTokens.length,
            candidateTokens.length
        );

    for (
        let phraseLength = 2;
        phraseLength <=
            maxPhraseLength;
        phraseLength++
    ) {
        for (
            let i = 0;
            i <=
                queryTokens.length -
                    phraseLength;
            i++
        ) {
            const phrase =
                queryTokens
                    .slice(
                        i,
                        i +
                            phraseLength
                    )
                    .join(" ");

            if (
                normalizedCandidate.includes(
                    phrase
                )
            ) {
                const score =
                    answerMemoryClamp(
                        phraseLength /
                            Math.max(
                                queryTokens.length,
                                candidateTokens.length
                            ),
                        0,
                        1
                    );

                if (
                    score > best
                ) {
                    best =
                        score;
                }
            }
        }
    }

    return best;
}


/* ============================================================
   2.18 - COMBINED TEXT SIMILARITY
============================================================ */

function answerMemoryCombinedSimilarity(
    query,
    candidate
) {
    const exact =
        answerMemoryExactScore(
            query,
            candidate
        );

    if (
        exact >= 1
    ) {
        return {
            score: 1,
            exact: 1,
            jaccard: 1,
            dice: 1,
            f1: 1,
            ngram: 1,
            contains: 1,
            phrase: 1,
            wordOrder: 1
        };
    }

    const queryTokens =
        answerMemoryTokenize(
            query
        );

    const candidateTokens =
        answerMemoryTokenize(
            candidate
        );

    const jaccard =
        answerMemoryJaccardSimilarity(
            queryTokens,
            candidateTokens
        );

    const dice =
        answerMemoryDiceSimilarity(
            queryTokens,
            candidateTokens
        );

    const f1 =
        answerMemoryF1(
            queryTokens,
            candidateTokens
        );

    const ngram =
        answerMemoryNgramSimilarity(
            query,
            candidate,
            3
        );

    const contains =
        answerMemoryContainsScore(
            query,
            candidate
        );

    const phrase =
        answerMemoryPhraseMatchScore(
            query,
            candidate
        );

    const wordOrder =
        answerMemoryWordOrderScore(
            query,
            candidate
        );

    const score =
        answerMemoryClamp(
            (
                jaccard *
                0.22
            ) +
            (
                dice *
                0.20
            ) +
            (
                f1 *
                0.20
            ) +
            (
                ngram *
                0.12
            ) +
            (
                contains *
                0.08
            ) +
            (
                phrase *
                0.10
            ) +
            (
                wordOrder *
                0.08
            ),
            0,
            1
        );

    return {
        score,
        exact,
        jaccard,
        dice,
        f1,
        ngram,
        contains,
        phrase,
        wordOrder
    };
}


/* ============================================================
   2.19 - TEXT KEYWORDS
============================================================ */

function answerMemoryExtractKeywords(
    text
) {
    const tokens =
        answerMemoryTokenize(
            text
        );

    const stopWords =
        new Set([
            "ve",
            "veya",
            "ile",
            "için",
            "bir",
            "bu",
            "şu",
            "o",
            "da",
            "de",
            "mi",
            "mı",
            "mu",
            "mü",
            "ne",
            "nasıl",
            "neden",
            "niye",
            "hangi",
            "kim",
            "kaç",
            "çok",
            "daha",
            "en",
            "ben",
            "sen",
            "biz",
            "siz",
            "onlar",
            "olan",
            "olarak",
            "gibi",
            "ise",
            "ama",
            "fakat",
            "çünkü",
            "ya",
            "yani",
            "şey",
            "şeyi",
            "bana",
            "sana"
        ]);

    return answerMemoryUniqueArray(
        tokens.filter(
            token =>
                token.length >=
                    2 &&
                !stopWords.has(
                    token
                )
        )
    );
}


/* ============================================================
   2.20 - QUESTION TYPE DETECTION
============================================================ */

function answerMemoryDetectQuestionType(
    question
) {
    const text =
        answerMemoryNormalizeTurkish(
            question
        );

    if (!text) {
        return "unknown";
    }

    if (
        /^(kim|kimdir|kimdi)\b/iu.test(
            text
        )
    ) {
        return "person";
    }

    if (
        /^(nedir|ne demek|ne\b)/iu.test(
            text
        ) ||
        /\bnedir\b/iu.test(
            text
        )
    ) {
        return "definition";
    }

    if (
        /^(nasıl|nasıl yapılır|nasıl yapabilirim)\b/iu.test(
            text
        ) ||
        /\bnasıl\b.*\byapılır\b/iu.test(
            text
        )
    ) {
        return "how_to";
    }

    if (
        /^(neden|niye|niçin)\b/iu.test(
            text
        )
    ) {
        return "why";
    }

    if (
        /^(ne zaman|hangi gün|hangi tarihte)\b/iu.test(
            text
        )
    ) {
        return "when";
    }

    if (
        /^(nerede|neresi|nereye)\b/iu.test(
            text
        )
    ) {
        return "where";
    }

    if (
        /^(kaç|ne kadar|kaç tane|kaç yaş)\b/iu.test(
            text
        )
    ) {
        return "quantity";
    }

    if (
        /^(doğru mu|yanlış mı|olur mu|mümkün mü|var mı|yok mu)\b/iu.test(
            text
        )
    ) {
        return "yes_no";
    }

    if (
        /\?$/.test(
            text
        )
    ) {
        return "question";
    }

    return "statement";
}


/* ============================================================
   2.21 - CATEGORY DETECTION
============================================================ */

function answerMemoryDetectCategory(
    question
) {
    const text =
        answerMemoryNormalizeTurkish(
            question
        );

    if (!text) {
        return "general";
    }

    if (
        /(javascript|typescript|python|html|css|kod|programlama|yazılım|node\.?js|react|java|c\+\+|c#|php|sql|terminal|cmd|powershell)/iu.test(
            text
        )
    ) {
        return "coding";
    }

    if (
        /(hava|hava durumu|sıcaklık|yağmur|kar yağışı|meteoroloji|rüzgar)/iu.test(
            text
        )
    ) {
        return "weather";
    }

    if (
        /(dolar|euro|sterlin|altın|gram altın|çeyrek altın|borsa|kur|fiyat|coin|kripto)/iu.test(
            text
        )
    ) {
        return "market";
    }

    if (
        /(haber|son dakika|güncel|bugün|şimdi|son durum|en son|şu anda)/iu.test(
            text
        )
    ) {
        return "current";
    }

    if (
        /(okul|ders|matematik|fen|sosyal|türkçe|ingilizce|ödev|sınav|konu anlatımı)/iu.test(
            text
        )
    ) {
        return "education";
    }

    if (
        /(oyun|minecraft|roblox|fortnite|steam|playstation|xbox)/iu.test(
            text
        )
    ) {
        return "gaming";
    }

    if (
        /(telefon|android|iphone|bilgisayar|pc|laptop|tablet|işletim sistemi)/iu.test(
            text
        )
    ) {
        return "technology";
    }

    if (
        /(güvenlik|siber güvenlik|cyber|firewall|virüs|malware|zararlı yazılım)/iu.test(
            text
        )
    ) {
        return "security";
    }

    if (
        /(tarih|osmanlı|cumhuriyet|atatürk|savaş|medeniyet)/iu.test(
            text
        )
    ) {
        return "history";
    }

    if (
        /(gezegen|uzay|evren|astronomi|fizik|kimya|biyoloji|bilim)/iu.test(
            text
        )
    ) {
        return "science";
    }

    return "general";
}


/* ============================================================
   2.22 - LANGUAGE DETECTION
============================================================ */

function answerMemoryDetectLanguage(
    text
) {
    const value =
        answerMemorySafeString(
            text,
            ""
        );

    if (!value) {
        return "unknown";
    }

    if (
        /[çğıöşü]/iu.test(
            value
        )
    ) {
        return "tr";
    }

    if (
        /\b(the|is|are|what|how|why|when|where|can|do|does|you)\b/iu.test(
            value
        )
    ) {
        return "en";
    }

    if (
        /\b(le|la|les|bonjour|comment|pourquoi|avec|dans)\b/iu.test(
            value
        )
    ) {
        return "fr";
    }

    if (
        /\b(der|die|das|ist|und|wie|warum|mit)\b/iu.test(
            value
        )
    ) {
        return "de";
    }

    return "tr";
}


/* ============================================================
   2.23 - RECORD ID
============================================================ */

function answerMemoryCreateRecordId(
    prefix = "answer"
) {
    return answerMemoryCreateId(
        prefix
    );
}


/* ============================================================
   2.24 - USER ID NORMALIZATION
============================================================ */

function answerMemoryNormalizeUserId2(
    value
) {
    let userId =
        answerMemorySafeString(
            value,
            "anonymous"
        ).trim();

    if (!userId) {
        userId =
            "anonymous";
    }

    return userId.slice(
        0,
        256
    );
}


/* ============================================================
   2.25 - USER NAME NORMALIZATION
============================================================ */

function answerMemoryNormalizeUserName2(
    value
) {
    let name =
        answerMemorySafeString(
            value,
            "TürkAI"
        ).trim();

    if (!name) {
        name =
            "TürkAI";
    }

    return name.slice(
        0,
        256
    );
}


/* ============================================================
   2.26 - TAG NORMALIZATION
============================================================ */

function answerMemoryNormalizeTags(
    tags
) {
    if (
        !Array.isArray(
            tags
        )
    ) {
        return [];
    }

    return answerMemoryUniqueArray(
        tags
            .map(
                tag =>
                    answerMemorySearchNormalize(
                        tag
                    )
            )
            .filter(
                tag =>
                    tag.length > 0
            )
    ).slice(
        0,
        100
    );
}


/* ============================================================
   2.27 - RECORD FACTORY
============================================================ */

function answerMemoryCreateRecord(
    question,
    answer,
    options = {}
) {
    const originalQuestion =
        answerMemorySafeString(
            question,
            ""
        ).trim();

    const originalAnswer =
        answerMemorySafeString(
            answer,
            ""
        ).trim();

    const normalizedQuestion =
        answerMemoryNormalizeTurkish(
            originalQuestion
        );

    const normalizedAnswer =
        answerMemoryNormalizeTurkish(
            originalAnswer
        );

    const searchQuestion =
        answerMemorySearchNormalize(
            originalQuestion
        );

    const tokens =
        answerMemoryUniqueArray(
            answerMemoryTokenize(
                originalQuestion
            )
        );

    const keywords =
        answerMemoryExtractKeywords(
            originalQuestion
        );

    const now =
        answerMemoryNowISO();

    const userId =
        answerMemoryNormalizeUserId2(
            options.userId
        );

    const record = {
        id:
            answerMemoryCreateRecordId(),

        version:
            1,

        createdAt:
            now,

        updatedAt:
            now,

        lastReadAt:
            null,

        lastWriteAt:
            now,

        question:
            originalQuestion,

        answer:
            originalAnswer,

        normalizedQuestion,

        normalizedAnswer,

        searchQuestion,

        questionHash:
            answerMemoryHash(
                normalizedQuestion
            ),

        answerHash:
            answerMemoryHash(
                normalizedAnswer
            ),

        userId,

        userName:
            answerMemoryNormalizeUserName2(
                options.userName
            ),

        scope:
            answerMemorySafeString(
                options.scope,
                "user"
            ),

        language:
            answerMemorySafeString(
                options.language,
                answerMemoryDetectLanguage(
                    originalQuestion
                )
            ),

        category:
            answerMemorySafeString(
                options.category,
                answerMemoryDetectCategory(
                    originalQuestion
                )
            ),

        questionType:
            answerMemoryDetectQuestionType(
                originalQuestion
            ),

        tags:
            answerMemoryNormalizeTags(
                options.tags
            ),

        tokens,

        keywords,

        tokenCount:
            tokens.length,

        keywordCount:
            keywords.length,

        importance:
            answerMemoryClamp(
                options.importance ??
                    0.50,
                0,
                1
            ),

        confidence:
            answerMemoryClamp(
                options.confidence ??
                    0.80,
                0,
                1
            ),

        quality:
            answerMemoryClamp(
                options.quality ??
                    0.70,
                0,
                1
            ),

        frequency:
            Math.max(
                1,
                Number(
                    options.frequency
                ) || 1
            ),

        hits:
            0,

        misses:
            0,

        saves:
            1,

        updates:
            0,

        duplicateCount:
            0,

        active:
            true,

        archived:
            false,

        pinned:
            Boolean(
                options.pinned
            ),

        favorite:
            Boolean(
                options.favorite
            ),

        verified:
            Boolean(
                options.verified
            ),

        trusted:
            Boolean(
                options.trusted
            ),

        source:
            answerMemorySafeString(
                options.source,
                "chat"
            ),

        model:
            answerMemorySafeString(
                options.model,
                "local"
            ),

        conversationId:
            answerMemorySafeString(
                options.conversationId,
                ""
            ),

        sessionId:
            answerMemorySafeString(
                options.sessionId,
                ""
            ),

        projectId:
            answerMemorySafeString(
                options.projectId,
                ""
            ),

        metadata:
            answerMemoryEnsureObject(
                options.metadata
            ),

        custom:
            answerMemoryEnsureObject(
                options.custom
            )
    };

    return record;
}


/* ============================================================
   2.28 - RECORD VALIDATION
============================================================ */

function answerMemoryValidateRecord(
    record
) {
    if (
        !record ||
        typeof record !==
            "object"
    ) {
        return {
            ok: false,
            reason:
                "invalid_record"
        };
    }

    if (
        !record.id
    ) {
        return {
            ok: false,
            reason:
                "missing_id"
        };
    }

    if (
        !record.question ||
        typeof record.question !==
            "string"
    ) {
        return {
            ok: false,
            reason:
                "missing_question"
        };
    }

    if (
        !record.answer ||
        typeof record.answer !==
            "string"
    ) {
        return {
            ok: false,
            reason:
                "missing_answer"
        };
    }

    if (
        record.question.length >
        10000
    ) {
        return {
            ok: false,
            reason:
                "question_too_long"
        };
    }

    if (
        record.answer.length >
        30000
    ) {
        return {
            ok: false,
            reason:
                "answer_too_long"
        };
    }

    return {
        ok: true
    };
}


/* ============================================================
   2.29 - PUBLIC RECORD
============================================================ */

AnswerMemory.prototype.publicRecord =
    function (
        record
    ) {
        if (
            !record
        ) {
            return null;
        }

        const output = {
            ...record
        };

        /*
        Kullanıcıya dönmesi gerekmeyen
        internal search alanlarını gizle.
        */

        delete output
            .normalizedQuestion;

        delete output
            .normalizedAnswer;

        delete output
            .searchQuestion;

        delete output
            .questionHash;

        delete output
            .answerHash;

        delete output
            .tokens;

        delete output
            .keywords;

        return output;
    };


/* ============================================================
   2.30 - DUPLICATE SEARCH
============================================================ */

AnswerMemory.prototype.findDuplicate =
    function (
        question,
        options = {}
    ) {
        const query =
            answerMemorySafeString(
                question,
                ""
            ).trim();

        if (!query) {
            return null;
        }

        const normalizedQuery =
            answerMemorySearchNormalize(
                query
            );

        const userId =
            answerMemoryNormalizeUserId2(
                options.userId
            );

        const records =
            Object.values(
                this.records ||
                    {}
            );

        let best =
            null;

        for (
            const record
            of records
        ) {
            if (
                !record
            ) {
                continue;
            }

            if (
                record.active ===
                false
            ) {
                continue;
            }

            if (
                options.category &&
                record.category !==
                    options.category
            ) {
                continue;
            }

            if (
                options.language &&
                record.language !==
                    options.language
            ) {
                continue;
            }

            const similarity =
                answerMemoryCombinedSimilarity(
                    normalizedQuery,
                    record.searchQuestion ||
                        record.normalizedQuestion ||
                        record.question
                );

            let score =
                similarity.score;

            if (
                answerMemoryNormalizeUserId2(
                    record.userId
                ) ===
                userId
            ) {
                score += 0.05;
            }

            if (
                record.scope ===
                "global"
            ) {
                score += 0.02;
            }

            if (
                record.pinned
            ) {
                score += 0.02;
            }

            if (
                record.favorite
            ) {
                score += 0.01;
            }

            score =
                answerMemoryClamp(
                    score,
                    0,
                    1
                );

            if (
                !best ||
                score >
                    best.score
            ) {
                best = {
                    record,
                    score,
                    similarity
                };
            }
        }

        const threshold =
            Number(
                options.threshold ??
                    this.config
                        ?.duplicateSimilarity ??
                    0.92
            );

        if (
            !best ||
            best.score <
                threshold
        ) {
            return null;
        }

        return best;
    };


/* ============================================================
   2.31 - RECORD INTERNAL MATCH
============================================================ */

AnswerMemory.prototype.matchRecord =
    function (
        question,
        record,
        options = {}
    ) {
        if (
            !record ||
            record.active ===
                false
        ) {
            return null;
        }

        const query =
            answerMemorySafeString(
                question,
                ""
            ).trim();

        if (!query) {
            return null;
        }

        const candidate =
            record.searchQuestion ||
            record.normalizedQuestion ||
            record.question ||
            "";

        const similarity =
            answerMemoryCombinedSimilarity(
                query,
                candidate
            );

        const queryTokens =
            answerMemoryTokenize(
                query
            );

        const candidateTokens =
            record.tokens ||
            answerMemoryTokenize(
                candidate
            );

        const overlap =
            answerMemoryTokenOverlap(
                queryTokens,
                candidateTokens
            );

        const precision =
            answerMemoryPrecision(
                queryTokens,
                candidateTokens
            );

        const recall =
            answerMemoryRecall(
                queryTokens,
                candidateTokens
            );

        const now =
            Date.now();

        const updated =
            new Date(
                record.updatedAt ||
                    record.createdAt ||
                    now
            ).getTime();

        const age =
            Math.max(
                0,
                now -
                    (
                        Number.isFinite(
                            updated
                        )
                            ? updated
                            : now
                    )
            );

        const halfLife =
            Number(
                this.config
                    ?.recencyHalfLife ||
                    (
                        1000 *
                        60 *
                        60 *
                        24 *
                        30
                    )
            );

        const recency =
            Math.pow(
                0.5,
                age /
                    Math.max(
                        1,
                        halfLife
                    )
            );

        const frequency =
            answerMemoryClamp(
                Math.log1p(
                    Number(
                        record.frequency ||
                            1
                    )
                ) /
                    10,
                0,
                1
            );

        const quality =
            answerMemoryClamp(
                Number(
                    record.quality ??
                        0.70
                ),
                0,
                1
            );

        const confidence =
            answerMemoryClamp(
                Number(
                    record.confidence ??
                        0.80
                ),
                0,
                1
            );

        const importance =
            answerMemoryClamp(
                Number(
                    record.importance ??
                        0.50
                ),
                0,
                1
            );

        const qualityCombined =
            answerMemoryClamp(
                (
                    quality *
                    0.50
                ) +
                (
                    confidence *
                    0.30
                ) +
                (
                    importance *
                    0.20
                ),
                0,
                1
            );

        const sameUser =
            answerMemoryNormalizeUserId2(
                record.userId
            ) ===
            answerMemoryNormalizeUserId2(
                options.userId
            );

        const sameLanguage =
            !options.language ||
            record.language ===
                options.language;

        const sameCategory =
            !options.category ||
            record.category ===
                options.category;

        let score =
            (
                similarity.score *
                0.52
            ) +
            (
                overlap *
                0.10
            ) +
            (
                precision *
                0.04
            ) +
            (
                recall *
                0.04
            ) +
            (
                recency *
                0.08
            ) +
            (
                frequency *
                0.06
            ) +
            (
                qualityCombined *
                0.16
            );

        if (
            similarity.exact >=
            1
        ) {
            score +=
                0.15;
        }

        if (
            sameUser
        ) {
            score +=
                0.06;
        }

        if (
            sameLanguage
        ) {
            score +=
                0.02;
        }

        if (
            sameCategory
        ) {
            score +=
                0.02;
        }

        if (
            record.pinned
        ) {
            score +=
                0.025;
        }

        if (
            record.favorite
        ) {
            score +=
                0.015;
        }

        if (
            record.verified
        ) {
            score +=
                0.02;
        }

        if (
            record.trusted
        ) {
            score +=
                0.02;
        }

        if (
            record.archived
        ) {
            score -=
                0.10;
        }

        if (
            record.active ===
            false
        ) {
            score = 0;
        }

        score =
            answerMemoryClamp(
                score,
                0,
                1
            );

        return {
            score,

            similarity:
                similarity.score,

            exact:
                similarity.exact,

            jaccard:
                similarity.jaccard,

            dice:
                similarity.dice,

            f1:
                similarity.f1,

            ngram:
                similarity.ngram,

            contains:
                similarity.contains,

            phrase:
                similarity.phrase,

            wordOrder:
                similarity.wordOrder,

            overlap,

            precision,

            recall,

            recency,

            frequency,

            quality:
                qualityCombined,

            sameUser,

            sameLanguage,

            sameCategory
        };
    };


/* ============================================================
   2.32 - RELEVANCE LEVEL
============================================================ */

AnswerMemory.prototype.getRelevanceLevel =
    function (
        score
    ) {
        const value =
            answerMemoryClamp(
                score,
                0,
                1
            );

        if (
            value >=
            0.92
        ) {
            return "exact";
        }

        if (
            value >=
            0.82
        ) {
            return "very_high";
        }

        if (
            value >=
            0.70
        ) {
            return "high";
        }

        if (
            value >=
            0.55
        ) {
            return "medium";
        }

        if (
            value >=
            0.40
        ) {
            return "low";
        }

        return "very_low";
    };


/* ============================================================
   2.33 - RECORD QUALITY UPDATE
============================================================ */

AnswerMemory.prototype.updateRecordQuality =
    function (
        record,
        patch = {}
    ) {
        if (
            !record
        ) {
            return null;
        }

        if (
            patch.quality !==
            undefined
        ) {
            record.quality =
                answerMemoryClamp(
                    patch.quality,
                    0,
                    1
                );
        }

        if (
            patch.confidence !==
            undefined
        ) {
            record.confidence =
                answerMemoryClamp(
                    patch.confidence,
                    0,
                    1
                );
        }

        if (
            patch.importance !==
            undefined
        ) {
            record.importance =
                answerMemoryClamp(
                    patch.importance,
                    0,
                    1
                );
        }

        return record;
    };


/* ============================================================
   2.34 - RECORD ACCESS
============================================================ */

AnswerMemory.prototype.touchRecord =
    function (
        record,
        type = "read"
    ) {
        if (
            !record
        ) {
            return false;
        }

        const now =
            answerMemoryNowISO();

        record.updatedAt =
            record.updatedAt ||
            now;

        if (
            type ===
            "read" ||
            type ===
            "hit"
        ) {
            record.lastReadAt =
                now;

            record.hits =
                Number(
                    record.hits ||
                        0
                ) + 1;

            record.frequency =
                Number(
                    record.frequency ||
                        0
                ) + 0.25;
        }

        if (
            type ===
            "write"
        ) {
            record.lastWriteAt =
                now;

            record.saves =
                Number(
                    record.saves ||
                        0
                ) + 1;
        }

        record.updatedAt =
            now;

        return true;
    };


/* ============================================================
   2.35 - RECORD DUPLICATE MERGE
============================================================ */

AnswerMemory.prototype.mergeDuplicateRecord =
    function (
        existing,
        incoming
    ) {
        if (
            !existing
        ) {
            return incoming;
        }

        if (
            !incoming
        ) {
            return existing;
        }

        existing.frequency =
            Number(
                existing.frequency ||
                    0
            ) +
            Number(
                incoming.frequency ||
                    0
            );

        existing.hits =
            Number(
                existing.hits ||
                    0
            ) +
            Number(
                incoming.hits ||
                    0
            );

        existing.saves =
            Number(
                existing.saves ||
                    0
            ) +
            Number(
                incoming.saves ||
                    0
            );

        existing.duplicateCount =
            Number(
                existing.duplicateCount ||
                    0
            ) + 1;

        existing.quality =
            answerMemoryClamp(
                (
                    Number(
                        existing.quality ??
                            0.70
                    ) +
                    Number(
                        incoming.quality ??
                            0.70
                    )
                ) /
                    2,
                0,
                1
            );

        existing.confidence =
            answerMemoryClamp(
                (
                    Number(
                        existing.confidence ??
                            0.80
                    ) +
                    Number(
                        incoming.confidence ??
                            0.80
                    )
                ) /
                    2,
                0,
                1
            );

        existing.importance =
            Math.max(
                Number(
                    existing.importance ??
                        0.50
                ),
                Number(
                    incoming.importance ??
                        0.50
                )
            );

        existing.tags =
            answerMemoryUniqueArray(
                [
                    ...(existing.tags ||
                        []),
                    ...(incoming.tags ||
                        [])
                ]
            ).slice(
                0,
                100
            );

        existing.keywords =
            answerMemoryUniqueArray(
                [
                    ...(existing.keywords ||
                        []),
                    ...(incoming.keywords ||
                        [])
                ]
            );

        existing.metadata =
            Object.assign(
                {},
                answerMemoryEnsureObject(
                    existing.metadata
                ),
                answerMemoryEnsureObject(
                    incoming.metadata
                )
            );

        if (
            incoming.quality >
            existing.quality
        ) {
            existing.answer =
                incoming.answer;

            existing.normalizedAnswer =
                incoming.normalizedAnswer;

            existing.answerHash =
                incoming.answerHash;
        }

        existing.updatedAt =
            answerMemoryNowISO();

        existing.version =
            Number(
                existing.version ||
                    1
            ) + 1;

        return existing;
    };


/* ============================================================
   2.36 - SAVE ANSWER V2
============================================================ */

AnswerMemory.prototype.saveAnswerV2 =
    function (
        question,
        answer,
        options = {}
    ) {
        if (
            !this.config?.enabled
        ) {
            return {
                ok: false,
                reason:
                    "disabled"
            };
        }

        const q =
            answerMemorySafeString(
                question,
                ""
            ).trim();

        const a =
            answerMemorySafeString(
                answer,
                ""
            ).trim();

        if (
            q.length <
            Number(
                this.config
                    ?.minimumQuestionLength ||
                    4
            )
        ) {
            return {
                ok: false,
                reason:
                    "question_too_short"
            };
        }

        if (
            a.length <
            Number(
                this.config
                    ?.minimumAnswerLength ||
                    2
            )
        ) {
            return {
                ok: false,
                reason:
                    "answer_too_short"
            };
        }

        if (
            q.length >
            Number(
                this.config
                    ?.maximumQuestionLength ||
                    10000
            )
        ) {
            return {
                ok: false,
                reason:
                    "question_too_long"
            };
        }

        if (
            a.length >
            Number(
                this.config
                    ?.maximumAnswerLength ||
                    30000
            )
        ) {
            return {
                ok: false,
                reason:
                    "answer_too_long"
            };
        }

        const duplicate =
            this.findDuplicate(
                q,
                {
                    ...options
                }
            );

        if (
            duplicate?.record
        ) {
            const existing =
                duplicate.record;

            const incoming =
                answerMemoryCreateRecord(
                    q,
                    a,
                    options
                );

            const sameAnswer =
                answerMemoryCombinedSimilarity(
                    existing.answer,
                    a
                ).score >=
                0.90;

            if (
                sameAnswer ||
                options.updateOnConflict ===
                    false
            ) {
                this.mergeDuplicateRecord(
                    existing,
                    incoming
                );

                this.stats.duplicates =
                    Number(
                        this.stats
                            .duplicates ||
                            0
                    ) + 1;

                this.stats.totalWrites =
                    Number(
                        this.stats
                            .totalWrites ||
                            0
                    ) + 1;

                this.stats.lastWrite =
                    answerMemoryNowISO();

                this.addHistoryV2(
                    "duplicate",
                    existing,
                    {
                        similarity:
                            duplicate.score
                    }
                );

                this.persist();

                return {
                    ok: true,
                    duplicate: true,
                    created: false,
                    updated: true,
                    id:
                        existing.id,
                    score:
                        duplicate.score,
                    relevance:
                        this.getRelevanceLevel(
                            duplicate.score
                        ),
                    record:
                        this.publicRecord(
                            existing
                        )
                };
            }

            existing.answer =
                a;

            existing.normalizedAnswer =
                answerMemoryNormalizeTurkish(
                    a
                );

            existing.answerHash =
                answerMemoryHash(
                    existing.normalizedAnswer
                );

            existing.version =
                Number(
                    existing.version ||
                        1
                ) + 1;

            existing.updates =
                Number(
                    existing.updates ||
                        0
                ) + 1;

            existing.frequency =
                Number(
                    existing.frequency ||
                        1
                ) + 1;

            existing.updatedAt =
                answerMemoryNowISO();

            if (
                options.quality !==
                undefined
            ) {
                existing.quality =
                    answerMemoryClamp(
                        options.quality,
                        0,
                        1
                    );
            }

            if (
                options.confidence !==
                undefined
            ) {
                existing.confidence =
                    answerMemoryClamp(
                        options.confidence,
                        0,
                        1
                    );
            }

            this.stats.updates =
                Number(
                    this.stats
                        .updates ||
                        0
                ) + 1;

            this.stats.totalWrites =
                Number(
                    this.stats
                        .totalWrites ||
                        0
                ) + 1;

            this.stats.lastWrite =
                answerMemoryNowISO();

            this.addHistoryV2(
                "update",
                existing,
                {
                    similarity:
                        duplicate.score
                }
            );

            this.persist();

            return {
                ok: true,
                duplicate: false,
                created: false,
                updated: true,
                id:
                    existing.id,
                score:
                    duplicate.score,
                record:
                    this.publicRecord(
                        existing
                    )
            };
        }

        const record =
            answerMemoryCreateRecord(
                q,
                a,
                options
            );

        const validation =
            answerMemoryValidateRecord(
                record
            );

        if (
            !validation.ok
        ) {
            return validation;
        }

        this.records[
            record.id
        ] = record;

        this.stats.totalEntries =
            Object.keys(
                this.records
            ).length;

        this.stats.totalWrites =
            Number(
                this.stats
                    .totalWrites ||
                    0
            ) + 1;

        this.stats.lastWrite =
            answerMemoryNowISO();

        this.indexRecordV2(
            record
        );

        this.addHistoryV2(
            "save",
            record
        );

        this.persist();

        return {
            ok: true,
            duplicate: false,
            created: true,
            updated: false,
            id:
                record.id,
            score: 1,
            relevance:
                "new",
            record:
                this.publicRecord(
                    record
                )
        };
    };


/* ============================================================
   2.37 - INDEX RECORD V2
============================================================ */

AnswerMemory.prototype.indexRecordV2 =
    function (
        record
    ) {
        if (
            !record ||
            !record.id
        ) {
            return false;
        }

        const tokens =
            answerMemoryUniqueArray(
                record.tokens ||
                    answerMemoryTokenize(
                        record.question
                    )
            );

        record.tokens =
            tokens;

        record.tokenCount =
            tokens.length;

        if (
            !this.index ||
            typeof this.index !==
                "object"
        ) {
            this.index = {};
        }

        for (
            const token
            of tokens
        ) {
            if (
                !Array.isArray(
                    this.index[token]
                )
            ) {
                this.index[token] =
                    [];
            }

            if (
                !this.index[
                    token
                ].includes(
                    record.id
                )
            ) {
                this.index[
                    token
                ].push(
                    record.id
                );
            }
        }

        if (
            !this.userIndex ||
            typeof this.userIndex !==
                "object"
        ) {
            this.userIndex = {};
        }

        const userId =
            answerMemoryNormalizeUserId2(
                record.userId
            );

        if (
            !Array.isArray(
                this.userIndex[
                    userId
                ]
            )
        ) {
            this.userIndex[
                userId
            ] = [];
        }

        if (
            !this.userIndex[
                userId
            ].includes(
                record.id
            )
        ) {
            this.userIndex[
                userId
            ].push(
                record.id
            );
        }

        return true;
    };


/* ============================================================
   2.38 - REMOVE INDEX V2
============================================================ */

AnswerMemory.prototype.removeRecordFromIndexV2 =
    function (
        record
    ) {
        if (
            !record
        ) {
            return false;
        }

        const tokens =
            answerMemoryUniqueArray(
                record.tokens ||
                    []
            );

        if (
            this.index &&
            typeof this.index ===
                "object"
        ) {
            for (
                const token
                of tokens
            ) {
                if (
                    !Array.isArray(
                        this.index[
                            token
                        ]
                    )
                ) {
                    continue;
                }

                this.index[
                    token
                ] =
                    this.index[
                        token
                    ].filter(
                        id =>
                            id !==
                            record.id
                    );

                if (
                    this.index[
                        token
                    ].length ===
                    0
                ) {
                    delete this.index[
                        token
                    ];
                }
            }
        }

        const userId =
            answerMemoryNormalizeUserId2(
                record.userId
            );

        if (
            this.userIndex &&
            Array.isArray(
                this.userIndex[
                    userId
                ]
            )
        ) {
            this.userIndex[
                userId
            ] =
                this.userIndex[
                    userId
                ].filter(
                    id =>
                        id !==
                        record.id
                );

            if (
                this.userIndex[
                    userId
                ].length ===
                0
            ) {
                delete this.userIndex[
                    userId
                ];
            }
        }

        return true;
    };


/* ============================================================
   2.39 - ADD HISTORY V2
============================================================ */

AnswerMemory.prototype.addHistoryV2 =
    function (
        event,
        record,
        extra = {}
    ) {
        if (
            this.config?.historyEnabled ===
            false
        ) {
            return false;
        }

        if (
            !Array.isArray(
                this.history
            )
        ) {
            this.history =
                [];
        }

        const historyRecord = {
            id:
                answerMemoryCreateId(
                    "history"
                ),

            timestamp:
                answerMemoryNowISO(),

            event:
                answerMemorySafeString(
                    event,
                    "unknown"
                ),

            recordId:
                record?.id ||
                null,

            userId:
                record?.userId ||
                extra.userId ||
                null,

            question:
                record?.question ||
                extra.question ||
                extra.query ||
                null,

            score:
                extra.score ??
                null,

            similarity:
                extra.similarity ??
                null,

            category:
                record?.category ||
                extra.category ||
                "general",

            source:
                record?.source ||
                extra.source ||
                null,

            metadata:
                answerMemoryEnsureObject(
                    extra.metadata
                )
        };

        this.history.push(
            historyRecord
        );

        const maxHistory =
            Number(
                this.config
                    ?.maximumHistory ||
                    50000
            );

        if (
            this.history.length >
            maxHistory
        ) {
            this.history =
                this.history.slice(
                    -maxHistory
                );
        }

        return true;
    };


/* ============================================================
   2.40 - GET RECORD V2
============================================================ */

AnswerMemory.prototype.getRecordV2 =
    function (
        id
    ) {
        if (
            !id ||
            !this.records
        ) {
            return null;
        }

        const record =
            this.records[id];

        if (
            !record
        ) {
            return null;
        }

        return this.publicRecord(
            record
        );
    };


/* ============================================================
   2.41 - UPDATE RECORD V2
============================================================ */

AnswerMemory.prototype.updateRecordV2 =
    function (
        id,
        patch = {}
    ) {
        if (
            !this.records
        ) {
            return {
                ok: false,
                reason:
                    "records_unavailable"
            };
        }

        const record =
            this.records[id];

        if (
            !record
        ) {
            return {
                ok: false,
                reason:
                    "not_found"
            };
        }

        this.removeRecordFromIndexV2(
            record
        );

        if (
            patch.question !==
            undefined
        ) {
            record.question =
                answerMemorySafeString(
                    patch.question,
                    ""
                ).trim();

            record.normalizedQuestion =
                answerMemoryNormalizeTurkish(
                    record.question
                );

            record.searchQuestion =
                answerMemorySearchNormalize(
                    record.question
                );

            record.questionHash =
                answerMemoryHash(
                    record.normalizedQuestion
                );

            record.tokens =
                answerMemoryUniqueArray(
                    answerMemoryTokenize(
                        record.question
                    )
                );

            record.keywords =
                answerMemoryExtractKeywords(
                    record.question
                );

            record.tokenCount =
                record.tokens.length;

            record.keywordCount =
                record.keywords.length;

            record.questionType =
                answerMemoryDetectQuestionType(
                    record.question
                );

            record.category =
                patch.category ??
                answerMemoryDetectCategory(
                    record.question
                );
        }

        if (
            patch.answer !==
            undefined
        ) {
            record.answer =
                answerMemorySafeString(
                    patch.answer,
                    ""
                ).trim();

            record.normalizedAnswer =
                answerMemoryNormalizeTurkish(
                    record.answer
                );

            record.answerHash =
                answerMemoryHash(
                    record.normalizedAnswer
                );
        }

        if (
            patch.userId !==
            undefined
        ) {
            record.userId =
                answerMemoryNormalizeUserId2(
                    patch.userId
                );
        }

        if (
            patch.userName !==
            undefined
        ) {
            record.userName =
                answerMemoryNormalizeUserName2(
                    patch.userName
                );
        }

        if (
            patch.tags !==
            undefined
        ) {
            record.tags =
                answerMemoryNormalizeTags(
                    patch.tags
                );
        }

        const numericFields = [
            "importance",
            "confidence",
            "quality"
        ];

        for (
            const field
            of numericFields
        ) {
            if (
                patch[field] !==
                undefined
            ) {
                record[field] =
                    answerMemoryClamp(
                        patch[field],
                        0,
                        1
                    );
            }
        }

        const booleanFields = [
            "active",
            "archived",
            "pinned",
            "favorite",
            "verified",
            "trusted"
        ];

        for (
            const field
            of booleanFields
        ) {
            if (
                patch[field] !==
                undefined
            ) {
                record[field] =
                    Boolean(
                        patch[field]
                    );
            }
        }

        if (
            patch.category !==
            undefined
        ) {
            record.category =
                answerMemorySafeString(
                    patch.category,
                    record.category ||
                        "general"
                );
        }

        if (
            patch.language !==
            undefined
        ) {
            record.language =
                answerMemorySafeString(
                    patch.language,
                    record.language ||
                        "tr"
                );
        }

        if (
            patch.scope !==
            undefined
        ) {
            record.scope =
                answerMemorySafeString(
                    patch.scope,
                    record.scope ||
                        "user"
                );
        }

        if (
            patch.source !==
            undefined
        ) {
            record.source =
                answerMemorySafeString(
                    patch.source,
                    record.source ||
                        "chat"
                );
        }

        if (
            patch.model !==
            undefined
        ) {
            record.model =
                answerMemorySafeString(
                    patch.model,
                    record.model ||
                        "local"
                );
        }

        if (
            patch.metadata !==
            undefined
        ) {
            record.metadata =
                Object.assign(
                    {},
                    answerMemoryEnsureObject(
                        record.metadata
                    ),
                    answerMemoryEnsureObject(
                        patch.metadata
                    )
                );
        }

        if (
            patch.custom !==
            undefined
        ) {
            record.custom =
                Object.assign(
                    {},
                    answerMemoryEnsureObject(
                        record.custom
                    ),
                    answerMemoryEnsureObject(
                        patch.custom
                    )
                );
        }

        record.updatedAt =
            answerMemoryNowISO();

        record.version =
            Number(
                record.version ||
                    1
            ) + 1;

        record.updates =
            Number(
                record.updates ||
                    0
            ) + 1;

        this.indexRecordV2(
            record
        );

        this.stats.updates =
            Number(
                this.stats
                    .updates ||
                    0
            ) + 1;

        this.stats.totalWrites =
            Number(
                this.stats
                    .totalWrites ||
                    0
            ) + 1;

        this.stats.lastWrite =
            answerMemoryNowISO();

        this.addHistoryV2(
            "manual_update",
            record
        );

        this.persist();

        return {
            ok: true,
            id,
            record:
                this.publicRecord(
                    record
                )
        };
    };


/* ============================================================
   2.42 - ARCHIVE RECORD
============================================================ */

AnswerMemory.prototype.archiveRecordV2 =
    function (
        id
    ) {
        const record =
            this.records?.[id];

        if (
            !record
        ) {
            return {
                ok: false,
                reason:
                    "not_found"
            };
        }

        record.archived =
            true;

        record.active =
            false;

        record.updatedAt =
            answerMemoryNowISO();

        this.removeRecordFromIndexV2(
            record
        );

        this.stats.deletions =
            Number(
                this.stats
                    .deletions ||
                    0
            ) + 1;

        this.addHistoryV2(
            "archive",
            record
        );

        this.persist();

        return {
            ok: true,
            id,
            record:
                this.publicRecord(
                    record
                )
        };
    };


/* ============================================================
   2.43 - RESTORE RECORD
============================================================ */

AnswerMemory.prototype.restoreRecordV2 =
    function (
        id
    ) {
        const record =
            this.records?.[id];

        if (
            !record
        ) {
            return {
                ok: false,
                reason:
                    "not_found"
            };
        }

        record.archived =
            false;

        record.active =
            true;

        record.updatedAt =
            answerMemoryNowISO();

        this.indexRecordV2(
            record
        );

        this.addHistoryV2(
            "restore",
            record
        );

        this.persist();

        return {
            ok: true,
            id,
            record:
                this.publicRecord(
                    record
                )
        };
    };


/* ============================================================
   2.44 - HARD DELETE RECORD
============================================================ */

AnswerMemory.prototype.hardDeleteRecordV2 =
    function (
        id
    ) {
        const record =
            this.records?.[id];

        if (
            !record
        ) {
            return {
                ok: false,
                reason:
                    "not_found"
            };
        }

        this.removeRecordFromIndexV2(
            record
        );

        delete this.records[
            id
        ];

        this.stats.deletions =
            Number(
                this.stats
                    .deletions ||
                    0
            ) + 1;

        this.stats.totalEntries =
            Object.keys(
                this.records
            ).length;

        this.stats.lastWrite =
            answerMemoryNowISO();

        this.addHistoryV2(
            "permanent_delete",
            record
        );

        this.persist();

        return {
            ok: true,
            id,
            permanent: true
        };
    };


/* ============================================================
   2.45 - LIST ACTIVE RECORDS
============================================================ */

AnswerMemory.prototype.listActiveRecordsV2 =
    function (
        options = {}
    ) {
        const records =
            Object.values(
                this.records ||
                    {}
            );

        let result =
            records.filter(
                record =>
                    record &&
                    record.active !==
                        false
            );

        if (
            options.userId
        ) {
            const userId =
                answerMemoryNormalizeUserId2(
                    options.userId
                );

            result =
                result.filter(
                    record =>
                        answerMemoryNormalizeUserId2(
                            record.userId
                        ) ===
                        userId
                );
        }

        if (
            options.category
        ) {
            result =
                result.filter(
                    record =>
                        record.category ===
                        options.category
                );
        }

        if (
            options.language
        ) {
            result =
                result.filter(
                    record =>
                        record.language ===
                        options.language
                );
        }

        result.sort(
            (
                a,
                b
            ) => {
                const dateA =
                    new Date(
                        a.updatedAt ||
                            a.createdAt ||
                            0
                    ).getTime();

                const dateB =
                    new Date(
                        b.updatedAt ||
                            b.createdAt ||
                            0
                    ).getTime();

                return (
                    dateB -
                    dateA
                );
            }
        );

        const limit =
            answerMemoryClamp(
                options.limit ??
                    100,
                1,
                10000
            );

        return result
            .slice(
                0,
                limit
            )
            .map(
                record =>
                    this.publicRecord(
                        record
                    )
            );
    };


/* ============================================================
   2.46 - USER RECORD COUNT
============================================================ */

AnswerMemory.prototype.getUserRecordCountV2 =
    function (
        userId
    ) {
        const normalized =
            answerMemoryNormalizeUserId2(
                userId
            );

        return Object.values(
            this.records ||
                {}
        ).filter(
            record =>
                record &&
                answerMemoryNormalizeUserId2(
                    record.userId
                ) ===
                    normalized &&
                record.active !==
                    false
        ).length;
    };


/* ============================================================
   2.47 - CATEGORY COUNTS
============================================================ */

AnswerMemory.prototype.getCategoryCountsV2 =
    function () {
        const counts =
            {};

        for (
            const record
            of Object.values(
                this.records ||
                    {}
            )
        ) {
            if (
                !record ||
                record.active ===
                    false
            ) {
                continue;
            }

            const category =
                record.category ||
                "general";

            counts[
                category
            ] =
                (
                    counts[
                        category
                    ] || 0
                ) + 1;
        }

        return counts;
    };


/* ============================================================
   2.48 - LANGUAGE COUNTS
============================================================ */

AnswerMemory.prototype.getLanguageCountsV2 =
    function () {
        const counts =
            {};

        for (
            const record
            of Object.values(
                this.records ||
                    {}
            )
        ) {
            if (
                !record ||
                record.active ===
                    false
            ) {
                continue;
            }

            const language =
                record.language ||
                "unknown";

            counts[
                language
            ] =
                (
                    counts[
                        language
                    ] || 0
                ) + 1;
        }

        return counts;
    };


/* ============================================================
   2.49 - USER COUNTS
============================================================ */

AnswerMemory.prototype.getUserCountsV2 =
    function () {
        const counts =
            {};

        for (
            const record
            of Object.values(
                this.records ||
                    {}
            )
        ) {
            if (
                !record ||
                record.active ===
                    false
            ) {
                continue;
            }

            const userId =
                answerMemoryNormalizeUserId2(
                    record.userId
                );

            counts[
                userId
            ] =
                (
                    counts[
                        userId
                    ] || 0
                ) + 1;
        }

        return counts;
    };


/* ============================================================
   2.50 - SEARCH PREPARATION
============================================================ */

AnswerMemory.prototype.prepareSearchQueryV2 =
    function (
        question
    ) {
        const original =
            answerMemorySafeString(
                question,
                ""
            ).trim();

        const normalized =
            answerMemoryNormalizeTurkish(
                original
            );

        const search =
            answerMemorySearchNormalize(
                original
            );

        const tokens =
            answerMemoryTokenize(
                original
            );

        const keywords =
            answerMemoryExtractKeywords(
                original
            );

        const category =
            answerMemoryDetectCategory(
                original
            );

        const language =
            answerMemoryDetectLanguage(
                original
            );

        const questionType =
            answerMemoryDetectQuestionType(
                original
            );

        return {
            original,
            normalized,
            search,
            tokens,
            keywords,
            category,
            language,
            questionType
        };
    };


/* ============================================================
   PART 2 STATUS
============================================================ */

console.log(
    "[AnswerMemory] Part 2/5 loaded."
);

console.log(
    "[AnswerMemory] Turkish normalization : ACTIVE"
);

console.log(
    "[AnswerMemory] Token engine           : ACTIVE"
);

console.log(
    "[AnswerMemory] Similarity engine       : ACTIVE"
);

console.log(
    "[AnswerMemory] Duplicate detection    : ACTIVE"
);

console.log(
    "[AnswerMemory] Record engine           : ACTIVE"
);

console.log(
    "[AnswerMemory] Search preparation      : ACTIVE"
);

/* ============================================================
   END OF PART 2
============================================================ */
/* ============================================================
   TÜRKAI ANSWER MEMORY ENGINE 5.0
   PART 3 / 5
   ADVANCED SEARCH + RANKING + CANDIDATE ENGINE
   + CACHE + RESULT ENGINE
============================================================ */


/* ============================================================
   3.0 - SEARCH CONSTANTS
============================================================ */

const ANSWER_MEMORY_SEARCH_LIMITS_3 = {
    minimumTopK:
        1,

    maximumTopK:
        100,

    defaultTopK:
        8,

    maximumCandidates:
        50000,

    minimumCandidateScore:
        0.05,

    minimumReturnScore:
        0.30,

    exactThreshold:
        0.96,

    strongThreshold:
        0.86,

    goodThreshold:
        0.72,

    weakThreshold:
        0.50
};


/* ============================================================
   3.1 - SAFE NUMBER
============================================================ */

function answerMemorySafeNumber3(
    value,
    fallback = 0
) {
    const number =
        Number(value);

    if (
        Number.isFinite(
            number
        )
    ) {
        return number;
    }

    return fallback;
}


/* ============================================================
   3.2 - SAFE BOOLEAN
============================================================ */

function answerMemorySafeBoolean3(
    value,
    fallback = false
) {
    if (
        value === undefined ||
        value === null
    ) {
        return fallback;
    }

    if (
        typeof value ===
        "boolean"
    ) {
        return value;
    }

    if (
        typeof value ===
        "string"
    ) {
        const normalized =
            value
                .trim()
                .toLocaleLowerCase(
                    "tr-TR"
                );

        if (
            [
                "true",
                "1",
                "yes",
                "evet",
                "on"
            ].includes(
                normalized
            )
        ) {
            return true;
        }

        if (
            [
                "false",
                "0",
                "no",
                "hayır",
                "off"
            ].includes(
                normalized
            )
        ) {
            return false;
        }
    }

    return Boolean(
        value
    );
}


/* ============================================================
   3.3 - CACHE KEY CREATOR
============================================================ */

function answerMemoryCreateSearchCacheKey3(
    question,
    options = {}
) {
    const prepared =
        typeof answerMemoryNormalizeTurkish ===
            "function"
            ? answerMemoryNormalizeTurkish(
                  question
              )
            : String(
                  question || ""
              )
                  .trim()
                  .toLocaleLowerCase(
                      "tr-TR"
                  );

    const payload = {
        q:
            prepared,

        userId:
            options.userId ||
            "anonymous",

        scope:
            options.scope ||
            null,

        category:
            options.category ||
            null,

        language:
            options.language ||
            null,

        topK:
            options.topK ||
            ANSWER_MEMORY_SEARCH_LIMITS_3.defaultTopK,

        minimumScore:
            options.minimumScore ??
            ANSWER_MEMORY_SEARCH_LIMITS_3.minimumReturnScore,

        userOnly:
            Boolean(
                options.userOnly
            ),

        includeArchived:
            Boolean(
                options.includeArchived
            ),

        includeInactive:
            Boolean(
                options.includeInactive
            )
    };

    return (
        "search:" +
        answerMemoryHash(
            JSON.stringify(
                payload
            )
        )
    );
}


/* ============================================================
   3.4 - CACHE ENTRY VALIDATION
============================================================ */

function answerMemoryValidateCacheEntry3(
    entry,
    ttl
) {
    if (
        !entry ||
        typeof entry !==
            "object"
    ) {
        return false;
    }

    const createdAt =
        answerMemorySafeNumber3(
            entry.createdAt,
            0
        );

    if (
        createdAt <= 0
    ) {
        return false;
    }

    const age =
        Date.now() -
        createdAt;

    return (
        age >= 0 &&
        age <=
            Math.max(
                1000,
                Number(
                    ttl || 0
                )
            ) &&
        entry.response &&
        typeof entry.response ===
            "object"
    );
}


/* ============================================================
   3.5 - CACHE READ
============================================================ */

AnswerMemory.prototype.getSearchCache3 =
    function (
        key
    ) {
        if (
            !this.cache ||
            typeof this.cache !==
                "object"
        ) {
            return null;
        }

        const ttl =
            answerMemorySafeNumber3(
                this.config?.cacheTTL,
                1000 * 60 * 15
            );

        const entry =
            this.cache[key];

        if (
            !answerMemoryValidateCacheEntry3(
                entry,
                ttl
            )
        ) {
            if (
                entry
            ) {
                delete this.cache[
                    key
                ];
            }

            return null;
        }

        try {
            return JSON.parse(
                JSON.stringify(
                    entry.response
                )
            );
        } catch {
            return null;
        }
    };


/* ============================================================
   3.6 - CACHE WRITE
============================================================ */

AnswerMemory.prototype.setSearchCache3 =
    function (
        key,
        response
    ) {
        if (
            !this.cache ||
            typeof this.cache !==
                "object"
        ) {
            this.cache = {};
        }

        this.cache[key] = {
            createdAt:
                Date.now(),

            response:
                JSON.parse(
                    JSON.stringify(
                        response
                    )
                )
        };

        const keys =
            Object.keys(
                this.cache
            );

        /*
        --------------------------------------------------------
        Cache çok büyürse eski girişleri temizle.
        --------------------------------------------------------
        */

        if (
            keys.length >
            10000
        ) {
            const removeCount =
                keys.length -
                8000;

            for (
                let i = 0;
                i < removeCount;
                i++
            ) {
                delete this.cache[
                    keys[i]
                ];
            }
        }

        return true;
    };


/* ============================================================
   3.7 - CACHE CLEAR
============================================================ */

AnswerMemory.prototype.clearSearchCache3 =
    function () {
        this.cache = {};

        try {
            answerMemoryWriteJSON(
                ANSWER_MEMORY_FILES.cache,
                this.cache
            );
        } catch {}

        return {
            ok: true,
            cleared: true
        };
    };


/* ============================================================
   3.8 - SEARCH CANDIDATE BY TOKEN
============================================================ */

AnswerMemory.prototype.getTokenCandidates3 =
    function (
        token
    ) {
        if (
            !token ||
            !this.index ||
            typeof this.index !==
                "object"
        ) {
            return [];
        }

        const ids =
            this.index[token];

        if (
            !Array.isArray(
                ids
            )
        ) {
            return [];
        }

        return ids;
    };


/* ============================================================
   3.9 - GET USER CANDIDATES
============================================================ */

AnswerMemory.prototype.getUserCandidates3 =
    function (
        userId
    ) {
        if (
            !this.userIndex ||
            typeof this.userIndex !==
                "object"
        ) {
            return [];
        }

        const normalized =
            typeof answerMemoryNormalizeUserId2 ===
                "function"
                ? answerMemoryNormalizeUserId2(
                      userId
                  )
                : String(
                      userId ||
                          "anonymous"
                  );

        const ids =
            this.userIndex[
                normalized
            ];

        return Array.isArray(
            ids
        )
            ? ids
            : [];
    };


/* ============================================================
   3.10 - GLOBAL CANDIDATE COLLECTION
============================================================ */

AnswerMemory.prototype.collectSearchCandidates3 =
    function (
        query,
        options = {}
    ) {
        const prepared =
            this.prepareSearchQueryV2
                ? this.prepareSearchQueryV2(
                      query
                  )
                : {
                      original:
                          query,
                      tokens:
                          typeof answerMemoryTokenize ===
                              "function"
                              ? answerMemoryTokenize(
                                    query
                                )
                              : []
                  };

        const candidateIds =
            new Set();

        /*
        --------------------------------------------------------
        1. Kullanıcının kendi kayıtları
        --------------------------------------------------------
        */

        if (
            options.userId
        ) {
            const userIds =
                this.getUserCandidates3(
                    options.userId
                );

            for (
                const id
                of userIds
            ) {
                candidateIds.add(
                    id
                );
            }
        }

        /*
        --------------------------------------------------------
        2. Token indeksinden adaylar
        --------------------------------------------------------
        */

        const tokens =
            Array.isArray(
                prepared.tokens
            )
                ? prepared.tokens
                : [];

        const keywords =
            Array.isArray(
                prepared.keywords
            )
                ? prepared.keywords
                : [];

        const searchTokens =
            answerMemoryUniqueArray(
                [
                    ...tokens,
                    ...keywords
                ]
            );

        /*
        En ayırt edici tokenlardan başlayalım.
        Çok yaygın kısa kelimeleri atla.
        */

        const usefulTokens =
            searchTokens.filter(
                token =>
                    String(
                        token
                    ).length >=
                    2
            );

        usefulTokens.sort(
            (
                a,
                b
            ) => {
                const aCount =
                    Array.isArray(
                        this.index?.[a]
                    )
                        ? this.index[
                              a
                          ].length
                        : Number.MAX_SAFE_INTEGER;

                const bCount =
                    Array.isArray(
                        this.index?.[b]
                    )
                        ? this.index[
                              b
                          ].length
                        : Number.MAX_SAFE_INTEGER;

                return (
                    aCount -
                    bCount
                );
            }
        );

        const tokenLimit =
            Math.min(
                20,
                usefulTokens.length
            );

        for (
            let i = 0;
            i < tokenLimit;
            i++
        ) {
            const token =
                usefulTokens[i];

            const ids =
                this.getTokenCandidates3(
                    token
                );

            for (
                const id
                of ids
            ) {
                candidateIds.add(
                    id
                );

                if (
                    candidateIds.size >=
                    ANSWER_MEMORY_SEARCH_LIMITS_3.maximumCandidates
                ) {
                    break;
                }
            }

            if (
                candidateIds.size >=
                ANSWER_MEMORY_SEARCH_LIMITS_3.maximumCandidates
            ) {
                break;
            }
        }

        /*
        --------------------------------------------------------
        3. Arama indeksi boşsa tüm aktif kayıtlar
        --------------------------------------------------------
        */

        if (
            candidateIds.size ===
            0
        ) {
            for (
                const record
                of Object.values(
                    this.records ||
                        {}
                )
            ) {
                if (
                    !record
                ) {
                    continue;
                }

                if (
                    record.active ===
                    false &&
                    !options.includeInactive
                ) {
                    continue;
                }

                if (
                    record.archived ===
                    true &&
                    !options.includeArchived
                ) {
                    continue;
                }

                candidateIds.add(
                    record.id
                );

                if (
                    candidateIds.size >=
                    ANSWER_MEMORY_SEARCH_LIMITS_3.maximumCandidates
                ) {
                    break;
                }
            }
        }

        return [
            ...candidateIds
        ];
    };


/* ============================================================
   3.11 - FILTER RECORD
============================================================ */

AnswerMemory.prototype.filterSearchRecord3 =
    function (
        record,
        options = {}
    ) {
        if (
            !record
        ) {
            return false;
        }

        if (
            record.active ===
                false &&
            !options.includeInactive
        ) {
            return false;
        }

        if (
            record.archived ===
                true &&
            !options.includeArchived
        ) {
            return false;
        }

        if (
            options.userOnly
        ) {
            const wantedUser =
                typeof answerMemoryNormalizeUserId2 ===
                    "function"
                    ? answerMemoryNormalizeUserId2(
                          options.userId
                      )
                    : String(
                          options.userId ||
                              "anonymous"
                      );

            const recordUser =
                typeof answerMemoryNormalizeUserId2 ===
                    "function"
                    ? answerMemoryNormalizeUserId2(
                          record.userId
                      )
                    : String(
                          record.userId ||
                              "anonymous"
                      );

            if (
                wantedUser !==
                recordUser
            ) {
                return false;
            }
        }

        if (
            options.userId &&
            options.scope ===
                "user"
        ) {
            /*
            Kullanıcı araması isteniyorsa kendi
            kullanıcısına ait kayıtları + explicit global
            kayıtları tut.
            */

            const wantedUser =
                typeof answerMemoryNormalizeUserId2 ===
                    "function"
                    ? answerMemoryNormalizeUserId2(
                          options.userId
                      )
                    : String(
                          options.userId ||
                              "anonymous"
                      );

            const recordUser =
                typeof answerMemoryNormalizeUserId2 ===
                    "function"
                    ? answerMemoryNormalizeUserId2(
                          record.userId
                      )
                    : String(
                          record.userId ||
                              "anonymous"
                      );

            if (
                wantedUser !==
                    recordUser &&
                record.scope !==
                    "global"
            ) {
                return false;
            }
        }

        if (
            options.scope &&
            options.scope !==
                "any"
        ) {
            if (
                record.scope !==
                options.scope
            ) {
                return false;
            }
        }

        if (
            options.category &&
            options.category !==
                "any"
        ) {
            if (
                record.category !==
                options.category
            ) {
                return false;
            }
        }

        if (
            options.language &&
            options.language !==
                "any"
        ) {
            if (
                record.language !==
                options.language
            ) {
                return false;
            }
        }

        if (
            Array.isArray(
                options.tags
            ) &&
            options.tags.length >
                0
        ) {
            const recordTags =
                new Set(
                    answerMemoryNormalizeTags(
                        record.tags || []
                    )
                );

            const requiredTags =
                answerMemoryNormalizeTags(
                    options.tags
                );

            const hasAllTags =
                options.matchAllTags ===
                true;

            if (
                hasAllTags
            ) {
                for (
                    const tag
                    of requiredTags
                ) {
                    if (
                        !recordTags.has(
                            tag
                        )
                    ) {
                        return false;
                    }
                }
            } else {
                let found = false;

                for (
                    const tag
                    of requiredTags
                ) {
                    if (
                        recordTags.has(
                            tag
                        )
                    ) {
                        found = true;
                        break;
                    }
                }

                if (
                    !found
                ) {
                    return false;
                }
            }
        }

        return true;
    };


/* ============================================================
   3.12 - RECENCY SCORE V3
============================================================ */

AnswerMemory.prototype.calculateRecencyScore3 =
    function (
        record,
        options = {}
    ) {
        if (
            !record
        ) {
            return 0;
        }

        const timestamp =
            new Date(
                record.updatedAt ||
                    record.createdAt ||
                    0
            ).getTime();

        if (
            !Number.isFinite(
                timestamp
            )
        ) {
            return 0;
        }

        const age =
            Math.max(
                0,
                Date.now() -
                    timestamp
            );

        const defaultHalfLife =
            1000 *
            60 *
            60 *
            24 *
            30;

        const halfLife =
            answerMemorySafeNumber3(
                options.recencyHalfLife ??
                    this.config
                        ?.recencyHalfLife ??
                    defaultHalfLife,
                defaultHalfLife
            );

        if (
            halfLife <=
            0
        ) {
            return 0;
        }

        return answerMemoryClamp(
            Math.pow(
                0.5,
                age /
                    halfLife
            ),
            0,
            1
        );
    };


/* ============================================================
   3.13 - FREQUENCY SCORE V3
============================================================ */

AnswerMemory.prototype.calculateFrequencyScore3 =
    function (
        record
    ) {
        if (
            !record
        ) {
            return 0;
        }

        const frequency =
            Math.max(
                0,
                answerMemorySafeNumber3(
                    record.frequency,
                    0
                )
            );

        const hits =
            Math.max(
                0,
                answerMemorySafeNumber3(
                    record.hits,
                    0
                )
            );

        const reads =
            frequency +
            hits;

        return answerMemoryClamp(
            Math.log1p(
                reads
            ) /
                10,
            0,
            1
        );
    };


/* ============================================================
   3.14 - IMPORTANCE SCORE V3
============================================================ */

AnswerMemory.prototype.calculateImportanceScore3 =
    function (
        record
    ) {
        if (
            !record
        ) {
            return 0;
        }

        const importance =
            answerMemorySafeNumber3(
                record.importance,
                0.50
            );

        const confidence =
            answerMemorySafeNumber3(
                record.confidence,
                0.80
            );

        const quality =
            answerMemorySafeNumber3(
                record.quality,
                0.70
            );

        let score =
            (
                importance *
                0.35
            ) +
            (
                confidence *
                0.35
            ) +
            (
                quality *
                0.30
            );

        if (
            record.verified
        ) {
            score +=
                0.05;
        }

        if (
            record.trusted
        ) {
            score +=
                0.05;
        }

        if (
            record.pinned
        ) {
            score +=
                0.03;
        }

        if (
            record.favorite
        ) {
            score +=
                0.02;
        }

        return answerMemoryClamp(
            score,
            0,
            1
        );
    };


/* ============================================================
   3.15 - USER MATCH BONUS
============================================================ */

AnswerMemory.prototype.calculateUserBonus3 =
    function (
        record,
        options = {}
    ) {
        if (
            !record ||
            !options.userId
        ) {
            return 0;
        }

        const left =
            typeof answerMemoryNormalizeUserId2 ===
                "function"
                ? answerMemoryNormalizeUserId2(
                      options.userId
                  )
                : String(
                      options.userId
                  );

        const right =
            typeof answerMemoryNormalizeUserId2 ===
                "function"
                ? answerMemoryNormalizeUserId2(
                      record.userId
                  )
                : String(
                      record.userId
                  );

        if (
            left ===
            right
        ) {
            return 0.08;
        }

        if (
            record.scope ===
            "global"
        ) {
            return 0.02;
        }

        return 0;
    };


/* ============================================================
   3.16 - CATEGORY BONUS
============================================================ */

AnswerMemory.prototype.calculateCategoryBonus3 =
    function (
        record,
        options = {}
    ) {
        if (
            !record ||
            !options.category
        ) {
            return 0;
        }

        return (
            record.category ===
            options.category
        )
            ? 0.04
            : 0;
    };


/* ============================================================
   3.17 - LANGUAGE BONUS
============================================================ */

AnswerMemory.prototype.calculateLanguageBonus3 =
    function (
        record,
        options = {}
    ) {
        if (
            !record ||
            !options.language
        ) {
            return 0;
        }

        return (
            record.language ===
            options.language
        )
            ? 0.03
            : 0;
    };


/* ============================================================
   3.18 - QUERY/RECORD SCORE V3
============================================================ */

AnswerMemory.prototype.calculateSearchScore3 =
    function (
        query,
        record,
        options = {}
    ) {
        if (
            !record
        ) {
            return null;
        }

        const candidateQuestion =
            record.searchQuestion ||
            record.normalizedQuestion ||
            record.question ||
            "";

        const similarity =
            answerMemoryCombinedSimilarity(
                query,
                candidateQuestion
            );

        const queryTokens =
            answerMemoryTokenize(
                query
            );

        const recordTokens =
            Array.isArray(
                record.tokens
            )
                ? record.tokens
                : answerMemoryTokenize(
                      record.question
                  );

        const overlap =
            answerMemoryTokenOverlap(
                queryTokens,
                recordTokens
            );

        const precision =
            answerMemoryPrecision(
                queryTokens,
                recordTokens
            );

        const recall =
            answerMemoryRecall(
                queryTokens,
                recordTokens
            );

        const recency =
            this.calculateRecencyScore3(
                record,
                options
            );

        const frequency =
            this.calculateFrequencyScore3(
                record
            );

        const importance =
            this.calculateImportanceScore3(
                record
            );

        const userBonus =
            this.calculateUserBonus3(
                record,
                options
            );

        const categoryBonus =
            this.calculateCategoryBonus3(
                record,
                options
            );

        const languageBonus =
            this.calculateLanguageBonus3(
                record,
                options
            );

        const exactBonus =
            similarity.exact >=
            1
                ? 0.15
                : similarity.exact >
                  0
                ? 0.04
                : 0;

        const phraseBonus =
            answerMemorySafeNumber3(
                similarity.phrase,
                0
            ) *
            0.08;

        const wordOrderBonus =
            answerMemorySafeNumber3(
                similarity.wordOrder,
                0
            ) *
            0.05;

        /*
        --------------------------------------------------------
        Ana puan:
        similarity ağır basar.
        Kalite ve güncellik de destekler.
        --------------------------------------------------------
        */

        let score =
            (
                similarity.score *
                0.48
            ) +
            (
                overlap *
                0.07
            ) +
            (
                precision *
                0.04
            ) +
            (
                recall *
                0.04
            ) +
            (
                recency *
                0.08
            ) +
            (
                frequency *
                0.06
            ) +
            (
                importance *
                0.13
            ) +
            exactBonus +
            phraseBonus +
            wordOrderBonus +
            userBonus +
            categoryBonus +
            languageBonus;

        if (
            record.archived
        ) {
            score -=
                0.10;
        }

        if (
            record.active ===
            false
        ) {
            score -=
                0.20;
        }

        score =
            answerMemoryClamp(
                score,
                0,
                1
            );

        const relevance =
            this.getRelevanceLevel3(
                score
            );

        return {
            score,

            relevance,

            similarity:
                similarity.score,

            exact:
                similarity.exact,

            jaccard:
                similarity.jaccard,

            dice:
                similarity.dice,

            f1:
                similarity.f1,

            ngram:
                similarity.ngram,

            contains:
                similarity.contains,

            phrase:
                similarity.phrase,

            wordOrder:
                similarity.wordOrder,

            overlap,

            precision,

            recall,

            recency,

            frequency,

            importance,

            userBonus,

            categoryBonus,

            languageBonus
        };
    };


/* ============================================================
   3.19 - RELEVANCE LEVEL V3
============================================================ */

AnswerMemory.prototype.getRelevanceLevel3 =
    function (
        score
    ) {
        const value =
            answerMemoryClamp(
                score,
                0,
                1
            );

        if (
            value >=
            ANSWER_MEMORY_SEARCH_LIMITS_3.exactThreshold
        ) {
            return "exact";
        }

        if (
            value >=
            ANSWER_MEMORY_SEARCH_LIMITS_3.strongThreshold
        ) {
            return "very_high";
        }

        if (
            value >=
            ANSWER_MEMORY_SEARCH_LIMITS_3.goodThreshold
        ) {
            return "high";
        }

        if (
            value >=
            ANSWER_MEMORY_SEARCH_LIMITS_3.weakThreshold
        ) {
            return "medium";
        }

        if (
            value >=
            0.30
        ) {
            return "low";
        }

        return "very_low";
    };


/* ============================================================
   3.20 - ANSWER CONFIDENCE
============================================================ */

AnswerMemory.prototype.calculateAnswerConfidence3 =
    function (
        result,
        record
    ) {
        if (
            !result ||
            !record
        ) {
            return 0;
        }

        let confidence =
            (
                Number(
                    result.score
                ) *
                0.55
            ) +
            (
                Number(
                    record.confidence ??
                        0.80
                ) *
                0.20
            ) +
            (
                Number(
                    record.quality ??
                        0.70
                ) *
                0.15
            ) +
            (
                Number(
                    record.importance ??
                        0.50
                ) *
                0.10
            );

        if (
            result.exact >=
            1
        ) {
            confidence +=
                0.08;
        }

        if (
            record.verified
        ) {
            confidence +=
                0.03;
        }

        if (
            record.trusted
        ) {
            confidence +=
                0.03;
        }

        return answerMemoryClamp(
            confidence,
            0,
            1
        );
    };


/* ============================================================
   3.21 - RESULT BUILDER
============================================================ */

AnswerMemory.prototype.buildSearchResult3 =
    function (
        record,
        ranking,
        options = {}
    ) {
        if (
            !record ||
            !ranking
        ) {
            return null;
        }

        const confidence =
            this.calculateAnswerConfidence3(
                ranking,
                record
            );

        const result = {
            id:
                record.id,

            question:
                record.question,

            answer:
                record.answer,

            userId:
                record.userId,

            userName:
                record.userName,

            scope:
                record.scope,

            language:
                record.language,

            category:
                record.category,

            questionType:
                record.questionType,

            tags:
                Array.isArray(
                    record.tags
                )
                    ? [
                          ...record.tags
                      ]
                    : [],

            score:
                ranking.score,

            relevance:
                ranking.relevance,

            confidence,

            similarity:
                ranking.similarity,

            exact:
                ranking.exact,

            quality:
                Number(
                    record.quality ??
                        0.70
                ),

            importance:
                Number(
                    record.importance ??
                        0.50
                ),

            frequency:
                Number(
                    record.frequency ??
                        1
                ),

            hits:
                Number(
                    record.hits ||
                        0
                ),

            createdAt:
                record.createdAt,

            updatedAt:
                record.updatedAt,

            lastReadAt:
                record.lastReadAt,

            source:
                record.source,

            model:
                record.model,

            pinned:
                Boolean(
                    record.pinned
                ),

            favorite:
                Boolean(
                    record.favorite
                ),

            verified:
                Boolean(
                    record.verified
                ),

            trusted:
                Boolean(
                    record.trusted
                ),

            archived:
                Boolean(
                    record.archived
                )
        };

        /*
        Debug modu aktifse ayrıntılı scoring döndür.
        */

        if (
            options.includeScores ===
            true
        ) {
            result.scores = {
                similarity:
                    ranking.similarity,

                jaccard:
                    ranking.jaccard,

                dice:
                    ranking.dice,

                f1:
                    ranking.f1,

                ngram:
                    ranking.ngram,

                contains:
                    ranking.contains,

                phrase:
                    ranking.phrase,

                wordOrder:
                    ranking.wordOrder,

                overlap:
                    ranking.overlap,

                precision:
                    ranking.precision,

                recall:
                    ranking.recall,

                recency:
                    ranking.recency,

                frequency:
                    ranking.frequency,

                importance:
                    ranking.importance,

                userBonus:
                    ranking.userBonus,

                categoryBonus:
                    ranking.categoryBonus,

                languageBonus:
                    ranking.languageBonus
            };
        }

        return result;
    };


/* ============================================================
   3.22 - ADVANCED SEARCH
============================================================ */

AnswerMemory.prototype.searchAdvanced3 =
    function (
        question,
        options = {}
    ) {
        const query =
            answerMemorySafeString(
                question,
                ""
            ).trim();

        if (
            !query
        ) {
            return {
                ok: false,
                query: "",
                count: 0,
                results: [],
                best: null,
                reason:
                    "empty_query"
            };
        }

        const minimumLength =
            Number(
                this.config
                    ?.minimumQuestionLength ||
                    4
            );

        if (
            query.length <
            minimumLength
        ) {
            return {
                ok: false,
                query,
                count: 0,
                results: [],
                best: null,
                reason:
                    "query_too_short"
            };
        }

        const prepared =
            this.prepareSearchQueryV2
                ? this.prepareSearchQueryV2(
                      query
                  )
                : {
                      original:
                          query,
                      normalized:
                          answerMemoryNormalizeTurkish(
                              query
                          ),
                      tokens:
                          answerMemoryTokenize(
                              query
                          ),
                      keywords:
                          answerMemoryExtractKeywords(
                              query
                          ),
                      category:
                          answerMemoryDetectCategory(
                              query
                          ),
                      language:
                          answerMemoryDetectLanguage(
                              query
                          ),
                      questionType:
                          answerMemoryDetectQuestionType(
                              query
                          )
                  };

        const effectiveOptions = {
            ...options
        };

        if (
            effectiveOptions.autoCategory !==
            false &&
            !effectiveOptions.category
        ) {
            effectiveOptions.category =
                options.disableAutoCategory
                    ? null
                    : prepared.category;
        }

        if (
            effectiveOptions.autoLanguage !==
            false &&
            !effectiveOptions.language
        ) {
            effectiveOptions.language =
                prepared.language !==
                "unknown"
                    ? prepared.language
                    : null;
        }

        const cacheKey =
            answerMemoryCreateSearchCacheKey3(
                query,
                effectiveOptions
            );

        if (
            this.config?.cacheEnabled !==
                false &&
            effectiveOptions.cache !==
                false
        ) {
            const cached =
                this.getSearchCache3(
                    cacheKey
                );

            if (
                cached
            ) {
                this.stats.cacheHits =
                    Number(
                        this.stats
                            .cacheHits ||
                            0
                    ) + 1;

                this.stats.searches =
                    Number(
                        this.stats.searches ||
                            0
                    ) + 1;

                this.stats.totalReads =
                    Number(
                        this.stats
                            .totalReads ||
                            0
                    ) + 1;

                this.stats.lastSearch =
                    answerMemoryNowISO();

                return {
                    ...cached,
                    cached: true
                };
            }

            this.stats.cacheMisses =
                Number(
                    this.stats
                        .cacheMisses ||
                        0
                ) + 1;
        }

        const candidateIds =
            this.collectSearchCandidates3(
                prepared.original,
                effectiveOptions
            );

        const ranked = [];

        const minimumScore =
            Number(
                effectiveOptions.minimumScore ??
                    this.config
                        ?.minimumScoreToReturn ??
                    ANSWER_MEMORY_SEARCH_LIMITS_3.minimumReturnScore
            );

        for (
            const id
            of candidateIds
        ) {
            const record =
                this.records?.[id];

            if (
                !record
            ) {
                continue;
            }

            if (
                !this.filterSearchRecord3(
                    record,
                    effectiveOptions
                )
            ) {
                continue;
            }

            const ranking =
                this.calculateSearchScore3(
                    prepared.original,
                    record,
                    effectiveOptions
                );

            if (
                !ranking
            ) {
                continue;
            }

            if (
                ranking.score <
                minimumScore
            ) {
                continue;
            }

            const result =
                this.buildSearchResult3(
                    record,
                    ranking,
                    effectiveOptions
                );

            if (
                result
            ) {
                ranked.push({
                    result,
                    record,
                    ranking
                });
            }
        }

        ranked.sort(
            (
                a,
                b
            ) => {
                if (
                    b.result.score !==
                    a.result.score
                ) {
                    return (
                        b.result.score -
                        a.result.score
                    );
                }

                if (
                    b.result.confidence !==
                    a.result.confidence
                ) {
                    return (
                        b.result.confidence -
                        a.result.confidence
                    );
                }

                const aDate =
                    new Date(
                        a.record.updatedAt ||
                            a.record.createdAt ||
                            0
                    ).getTime();

                const bDate =
                    new Date(
                        b.record.updatedAt ||
                            b.record.createdAt ||
                            0
                    ).getTime();

                return (
                    bDate -
                    aDate
                );
            }
        );

        const requestedTopK =
            answerMemorySafeNumber3(
                effectiveOptions.topK,
                ANSWER_MEMORY_SEARCH_LIMITS_3.defaultTopK
            );

        const topK =
            Math.floor(
                answerMemoryClamp(
                    requestedTopK,
                    ANSWER_MEMORY_SEARCH_LIMITS_3.minimumTopK,
                    ANSWER_MEMORY_SEARCH_LIMITS_3.maximumTopK
                )
            );

        const results =
            ranked
                .slice(
                    0,
                    topK
                )
                .map(
                    item =>
                        item.result
                );

        const best =
            results[0] ||
            null;

        /*
        --------------------------------------------------------
        Hit / miss metrikleri.
        --------------------------------------------------------
        */

        this.stats.searches =
            Number(
                this.stats.searches ||
                0
            ) + 1;

        this.stats.totalReads =
            Number(
                this.stats.totalReads ||
                0
            ) + 1;

        this.stats.lastRead =
            answerMemoryNowISO();

        this.stats.lastSearch =
            answerMemoryNowISO();

        if (
            best
        ) {
            this.stats.totalHits =
                Number(
                    this.stats
                        .totalHits ||
                    0
                ) + 1;

            this.stats.lastHit =
                answerMemoryNowISO();

            this.hitCount =
                Number(
                    this.hitCount ||
                    0
                ) + 1;
        } else {
            this.stats.totalMisses =
                Number(
                    this.stats
                        .totalMisses ||
                    0
                ) + 1;

            this.stats.lastMiss =
                answerMemoryNowISO();

            this.missCount =
                Number(
                    this.missCount ||
                    0
                ) + 1;
        }

        /*
        --------------------------------------------------------
        Kayıtların erişim sayaçlarını artır.
        --------------------------------------------------------
        */

        const touchTopResults =
            effectiveOptions.touchResults !==
            false;

        if (
            touchTopResults
        ) {
            const touchLimit =
                Math.min(
                    5,
                    results.length
                );

            for (
                let i = 0;
                i < touchLimit;
                i++
            ) {
                const id =
                    results[i].id;

                const record =
                    this.records?.[id];

                if (
                    !record
                ) {
                    continue;
                }

                record.hits =
                    Number(
                        record.hits ||
                        0
                    ) + 1;

                record.frequency =
                    Number(
                        record.frequency ||
                        1
                    ) + (
                        i === 0
                            ? 0.50
                            : 0.15
                    );

                record.lastReadAt =
                    answerMemoryNowISO();
            }
        }

        const response = {
            ok: true,

            query:
                prepared.original,

            normalizedQuery:
                prepared.normalized,

            tokens:
                prepared.tokens,

            keywords:
                prepared.keywords,

            detectedCategory:
                prepared.category,

            detectedLanguage:
                prepared.language,

            questionType:
                prepared.questionType,

            count:
                results.length,

            totalCandidates:
                candidateIds.length,

            totalRanked:
                ranked.length,

            results,

            best,

            confidence:
                best
                    ? best.confidence
                    : 0,

            relevance:
                best
                    ? best.relevance
                    : "none",

            hit:
                Boolean(
                    best
                ),

            cached:
                false
        };

        /*
        --------------------------------------------------------
        Cache
        --------------------------------------------------------
        */

        if (
            this.config?.cacheEnabled !==
                false &&
            effectiveOptions.cache !==
                false
        ) {
            this.setSearchCache3(
                cacheKey,
                response
            );
        }

        /*
        --------------------------------------------------------
        History
        --------------------------------------------------------
        */

        if (
            effectiveOptions.recordHistory !==
                false &&
            typeof this.addHistoryV2 ===
                "function"
        ) {
            this.addHistoryV2(
                best
                    ? "advanced_search_hit"
                    : "advanced_search_miss",
                best
                    ? this.records?.[
                          best.id
                      ]
                    : null,
                {
                    query:
                        prepared.original,

                    score:
                        best?.score ??
                        null,

                    userId:
                        effectiveOptions.userId ||
                        null,

                    category:
                        prepared.category,

                    source:
                        "searchAdvanced3"
                }
            );
        }

        if (
            effectiveOptions.persist !==
            false
        ) {
            try {
                this.persist();
            } catch {}
        }

        return response;
    };


/* ============================================================
   3.23 - SIMPLE SEARCH OVERRIDE
============================================================ */

AnswerMemory.prototype.searchV3 =
    function (
        question,
        options = {}
    ) {
        return this.searchAdvanced3(
            question,
            options
        );
    };


/* ============================================================
   3.24 - FIND BEST ANSWER
============================================================ */

AnswerMemory.prototype.findBestAnswer3 =
    function (
        question,
        options = {}
    ) {
        const result =
            this.searchAdvanced3(
                question,
                {
                    ...options,
                    topK: 1
                }
            );

        if (
            !result?.best
        ) {
            return null;
        }

        return result.best;
    };


/* ============================================================
   3.25 - GET ANSWER TEXT ONLY
============================================================ */

AnswerMemory.prototype.getAnswerText3 =
    function (
        question,
        options = {}
    ) {
        const best =
            this.findBestAnswer3(
                question,
                options
            );

        if (
            !best
        ) {
            return null;
        }

        return (
            best.answer ||
            null
        );
    };


/* ============================================================
   3.26 - IS ANSWER USABLE
============================================================ */

AnswerMemory.prototype.isAnswerUsable3 =
    function (
        result,
        options = {}
    ) {
        if (
            !result
        ) {
            return false;
        }

        const minimumScore =
            Number(
                options.minimumScore ??
                    this.config
                        ?.minimumScoreToReturn ??
                    0.30
            );

        const minimumConfidence =
            Number(
                options.minimumConfidence ??
                    0.55
            );

        if (
            Number(
                result.score
            ) <
            minimumScore
        ) {
            return false;
        }

        if (
            Number(
                result.confidence
            ) <
            minimumConfidence
        ) {
            return false;
        }

        if (
            result.relevance ===
            "very_low"
        ) {
            return false;
        }

        return true;
    };


/* ============================================================
   3.27 - CHAT MEMORY DECISION
============================================================ */

AnswerMemory.prototype.decideForChat3 =
    function (
        question,
        options = {}
    ) {
        const currentQuestion =
            answerMemorySafeString(
                question,
                ""
            ).trim();

        if (
            !currentQuestion
        ) {
            return {
                useMemory: false,
                reason:
                    "empty_question",
                result: null
            };
        }

        /*
        --------------------------------------------------------
        Güncel bilgi içeren soruları otomatik olarak
        hafızadan cevaplamama seçeneği.
        --------------------------------------------------------
        */

        const currentKnowledgePattern =
            /(bugün|şimdi|şu anda|güncel|son dakika|son durum|en son|bugünkü|yarın|dün|hava durumu|dolar|euro|altın|borsa|kur ne kadar)/iu;

        if (
            currentKnowledgePattern.test(
                currentQuestion
            ) &&
            options.allowCurrentMemory !==
                true
        ) {
            return {
                useMemory: false,
                reason:
                    "current_information",
                result: null
            };
        }

        const result =
            this.searchAdvanced3(
                currentQuestion,
                {
                    ...options,
                    topK:
                        options.topK ||
                        3
                }
            );

        if (
            !result.best
        ) {
            return {
                useMemory: false,
                reason:
                    "memory_miss",
                result
            };
        }

        const usable =
            this.isAnswerUsable3(
                result.best,
                {
                    minimumScore:
                        options.minimumScore ??
                        0.72,

                    minimumConfidence:
                        options.minimumConfidence ??
                        0.65
                }
            );

        if (
            !usable
        ) {
            return {
                useMemory: false,
                reason:
                    "low_confidence",
                result
            };
        }

        return {
            useMemory: true,

            reason:
                result.best.exact >=
                1
                    ? "exact_memory_match"
                    : "strong_memory_match",

            result:
                result.best
        };
    };


/* ============================================================
   3.28 - GET CONTEXT
============================================================ */

AnswerMemory.prototype.getMemoryContext3 =
    function (
        question,
        options = {}
    ) {
        const result =
            this.searchAdvanced3(
                question,
                {
                    ...options,
                    topK:
                        options.topK ||
                        5,
                    touchResults:
                        options.touchResults ??
                        false
                }
            );

        const usableResults =
            result.results.filter(
                item =>
                    this.isAnswerUsable3(
                        item,
                        {
                            minimumScore:
                                options.minimumScore ??
                                0.55,

                            minimumConfidence:
                                options.minimumConfidence ??
                                0.55
                        }
                    )
            );

        return {
            ok: true,

            query:
                result.query,

            count:
                usableResults.length,

            results:
                usableResults,

            best:
                usableResults[0] ||
                null,

            text:
                usableResults
                    .map(
                        item =>
                            `Soru: ${item.question}\nCevap: ${item.answer}`
                    )
                    .join(
                        "\n\n"
                    )
        };
    };


/* ============================================================
   3.29 - MEMORY HIT HELPER
============================================================ */

AnswerMemory.prototype.getMemoryHit3 =
    function (
        question,
        options = {}
    ) {
        const decision =
            this.decideForChat3(
                question,
                options
            );

        if (
            !decision.useMemory
        ) {
            return null;
        }

        return decision.result;
    };


/* ============================================================
   3.30 - SEARCH SUMMARY
============================================================ */

AnswerMemory.prototype.searchSummary3 =
    function (
        question,
        options = {}
    ) {
        const result =
            this.searchAdvanced3(
                question,
                {
                    ...options,
                    topK:
                        options.topK ||
                        5
                }
            );

        return {
            ok:
                result.ok,

            query:
                result.query,

            found:
                result.count > 0,

            count:
                result.count,

            bestId:
                result.best?.id ||
                null,

            bestScore:
                result.best?.score ??
                0,

            bestConfidence:
                result.best?.confidence ??
                0,

            relevance:
                result.best?.relevance ||
                "none",

            detectedCategory:
                result.detectedCategory,

            detectedLanguage:
                result.detectedLanguage,

            questionType:
                result.questionType,

            cached:
                Boolean(
                    result.cached
                )
        };
    };


/* ============================================================
   3.31 - INDEX REPAIR
============================================================ */

AnswerMemory.prototype.repairIndex3 =
    function () {
        this.index = {};
        this.userIndex = {};

        let indexed =
            0;

        for (
            const record
            of Object.values(
                this.records ||
                    {}
            )
        ) {
            if (
                !record ||
                !record.id
            ) {
                continue;
            }

            if (
                !Array.isArray(
                    record.tokens
                )
            ) {
                record.tokens =
                    answerMemoryUniqueArray(
                        answerMemoryTokenize(
                            record.question
                        )
                    );
            }

            if (
                !Array.isArray(
                    record.keywords
                )
            ) {
                record.keywords =
                    answerMemoryExtractKeywords(
                        record.question
                    );
            }

            this.indexRecordV2
                ? this.indexRecordV2(
                      record
                  )
                : this.indexRecord(
                      record
                  );

            indexed++;
        }

        this.stats.rebuilds =
            Number(
                this.stats.rebuilds ||
                    0
            ) + 1;

        this.stats.lastMaintenance =
            answerMemoryNowISO();

        this.persist();

        return {
            ok: true,

            indexed,

            tokens:
                Object.keys(
                    this.index ||
                        {}
                ).length,

            users:
                Object.keys(
                    this.userIndex ||
                        {}
                ).length
        };
    };


/* ============================================================
   3.32 - SEARCH DIAGNOSTICS
============================================================ */

AnswerMemory.prototype.getSearchDiagnostics3 =
    function (
        question,
        options = {}
    ) {
        const prepared =
            this.prepareSearchQueryV2
                ? this.prepareSearchQueryV2(
                      question
                  )
                : null;

        const candidateIds =
            this.collectSearchCandidates3(
                question,
                options
            );

        const diagnostics = {
            ok: true,

            query:
                answerMemorySafeString(
                    question,
                    ""
                ),

            prepared,

            candidateCount:
                candidateIds.length,

            candidates: [],

            indexTokenCount:
                Object.keys(
                    this.index ||
                        {}
                ).length,

            totalRecords:
                Object.keys(
                    this.records ||
                        {}
                ).length
        };

        const max =
            Math.min(
                50,
                candidateIds.length
            );

        for (
            let i = 0;
            i < max;
            i++
        ) {
            const id =
                candidateIds[i];

            const record =
                this.records?.[id];

            if (
                !record
            ) {
                continue;
            }

            const ranking =
                this.calculateSearchScore3(
                    question,
                    record,
                    options
                );

            diagnostics.candidates.push(
                {
                    id,
                    question:
                        record.question,
                    score:
                        ranking?.score ??
                        0,
                    similarity:
                        ranking?.similarity ??
                        0,
                    relevance:
                        ranking?.relevance ||
                        "none",
                    category:
                        record.category,
                    userId:
                        record.userId
                }
            );
        }

        diagnostics.candidates.sort(
            (
                a,
                b
            ) =>
                b.score -
                a.score
        );

        return diagnostics;
    };


/* ============================================================
   3.33 - SEARCH STATS
============================================================ */

AnswerMemory.prototype.getSearchStats3 =
    function () {
        const totalSearches =
            Number(
                this.stats
                    ?.searches ||
                    0
            );

        const totalHits =
            Number(
                this.stats
                    ?.totalHits ||
                    0
            );

        const totalMisses =
            Number(
                this.stats
                    ?.totalMisses ||
                    0
            );

        const cacheHits =
            Number(
                this.stats
                    ?.cacheHits ||
                    0
            );

        const cacheMisses =
            Number(
                this.stats
                    ?.cacheMisses ||
                    0
            );

        const hitRate =
            totalSearches >
            0
                ? totalHits /
                  totalSearches
                : 0;

        const cacheTotal =
            cacheHits +
            cacheMisses;

        const cacheHitRate =
            cacheTotal >
            0
                ? cacheHits /
                  cacheTotal
                : 0;

        return {
            totalSearches,

            totalHits,

            totalMisses,

            hitRate:
                answerMemoryClamp(
                    hitRate,
                    0,
                    1
                ),

            cacheHits,

            cacheMisses,

            cacheHitRate:
                answerMemoryClamp(
                    cacheHitRate,
                    0,
                    1
                ),

            records:
                Object.keys(
                    this.records ||
                        {}
                ).length,

            indexTokens:
                Object.keys(
                    this.index ||
                        {}
                ).length
        };
    };


/* ============================================================
   3.34 - COMPATIBILITY GLOBAL FUNCTIONS
============================================================ */

function searchAnswerMemory3(
    question,
    options = {}
) {
    if (
        !globalAnswerMemoryInstance
    ) {
        return {
            ok: false,
            results: [],
            best: null,
            reason:
                "memory_unavailable"
        };
    }

    return globalAnswerMemoryInstance.searchAdvanced3(
        question,
        options
    );
}


function findBestAnswerMemory3(
    question,
    options = {}
) {
    if (
        !globalAnswerMemoryInstance
    ) {
        return null;
    }

    return globalAnswerMemoryInstance.findBestAnswer3(
        question,
        options
    );
}


function getMemoryContext3(
    question,
    options = {}
) {
    if (
        !globalAnswerMemoryInstance
    ) {
        return {
            ok: false,
            results: [],
            best: null,
            text: ""
        };
    }

    return globalAnswerMemoryInstance.getMemoryContext3(
        question,
        options
    );
}

var globalAnswerMemoryInstance = null;
/* ============================================================
   3.35 - GLOBAL API
============================================================ */

globalThis.searchAnswerMemory3 =
    searchAnswerMemory3;

globalThis.findBestAnswerMemory3 =
    findBestAnswerMemory3;

globalThis.getMemoryContext3 =
    getMemoryContext3;


/* ============================================================
   3.36 - ANSWER MEMORY SEARCH BRIDGE
============================================================ */

globalThis.turkAIAnswerMemorySearch =
    function (
        question,
        options = {}
    ) {
        return searchAnswerMemory3(
            question,
            options
        );
    };


globalThis.turkAIAnswerMemoryBest =
    function (
        question,
        options = {}
    ) {
        return findBestAnswerMemory3(
            question,
            options
        );
    };


globalThis.turkAIAnswerMemoryContext =
    function (
        question,
        options = {}
    ) {
        return getMemoryContext3(
            question,
            options
        );
    };


/* ============================================================
   3.37 - DEFAULT SEARCH METHODS
============================================================ */

/*
Part 1'de oluşturulmuş search() varsa onu koruyoruz.
Ama yeni motoru kullanmak için searchSmart()
ve searchAdvanced() sunuyoruz.
*/

AnswerMemory.prototype.searchSmart =
    function (
        question,
        options = {}
    ) {
        return this.searchAdvanced3(
            question,
            options
        );
    };


AnswerMemory.prototype.searchAdvanced =
    function (
        question,
        options = {}
    ) {
        return this.searchAdvanced3(
            question,
            options
        );
    };


AnswerMemory.prototype.findBest =
    function (
        question,
        options = {}
    ) {
        return this.findBestAnswer3(
            question,
            options
        );
    };


AnswerMemory.prototype.getContext =
    function (
        question,
        options = {}
    ) {
        return this.getMemoryContext3(
            question,
            options
        );
    };


/* ============================================================
   3.38 - SEARCH ENGINE STATUS
============================================================ */

function answerMemorySearchEngineStatus3() {
    const instance =
        globalAnswerMemoryInstance;

    return {
        ok:
            Boolean(
                instance
            ),

        version:
            ANSWER_MEMORY_VERSION,

        engine:
            "Advanced Search Engine 3",

        enabled:
            Boolean(
                instance?.config
                    ?.enabled
            ),

        cache:
            Boolean(
                instance?.config
                    ?.cacheEnabled
            ),

        records:
            Object.keys(
                instance?.records ||
                    {}
            ).length,

        indexedTokens:
            Object.keys(
                instance?.index ||
                    {}
            ).length,

        users:
            Object.keys(
                instance?.userIndex ||
                    {}
            ).length,

        stats:
            instance
                ? instance.getSearchStats3()
                : null
    };
}


globalThis.answerMemorySearchEngineStatus3 =
    answerMemorySearchEngineStatus3;


/* ============================================================
   3.39 - PART 3 LOG
============================================================ */

console.log(
    "[AnswerMemory] Part 3/5 loaded."
);

console.log(
    "[AnswerMemory] Advanced search        : ACTIVE"
);

console.log(
    "[AnswerMemory] Ranking engine          : ACTIVE"
);

console.log(
    "[AnswerMemory] Candidate engine        : ACTIVE"
);

console.log(
    "[AnswerMemory] Similarity fusion       : ACTIVE"
);

console.log(
    "[AnswerMemory] Search cache            : ACTIVE"
);

console.log(
    "[AnswerMemory] Chat memory decision    : ACTIVE"
);

console.log(
    "[AnswerMemory] Context builder         : ACTIVE"
);

/* ============================================================
   END OF PART 3
============================================================ */
/* ============================================================
   TÜRKAI ANSWER MEMORY ENGINE 5.0
   PART 4 / 5
   AUTO LEARNING + USER MEMORY + QUALITY ENGINE
   + HISTORY + ANALYTICS + BULK OPERATIONS
============================================================ */


/* ============================================================
   4.0 - ANSWER QUALITY CONSTANTS
============================================================ */

const ANSWER_MEMORY_QUALITY_RULES_4 = {
    defaultQuality:
        0.70,

    minimumQuality:
        0,

    maximumQuality:
        1,

    defaultConfidence:
        0.80,

    defaultImportance:
        0.50,

    hitPositive:
        0.025,

    missNegative:
        0.045,

    verifiedBonus:
        0.05,

    trustedBonus:
        0.05,

    pinnedBonus:
        0.025,

    favoriteBonus:
        0.015,

    duplicatePositive:
        0.01,

    badAnswerPenalty:
        0.12,

    maximumQualityHistory:
        100
};


/* ============================================================
   4.1 - SAFE TEXT V4
============================================================ */

function answerMemorySafeText4(
    value,
    fallback = ""
) {
    if (
        value === undefined ||
        value === null
    ) {
        return fallback;
    }

    if (
        typeof value === "string"
    ) {
        return value.trim();
    }

    if (
        typeof value === "number" ||
        typeof value === "boolean" ||
        typeof value === "bigint"
    ) {
        return String(
            value
        ).trim();
    }

    try {
        return JSON.stringify(
            value
        ).trim();
    } catch {
        return fallback;
    }
}


/* ============================================================
   4.2 - QUALITY CLAMP
============================================================ */

function answerMemoryQualityClamp4(
    value,
    fallback = 0.70
) {
    const numeric =
        Number(value);

    if (
        !Number.isFinite(
            numeric
        )
    ) {
        return fallback;
    }

    return answerMemoryClamp(
        numeric,
        ANSWER_MEMORY_QUALITY_RULES_4.minimumQuality,
        ANSWER_MEMORY_QUALITY_RULES_4.maximumQuality
    );
}


/* ============================================================
   4.3 - QUALITY SCORE BUILDER
============================================================ */

function answerMemoryBuildQuality4(
    options = {}
) {
    let quality =
        answerMemoryQualityClamp4(
            options.quality,
            ANSWER_MEMORY_QUALITY_RULES_4.defaultQuality
        );

    let confidence =
        answerMemoryQualityClamp4(
            options.confidence,
            ANSWER_MEMORY_QUALITY_RULES_4.defaultConfidence
        );

    let importance =
        answerMemoryQualityClamp4(
            options.importance,
            ANSWER_MEMORY_QUALITY_RULES_4.defaultImportance
        );

    if (
        options.verified
    ) {
        quality +=
            ANSWER_MEMORY_QUALITY_RULES_4
                .verifiedBonus;
    }

    if (
        options.trusted
    ) {
        quality +=
            ANSWER_MEMORY_QUALITY_RULES_4
                .trustedBonus;
    }

    if (
        options.pinned
    ) {
        quality +=
            ANSWER_MEMORY_QUALITY_RULES_4
                .pinnedBonus;
    }

    if (
        options.favorite
    ) {
        quality +=
            ANSWER_MEMORY_QUALITY_RULES_4
                .favoriteBonus;
    }

    quality =
        answerMemoryQualityClamp4(
            quality
        );

    return {
        quality,
        confidence,
        importance
    };
}


/* ============================================================
   4.4 - RECORD QUALITY PROFILE
============================================================ */

AnswerMemory.prototype.getQualityProfile4 =
    function (
        record
    ) {
        if (
            !record
        ) {
            return null;
        }

        const quality =
            answerMemoryQualityClamp4(
                record.quality,
                0.70
            );

        const confidence =
            answerMemoryQualityClamp4(
                record.confidence,
                0.80
            );

        const importance =
            answerMemoryQualityClamp4(
                record.importance,
                0.50
            );

        const hits =
            Math.max(
                0,
                Number(
                    record.hits ||
                        0
                )
            );

        const misses =
            Math.max(
                0,
                Number(
                    record.misses ||
                        0
                )
            );

        const totalFeedback =
            hits +
            misses;

        const feedbackRate =
            totalFeedback >
            0
                ? hits /
                  totalFeedback
                : 0.50;

        const qualityScore =
            answerMemoryClamp(
                (
                    quality *
                    0.40
                ) +
                (
                    confidence *
                    0.25
                ) +
                (
                    importance *
                    0.15
                ) +
                (
                    feedbackRate *
                    0.20
                ),
                0,
                1
            );

        return {
            quality,
            confidence,
            importance,
            hits,
            misses,
            totalFeedback,
            feedbackRate,
            qualityScore
        };
    };


/* ============================================================
   4.5 - FEEDBACK EVENT
============================================================ */

AnswerMemory.prototype.recordFeedback4 =
    function (
        id,
        feedback,
        options = {}
    ) {
        const record =
            this.records?.[id];

        if (
            !record
        ) {
            return {
                ok: false,
                reason:
                    "not_found"
            };
        }

        const normalized =
            answerMemorySafeText4(
                feedback,
                ""
            )
                .toLocaleLowerCase(
                    "tr-TR"
                )
                .trim();

        const positiveValues = [
            "positive",
            "good",
            "correct",
            "helpful",
            "like",
            "up",
            "true",
            "1",
            "evet",
            "doğru",
            "iyi",
            "yararlı"
        ];

        const negativeValues = [
            "negative",
            "bad",
            "wrong",
            "unhelpful",
            "dislike",
            "down",
            "false",
            "0",
            "hayır",
            "yanlış",
            "kötü",
            "yararsız"
        ];

        const isPositive =
            positiveValues.includes(
                normalized
            );

        const isNegative =
            negativeValues.includes(
                normalized
            );

        if (
            !isPositive &&
            !isNegative
        ) {
            return {
                ok: false,
                reason:
                    "invalid_feedback"
            };
        }

        const now =
            answerMemoryNowISO();

        if (
            isPositive
        ) {
            record.hits =
                Number(
                    record.hits ||
                        0
                ) + 1;

            record.frequency =
                Number(
                    record.frequency ||
                        1
                ) + 0.50;

            record.quality =
                answerMemoryQualityClamp4(
                    Number(
                        record.quality ??
                            0.70
                    ) +
                        ANSWER_MEMORY_QUALITY_RULES_4
                            .hitPositive
                );

            record.confidence =
                answerMemoryQualityClamp4(
                    Number(
                        record.confidence ??
                            0.80
                    ) +
                        0.015
                );
        }

        if (
            isNegative
        ) {
            record.misses =
                Number(
                    record.misses ||
                        0
                ) + 1;

            record.quality =
                answerMemoryQualityClamp4(
                    Number(
                        record.quality ??
                            0.70
                    ) -
                        ANSWER_MEMORY_QUALITY_RULES_4
                            .missNegative
                );

            record.confidence =
                answerMemoryQualityClamp4(
                    Number(
                        record.confidence ??
                            0.80
                    ) -
                        0.020
                );
        }

        record.updatedAt =
            now;

        record.lastReadAt =
            now;

        record.metadata =
            Object.assign(
                {},
                answerMemoryEnsureObject(
                    record.metadata
                ),
                {
                    lastFeedback:
                        isPositive
                            ? "positive"
                            : "negative",

                    lastFeedbackAt:
                        now
                }
            );

        if (
            !Array.isArray(
                record.feedbackHistory
            )
        ) {
            record.feedbackHistory =
                [];
        }

        record.feedbackHistory.push({
            type:
                isPositive
                    ? "positive"
                    : "negative",

            timestamp:
                now,

            userId:
                options.userId ||
                record.userId ||
                null,

            note:
                answerMemorySafeText4(
                    options.note,
                    ""
                )
        });

        if (
            record.feedbackHistory.length >
            ANSWER_MEMORY_QUALITY_RULES_4
                .maximumQualityHistory
        ) {
            record.feedbackHistory =
                record.feedbackHistory.slice(
                    -ANSWER_MEMORY_QUALITY_RULES_4
                        .maximumQualityHistory
                );
        }

        this.stats.lastWrite =
            now;

        this.addHistoryV2?.(
            isPositive
                ? "feedback_positive"
                : "feedback_negative",
            record,
            {
                userId:
                    options.userId ||
                    record.userId ||
                    null,

                source:
                    "feedback"
            }
        );

        this.persist();

        return {
            ok: true,

            id,

            feedback:
                isPositive
                    ? "positive"
                    : "negative",

            quality:
                record.quality,

            confidence:
                record.confidence,

            hits:
                record.hits,

            misses:
                record.misses
        };
    };


/* ============================================================
   4.6 - MARK POSITIVE
============================================================ */

AnswerMemory.prototype.markHelpful4 =
    function (
        id,
        options = {}
    ) {
        return this.recordFeedback4(
            id,
            "positive",
            options
        );
    };


/* ============================================================
   4.7 - MARK NEGATIVE
============================================================ */

AnswerMemory.prototype.markUnhelpful4 =
    function (
        id,
        options = {}
    ) {
        return this.recordFeedback4(
            id,
            "negative",
            options
        );
    };


/* ============================================================
   4.8 - VERIFY RECORD
============================================================ */

AnswerMemory.prototype.verifyRecord4 =
    function (
        id,
        verified = true,
        options = {}
    ) {
        const record =
            this.records?.[id];

        if (
            !record
        ) {
            return {
                ok: false,
                reason:
                    "not_found"
            };
        }

        record.verified =
            Boolean(
                verified
            );

        if (
            record.verified
        ) {
            record.quality =
                answerMemoryQualityClamp4(
                    Number(
                        record.quality ??
                            0.70
                    ) + 0.05
                );

            record.confidence =
                answerMemoryQualityClamp4(
                    Number(
                        record.confidence ??
                            0.80
                    ) + 0.03
                );
        }

        record.updatedAt =
            answerMemoryNowISO();

        this.addHistoryV2?.(
            record.verified
                ? "verify"
                : "unverify",
            record,
            {
                userId:
                    options.userId ||
                    null
            }
        );

        this.persist();

        return {
            ok: true,
            id,
            verified:
                record.verified,
            quality:
                record.quality,
            confidence:
                record.confidence
        };
    };


/* ============================================================
   4.9 - TRUST RECORD
============================================================ */

AnswerMemory.prototype.trustRecord4 =
    function (
        id,
        trusted = true,
        options = {}
    ) {
        const record =
            this.records?.[id];

        if (
            !record
        ) {
            return {
                ok: false,
                reason:
                    "not_found"
            };
        }

        record.trusted =
            Boolean(
                trusted
            );

        if (
            record.trusted
        ) {
            record.quality =
                answerMemoryQualityClamp4(
                    Number(
                        record.quality ??
                            0.70
                    ) + 0.05
                );

            record.confidence =
                answerMemoryQualityClamp4(
                    Number(
                        record.confidence ??
                            0.80
                    ) + 0.03
                );
        }

        record.updatedAt =
            answerMemoryNowISO();

        this.addHistoryV2?.(
            record.trusted
                ? "trust"
                : "untrust",
            record,
            {
                userId:
                    options.userId ||
                    null
            }
        );

        this.persist();

        return {
            ok: true,
            id,
            trusted:
                record.trusted,
            quality:
                record.quality,
            confidence:
                record.confidence
        };
    };


/* ============================================================
   4.10 - PIN RECORD
============================================================ */

AnswerMemory.prototype.pinRecord4 =
    function (
        id,
        pinned = true,
        options = {}
    ) {
        const record =
            this.records?.[id];

        if (
            !record
        ) {
            return {
                ok: false,
                reason:
                    "not_found"
            };
        }

        record.pinned =
            Boolean(
                pinned
            );

        record.updatedAt =
            answerMemoryNowISO();

        this.addHistoryV2?.(
            record.pinned
                ? "pin"
                : "unpin",
            record
        );

        this.persist();

        return {
            ok: true,
            id,
            pinned:
                record.pinned
        };
    };


/* ============================================================
   4.11 - FAVORITE RECORD
============================================================ */

AnswerMemory.prototype.favoriteRecord4 =
    function (
        id,
        favorite = true,
        options = {}
    ) {
        const record =
            this.records?.[id];

        if (
            !record
        ) {
            return {
                ok: false,
                reason:
                    "not_found"
            };
        }

        record.favorite =
            Boolean(
                favorite
            );

        record.updatedAt =
            answerMemoryNowISO();

        this.addHistoryV2?.(
            record.favorite
                ? "favorite"
                : "unfavorite",
            record
        );

        this.persist();

        return {
            ok: true,
            id,
            favorite:
                record.favorite
        };
    };


/* ============================================================
   4.12 - AUTO LEARN DECISION
============================================================ */

AnswerMemory.prototype.shouldAutoLearn4 =
    function (
        question,
        answer,
        options = {}
    ) {
        const q =
            answerMemorySafeText4(
                question,
                ""
            );

        const a =
            answerMemorySafeText4(
                answer,
                ""
            );

        if (
            !this.config?.enabled
        ) {
            return {
                learn: false,
                reason:
                    "memory_disabled"
            };
        }

        if (
            this.config?.autoLearn ===
            false
        ) {
            return {
                learn: false,
                reason:
                    "auto_learning_disabled"
            };
        }

        if (
            q.length <
            Number(
                this.config
                    ?.minimumQuestionLength ||
                    4
            )
        ) {
            return {
                learn: false,
                reason:
                    "question_too_short"
            };
        }

        if (
            a.length <
            Number(
                this.config
                    ?.minimumAnswerLength ||
                    2
            )
        ) {
            return {
                learn: false,
                reason:
                    "answer_too_short"
            };
        }

        /*
        --------------------------------------------------------
        Güncel veriler doğrudan kalıcı cevap hafızasına
        yazılmasın.
        --------------------------------------------------------
        */

        const currentPattern =
            /(bugün|şimdi|şu anda|güncel|son dakika|son durum|en son|bugünkü|yarın|dün|hava durumu|dolar|euro|altın|borsa|kur ne kadar)/iu;

        if (
            currentPattern.test(
                q
            ) &&
            options.allowCurrent !==
                true
        ) {
            return {
                learn: false,
                reason:
                    "current_information"
            };
        }

        /*
        --------------------------------------------------------
        Çok kısa / anlamsız cevapları filtrele.
        --------------------------------------------------------
        */

        if (
            a.length <
            10 &&
            options.allowShortAnswer !==
                true
        ) {
            return {
                learn: false,
                reason:
                    "answer_too_short_for_learning"
            };
        }

        /*
        --------------------------------------------------------
        Komut, parola, token gibi hassas verileri
        kalıcı cevap hafızasına alma.
        --------------------------------------------------------
        */

        const sensitivePattern =
            /(parola|şifre|password|token|api[_ -]?key|secret|private[_ -]?key|access[_ -]?token)/iu;

        if (
            sensitivePattern.test(
                q
            ) ||
            sensitivePattern.test(
                a
            )
        ) {
            return {
                learn: false,
                reason:
                    "sensitive_content"
            };
        }

        /*
        --------------------------------------------------------
        Sistem komutları için otomatik öğrenmeyi varsayılan
        olarak kapat.
        --------------------------------------------------------
        */

        if (
            /^\s*(sudo|rm\s+-rf|format\b|del\b|shutdown\b|powershell\b|cmd\.exe\b)/iu.test(
                q
            ) &&
            options.allowSystemCommands !==
                true
        ) {
            return {
                learn: false,
                reason:
                    "system_command"
            };
        }

        const duplicate =
            this.findDuplicate
                ? this.findDuplicate(
                      q,
                      options
                  )
                : null;

        if (
            duplicate
        ) {
            return {
                learn: true,
                reason:
                    "update_existing",
                duplicate
            };
        }

        return {
            learn: true,
            reason:
                "new_answer"
        };
    };


/* ============================================================
   4.13 - SMART AUTO LEARN
============================================================ */

AnswerMemory.prototype.smartAutoLearn4 =
    function (
        question,
        answer,
        options = {}
    ) {
        const decision =
            this.shouldAutoLearn4(
                question,
                answer,
                options
            );

        if (
            !decision.learn
        ) {
            return {
                ok: false,
                learned: false,
                reason:
                    decision.reason
            };
        }

        const category =
            options.category ||
            answerMemoryDetectCategory(
                question
            );

        const language =
            options.language ||
            answerMemoryDetectLanguage(
                question
            );

        const quality =
            answerMemoryBuildQuality4(
                {
                    ...options,

                    category,

                    language
                }
            );

        let result;

        /*
        --------------------------------------------------------
        Yeni motor varsa V2 save kullan.
        --------------------------------------------------------
        */

        if (
            typeof this.saveAnswerV2 ===
            "function"
        ) {
            result =
                this.saveAnswerV2(
                    question,
                    answer,
                    {
                        ...options,

                        category,

                        language,

                        quality:
                            quality.quality,

                        confidence:
                            quality.confidence,

                        importance:
                            quality.importance,

                        source:
                            options.source ||
                            "auto-learn"
                    }
                );
        } else {
            result =
                this.save(
                    question,
                    answer,
                    {
                        ...options,

                        category,

                        language,

                        quality:
                            quality.quality
                    }
                );
        }

        return {
            ...result,

            learned:
                Boolean(
                    result?.ok
                ),

            autoLearn:
                true,

            decision:
                decision.reason
        };
    };


/* ============================================================
   4.14 - USER MEMORY PROFILE
============================================================ */

AnswerMemory.prototype.getUserMemoryProfile4 =
    function (
        userId
    ) {
        const normalizedUser =
            answerMemoryNormalizeUserId2
                ? answerMemoryNormalizeUserId2(
                      userId
                  )
                : String(
                      userId ||
                          "anonymous"
                  );

        const records =
            Object.values(
                this.records ||
                    {}
            ).filter(
                record =>
                    record &&
                    record.active !==
                        false &&
                    answerMemoryNormalizeUserId2
                        ? answerMemoryNormalizeUserId2(
                              record.userId
                          ) ===
                          normalizedUser
                        : String(
                              record.userId ||
                                  "anonymous"
                          ) ===
                          normalizedUser
            );

        const categories =
            {};

        const languages =
            {};

        const tags =
            {};

        let qualityTotal =
            0;

        let confidenceTotal =
            0;

        let importanceTotal =
            0;

        let hits =
            0;

        let misses =
            0;

        for (
            const record
            of records
        ) {
            const category =
                record.category ||
                "general";

            const language =
                record.language ||
                "unknown";

            categories[
                category
            ] =
                (
                    categories[
                        category
                    ] || 0
                ) + 1;

            languages[
                language
            ] =
                (
                    languages[
                        language
                    ] || 0
                ) + 1;

            for (
                const tag
                of answerMemoryNormalizeTags(
                    record.tags || []
                )
            ) {
                tags[tag] =
                    (
                        tags[tag] ||
                        0
                    ) + 1;
            }

            qualityTotal +=
                Number(
                    record.quality ??
                        0.70
                );

            confidenceTotal +=
                Number(
                    record.confidence ??
                        0.80
                );

            importanceTotal +=
                Number(
                    record.importance ??
                        0.50
                );

            hits +=
                Number(
                    record.hits ||
                        0
                );

            misses +=
                Number(
                    record.misses ||
                        0
                );
        }

        const sortObject =
            object => {
                return Object.entries(
                    object
                )
                    .sort(
                        (
                            a,
                            b
                        ) =>
                            b[1] -
                            a[1]
                    )
                    .reduce(
                        (
                            output,
                            [
                                key,
                                value
                            ]
                        ) => {
                            output[
                                key
                            ] =
                                value;

                            return output;
                        },
                        {}
                    );
            };

        const average =
            value =>
                records.length
                    ? value /
                      records.length
                    : 0;

        return {
            ok: true,

            userId:
                normalizedUser,

            recordCount:
                records.length,

            categories:
                sortObject(
                    categories
                ),

            languages:
                sortObject(
                    languages
                ),

            tags:
                sortObject(
                    tags
                ),

            averageQuality:
                average(
                    qualityTotal
                ),

            averageConfidence:
                average(
                    confidenceTotal
                ),

            averageImportance:
                average(
                    importanceTotal
                ),

            hits,

            misses,

            feedbackRate:
                hits + misses >
                0
                    ? hits /
                      (
                          hits +
                          misses
                      )
                    : 0,

            favoriteCount:
                records.filter(
                    record =>
                        Boolean(
                            record.favorite
                        )
                ).length,

            pinnedCount:
                records.filter(
                    record =>
                        Boolean(
                            record.pinned
                        )
                ).length,

            verifiedCount:
                records.filter(
                    record =>
                        Boolean(
                            record.verified
                        )
                ).length,

            trustedCount:
                records.filter(
                    record =>
                        Boolean(
                            record.trusted
                        )
                ).length
        };
    };


/* ============================================================
   4.15 - USER QUESTIONS
============================================================ */

AnswerMemory.prototype.getUserQuestions4 =
    function (
        userId,
        options = {}
    ) {
        const normalizedUser =
            answerMemoryNormalizeUserId2
                ? answerMemoryNormalizeUserId2(
                      userId
                  )
                : String(
                      userId ||
                          "anonymous"
                  );

        let records =
            Object.values(
                this.records ||
                    {}
            ).filter(
                record =>
                    record &&
                    record.active !==
                        false &&
                    (
                        answerMemoryNormalizeUserId2
                            ? answerMemoryNormalizeUserId2(
                                  record.userId
                              ) ===
                              normalizedUser
                            : String(
                                  record.userId ||
                                      ""
                              ) ===
                              normalizedUser
                    )
            );

        if (
            options.category
        ) {
            records =
                records.filter(
                    record =>
                        record.category ===
                        options.category
                );
        }

        if (
            options.search
        ) {
            const search =
                answerMemorySearchNormalize(
                    options.search
                );

            records =
                records.filter(
                    record =>
                        answerMemorySearchNormalize(
                            record.question
                        ).includes(
                            search
                        )
                );
        }

        records.sort(
            (
                a,
                b
            ) =>
                (
                    new Date(
                        b.updatedAt ||
                            b.createdAt ||
                            0
                    ).getTime() || 0
                ) -
                (
                    new Date(
                        a.updatedAt ||
                            a.createdAt ||
                            0
                    ).getTime() || 0
                )
        );

        const limit =
            Math.floor(
                answerMemoryClamp(
                    options.limit ??
                        100,
                    1,
                    10000
                )
            );

        return records
            .slice(
                0,
                limit
            )
            .map(
                record =>
                    this.publicRecord(
                        record
                    )
            );
    };


/* ============================================================
   4.16 - USER TOPICS
============================================================ */

AnswerMemory.prototype.getUserTopics4 =
    function (
        userId,
        options = {}
    ) {
        const profile =
            this.getUserMemoryProfile4(
                userId
            );

        const categories =
            Object.entries(
                profile.categories ||
                    {}
            )
                .sort(
                    (
                        a,
                        b
                    ) =>
                        b[1] -
                        a[1]
                );

        const tags =
            Object.entries(
                profile.tags ||
                    {}
            )
                .sort(
                    (
                        a,
                        b
                    ) =>
                        b[1] -
                        a[1]
                );

        return {
            ok: true,

            userId:
                profile.userId,

            topCategories:
                categories.slice(
                    0,
                    options.categoryLimit ||
                        10
                ),

            topTags:
                tags.slice(
                    0,
                    options.tagLimit ||
                        30
                ),

            languages:
                profile.languages
        };
    };


/* ============================================================
   4.17 - HISTORY V4
============================================================ */

AnswerMemory.prototype.addHistoryV4 =
    function (
        event,
        record,
        extra = {}
    ) {
        if (
            this.config?.historyEnabled ===
            false
        ) {
            return false;
        }

        if (
            !Array.isArray(
                this.history
            )
        ) {
            this.history =
                [];
        }

        const entry = {
            id:
                answerMemoryCreateId(
                    "history4"
                ),

            timestamp:
                answerMemoryNowISO(),

            event:
                answerMemorySafeText4(
                    event,
                    "unknown"
                ),

            recordId:
                record?.id ||
                extra.recordId ||
                null,

            userId:
                record?.userId ||
                extra.userId ||
                null,

            question:
                record?.question ||
                extra.question ||
                extra.query ||
                null,

            answer:
                extra.includeAnswer
                    ? record?.answer ||
                      null
                    : undefined,

            score:
                extra.score ??
                null,

            confidence:
                extra.confidence ??
                null,

            category:
                record?.category ||
                extra.category ||
                null,

            source:
                record?.source ||
                extra.source ||
                null,

            metadata:
                answerMemoryEnsureObject(
                    extra.metadata
                )
        };

        this.history.push(
            entry
        );

        const maximum =
            Number(
                this.config
                    ?.maximumHistory ||
                    50000
            );

        if (
            this.history.length >
            maximum
        ) {
            this.history =
                this.history.slice(
                    -maximum
                );
        }

        return true;
    };


/* ============================================================
   4.18 - HISTORY QUERY
============================================================ */

AnswerMemory.prototype.queryHistory4 =
    function (
        options = {}
    ) {
        let items =
            Array.isArray(
                this.history
            )
                ? [
                      ...this.history
                  ]
                : [];

        if (
            options.event
        ) {
            items =
                items.filter(
                    item =>
                        item.event ===
                        options.event
                );
        }

        if (
            options.userId
        ) {
            const userId =
                answerMemoryNormalizeUserId2
                    ? answerMemoryNormalizeUserId2(
                          options.userId
                      )
                    : String(
                          options.userId
                      );

            items =
                items.filter(
                    item =>
                        (
                            answerMemoryNormalizeUserId2
                                ? answerMemoryNormalizeUserId2(
                                      item.userId
                                  )
                                : String(
                                      item.userId
                                  )
                        ) ===
                        userId
                );
        }

        if (
            options.recordId
        ) {
            items =
                items.filter(
                    item =>
                        item.recordId ===
                        options.recordId
                );
        }

        if (
            options.category
        ) {
            items =
                items.filter(
                    item =>
                        item.category ===
                        options.category
                );
        }

        if (
            options.from
        ) {
            const from =
                new Date(
                    options.from
                ).getTime();

            if (
                Number.isFinite(
                    from
                )
            ) {
                items =
                    items.filter(
                        item =>
                            new Date(
                                item.timestamp
                            ).getTime() >=
                            from
                    );
            }
        }

        if (
            options.to
        ) {
            const to =
                new Date(
                    options.to
                ).getTime();

            if (
                Number.isFinite(
                    to
                )
            ) {
                items =
                    items.filter(
                        item =>
                            new Date(
                                item.timestamp
                            ).getTime() <=
                            to
                    );
            }
        }

        items.reverse();

        const limit =
            Math.floor(
                answerMemoryClamp(
                    options.limit ??
                        100,
                    1,
                    50000
                )
            );

        return {
            ok: true,

            count:
                Math.min(
                    limit,
                    items.length
                ),

            total:
                items.length,

            items:
                items.slice(
                    0,
                    limit
                )
        };
    };


/* ============================================================
   4.19 - BULK TAG
============================================================ */

AnswerMemory.prototype.bulkTag4 =
    function (
        ids,
        tags,
        options = {}
    ) {
        const idList =
            answerMemoryUniqueArray(
                Array.isArray(
                    ids
                )
                    ? ids
                    : [ids]
            );

        const newTags =
            answerMemoryNormalizeTags(
                tags
            );

        let updated = 0;

        for (
            const id
            of idList
        ) {
            const record =
                this.records?.[id];

            if (
                !record
            ) {
                continue;
            }

            record.tags =
                answerMemoryNormalizeTags(
                    [
                        ...(record.tags ||
                            []),
                        ...newTags
                    ]
                );

            record.updatedAt =
                answerMemoryNowISO();

            updated++;
        }

        if (
            updated > 0
        ) {
            this.persist();
        }

        return {
            ok: true,

            requested:
                idList.length,

            updated,

            tags:
                newTags
        };
    };


/* ============================================================
   4.20 - BULK ARCHIVE
============================================================ */

AnswerMemory.prototype.bulkArchive4 =
    function (
        ids,
        options = {}
    ) {
        const idList =
            answerMemoryUniqueArray(
                Array.isArray(
                    ids
                )
                    ? ids
                    : [ids]
            );

        let updated = 0;

        for (
            const id
            of idList
        ) {
            const result =
                this.archiveRecordV2
                    ? this.archiveRecordV2(
                          id
                      )
                    : this.remove(
                          id
                      );

            if (
                result?.ok
            ) {
                updated++;
            }
        }

        return {
            ok: true,

            requested:
                idList.length,

            updated
        };
    };


/* ============================================================
   4.21 - BULK RESTORE
============================================================ */

AnswerMemory.prototype.bulkRestore4 =
    function (
        ids
    ) {
        const idList =
            answerMemoryUniqueArray(
                Array.isArray(
                    ids
                )
                    ? ids
                    : [ids]
            );

        let restored = 0;

        for (
            const id
            of idList
        ) {
            const result =
                this.restoreRecordV2
                    ? this.restoreRecordV2(
                          id
                      )
                    : this.restore(
                          id
                      );

            if (
                result?.ok
            ) {
                restored++;
            }
        }

        return {
            ok: true,

            requested:
                idList.length,

            restored
        };
    };


/* ============================================================
   4.22 - BULK DELETE
============================================================ */

AnswerMemory.prototype.bulkDelete4 =
    function (
        ids,
        options = {}
    ) {
        const idList =
            answerMemoryUniqueArray(
                Array.isArray(
                    ids
                )
                    ? ids
                    : [ids]
            );

        let deleted = 0;

        for (
            const id
            of idList
        ) {
            let result;

            if (
                options.permanent
            ) {
                result =
                    this.hardDeleteRecordV2
                        ? this.hardDeleteRecordV2(
                              id
                          )
                        : this.remove(
                              id,
                              {
                                  permanent:
                                      true
                              }
                          );
            } else {
                result =
                    this.archiveRecordV2
                        ? this.archiveRecordV2(
                              id
                          )
                        : this.remove(
                              id
                          );
            }

            if (
                result?.ok
            ) {
                deleted++;
            }
        }

        return {
            ok: true,

            requested:
                idList.length,

            deleted,

            permanent:
                Boolean(
                    options.permanent
                )
        };
    };


/* ============================================================
   4.23 - BULK VERIFY
============================================================ */

AnswerMemory.prototype.bulkVerify4 =
    function (
        ids,
        verified = true
    ) {
        const idList =
            answerMemoryUniqueArray(
                Array.isArray(
                    ids
                )
                    ? ids
                    : [ids]
            );

        let updated = 0;

        for (
            const id
            of idList
        ) {
            const result =
                this.verifyRecord4(
                    id,
                    verified
                );

            if (
                result?.ok
            ) {
                updated++;
            }
        }

        return {
            ok: true,
            requested:
                idList.length,
            updated,
            verified:
                Boolean(
                    verified
                )
        };
    };


/* ============================================================
   4.24 - BULK TRUST
============================================================ */

AnswerMemory.prototype.bulkTrust4 =
    function (
        ids,
        trusted = true
    ) {
        const idList =
            answerMemoryUniqueArray(
                Array.isArray(
                    ids
                )
                    ? ids
                    : [ids]
            );

        let updated = 0;

        for (
            const id
            of idList
        ) {
            const result =
                this.trustRecord4(
                    id,
                    trusted
                );

            if (
                result?.ok
            ) {
                updated++;
            }
        }

        return {
            ok: true,
            requested:
                idList.length,
            updated,
            trusted:
                Boolean(
                    trusted
                )
        };
    };


/* ============================================================
   4.25 - QUALITY REBALANCE
============================================================ */

AnswerMemory.prototype.rebalanceQuality4 =
    function (
        options = {}
    ) {
        let changed = 0;

        const minimum =
            answerMemorySafeNumber3(
                options.minimumQuality,
                0.20
            );

        const maximum =
            answerMemorySafeNumber3(
                options.maximumQuality,
                0.95
            );

        for (
            const record
            of Object.values(
                this.records ||
                    {}
            )
        ) {
            if (
                !record ||
                record.active ===
                    false
            ) {
                continue;
            }

            let quality =
                answerMemoryQualityClamp4(
                    record.quality,
                    0.70
                );

            const hits =
                Number(
                    record.hits ||
                        0
                );

            const misses =
                Number(
                    record.misses ||
                        0
                );

            const total =
                hits +
                misses;

            if (
                total > 0
            ) {
                const feedbackRate =
                    hits /
                    total;

                quality =
                    (
                        quality *
                        0.70
                    ) +
                    (
                        feedbackRate *
                        0.30
                    );
            }

            if (
                record.verified
            ) {
                quality +=
                    0.03;
            }

            if (
                record.trusted
            ) {
                quality +=
                    0.03;
            }

            const finalQuality =
                answerMemoryClamp(
                    quality,
                    minimum,
                    maximum
                );

            if (
                Math.abs(
                    finalQuality -
                    Number(
                        record.quality ||
                            0
                    )
                ) >
                0.001
            ) {
                record.quality =
                    finalQuality;

                record.updatedAt =
                    answerMemoryNowISO();

                changed++;
            }
        }

        this.stats.lastMaintenance =
            answerMemoryNowISO();

        this.persist();

        return {
            ok: true,
            changed
        };
    };


/* ============================================================
   4.26 - TOP ANSWERS
============================================================ */

AnswerMemory.prototype.getTopAnswers4 =
    function (
        options = {}
    ) {
        let records =
            Object.values(
                this.records ||
                    {}
            ).filter(
                record =>
                    record &&
                    record.active !==
                        false
            );

        if (
            options.userId
        ) {
            const userId =
                answerMemoryNormalizeUserId2
                    ? answerMemoryNormalizeUserId2(
                          options.userId
                      )
                    : String(
                          options.userId
                      );

            records =
                records.filter(
                    record =>
                        (
                            answerMemoryNormalizeUserId2
                                ? answerMemoryNormalizeUserId2(
                                      record.userId
                                  )
                                : String(
                                      record.userId
                                  )
                        ) ===
                        userId
                );
        }

        if (
            options.category
        ) {
            records =
                records.filter(
                    record =>
                        record.category ===
                        options.category
                );
        }

        records.sort(
            (
                a,
                b
            ) => {
                const profileA =
                    this.getQualityProfile4(
                        a
                    );

                const profileB =
                    this.getQualityProfile4(
                        b
                    );

                return (
                    profileB.qualityScore -
                    profileA.qualityScore
                );
            }
        );

        const limit =
            Math.floor(
                answerMemoryClamp(
                    options.limit ??
                        20,
                    1,
                    500
                )
            );

        return records
            .slice(
                0,
                limit
            )
            .map(
                record => {
                    const profile =
                        this.getQualityProfile4(
                            record
                        );

                    return {
                        ...this.publicRecord(
                            record
                        ),

                        qualityScore:
                            profile.qualityScore,

                        feedbackRate:
                            profile.feedbackRate
                    };
                }
            );
    };


/* ============================================================
   4.27 - MEMORY OVERVIEW
============================================================ */

AnswerMemory.prototype.getOverview4 =
    function (
        options = {}
    ) {
        const total =
            Object.keys(
                this.records ||
                    {}
            ).length;

        const active =
            Object.values(
                this.records ||
                    {}
            ).filter(
                record =>
                    record &&
                    record.active !==
                        false
            ).length;

        const archived =
            Object.values(
                this.records ||
                    {}
            ).filter(
                record =>
                    record &&
                    record.archived ===
                        true
            ).length;

        const users =
            new Set();

        let qualityTotal =
            0;

        let confidenceTotal =
            0;

        let importanceTotal =
            0;

        for (
            const record
            of Object.values(
                this.records ||
                    {}
            )
        ) {
            if (
                !record
            ) {
                continue;
            }

            users.add(
                answerMemoryNormalizeUserId2
                    ? answerMemoryNormalizeUserId2(
                          record.userId
                      )
                    : String(
                          record.userId ||
                              "anonymous"
                      )
            );

            qualityTotal +=
                Number(
                    record.quality ??
                        0.70
                );

            confidenceTotal +=
                Number(
                    record.confidence ??
                        0.80
                );

            importanceTotal +=
                Number(
                    record.importance ??
                        0.50
                );
        }

        return {
            ok: true,

            version:
                ANSWER_MEMORY_VERSION,

            totalRecords:
                total,

            activeRecords:
                active,

            archivedRecords:
                archived,

            users:
                users.size,

            indexTokens:
                Object.keys(
                    this.index ||
                        {}
                ).length,

            averageQuality:
                total
                    ? qualityTotal /
                      total
                    : 0,

            averageConfidence:
                total
                    ? confidenceTotal /
                      total
                    : 0,

            averageImportance:
                total
                    ? importanceTotal /
                      total
                    : 0,

            stats:
                this.stats,

            search:
                this.getSearchStats3
                    ? this.getSearchStats3()
                    : null,

            health:
                this.health()
        };
    };


/* ============================================================
   4.28 - EXPORT USER MEMORY
============================================================ */

AnswerMemory.prototype.exportUserMemory4 =
    function (
        userId,
        options = {}
    ) {
        const normalizedUser =
            answerMemoryNormalizeUserId2
                ? answerMemoryNormalizeUserId2(
                      userId
                  )
                : String(
                      userId ||
                          "anonymous"
                  );

        const records =
            Object.values(
                this.records ||
                    {}
            ).filter(
                record =>
                    record &&
                    (
                        answerMemoryNormalizeUserId2
                            ? answerMemoryNormalizeUserId2(
                                  record.userId
                              ) ===
                              normalizedUser
                            : String(
                                  record.userId ||
                                      ""
                              ) ===
                              normalizedUser
                    )
            );

        const payload = {
            format:
                "turkai-user-answer-memory",

            version:
                ANSWER_MEMORY_VERSION,

            exportedAt:
                answerMemoryNowISO(),

            userId:
                normalizedUser,

            count:
                records.length,

            records:
                records.map(
                    record =>
                        this.publicRecord(
                            record
                        )
                ),

            profile:
                this.getUserMemoryProfile4(
                    normalizedUser
                ),

            topics:
                this.getUserTopics4(
                    normalizedUser
                )
        };

        const stamp =
            new Date()
                .toISOString()
                .replace(
                    /[:.]/g,
                    "-"
                );

        const filename =
            options.fileName ||
            `user-memory-${normalizedUser}-${stamp}.json`;

        const filePath =
            path.join(
                ANSWER_MEMORY_EXPORT_DIR,
                filename
            );

        const ok =
            answerMemoryWriteJSON(
                filePath,
                payload
            );

        return {
            ok,

            userId:
                normalizedUser,

            count:
                records.length,

            file:
                filePath
        };
    };


/* ============================================================
   4.29 - SNAPSHOT
============================================================ */

AnswerMemory.prototype.createSnapshot4 =
    function () {
        return {
            version:
                ANSWER_MEMORY_VERSION,

            timestamp:
                answerMemoryNowISO(),

            overview:
                this.getOverview4(),

            diagnostics:
                this.diagnostics
                    ? this.diagnostics()
                    : null,

            topAnswers:
                this.getTopAnswers4({
                    limit: 10
                })
        };
    };


/* ============================================================
   4.30 - GLOBAL HELPERS
============================================================ */

function smartAutoLearnAnswer4(
    question,
    answer,
    options = {}
) {
    if (
        !globalAnswerMemoryInstance
    ) {
        return {
            ok: false,
            learned: false,
            reason:
                "memory_unavailable"
        };
    }

    return globalAnswerMemoryInstance.smartAutoLearn4(
        question,
        answer,
        options
    );
}


function searchAnswerMemorySmart4(
    question,
    options = {}
) {
    if (
        !globalAnswerMemoryInstance
    ) {
        return {
            ok: false,
            results: [],
            best: null,
            reason:
                "memory_unavailable"
        };
    }

    return globalAnswerMemoryInstance.searchAdvanced3(
        question,
        options
    );
}


function getAnswerMemoryUserProfile4(
    userId
) {
    if (
        !globalAnswerMemoryInstance
    ) {
        return null;
    }

    return globalAnswerMemoryInstance.getUserMemoryProfile4(
        userId
    );
}


function getAnswerMemoryOverview4() {
    if (
        !globalAnswerMemoryInstance
    ) {
        return {
            ok: false
        };
    }

    return globalAnswerMemoryInstance.getOverview4();
}


/* ============================================================
   4.31 - GLOBAL BRIDGE
============================================================ */

globalThis.smartAutoLearnAnswer4 =
    smartAutoLearnAnswer4;

globalThis.searchAnswerMemorySmart4 =
    searchAnswerMemorySmart4;

globalThis.getAnswerMemoryUserProfile4 =
    getAnswerMemoryUserProfile4;

globalThis.getAnswerMemoryOverview4 =
    getAnswerMemoryOverview4;


/* ============================================================
   4.32 - TURKAI GLOBAL NAMESPACE
============================================================ */

if (
    !globalThis.turkAIAnswerMemory
) {
    globalThis.turkAIAnswerMemory =
        globalAnswerMemoryInstance;
}

globalThis.turkAIAnswerMemory.smartLearn =
    smartAutoLearnAnswer4;

globalThis.turkAIAnswerMemory.smartSearch =
    searchAnswerMemorySmart4;

globalThis.turkAIAnswerMemory.userProfile =
    getAnswerMemoryUserProfile4;

globalThis.turkAIAnswerMemory.overview =
    getAnswerMemoryOverview4;


/* ============================================================
   4.33 - FINAL STATUS
============================================================ */

console.log(
    "[AnswerMemory] Part 4/5 loaded."
);

console.log(
    "[AnswerMemory] Auto learning          : ACTIVE"
);

console.log(
    "[AnswerMemory] Feedback engine        : ACTIVE"
);

console.log(
    "[AnswerMemory] Quality engine         : ACTIVE"
);

console.log(
    "[AnswerMemory] User profiles          : ACTIVE"
);

console.log(
    "[AnswerMemory] User topics            : ACTIVE"
);

console.log(
    "[AnswerMemory] History engine         : ACTIVE"
);

console.log(
    "[AnswerMemory] Bulk operations        : ACTIVE"
);

console.log(
    "[AnswerMemory] Verification system    : ACTIVE"
);

console.log(
    "[AnswerMemory] Trust system            : ACTIVE"
);

console.log(
    "[AnswerMemory] Analytics               : ACTIVE"
);

/* ============================================================
   END OF PART 4 / 5
============================================================ */
/* ============================================================
   TÜRKAI ANSWER MEMORY ENGINE 5.0
   PART 5 / 5
   PERSISTENCE + MAINTENANCE + GLOBAL INSTANCE
   + EXPORT / IMPORT + HEALTH + DIAGNOSTICS
   + COMPATIBILITY + FINAL API
============================================================ */


/* ============================================================
   5.0 - MEMORY MAINTENANCE CONSTANTS
============================================================ */

const ANSWER_MEMORY_MAINTENANCE_5 = {
    cacheMaximum:
        10000,

    cacheKeep:
        8000,

    maximumBackups:
        20,

    inactiveRetentionDays:
        365,

    archivedRetentionDays:
        365,

    weakRecordRetentionDays:
        180,

    minimumWeakQuality:
        0.30,

    maintenanceIntervalMs:
        1000 *
        60 *
        30,

    backupIntervalMs:
        1000 *
        60 *
        60 *
        6
};


/* ============================================================
   5.1 - DATE HELPERS
============================================================ */

function answerMemoryDateMs5(
    value,
    fallback = 0
) {
    const time =
        new Date(
            value
        ).getTime();

    return Number.isFinite(
        time
    )
        ? time
        : fallback;
}


function answerMemoryAgeDays5(
    value
) {
    const timestamp =
        answerMemoryDateMs5(
            value,
            Date.now()
        );

    return Math.max(
        0,
        (
            Date.now() -
            timestamp
        ) /
        (
            1000 *
            60 *
            60 *
            24
        )
    );
}


/* ============================================================
   5.2 - ERROR SAFE
============================================================ */

function answerMemoryError5(
    error
) {
    if (
        !error
    ) {
        return {
            name:
                "UnknownError",

            message:
                "Unknown error",

            stack:
                null
        };
    }

    return {
        name:
            String(
                error.name ||
                    "Error"
            ),

        message:
            String(
                error.message ||
                    error
            ),

        stack:
            error.stack
                ? String(
                      error.stack
                  )
                : null
    };
}


/* ============================================================
   5.3 - RECORD NORMALIZATION V5
============================================================ */

function answerMemoryNormalizeExistingRecord5(
    record
) {
    if (
        !record ||
        typeof record !==
            "object"
    ) {
        return null;
    }

    if (
        !record.id
    ) {
        record.id =
            answerMemoryCreateId(
                "answer"
            );
    }

    record.version =
        Number(
            record.version ||
                1
        );

    record.createdAt =
        record.createdAt ||
        answerMemoryNowISO();

    record.updatedAt =
        record.updatedAt ||
        record.createdAt;

    record.lastReadAt =
        record.lastReadAt ||
        null;

    record.lastWriteAt =
        record.lastWriteAt ||
        record.updatedAt;

    record.question =
        answerMemorySafeText4(
            record.question,
            ""
        );

    record.answer =
        answerMemorySafeText4(
            record.answer,
            ""
        );

    record.normalizedQuestion =
        answerMemoryNormalizeTurkish(
            record.question
        );

    record.normalizedAnswer =
        answerMemoryNormalizeTurkish(
            record.answer
        );

    record.searchQuestion =
        answerMemorySearchNormalize(
            record.question
        );

    record.questionHash =
        answerMemoryHash(
            record.normalizedQuestion
        );

    record.answerHash =
        answerMemoryHash(
            record.normalizedAnswer
        );

    record.userId =
        answerMemoryNormalizeUserId2(
            record.userId
        );

    record.userName =
        answerMemoryNormalizeUserName2(
            record.userName
        );

    record.scope =
        answerMemorySafeText4(
            record.scope,
            "user"
        );

    record.language =
        answerMemorySafeText4(
            record.language,
            answerMemoryDetectLanguage(
                record.question
            )
        );

    record.category =
        answerMemorySafeText4(
            record.category,
            answerMemoryDetectCategory(
                record.question
            )
        );

    record.questionType =
        answerMemorySafeText4(
            record.questionType,
            answerMemoryDetectQuestionType(
                record.question
            )
        );

    record.tags =
        answerMemoryNormalizeTags(
            record.tags ||
                []
        );

    record.tokens =
        answerMemoryUniqueArray(
            Array.isArray(
                record.tokens
            )
                ? record.tokens
                : answerMemoryTokenize(
                      record.question
                  )
        );

    record.keywords =
        answerMemoryUniqueArray(
            Array.isArray(
                record.keywords
            )
                ? record.keywords
                : answerMemoryExtractKeywords(
                      record.question
                  )
        );

    record.tokenCount =
        record.tokens.length;

    record.keywordCount =
        record.keywords.length;

    record.importance =
        answerMemoryQualityClamp4(
            record.importance,
            0.50
        );

    record.confidence =
        answerMemoryQualityClamp4(
            record.confidence,
            0.80
        );

    record.quality =
        answerMemoryQualityClamp4(
            record.quality,
            0.70
        );

    record.frequency =
        Math.max(
            1,
            Number(
                record.frequency ||
                    1
            )
        );

    record.hits =
        Math.max(
            0,
            Number(
                record.hits ||
                    0
            )
        );

    record.misses =
        Math.max(
            0,
            Number(
                record.misses ||
                    0
            )
        );

    record.saves =
        Math.max(
            1,
            Number(
                record.saves ||
                    1
            )
        );

    record.updates =
        Math.max(
            0,
            Number(
                record.updates ||
                    0
            )
        );

    record.duplicateCount =
        Math.max(
            0,
            Number(
                record.duplicateCount ||
                    0
            )
        );

    record.active =
        record.active !== false;

    record.archived =
        Boolean(
            record.archived
        );

    record.pinned =
        Boolean(
            record.pinned
        );

    record.favorite =
        Boolean(
            record.favorite
        );

    record.verified =
        Boolean(
            record.verified
        );

    record.trusted =
        Boolean(
            record.trusted
        );

    record.source =
        answerMemorySafeText4(
            record.source,
            "chat"
        );

    record.model =
        answerMemorySafeText4(
            record.model,
            "local"
        );

    record.conversationId =
        answerMemorySafeText4(
            record.conversationId,
            ""
        );

    record.sessionId =
        answerMemorySafeText4(
            record.sessionId,
            ""
        );

    record.projectId =
        answerMemorySafeText4(
            record.projectId,
            ""
        );

    record.metadata =
        answerMemoryEnsureObject(
            record.metadata
        );

    record.custom =
        answerMemoryEnsureObject(
            record.custom
        );

    if (
        !Array.isArray(
            record.feedbackHistory
        )
    ) {
        record.feedbackHistory =
            [];
    }

    return record;
}


/* ============================================================
   5.4 - NORMALIZE ALL STORED RECORDS
============================================================ */

AnswerMemory.prototype.normalizeAllRecords5 =
    function () {
        const records =
            this.records || {};

        const normalized = {};

        let count = 0;
        let invalid = 0;

        for (
            const [id, rawRecord]
            of Object.entries(
                records
            )
        ) {
            const record =
                answerMemoryNormalizeExistingRecord5(
                    rawRecord
                );

            if (
                !record
            ) {
                invalid++;
                continue;
            }

            if (
                !record.id
            ) {
                record.id =
                    id;
            }

            normalized[
                record.id
            ] =
                record;

            count++;
        }

        this.records =
            normalized;

        return {
            ok: true,
            normalized:
                count,
            invalid
        };
    };


/* ============================================================
   5.5 - INDEX REBUILD V5
============================================================ */

AnswerMemory.prototype.rebuildIndex5 =
    function (
        options = {}
    ) {
        this.index = {};
        this.userIndex = {};

        const records =
            Object.values(
                this.records || {}
            );

        let indexed =
            0;

        let skipped =
            0;

        for (
            const record
            of records
        ) {
            if (
                !record
            ) {
                skipped++;
                continue;
            }

            answerMemoryNormalizeExistingRecord5(
                record
            );

            if (
                record.active ===
                    false &&
                options.includeInactive !==
                    true
            ) {
                continue;
            }

            if (
                record.archived ===
                    true &&
                options.includeArchived !==
                    true
            ) {
                continue;
            }

            this.indexRecordV2
                ? this.indexRecordV2(
                      record
                  )
                : this.indexRecord(
                      record
                  );

            indexed++;
        }

        this.stats.rebuilds =
            Number(
                this.stats?.rebuilds ||
                    0
            ) + 1;

        this.stats.lastMaintenance =
            answerMemoryNowISO();

        if (
            options.persist !==
            false
        ) {
            this.persist();
        }

        return {
            ok: true,

            indexed,

            skipped,

            records:
                Object.keys(
                    this.records || {}
                ).length,

            tokens:
                Object.keys(
                    this.index || {}
                ).length,

            users:
                Object.keys(
                    this.userIndex || {}
                ).length
        };
    };


/* ============================================================
   5.6 - CACHE MAINTENANCE
============================================================ */

AnswerMemory.prototype.maintainCache5 =
    function () {
        if (
            !this.cache ||
            typeof this.cache !==
                "object"
        ) {
            this.cache = {};

            return {
                ok: true,
                removed: 0,
                remaining: 0
            };
        }

        const now =
            Date.now();

        let removed =
            0;

        const ttl =
            Number(
                this.config?.cacheTTL ||
                    1000 *
                    60 *
                    15
            );

        for (
            const [key, entry]
            of Object.entries(
                this.cache
            )
        ) {
            if (
                !answerMemoryValidateCacheEntry3(
                    entry,
                    ttl
                )
            ) {
                delete this.cache[
                    key
                ];

                removed++;

                continue;
            }

            const age =
                now -
                Number(
                    entry.createdAt ||
                        now
                );

            if (
                age >
                ttl
            ) {
                delete this.cache[
                    key
                ];

                removed++;
            }
        }

        const keys =
            Object.keys(
                this.cache
            );

        if (
            keys.length >
            ANSWER_MEMORY_MAINTENANCE_5
                .cacheMaximum
        ) {
            const entries =
                keys
                    .map(
                        key => ({
                            key,

                            createdAt:
                                Number(
                                    this.cache[
                                        key
                                    ]?.createdAt ||
                                    0
                                )
                        })
                    )
                    .sort(
                        (
                            a,
                            b
                        ) =>
                            a.createdAt -
                            b.createdAt
                    );

            const removeCount =
                Math.max(
                    0,
                    keys.length -
                        ANSWER_MEMORY_MAINTENANCE_5
                            .cacheKeep
                );

            for (
                let i = 0;
                i < removeCount;
                i++
            ) {
                delete this.cache[
                    entries[i].key
                ];

                removed++;
            }
        }

        return {
            ok: true,
            removed,
            remaining:
                Object.keys(
                    this.cache
                ).length
        };
    };


/* ============================================================
   5.7 - RECORD MAINTENANCE
============================================================ */

AnswerMemory.prototype.maintainRecords5 =
    function (
        options = {}
    ) {
        const now =
            Date.now();

        const inactiveDays =
            Number(
                options.inactiveDays ??
                    ANSWER_MEMORY_MAINTENANCE_5
                        .inactiveRetentionDays
            );

        const archivedDays =
            Number(
                options.archivedDays ??
                    ANSWER_MEMORY_MAINTENANCE_5
                        .archivedRetentionDays
            );

        const weakDays =
            Number(
                options.weakDays ??
                    ANSWER_MEMORY_MAINTENANCE_5
                        .weakRecordRetentionDays
            );

        const minimumWeakQuality =
            Number(
                options.minimumWeakQuality ??
                    ANSWER_MEMORY_MAINTENANCE_5
                        .minimumWeakQuality
            );

        let removed =
            0;

        let archived =
            0;

        let touched =
            0;

        for (
            const record
            of Object.values(
                this.records || {}
            )
        ) {
            if (
                !record
            ) {
                continue;
            }

            const ageDays =
                answerMemoryAgeDays5(
                    record.updatedAt ||
                        record.createdAt
                );

            const inactive =
                record.active ===
                false;

            const oldArchived =
                record.archived ===
                    true &&
                ageDays >
                    archivedDays;

            const weak =
                Number(
                    record.hits ||
                        0
                ) === 0 &&
                Number(
                    record.frequency ||
                        1
                ) <=
                    1 &&
                Number(
                    record.quality ??
                        0.70
                ) <=
                    minimumWeakQuality &&
                ageDays >
                    weakDays;

            if (
                oldArchived ||
                (
                    inactive &&
                    ageDays >
                        inactiveDays
                )
            ) {
                if (
                    options.permanent ===
                    true
                ) {
                    this.removeRecordFromIndexV2(
                        record
                    );

                    delete this.records[
                        record.id
                    ];

                    removed++;
                } else {
                    record.archived =
                        true;

                    record.active =
                        false;

                    record.updatedAt =
                        answerMemoryNowISO();

                    archived++;

                    this.removeRecordFromIndexV2(
                        record
                    );
                }

                continue;
            }

            if (
                weak &&
                options.archiveWeak !==
                    false
            ) {
                if (
                    !record.archived
                ) {
                    record.archived =
                        true;

                    record.active =
                        false;

                    record.updatedAt =
                        answerMemoryNowISO();

                    archived++;

                    this.removeRecordFromIndexV2(
                        record
                    );
                }

                continue;
            }

            /*
            Eski kayıtların scoring alanlarını normalize et.
            */

            answerMemoryNormalizeExistingRecord5(
                record
            );

            touched++;
        }

        this.stats.totalEntries =
            Object.keys(
                this.records || {}
            ).length;

        this.stats.lastMaintenance =
            answerMemoryNowISO();

        this.persist();

        return {
            ok: true,

            removed,

            archived,

            touched,

            remaining:
                Object.keys(
                    this.records || {}
                ).length
        };
    };


/* ============================================================
   5.8 - FULL MAINTENANCE
============================================================ */

AnswerMemory.prototype.runMaintenance5 =
    function (
        options = {}
    ) {
        const started =
            Date.now();

        let normalizeResult =
            null;

        let cacheResult =
            null;

        let recordResult =
            null;

        let indexResult =
            null;

        const errors =
            [];

        try {
            normalizeResult =
                this.normalizeAllRecords5();
        } catch (
            error
        ) {
            errors.push({
                step:
                    "normalize",
                error:
                    answerMemoryError5(
                        error
                    )
            });
        }

        try {
            cacheResult =
                this.maintainCache5();
        } catch (
            error
        ) {
            errors.push({
                step:
                    "cache",
                error:
                    answerMemoryError5(
                        error
                    )
            });
        }

        try {
            recordResult =
                this.maintainRecords5(
                    options
                );
        } catch (
            error
        ) {
            errors.push({
                step:
                    "records",
                error:
                    answerMemoryError5(
                        error
                    )
            });
        }

        try {
            indexResult =
                this.rebuildIndex5(
                    {
                        persist:
                            false,

                        includeInactive:
                            false,

                        includeArchived:
                            false
                    }
                );
        } catch (
            error
        ) {
            errors.push({
                step:
                    "index",
                error:
                    answerMemoryError5(
                        error
                    )
            });
        }

        try {
            this.persist(
                {
                    backup:
                        options.backup ===
                        true
                }
            );
        } catch (
            error
        ) {
            errors.push({
                step:
                    "persist",
                error:
                    answerMemoryError5(
                        error
                    )
            });
        }

        const durationMs =
            Date.now() -
            started;

        return {
            ok:
                errors.length ===
                0,

            durationMs,

            normalize:
                normalizeResult,

            cache:
                cacheResult,

            records:
                recordResult,

            index:
                indexResult,

            errors
        };
    };


/* ============================================================
   5.9 - BACKUP CREATOR
============================================================ */

AnswerMemory.prototype.createBackup5 =
    function () {
        try {
            answerMemoryEnsureDirectories();

            const stamp =
                new Date()
                    .toISOString()
                    .replace(
                        /[:.]/g,
                        "-"
                    );

            const backupFile =
                path.join(
                    ANSWER_MEMORY_BACKUP_DIR,
                    `answer-memory-${stamp}.json`
                );

            const payload = {
                format:
                    "turkai-answer-memory-backup",

                version:
                    ANSWER_MEMORY_VERSION,

                createdAt:
                    answerMemoryNowISO(),

                config:
                    this.config,

                records:
                    this.records,

                index:
                    this.index,

                userIndex:
                    this.userIndex,

                stats:
                    this.stats,

                history:
                    this.history
            };

            const ok =
                answerMemoryWriteJSON(
                    backupFile,
                    payload
                );

            if (
                ok
            ) {
                this.stats.backups =
                    Number(
                        this.stats
                            .backups ||
                            0
                    ) + 1;

                this.stats.lastBackup =
                    answerMemoryNowISO();

                this.rotateBackups5();
            }

            return {
                ok,
                file:
                    backupFile
            };
        } catch (
            error
        ) {
            return {
                ok: false,
                error:
                    answerMemoryError5(
                        error
                    )
            };
        }
    };


/* ============================================================
   5.10 - ROTATE BACKUPS
============================================================ */

AnswerMemory.prototype.rotateBackups5 =
    function () {
        try {
            if (
                !fs.existsSync(
                    ANSWER_MEMORY_BACKUP_DIR
                )
            ) {
                return {
                    ok: true,
                    removed: 0
                };
            }

            const maximum =
                Number(
                    this.config
                        ?.maxBackupFiles ||
                    ANSWER_MEMORY_MAINTENANCE_5
                        .maximumBackups
                );

            const files =
                fs.readdirSync(
                    ANSWER_MEMORY_BACKUP_DIR
                )
                    .filter(
                        file =>
                            file.startsWith(
                                "answer-memory-"
                            ) &&
                            file.endsWith(
                                ".json"
                            )
                    )
                    .map(
                        file => {
                            const full =
                                path.join(
                                    ANSWER_MEMORY_BACKUP_DIR,
                                    file
                                );

                            return {
                                file,
                                full,
                                time:
                                    fs.statSync(
                                        full
                                    ).mtimeMs
                            };
                        }
                    )
                    .sort(
                        (
                            a,
                            b
                        ) =>
                            b.time -
                            a.time
                    );

            let removed =
                0;

            for (
                const item
                of files.slice(
                    maximum
                )
            ) {
                try {
                    fs.unlinkSync(
                        item.full
                    );

                    removed++;
                } catch {}
            }

            return {
                ok: true,
                removed
            };
        } catch (
            error
        ) {
            return {
                ok: false,
                error:
                    answerMemoryError5(
                        error
                    )
            };
        }
    };


/* ============================================================
   5.11 - EXPORT MEMORY
============================================================ */

AnswerMemory.prototype.export5 =
    function (
        options = {}
    ) {
        try {
            answerMemoryEnsureDirectories();

            let records =
                Object.values(
                    this.records || {}
                );

            if (
                options.userId
            ) {
                const userId =
                    answerMemoryNormalizeUserId2(
                        options.userId
                    );

                records =
                    records.filter(
                        record =>
                            answerMemoryNormalizeUserId2(
                                record.userId
                            ) ===
                            userId
                    );
            }

            if (
                options.category
            ) {
                records =
                    records.filter(
                        record =>
                            record.category ===
                            options.category
                    );
            }

            if (
                options.activeOnly
            ) {
                records =
                    records.filter(
                        record =>
                            record.active !==
                            false
                    );
            }

            const timestamp =
                new Date()
                    .toISOString()
                    .replace(
                        /[:.]/g,
                        "-"
                    );

            const filename =
                options.fileName ||
                `answer-memory-export-${timestamp}.json`;

            const safeFilename =
                filename
                    .replace(
                        /[<>:"/\\|?*]/g,
                        "_"
                    )
                    .slice(
                        0,
                        180
                    );

            const filePath =
                path.join(
                    ANSWER_MEMORY_EXPORT_DIR,
                    safeFilename
                );

            const payload = {
                format:
                    "turkai-answer-memory",

                version:
                    ANSWER_MEMORY_VERSION,

                exportedAt:
                    answerMemoryNowISO(),

                count:
                    records.length,

                filters: {
                    userId:
                        options.userId ||
                        null,

                    category:
                        options.category ||
                        null,

                    activeOnly:
                        Boolean(
                            options.activeOnly
                        )
                },

                records:
                    records.map(
                        record =>
                            this.publicRecord(
                                record
                            )
                    ),

                stats:
                    options.includeStats
                        ? this.stats
                        : undefined
            };

            const ok =
                answerMemoryWriteJSON(
                    filePath,
                    payload
                );

            if (
                ok
            ) {
                this.stats.exports =
                    Number(
                        this.stats
                            .exports ||
                            0
                    ) + 1;
            }

            return {
                ok,
                file:
                    filePath,
                count:
                    records.length
            };
        } catch (
            error
        ) {
            return {
                ok: false,
                error:
                    answerMemoryError5(
                        error
                    )
            };
        }
    };


/* ============================================================
   5.12 - IMPORT MEMORY
============================================================ */

AnswerMemory.prototype.import5 =
    function (
        input,
        options = {}
    ) {
        try {
            let payload =
                input;

            if (
                typeof input ===
                "string"
            ) {
                if (
                    fs.existsSync(
                        input
                    )
                ) {
                    payload =
                        answerMemoryReadJSON(
                            input,
                            {}
                        );
                } else {
                    payload =
                        JSON.parse(
                            input
                        );
                }
            }

            if (
                Buffer.isBuffer(
                    payload
                )
            ) {
                payload =
                    JSON.parse(
                        payload.toString(
                            "utf8"
                        )
                    );
            }

            const data =
                answerMemoryEnsureObject(
                    payload
                );

            const imported =
                Array.isArray(
                    data.records
                )
                    ? data.records
                    : Array.isArray(
                          payload
                      )
                    ? payload
                    : [];

            let importedCount =
                0;

            let skipped =
                0;

            let updated =
                0;

            let created =
                0;

            for (
                const item
                of imported
            ) {
                if (
                    !item ||
                    !item.question ||
                    !item.answer
                ) {
                    skipped++;
                    continue;
                }

                const normalizedQuestion =
                    answerMemoryNormalizeTurkish(
                        item.question
                    );

                const existing =
                    Object.values(
                        this.records || {}
                    ).find(
                        record =>
                            record &&
                            record.active !==
                                false &&
                            record.questionHash ===
                                answerMemoryHash(
                                    normalizedQuestion
                                ) &&
                            (
                                !options.userId ||
                                answerMemoryNormalizeUserId2(
                                    record.userId
                                ) ===
                                    answerMemoryNormalizeUserId2(
                                        options.userId
                                    )
                            )
                    );

                if (
                    existing &&
                    options.updateOnConflict !==
                        false
                ) {
                    existing.answer =
                        answerMemorySafeText4(
                            item.answer,
                            existing.answer
                        );

                    existing.normalizedAnswer =
                        answerMemoryNormalizeTurkish(
                            existing.answer
                        );

                    existing.answerHash =
                        answerMemoryHash(
                            existing.normalizedAnswer
                        );

                    existing.updatedAt =
                        answerMemoryNowISO();

                    existing.version =
                        Number(
                            existing.version ||
                                1
                        ) + 1;

                    existing.updates =
                        Number(
                            existing.updates ||
                                0
                        ) + 1;

                    updated++;
                    importedCount++;

                    continue;
                }

                const result =
                    this.saveAnswerV2(
                        item.question,
                        item.answer,
                        {
                            userId:
                                options.userId ||
                                item.userId,

                            userName:
                                item.userName,

                            scope:
                                item.scope,

                            language:
                                item.language,

                            category:
                                item.category,

                            tags:
                                item.tags,

                            importance:
                                item.importance,

                            confidence:
                                item.confidence,

                            quality:
                                item.quality,

                            pinned:
                                item.pinned,

                            favorite:
                                item.favorite,

                            verified:
                                item.verified,

                            trusted:
                                item.trusted,

                            source:
                                "import",

                            model:
                                item.model,

                            metadata:
                                item.metadata,

                            custom:
                                item.custom,

                            updateOnConflict:
                                options
                                    .updateOnConflict !==
                                false
                        }
                    );

                if (
                    result?.ok
                ) {
                    importedCount++;

                    if (
                        result.created
                    ) {
                        created++;
                    }
                } else {
                    skipped++;
                }
            }

            this.stats.imports =
                Number(
                    this.stats.imports ||
                        0
                ) + 1;

            this.stats.lastWrite =
                answerMemoryNowISO();

            this.persist();

            return {
                ok: true,

                imported:
                    importedCount,

                created,

                updated,

                skipped,

                total:
                    imported.length
            };
        } catch (
            error
        ) {
            return {
                ok: false,

                imported: 0,

                skipped: 0,

                error:
                    answerMemoryError5(
                        error
                    )
            };
        }
    };


/* ============================================================
   5.13 - HEALTH REPORT
============================================================ */

AnswerMemory.prototype.getHealth5 =
    function () {
        let storageOk =
            true;

        const storageErrors =
            [];

        const filesToCheck = [
            ANSWER_MEMORY_FILES.records,
            ANSWER_MEMORY_FILES.index,
            ANSWER_MEMORY_FILES.stats,
            ANSWER_MEMORY_FILES.history,
            ANSWER_MEMORY_FILES.config,
            ANSWER_MEMORY_FILES.users,
            ANSWER_MEMORY_FILES.cache
        ];

        for (
            const filePath
            of filesToCheck
        ) {
            try {
                if (
                    fs.existsSync(
                        filePath
                    )
                ) {
                    fs.accessSync(
                        filePath,
                        fs.constants.R_OK |
                            fs.constants.W_OK
                    );
                }
            } catch (
                error
            ) {
                storageOk =
                    false;

                storageErrors.push(
                    {
                        file:
                            filePath,

                        error:
                            error.message
                    }
                );
            }
        }

        const total =
            Object.keys(
                this.records || {}
            ).length;

        const active =
            Object.values(
                this.records || {}
            ).filter(
                record =>
                    record &&
                    record.active !==
                        false
            ).length;

        const archived =
            Object.values(
                this.records || {}
            ).filter(
                record =>
                    record &&
                    record.archived ===
                        true
            ).length;

        const cacheEntries =
            Object.keys(
                this.cache || {}
            ).length;

        const indexTokens =
            Object.keys(
                this.index || {}
            ).length;

        const userCount =
            Object.keys(
                this.userIndex || {}
            ).length;

        return {
            ok:
                this.loaded ===
                    true &&
                this.config?.enabled !==
                    false &&
                storageOk,

            version:
                ANSWER_MEMORY_VERSION,

            loaded:
                Boolean(
                    this.loaded
                ),

            enabled:
                this.config?.enabled !==
                false,

            storage: {
                ok:
                    storageOk,

                root:
                    ANSWER_MEMORY_ROOT,

                errors:
                    storageErrors
            },

            records: {
                total,
                active,
                archived
            },

            index: {
                tokens:
                    indexTokens,

                users:
                    userCount
            },

            cache: {
                entries:
                    cacheEntries,

                enabled:
                    this.config?.cacheEnabled !==
                    false
            },

            statistics:
                this.stats,

            startedAt:
                this.startedAt,

            lastWriteAt:
                this.lastWriteAt,

            error:
                this.lastLoadError
        };
    };


/* ============================================================
   5.14 - DIAGNOSTICS V5
============================================================ */

AnswerMemory.prototype.diagnostics5 =
    function () {
        const records =
            Object.values(
                this.records || {}
            );

        const categoryCounts =
            {};

        const userCounts =
            {};

        const sourceCounts =
            {};

        const languageCounts =
            {};

        let totalHits =
            0;

        let totalMisses =
            0;

        let totalQuality =
            0;

        let totalConfidence =
            0;

        let totalImportance =
            0;

        let totalAnswerLength =
            0;

        let totalQuestionLength =
            0;

        for (
            const record
            of records
        ) {
            if (
                !record
            ) {
                continue;
            }

            const category =
                record.category ||
                "general";

            const userId =
                record.userId ||
                "anonymous";

            const source =
                record.source ||
                "unknown";

            const language =
                record.language ||
                "unknown";

            categoryCounts[
                category
            ] =
                (
                    categoryCounts[
                        category
                    ] || 0
                ) + 1;

            userCounts[
                userId
            ] =
                (
                    userCounts[
                        userId
                    ] || 0
                ) + 1;

            sourceCounts[
                source
            ] =
                (
                    sourceCounts[
                        source
                    ] || 0
                ) + 1;

            languageCounts[
                language
            ] =
                (
                    languageCounts[
                        language
                    ] || 0
                ) + 1;

            totalHits +=
                Number(
                    record.hits ||
                        0
                );

            totalMisses +=
                Number(
                    record.misses ||
                        0
                );

            totalQuality +=
                Number(
                    record.quality ??
                        0.70
                );

            totalConfidence +=
                Number(
                    record.confidence ??
                        0.80
                );

            totalImportance +=
                Number(
                    record.importance ??
                        0.50
                );

            totalAnswerLength +=
                String(
                    record.answer ||
                        ""
                ).length;

            totalQuestionLength +=
                String(
                    record.question ||
                        ""
                ).length;
        }

        const totalFeedback =
            totalHits +
            totalMisses;

        return {
            ok: true,

            version:
                ANSWER_MEMORY_VERSION,

            records:
                records.length,

            active:
                records.filter(
                    record =>
                        record.active !==
                        false
                ).length,

            archived:
                records.filter(
                    record =>
                        record.archived ===
                        true
                ).length,

            users:
                Object.keys(
                    userCounts
                ).length,

            indexedTokens:
                Object.keys(
                    this.index || {}
                ).length,

            cacheEntries:
                Object.keys(
                    this.cache || {}
                ).length,

            categoryCounts,

            userCounts,

            sourceCounts,

            languageCounts,

            totalHits,

            totalMisses,

            feedbackRate:
                totalFeedback >
                0
                    ? totalHits /
                      totalFeedback
                    : 0,

            averageQuality:
                records.length >
                0
                    ? totalQuality /
                      records.length
                    : 0,

            averageConfidence:
                records.length >
                0
                    ? totalConfidence /
                      records.length
                    : 0,

            averageImportance:
                records.length >
                0
                    ? totalImportance /
                      records.length
                    : 0,

            averageQuestionLength:
                records.length >
                0
                    ? totalQuestionLength /
                      records.length
                    : 0,

            averageAnswerLength:
                records.length >
                0
                    ? totalAnswerLength /
                      records.length
                    : 0,

            search:
                this.getSearchStats3
                    ? this.getSearchStats3()
                    : null,

            health:
                this.getHealth5()
        };
    };


/* ============================================================
   5.15 - SNAPSHOT V5
============================================================ */

AnswerMemory.prototype.snapshot5 =
    function () {
        return {
            format:
                "turkai-answer-memory-snapshot",

            version:
                ANSWER_MEMORY_VERSION,

            timestamp:
                answerMemoryNowISO(),

            health:
                this.getHealth5(),

            diagnostics:
                this.diagnostics5(),

            topAnswers:
                this.getTopAnswers4
                    ? this.getTopAnswers4({
                          limit: 20
                      })
                    : [],

            recentHistory:
                this.queryHistory4
                    ? this.queryHistory4({
                          limit: 20
                      })
                    : null
        };
    };


/* ============================================================
   5.16 - COMPATIBILITY SAVE
============================================================ */

AnswerMemory.prototype.saveAnswer =
    function (
        question,
        answer,
        options = {}
    ) {
        return this.saveAnswerV2(
            question,
            answer,
            options
        );
    };


/* ============================================================
   5.17 - COMPATIBILITY SEARCH
============================================================ */

AnswerMemory.prototype.search =
    function (
        question,
        options = {}
    ) {
        return this.searchAdvanced3(
            question,
            options
        );
    };


AnswerMemory.prototype.find =
    function (
        question,
        options = {}
    ) {
        return this.searchAdvanced3(
            question,
            {
                ...options,
                topK:
                    options.topK ||
                    1
            }
        );
    };


AnswerMemory.prototype.searchSmart =
    function (
        question,
        options = {}
    ) {
        return this.searchAdvanced3(
            question,
            options
        );
    };


/* ============================================================
   5.18 - COMPATIBILITY HEALTH
============================================================ */

AnswerMemory.prototype.health =
    function () {
        return this.getHealth5();
    };


/* ============================================================
   5.19 - COMPATIBILITY DIAGNOSTICS
============================================================ */

AnswerMemory.prototype.diagnostics =
    function () {
        return this.diagnostics5();
    };


/* ============================================================
   5.20 - COMPATIBILITY EXPORT
============================================================ */

AnswerMemory.prototype.exportData =
    function (
        options = {}
    ) {
        return this.export5(
            options
        );
    };


/* ============================================================
   5.21 - COMPATIBILITY IMPORT
============================================================ */

AnswerMemory.prototype.importData =
    function (
        input,
        options = {}
    ) {
        return this.import5(
            input,
            options
        );
    };


/* ============================================================
   5.22 - COMPATIBILITY CLEAR
============================================================ */

AnswerMemory.prototype.clearMemory5 =
    function (
        options = {}
    ) {
        if (
            options.backup !==
            false
        ) {
            this.createBackup5();
        }

        this.records = {};
        this.index = {};
        this.userIndex = {};
        this.history = [];
        this.cache = {};

        this.stats = {
            totalEntries: 0,
            totalReads: 0,
            totalWrites: 0,
            totalHits: 0,
            totalMisses: 0,
            duplicates: 0,
            updates: 0,
            deletions: 0,
            searches: 0,
            cacheHits: 0,
            cacheMisses: 0,
            imports: 0,
            exports: 0,
            rebuilds: 0,
            backups: 0,
            errors: 0,
            lastWrite: null,
            lastRead: null,
            lastHit: null,
            lastMiss: null,
            lastSearch: null,
            lastMaintenance:
                answerMemoryNowISO(),
            lastBackup:
                this.stats?.lastBackup ||
                null
        };

        this.persist();

        return {
            ok: true,
            cleared: true
        };
    };


/* ============================================================
   5.23 - MEMORY CONTEXT TEXT
============================================================ */

AnswerMemory.prototype.buildContextText5 =
    function (
        question,
        options = {}
    ) {
        const result =
            this.getMemoryContext3
                ? this.getMemoryContext3(
                      question,
                      {
                          ...options,

                          topK:
                              options.topK ||
                              5,

                          touchResults:
                              false
                      }
                  )
                : null;

        if (
            !result?.results?.length
        ) {
            return {
                ok: true,

                text: "",

                results: [],

                best: null
            };
        }

        const maxChars =
            Math.max(
                500,
                Number(
                    options.maxChars ||
                        12000
                )
            );

        let text = "";

        const selected = [];

        for (
            const item
            of result.results
        ) {
            const block =
                [
                    `Soru: ${item.question}`,

                    `Cevap: ${item.answer}`,

                    `Güven: ${(
                        Number(
                            item.confidence ||
                                0
                        ) *
                        100
                    ).toFixed(0)}%`,

                    `Benzerlik: ${(
                        Number(
                            item.similarity ||
                                0
                        ) *
                        100
                    ).toFixed(0)}%`
                ].join(
                    "\n"
                );

            if (
                (
                    text.length +
                    block.length +
                    2
                ) >
                maxChars
            ) {
                break;
            }

            text +=
                (
                    text
                        ? "\n\n"
                        : ""
                ) +
                block;

            selected.push(
                item
            );
        }

        return {
            ok: true,

            text,

            results:
                selected,

            best:
                selected[0] ||
                null,

            count:
                selected.length
        };
    };


/* ============================================================
   5.24 - FINAL AUTO LEARNING BRIDGE
============================================================ */

AnswerMemory.prototype.learn =
    function (
        question,
        answer,
        options = {}
    ) {
        return this.smartAutoLearn4(
            question,
            answer,
            options
        );
    };


AnswerMemory.prototype.autoLearn =
    function (
        question,
        answer,
        options = {}
    ) {
        return this.smartAutoLearn4(
            question,
            answer,
            options
        );
    };


/* ============================================================
   5.25 - MEMORY DECISION
============================================================ */

AnswerMemory.prototype.shouldUseMemory =
    function (
        question,
        options = {}
    ) {
        return this.decideForChat3(
            question,
            options
        );
    };


AnswerMemory.prototype.getMemoryAnswer =
    function (
        question,
        options = {}
    ) {
        const decision =
            this.decideForChat3(
                question,
                options
            );

        if (
            !decision.useMemory
        ) {
            return null;
        }

        return (
            decision.result ||
            null
        );
    };


/* ============================================================
   5.26 - USER MEMORY EXPORT
============================================================ */

AnswerMemory.prototype.exportUser5 =
    function (
        userId,
        options = {}
    ) {
        return this.export5(
            {
                ...options,

                userId
            }
        );
    };


/* ============================================================
   5.27 - GET OVERVIEW
============================================================ */

AnswerMemory.prototype.overview =
    function () {
        if (
            this.getOverview4
        ) {
            return this.getOverview4();
        }

        return {
            ok: true,

            totalRecords:
                Object.keys(
                    this.records || {}
                ).length,

            users:
                Object.keys(
                    this.userIndex || {}
                ).length,

            indexedTokens:
                Object.keys(
                    this.index || {}
                ).length
        };
    };


/* ============================================================
   5.28 - GLOBAL INSTANCE
============================================================ */

/*
Bu satırlar özellikle önemli.

Part 2-4'te tanımlanan global fonksiyonların
kullanabilmesi için gerçek instance burada oluşturuluyor.
*/

const globalAnswerMemoryInstance =
    new AnswerMemory();


/* ============================================================
   5.29 - GLOBAL SAVE
============================================================ */

function saveAnswerMemory(
    question,
    answer,
    options = {}
) {
    try {
        return globalAnswerMemoryInstance.saveAnswer(
            question,
            answer,
            options
        );
    } catch (
        error
    ) {
        return {
            ok: false,

            error:
                answerMemoryError5(
                    error
                )
        };
    }
}


/* ============================================================
   5.30 - GLOBAL SEARCH
============================================================ */

function findAnswerMemory(
    question,
    options = {}
) {
    try {
        return globalAnswerMemoryInstance.search(
            question,
            options
        );
    } catch (
        error
    ) {
        return {
            ok: false,

            query:
                String(
                    question ||
                        ""
                ),

            results: [],

            best: null,

            error:
                answerMemoryError5(
                    error
                )
        };
    }
}


/* ============================================================
   5.31 - GLOBAL BEST ANSWER
============================================================ */

function findBestAnswerMemory(
    question,
    options = {}
) {
    try {
        return globalAnswerMemoryInstance.findBestAnswer3(
            question,
            options
        );
    } catch {
        return null;
    }
}


/* ============================================================
   5.32 - GLOBAL HEALTH
============================================================ */

function getAnswerMemoryHealth() {
    try {
        return globalAnswerMemoryInstance.getHealth5();
    } catch (
        error
    ) {
        return {
            ok: false,

            error:
                answerMemoryError5(
                    error
                )
        };
    }
}


/* ============================================================
   5.33 - GLOBAL STATS
============================================================ */

function getAnswerMemoryStats() {
    try {
        return globalAnswerMemoryInstance.getStats();
    } catch (
        error
    ) {
        return {
            ok: false,

            error:
                answerMemoryError5(
                    error
                )
        };
    }
}


/* ============================================================
   5.34 - GLOBAL DIAGNOSTICS
============================================================ */

function getAnswerMemoryDiagnostics() {
    try {
        return globalAnswerMemoryInstance.diagnostics5();
    } catch (
        error
    ) {
        return {
            ok: false,

            error:
                answerMemoryError5(
                    error
                )
        };
    }
}


/* ============================================================
   5.35 - GLOBAL AUTO LEARN
============================================================ */

function autoLearnAnswer(
    question,
    answer,
    options = {}
) {
    try {
        return globalAnswerMemoryInstance.smartAutoLearn4(
            question,
            answer,
            options
        );
    } catch (
        error
    ) {
        return {
            ok: false,

            learned: false,

            error:
                answerMemoryError5(
                    error
                )
        };
    }
}


/* ============================================================
   5.36 - GLOBAL EXPORT
============================================================ */

function exportAnswerMemory(
    options = {}
) {
    try {
        return globalAnswerMemoryInstance.export5(
            options
        );
    } catch (
        error
    ) {
        return {
            ok: false,

            error:
                answerMemoryError5(
                    error
                )
        };
    }
}


/* ============================================================
   5.37 - GLOBAL IMPORT
============================================================ */

function importAnswerMemory(
    input,
    options = {}
) {
    try {
        return globalAnswerMemoryInstance.import5(
            input,
            options
        );
    } catch (
        error
    ) {
        return {
            ok: false,

            error:
                answerMemoryError5(
                    error
                )
        };
    }
}


/* ============================================================
   5.38 - GLOBAL CLEAR
============================================================ */

function clearAnswerMemory(
    options = {}
) {
    try {
        return globalAnswerMemoryInstance.clearMemory5(
            options
        );
    } catch (
        error
    ) {
        return {
            ok: false,

            error:
                answerMemoryError5(
                    error
                )
        };
    }
}


/* ============================================================
   5.39 - GLOBAL REBUILD
============================================================ */

function rebuildAnswerMemoryIndex() {
    try {
        return globalAnswerMemoryInstance.rebuildIndex5();
    } catch (
        error
    ) {
        return {
            ok: false,

            error:
                answerMemoryError5(
                    error
                )
        };
    }
}


/* ============================================================
   5.40 - GLOBAL DECISION
============================================================ */

function shouldUseAnswerMemory(
    question,
    options = {}
) {
    try {
        return globalAnswerMemoryInstance.shouldUseMemory(
            question,
            options
        );
    } catch (
        error
    ) {
        return {
            useMemory: false,

            reason:
                "memory_error",

            error:
                answerMemoryError5(
                    error
                )
        };
    }
}


/* ============================================================
   5.41 - GLOBAL CONTEXT
============================================================ */

function getAnswerMemoryContext(
    question,
    options = {}
) {
    try {
        return globalAnswerMemoryInstance.buildContextText5(
            question,
            options
        );
    } catch (
        error
    ) {
        return {
            ok: false,

            text: "",

            results: [],

            best: null,

            error:
                answerMemoryError5(
                    error
                )
        };
    }
}


/* ============================================================
   5.42 - GLOBAL SNAPSHOT
============================================================ */

function getAnswerMemorySnapshot() {
    try {
        return globalAnswerMemoryInstance.snapshot5();
    } catch (
        error
    ) {
        return {
            ok: false,

            error:
                answerMemoryError5(
                    error
                )
        };
    }
}


/* ============================================================
   5.43 - TURKAI GLOBAL NAMESPACE
============================================================ */

globalThis.turkAIAnswerMemory =
    globalAnswerMemoryInstance;

globalThis.saveAnswerMemory =
    saveAnswerMemory;

globalThis.findAnswerMemory =
    findAnswerMemory;

globalThis.findBestAnswerMemory =
    findBestAnswerMemory;

globalThis.getAnswerMemoryHealth =
    getAnswerMemoryHealth;

globalThis.getAnswerMemoryStats =
    getAnswerMemoryStats;

globalThis.getAnswerMemoryDiagnostics =
    getAnswerMemoryDiagnostics;

globalThis.autoLearnAnswer =
    autoLearnAnswer;

globalThis.exportAnswerMemory =
    exportAnswerMemory;

globalThis.importAnswerMemory =
    importAnswerMemory;

globalThis.clearAnswerMemory =
    clearAnswerMemory;

globalThis.rebuildAnswerMemoryIndex =
    rebuildAnswerMemoryIndex;

globalThis.shouldUseAnswerMemory =
    shouldUseAnswerMemory;

globalThis.getAnswerMemoryContext =
    getAnswerMemoryContext;

globalThis.getAnswerMemorySnapshot =
    getAnswerMemorySnapshot;


/* ============================================================
   5.44 - NAMESPACE METHODS
============================================================ */

globalThis.turkAIAnswerMemory.save =
    saveAnswerMemory;

globalThis.turkAIAnswerMemory.search =
    findAnswerMemory;

globalThis.turkAIAnswerMemory.findBest =
    findBestAnswerMemory;

globalThis.turkAIAnswerMemory.health =
    getAnswerMemoryHealth;

globalThis.turkAIAnswerMemory.stats =
    getAnswerMemoryStats;

globalThis.turkAIAnswerMemory.diagnostics =
    getAnswerMemoryDiagnostics;

globalThis.turkAIAnswerMemory.learn =
    autoLearnAnswer;

globalThis.turkAIAnswerMemory.export =
    exportAnswerMemory;

globalThis.turkAIAnswerMemory.import =
    importAnswerMemory;

globalThis.turkAIAnswerMemory.clear =
    clearAnswerMemory;

globalThis.turkAIAnswerMemory.rebuild =
    rebuildAnswerMemoryIndex;

globalThis.turkAIAnswerMemory.shouldUse =
    shouldUseAnswerMemory;

globalThis.turkAIAnswerMemory.context =
    getAnswerMemoryContext;

globalThis.turkAIAnswerMemory.snapshot =
    getAnswerMemorySnapshot;


/* ============================================================
   5.45 - FINAL MODULE EXPORT
============================================================ */

module.exports = {
    AnswerMemory,

    answerMemory:
        globalAnswerMemoryInstance,

    instance:
        globalAnswerMemoryInstance,

    version:
        ANSWER_MEMORY_VERSION,

    ANSWER_MEMORY_VERSION,

    config:
        DEFAULT_ANSWER_MEMORY_CONFIG,

    DEFAULT_ANSWER_MEMORY_CONFIG,

    root:
        ANSWER_MEMORY_ROOT,

    ANSWER_MEMORY_ROOT,

    files:
        ANSWER_MEMORY_FILES,

    ANSWER_MEMORY_FILES,

    saveAnswerMemory,

    rememberAnswer:
        saveAnswerMemory,

    findAnswerMemory,

    searchAnswerMemory:
        findAnswerMemory,

    findBestAnswerMemory,

    findKnowledgeAnswer:
        findBestAnswerMemory,

    getAnswerMemoryHealth,

    getAnswerMemoryStats,

    getAnswerMemoryDiagnostics,

    autoLearnAnswer,

    smartAutoLearnAnswer:
        autoLearnAnswer,

    exportAnswerMemory,

    importAnswerMemory,

    clearAnswerMemory,

    rebuildAnswerMemoryIndex,

    shouldUseAnswerMemory,

    getAnswerMemoryContext,

    getAnswerMemorySnapshot,

    normalizeText:
        answerMemoryNormalizeTurkish,

    searchNormalize:
        answerMemorySearchNormalize,

    tokenize:
        answerMemoryTokenize,

    keywords:
        answerMemoryExtractKeywords,

    jaccard:
        answerMemoryJaccardSimilarity,

    dice:
        answerMemoryDiceSimilarity,

    similarity:
        answerMemoryCombinedSimilarity,

    detectCategory:
        answerMemoryDetectCategory,

    detectLanguage:
        answerMemoryDetectLanguage,

    detectQuestionType:
        answerMemoryDetectQuestionType
};


/* ============================================================
   5.46 - AUTO MAINTENANCE
============================================================ */

let answerMemoryMaintenanceTimer5 =
    null;

let answerMemoryBackupTimer5 =
    null;


/* ============================================================
   5.47 - MAINTENANCE TIMER
============================================================ */

try {
    answerMemoryMaintenanceTimer5 =
        setInterval(
            () => {
                try {
                    globalAnswerMemoryInstance.runMaintenance5(
                        {
                            backup: false,

                            archiveWeak:
                                true
                        }
                    );
                } catch (
                    error
                ) {
                    try {
                        globalAnswerMemoryInstance.stats.errors =
                            Number(
                                globalAnswerMemoryInstance
                                    .stats
                                    .errors ||
                                0
                            ) + 1;
                    } catch {}

                    console.warn(
                        "[AnswerMemory] Maintenance error:",
                        error.message
                    );
                }
            },
            ANSWER_MEMORY_MAINTENANCE_5
                .maintenanceIntervalMs
        );

    if (
        typeof
            answerMemoryMaintenanceTimer5.unref ===
        "function"
    ) {
        answerMemoryMaintenanceTimer5.unref();
    }
} catch (
    error
) {
    console.warn(
        "[AnswerMemory] Maintenance timer failed:",
        error.message
    );
}


/* ============================================================
   5.48 - BACKUP TIMER
============================================================ */

try {
    answerMemoryBackupTimer5 =
        setInterval(
            () => {
                try {
                    globalAnswerMemoryInstance
                        .createBackup5();
                } catch (
                    error
                ) {
                    console.warn(
                        "[AnswerMemory] Backup error:",
                        error.message
                    );
                }
            },
            ANSWER_MEMORY_MAINTENANCE_5
                .backupIntervalMs
        );

    if (
        typeof
            answerMemoryBackupTimer5.unref ===
        "function"
    ) {
        answerMemoryBackupTimer5.unref();
    }
} catch (
    error
) {
    console.warn(
        "[AnswerMemory] Backup timer failed:",
        error.message
    );
}


/* ============================================================
   5.49 - INITIAL INDEX CHECK
============================================================ */

try {
    const storedRecords =
        Object.keys(
            globalAnswerMemoryInstance
                .records || {}
        ).length;

    const storedTokens =
        Object.keys(
            globalAnswerMemoryInstance
                .index || {}
        ).length;

    if (
        storedRecords > 0 &&
        storedTokens === 0
    ) {
        globalAnswerMemoryInstance
            .rebuildIndex5(
                {
                    persist:
                        true
                }
            );
    }
} catch (
    error
) {
    console.warn(
        "[AnswerMemory] Initial index check failed:",
        error.message
    );
}


/* ============================================================
   5.50 - STARTUP LOG
============================================================ */

try {
    const health =
        getAnswerMemoryHealth();

    console.log(
        "=================================================="
    );

    console.log(
        "TürkAI Answer Memory Engine 5.0"
    );

    console.log(
        "Version       : " +
            ANSWER_MEMORY_VERSION
    );

    console.log(
        "Status        : " +
            (
                health.ok
                    ? "READY"
                    : "DEGRADED"
            )
    );

    console.log(
        "Records       : " +
            (
                health.records?.total ||
                0
            )
    );

    console.log(
        "Active        : " +
            (
                health.records?.active ||
                0
            )
    );

    console.log(
        "Archived      : " +
            (
                health.records?.archived ||
                0
            )
    );

    console.log(
        "Index Tokens  : " +
            (
                health.index?.tokens ||
                0
            )
    );

    console.log(
        "Users         : " +
            (
                health.index?.users ||
                0
            )
    );

    console.log(
        "Cache         : " +
            (
                health.cache?.enabled
                    ? "ACTIVE"
                    : "OFF"
            )
    );

    console.log(
        "Auto Learn    : " +
            (
                globalAnswerMemoryInstance
                    .config
                    ?.autoLearn ===
                false
                    ? "OFF"
                    : "ACTIVE"
            )
    );

    console.log(
        "Search        : ACTIVE"
    );

    console.log(
        "Feedback      : ACTIVE"
    );

    console.log(
        "Backup        : ACTIVE"
    );

    console.log(
        "Export/Import : ACTIVE"
    );

    console.log(
        "=================================================="
    );
} catch (
    error
) {
    console.warn(
        "[AnswerMemory] Startup report failed:",
        error.message
    );
}


/* ============================================================
   5.51 - FINAL
============================================================ */

console.log(
    "[AnswerMemory] Part 5/5 loaded."
);

console.log(
    "[AnswerMemory] GLOBAL INSTANCE READY."
);

console.log(
    "[AnswerMemory] FINAL API READY."
);

/* ============================================================
   END OF ANSWER MEMORY ENGINE 5.0
==========/*
========================================================================
 TÜRKAI ANSWER MEMORY ULTRA
 EXTENSION — APPEND TO EXISTING ANSWER MEMORY SECTION
========================================================================
*/

const TURKAI_ANSWER_ULTRA_DIR_X =
    path.join(
        DATA_DIR,
        "answer-memory-ultra"
    );

const TURKAI_ANSWER_ULTRA_FILE_X =
    path.join(
        TURKAI_ANSWER_ULTRA_DIR_X,
        "answers.json"
    );

const TURKAI_ANSWER_ULTRA_EVENT_FILE_X =
    path.join(
        TURKAI_ANSWER_ULTRA_DIR_X,
        "events.jsonl"
    );

ensureDir(
    TURKAI_ANSWER_ULTRA_DIR_X
);

let TURKAI_ANSWER_ULTRA_DB_X =
    readJSON(
        TURKAI_ANSWER_ULTRA_FILE_X,
        []
    );

const TURKAI_ANSWER_ULTRA_CONFIG_X = {
    version: "2.5.0",

    enabled: true,

    maxEntries: 75000,

    maxQuestionLength: 12000,
    maxAnswerLength: 50000,

    searchLimit: 8,

    exactMatchScore: 1,
    strongMatchScore: 0.91,
    normalMatchScore: 0.72,
    minimumMatchScore: 0.35,

    repeatBoost: 0.012,
    usefulBoost: 0.025,
    favoriteBoost: 0.08,

    maxScoreBoost: 0.28,

    decayDays: 120,

    autoCleanup: true,

    autoLearn: true,

    protectImportant: true,

    globalAnswersEnabled: true,

    saveCorrections: true
};

/*
========================================================================
 BASIC HELPERS
========================================================================
*/

function answerUltraCleanX(
    value,
    max = 10000
) {
    return String(
        value ?? ""
    )
        .replace(/\u0000/g, "")
        .replace(/\r/g, "")
        .slice(0, max)
        .trim();
}

function answerUltraNormalizeX(
    value
) {
    return answerUltraCleanX(
        value,
        TURKAI_ANSWER_ULTRA_CONFIG_X
            .maxQuestionLength
    )
        .toLocaleLowerCase(
            "tr-TR"
        )
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .replace(/ç/g, "c")
        .replace(/ğ/g, "g")
        .replace(/ı/g, "i")
        .replace(/ö/g, "o")
        .replace(/ş/g, "s")
        .replace(/ü/g, "u")
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

function answerUltraTokensX(
    value
) {
    const normalized =
        answerUltraNormalizeX(
            value
        );

    if (!normalized) {
        return [];
    }

    return [
        ...new Set(
            normalized
                .split(" ")
                .filter(
                    token =>
                        token.length >= 2
                )
        )
    ];
}

function answerUltraHashX(
    question,
    answer
) {
    return crypto
        .createHash("sha256")
        .update(
            answerUltraNormalizeX(
                question
            ) +
            "|" +
            answerUltraCleanX(
                answer,
                TURKAI_ANSWER_ULTRA_CONFIG_X
                    .maxAnswerLength
            )
        )
        .digest("hex");
}

function answerUltraNowX() {
    return new Date().toISOString();
}

function answerUltraDaysX(
    date
) {
    const time =
        new Date(
            date || answerUltraNowX()
        ).getTime();

    if (!Number.isFinite(time)) {
        return 0;
    }

    return Math.max(
        0,
        (
            Date.now() -
            time
        ) / 86400000
    );
}

/*
========================================================================
 SECRET / PRIVATE DATA PROTECTION
========================================================================
*/

function answerUltraLooksSecretX(
    value
) {
    const text =
        String(value || "");

    const patterns = [
        /api[_ -]?key\s*[:=]/i,
        /secret[_ -]?key\s*[:=]/i,
        /password\s*[:=]/i,
        /passwd\s*[:=]/i,
        /token\s*[:=]/i,
        /authorization\s*[:=]/i,
        /bearer\s+[a-z0-9._-]+/i,
        /-----BEGIN [^-]+PRIVATE KEY-----/i,
        /\bsk-[a-z0-9_-]{20,}\b/i,
        /\bghp_[a-z0-9]{20,}\b/i,
        /\bAIza[a-z0-9_-]{20,}\b/i
    ];

    return patterns.some(
        regex =>
            regex.test(text)
    );
}

/*
========================================================================
 CATEGORY DETECTION
========================================================================
*/

function answerUltraCategoryX(
    question,
    answer
) {
    const q =
        answerUltraNormalizeX(
            question
        );

    if (
        /duzelt|yanlis|dogrusu|hata|yanit yanlis/.test(
            q
        )
    ) {
        return "correction";
    }

    if (
        /hatirla|unutma|aklinda tut|kaydet|tercihim|sevdigim|istemiyorum/.test(
            q
        )
    ) {
        return "preference";
    }

    if (
        /benim|ben |yasim|sinifim|okulum|ismim|adim/.test(
            q
        )
    ) {
        return "user_fact";
    }

    if (
        /projem|uygulamam|kodum|server|frontend|backend|turkai/.test(
            q
        )
    ) {
        return "project";
    }

    if (
        /kod|javascript|python|html|css|java|c\+\+|c#|node/.test(
            q
        )
    ) {
        return "coding";
    }

    if (
        /dolar|euro|altin|hava|sicaklik|kur|fiyat/.test(
            q
        )
    ) {
        return "current_info";
    }

    return "general";
}

/*
========================================================================
 SMART SIMILARITY
========================================================================
*/

function answerUltraSimilarityX(
    questionA,
    questionB
) {
    const a =
        answerUltraTokensX(
            questionA
        );

    const b =
        answerUltraTokensX(
            questionB
        );

    if (
        !a.length ||
        !b.length
    ) {
        return 0;
    }

    const setA =
        new Set(a);

    const setB =
        new Set(b);

    let common = 0;

    for (const token of setA) {
        if (setB.has(token)) {
            common++;
        }
    }

    const union =
        new Set([
            ...a,
            ...b
        ]).size;

    const jaccard =
        common /
        Math.max(
            1,
            union
        );

    const coverage =
        common /
        Math.max(
            1,
            Math.min(
                setA.size,
                setB.size
            )
        );

    const lengthRatio =
        Math.min(
            a.length,
            b.length
        ) /
        Math.max(
            1,
            Math.max(
                a.length,
                b.length
            )
        );

    return Math.min(
        1,
        (
            jaccard * 0.60
        ) +
        (
            coverage * 0.30
        ) +
        (
            lengthRatio * 0.10
        )
    );
}

/*
========================================================================
 IMPORTANCE
========================================================================
*/

function answerUltraImportanceX({
    question,
    answer,
    category
}) {
    let importance = 5;

    const q =
        answerUltraNormalizeX(
            question
        );

    const a =
        String(answer || "");

    if (
        q.includes("hatirla")
    ) {
        importance += 8;
    }

    if (
        q.includes("unutma")
    ) {
        importance += 8;
    }

    if (
        q.includes("kaydet")
    ) {
        importance += 7;
    }

    if (
        category === "user_fact"
    ) {
        importance += 5;
    }

    if (
        category === "preference"
    ) {
        importance += 6;
    }

    if (
        category === "project"
    ) {
        importance += 4;
    }

    if (
        category === "correction"
    ) {
        importance += 8;
    }

    if (
        a.length > 1000
    ) {
        importance += 2;
    }

    return Math.min(
        20,
        importance
    );
}

/*
========================================================================
 SCORE
========================================================================
*/

function answerUltraScoreX(
    item,
    similarity
) {
    const days =
        answerUltraDaysX(
            item.lastUsedAt ||
            item.updatedAt ||
            item.createdAt
        );

    const decay =
        Math.max(
            0,
            1 -
            (
                days /
                TURKAI_ANSWER_ULTRA_CONFIG_X
                    .decayDays
            )
        );

    const repeatBoost =
        Math.min(
            TURKAI_ANSWER_ULTRA_CONFIG_X
                .maxScoreBoost,
            Number(item.hits || 0) *
            TURKAI_ANSWER_ULTRA_CONFIG_X
                .repeatBoost
        );

    const usefulBoost =
        Math.min(
            TURKAI_ANSWER_ULTRA_CONFIG_X
                .maxScoreBoost,
            Number(item.usefulHits || 0) *
            TURKAI_ANSWER_ULTRA_CONFIG_X
                .usefulBoost
        );

    const favoriteBoost =
        item.favorite
            ? TURKAI_ANSWER_ULTRA_CONFIG_X
                .favoriteBoost
            : 0;

    const importanceBoost =
        Math.min(
            0.18,
            Number(
                item.importance || 0
            ) * 0.009
        );

    const categoryBoost =
        item.category === "correction"
            ? 0.05
            : 0;

    return Math.min(
        1.35,
        (
            similarity * 0.68
        ) +
        (
            decay * 0.08
        ) +
        repeatBoost +
        usefulBoost +
        favoriteBoost +
        importanceBoost +
        categoryBoost
    );
}

/*
========================================================================
 SAVE STORAGE
========================================================================
*/

function answerUltraPersistX() {
    if (
        TURKAI_ANSWER_ULTRA_DB_X
            .length >
        TURKAI_ANSWER_ULTRA_CONFIG_X
            .maxEntries
    ) {
        TURKAI_ANSWER_ULTRA_DB_X =
            TURKAI_ANSWER_ULTRA_DB_X
                .sort(
                    (a, b) =>
                        (
                            Number(
                                b.score || 0
                            )
                            +
                            Number(
                                b.hits || 0
                            ) * 0.01
                        )
                        -
                        (
                            Number(
                                a.score || 0
                            )
                            +
                            Number(
                                a.hits || 0
                            ) * 0.01
                        )
                )
                .slice(
                    0,
                    TURKAI_ANSWER_ULTRA_CONFIG_X
                        .maxEntries
                );
    }

    writeJSON(
        TURKAI_ANSWER_ULTRA_FILE_X,
        TURKAI_ANSWER_ULTRA_DB_X
    );
}

function answerUltraEventX(
    type,
    data = {}
) {
    try {
        appendJSONLine(
            TURKAI_ANSWER_ULTRA_EVENT_FILE_X,
            {
                type,
                data,
                timestamp:
                    answerUltraNowX()
            }
        );
    } catch (error) {}
}

/*
========================================================================
 ADD / UPDATE
========================================================================
*/

function answerUltraRememberX({
    userId = "guest",
    question,
    answer,
    model = "unknown",
    category = null,
    tags = [],
    favorite = false,
    source = "chat"
}) {
    if (
        !TURKAI_ANSWER_ULTRA_CONFIG_X
            .enabled
    ) {
        return null;
    }

    const cleanQuestion =
        answerUltraCleanX(
            question,
            TURKAI_ANSWER_ULTRA_CONFIG_X
                .maxQuestionLength
        );

    const cleanAnswer =
        answerUltraCleanX(
            answer,
            TURKAI_ANSWER_ULTRA_CONFIG_X
                .maxAnswerLength
        );

    if (
        cleanQuestion.length < 3 ||
        cleanAnswer.length < 1
    ) {
        return null;
    }

    if (
        answerUltraLooksSecretX(
            cleanQuestion
        ) ||
        answerUltraLooksSecretX(
            cleanAnswer
        )
    ) {
        return null;
    }

    const resolvedCategory =
        category ||
        answerUltraCategoryX(
            cleanQuestion,
            cleanAnswer
        );

    const normalizedQuestion =
        answerUltraNormalizeX(
            cleanQuestion
        );

    const hash =
        answerUltraHashX(
            cleanQuestion,
            cleanAnswer
        );

    const now =
        answerUltraNowX();

    const existing =
        TURKAI_ANSWER_ULTRA_DB_X.find(
            item =>
                item.hash === hash &&
                String(
                    item.userId
                ) ===
                String(userId)
        );

    if (existing) {
        existing.hits =
            Number(
                existing.hits || 0
            ) + 1;

        existing.lastUsedAt =
            now;

        existing.updatedAt =
            now;

        if (
            favorite
        ) {
            existing.favorite =
                true;
        }

        existing.score =
            answerUltraScoreX(
                existing,
                1
            );

        answerUltraPersistX();

        return existing;
    }

    const item = {
        id:
            "amu_" +
            Date.now().toString(36) +
            "_" +
            crypto
                .randomBytes(6)
                .toString("hex"),

        userId:
            String(
                userId ||
                "guest"
            ),

        question:
            cleanQuestion,

        normalizedQuestion,

        answer:
            cleanAnswer,

        model:
            answerUltraCleanX(
                model,
                100
            ) ||
            "unknown",

        category:
            resolvedCategory,

        tags:
            Array.isArray(tags)
                ? tags
                    .map(
                        tag =>
                            answerUltraCleanX(
                                tag,
                                80
                            )
                    )
                    .filter(Boolean)
                    .slice(0, 30)
                : [],

        source:
            answerUltraCleanX(
                source,
                80
            ) ||
            "chat",

        favorite:
            Boolean(favorite),

        protected:
            Boolean(
                TURKAI_ANSWER_ULTRA_CONFIG_X
                    .protectImportant &&
                (
                    resolvedCategory ===
                    "user_fact" ||
                    resolvedCategory ===
                    "preference" ||
                    resolvedCategory ===
                    "correction"
                )
            ),

        importance:
            answerUltraImportanceX({
                question:
                    cleanQuestion,
                answer:
                    cleanAnswer,
                category:
                    resolvedCategory
            }),

        hits: 1,

        usefulHits: 0,

        badHits: 0,

        score: 0,

        correctionOf:
            null,

        createdAt: now,

        updatedAt: now,

        lastUsedAt: now,

        hash
    };

    item.score =
        answerUltraScoreX(
            item,
            1
        );

    TURKAI_ANSWER_ULTRA_DB_X
        .push(item);

    answerUltraEventX(
        "remember",
        {
            id: item.id,
            userId: item.userId,
            category:
                item.category
        }
    );

    answerUltraPersistX();

    return item;
}

/*
========================================================================
 SEARCH
========================================================================
*/

function answerUltraSearchX({
    userId = "guest",
    question,
    limit = null,
    category = null,
    includeGlobal = true
}) {
    const query =
        answerUltraCleanX(
            question,
            10000
        );

    if (!query) {
        return [];
    }

    const normalized =
        answerUltraNormalizeX(
            query
        );

    const results = [];

    for (
        const item
        of TURKAI_ANSWER_ULTRA_DB_X
    ) {
        const sameUser =
            String(
                item.userId
            ) ===
            String(userId);

        const global =
            includeGlobal &&
            item.userId ===
            "global";

        if (
            !sameUser &&
            !global
        ) {
            continue;
        }

        if (
            category &&
            item.category !==
                category
        ) {
            continue;
        }

        let similarity = 0;

        if (
            item.normalizedQuestion ===
            normalized
        ) {
            similarity =
                1;
        } else {
            similarity =
                answerUltraSimilarityX(
                    query,
                    item.question
                );
        }

        if (
            similarity <
            TURKAI_ANSWER_ULTRA_CONFIG_X
                .minimumMatchScore
        ) {
            continue;
        }

        const score =
            answerUltraScoreX(
                item,
                similarity
            );

        results.push({
            item,
            similarity,
            score
        });
    }

    results.sort(
        (a, b) =>
            b.score -
            a.score
    );

    const finalResults =
        results.slice(
            0,
            Math.max(
                1,
                Math.min(
                    50,
                    Number(
                        limit ||
                        TURKAI_ANSWER_ULTRA_CONFIG_X
                            .searchLimit
                    )
                )
            )
        );

    for (
        const result
        of finalResults
    ) {
        result.item.hits =
            Number(
                result.item.hits || 0
            ) + 1;

        result.item.lastUsedAt =
            answerUltraNowX();

        result.item.updatedAt =
            result.item.lastUsedAt;
    }

    if (
        finalResults.length
    ) {
        answerUltraPersistX();
    }

    return finalResults;
}

/*
========================================================================
 BEST MATCH
========================================================================
*/

function answerUltraBestX({
    userId = "guest",
    question
}) {
    const results =
        answerUltraSearchX({
            userId,
            question,
            limit: 5
        });

    if (!results.length) {
        return null;
    }

    const best =
        results[0];

    return {
        ...best.item,
        similarity:
            best.similarity,
        matchScore:
            best.score,
        confident:
            best.similarity >=
            TURKAI_ANSWER_ULTRA_CONFIG_X
                .strongMatchScore
    };
}

/*
========================================================================
 FEEDBACK
========================================================================
*/

function answerUltraFeedbackX({
    userId = "guest",
    memoryId,
    useful
}) {
    const item =
        TURKAI_ANSWER_ULTRA_DB_X.find(
            x =>
                x.id ===
                    String(memoryId) &&
                String(
                    x.userId
                ) ===
                    String(userId)
        );

    if (!item) {
        return null;
    }

    if (useful) {
        item.usefulHits =
            Number(
                item.usefulHits || 0
            ) + 1;

        item.importance =
            Math.min(
                20,
                Number(
                    item.importance || 0
                ) + 1
            );
    } else {
        item.badHits =
            Number(
                item.badHits || 0
            ) + 1;

        item.importance =
            Math.max(
                0,
                Number(
                    item.importance || 0
                ) - 1
            );
    }

    item.updatedAt =
        answerUltraNowX();

    item.score =
        answerUltraScoreX(
            item,
            0.9
        );

    answerUltraEventX(
        "feedback",
        {
            id: item.id,
            useful:
                Boolean(useful)
        }
    );

    answerUltraPersistX();

    return item;
}

/*
========================================================================
 FAVORITE
========================================================================
*/

function answerUltraFavoriteX({
    userId = "guest",
    memoryId,
    value
}) {
    const item =
        TURKAI_ANSWER_ULTRA_DB_X.find(
            x =>
                x.id ===
                    String(memoryId) &&
                String(
                    x.userId
                ) ===
                    String(userId)
        );

    if (!item) {
        return null;
    }

    item.favorite =
        value === undefined
            ? !item.favorite
            : Boolean(value);

    item.updatedAt =
        answerUltraNowX();

    item.score =
        answerUltraScoreX(
            item,
            1
        );

    answerUltraPersistX();

    return item;
}

/*
========================================================================
 CORRECTION
========================================================================
*/

function answerUltraCorrectionX({
    userId = "guest",
    question,
    oldAnswer,
    correction
}) {
    if (
        !TURKAI_ANSWER_ULTRA_CONFIG_X
            .saveCorrections
    ) {
        return null;
    }

    const item =
        answerUltraRememberX({
            userId,
            question,
            answer:
                correction,
            category:
                "correction",
            tags: [
                "correction"
            ],
            source:
                "correction"
        });

    if (!item) {
        return null;
    }

    item.correctionOf = {
        oldAnswer:
            answerUltraCleanX(
                oldAnswer,
                30000
            ),
        createdAt:
            answerUltraNowX()
    };

    item.protected =
        true;

    item.importance =
        20;

    item.score =
        answerUltraScoreX(
            item,
            1
        );

    answerUltraPersistX();

    return item;
}

/*
========================================================================
 AUTO LEARN
========================================================================
*/

function answerUltraAutoLearnX({
    userId = "guest",
    question,
    answer,
    model = "unknown"
}) {
    if (
        !TURKAI_ANSWER_ULTRA_CONFIG_X
            .autoLearn
    ) {
        return null;
    }

    const category =
        answerUltraCategoryX(
            question,
            answer
        );

    /*
    Current information is generally
    better refreshed than permanently cached.
    */

    if (
        category ===
        "current_info"
    ) {
        return null;
    }

    return answerUltraRememberX({
        userId,
        question,
        answer,
        model,
        category,
        source:
            "auto-learning"
    });
}

/*
========================================================================
 DELETE
========================================================================
*/

function answerUltraDeleteX({
    userId = "guest",
    memoryId
}) {
    const index =
        TURKAI_ANSWER_ULTRA_DB_X
            .findIndex(
                x =>
                    x.id ===
                        String(
                            memoryId
                        ) &&
                    String(
                        x.userId
                    ) ===
                        String(userId)
            );

    if (index < 0) {
        return false;
    }

    const removed =
        TURKAI_ANSWER_ULTRA_DB_X
            .splice(
                index,
                1
            )[0];

    answerUltraEventX(
        "delete",
        {
            id:
                removed.id,
            userId
        }
    );

    answerUltraPersistX();

    return true;
}

/*
========================================================================
 CLEANUP
========================================================================
*/

function answerUltraCleanupX() {
    if (
        !TURKAI_ANSWER_ULTRA_CONFIG_X
            .autoCleanup
    ) {
        return {
            removed: 0
        };
    }

    const before =
        TURKAI_ANSWER_ULTRA_DB_X
            .length;

    TURKAI_ANSWER_ULTRA_DB_X =
        TURKAI_ANSWER_ULTRA_DB_X
            .filter(item => {
                if (
                    item.protected
                ) {
                    return true;
                }

                if (
                    item.favorite
                ) {
                    return true;
                }

                const days =
                    answerUltraDaysX(
                        item.lastUsedAt ||
                        item.updatedAt ||
                        item.createdAt
                    );

                if (
                    days >
                    TURKAI_ANSWER_ULTRA_CONFIG_X
                        .decayDays &&
                    Number(
                        item.hits || 0
                    ) <= 1 &&
                    Number(
                        item.usefulHits || 0
                    ) === 0
                ) {
                    return false;
                }

                return true;
            });

    const removed =
        before -
        TURKAI_ANSWER_ULTRA_DB_X
            .length;

    if (removed > 0) {
        answerUltraEventX(
            "cleanup",
            {
                removed
            }
        );

        answerUltraPersistX();
    }

    return {
        removed,
        remaining:
            TURKAI_ANSWER_ULTRA_DB_X
                .length
    };
}

/*
========================================================================
 USER MEMORY SNAPSHOT
========================================================================
*/

function answerUltraUserSnapshotX(
    userId = "guest"
) {
    const items =
        TURKAI_ANSWER_ULTRA_DB_X.filter(
            x =>
                String(
                    x.userId
                ) ===
                String(userId)
        );

    return {
        userId,

        total:
            items.length,

        favorites:
            items.filter(
                x =>
                    x.favorite
            ).length,

        protected:
            items.filter(
                x =>
                    x.protected
            ).length,

        useful:
            items
                .reduce(
                    (
                        sum,
                        x
                    ) =>
                        sum +
                        Number(
                            x.usefulHits ||
                            0
                        ),
                    0
                ),

        top: items
            .sort(
                (a, b) =>
                    Number(
                        b.score || 0
                    ) -
                    Number(
                        a.score || 0
                    )
            )
            .slice(
                0,
                15
            )
    };
}

/*
========================================================================
 API — SEARCH
========================================================================
*/

app.get(
    "/api/memory/ultra/search",
    (req, res) => {
        try {
            const userId =
                String(
                    req.query.userId ||
                    req.headers[
                        "x-user-id"
                    ] ||
                    "guest"
                );

            const query =
                answerUltraCleanX(
                    req.query.q ||
                    req.query.query ||
                    "",
                    10000
                );

            if (!query) {
                return res.json({
                    ok: true,
                    success: true,
                    results: []
                });
            }

            const results =
                answerUltraSearchX({
                    userId,
                    question:
                        query,
                    limit:
                        req.query.limit
                });

            res.json({
                ok: true,
                success: true,
                results:
                    results.map(
                        x => ({
                            ...x.item,
                            similarity:
                                x.similarity,
                            matchScore:
                                x.score
                        })
                    )
            });
        } catch (error) {
            res.status(500).json({
                ok: false,
                error:
                    error.message
            });
        }
    }
);

/*
========================================================================
 API — BEST ANSWER
========================================================================
*/

app.post(
    "/api/memory/ultra/best",
    (req, res) => {
        try {
            const userId =
                String(
                    req.body?.userId ||
                    "guest"
                );

            const question =
                answerUltraCleanX(
                    req.body?.question ||
                    req.body?.message ||
                    ""
                );

            const best =
                answerUltraBestX({
                    userId,
                    question
                });

            res.json({
                ok: true,
                success: true,
                found:
                    Boolean(best),
                result:
                    best
            });
        } catch (error) {
            res.status(500).json({
                ok: false,
                error:
                    error.message
            });
        }
    }
);

/*
========================================================================
 API — SAVE
========================================================================
*/

app.post(
    "/api/memory/ultra/save",
    (req, res) => {
        try {
            const item =
                answerUltraRememberX({
                    userId:
                        req.body?.userId ||
                        "guest",

                    question:
                        req.body?.question ||
                        req.body?.message,

                    answer:
                        req.body?.answer ||
                        req.body?.content,

                    model:
                        req.body?.model,

                    category:
                        req.body?.category,

                    tags:
                        req.body?.tags,

                    favorite:
                        req.body?.favorite,

                    source:
                        req.body?.source ||
                        "api"
                });

            if (!item) {
                return res.status(400)
                    .json({
                        ok: false,
                        success: false,
                        error:
                            "Cevap hafızaya kaydedilemedi."
                    });
            }

            res.json({
                ok: true,
                success: true,
                memory:
                    item
            });
        } catch (error) {
            res.status(500).json({
                ok: false,
                error:
                    error.message
            });
        }
    }
);

/*
========================================================================
 API — FEEDBACK
========================================================================
*/

app.post(
    "/api/memory/ultra/feedback",
    (req, res) => {
        const item =
            answerUltraFeedbackX({
                userId:
                    req.body?.userId ||
                    "guest",

                memoryId:
                    req.body?.memoryId ||
                    req.body?.id,

                useful:
                    Boolean(
                        req.body?.useful
                    )
            });

        if (!item) {
            return res.status(404)
                .json({
                    ok: false,
                    error:
                        "Hafıza kaydı bulunamadı."
                });
        }

        res.json({
            ok: true,
            success: true,
            memory:
                item
        });
    }
);

/*
========================================================================
 API — FAVORITE
========================================================================
*/

app.post(
    "/api/memory/ultra/favorite",
    (req, res) => {
        const item =
            answerUltraFavoriteX({
                userId:
                    req.body?.userId ||
                    "guest",

                memoryId:
                    req.body?.memoryId ||
                    req.body?.id,

                value:
                    req.body?.value
            });

        if (!item) {
            return res.status(404)
                .json({
                    ok: false,
                    error:
                        "Hafıza kaydı bulunamadı."
                });
        }

        res.json({
            ok: true,
            success: true,
            favorite:
                item.favorite,
            memory:
                item
        });
    }
);

/*
========================================================================
 API — CORRECTION
========================================================================
*/

app.post(
    "/api/memory/ultra/correction",
    (req, res) => {
        const item =
            answerUltraCorrectionX({
                userId:
                    req.body?.userId ||
                    "guest",

                question:
                    req.body?.question,

                oldAnswer:
                    req.body?.oldAnswer,

                correction:
                    req.body?.correction ||
                    req.body?.answer
            });

        if (!item) {
            return res.status(400)
                .json({
                    ok: false,
                    error:
                        "Düzeltme kaydedilemedi."
                });
        }

        res.json({
            ok: true,
            success: true,
            correction:
                item
        });
    }
);

/*
========================================================================
 API — USER SNAPSHOT
========================================================================
*/

app.get(
    "/api/memory/ultra/user/:userId",
    (req, res) => {
        const snapshot =
            answerUltraUserSnapshotX(
                req.params.userId
            );

        res.json({
            ok: true,
            success: true,
            memory:
                snapshot
        });
    }
);

/*
========================================================================
 API — DELETE
========================================================================
*/

app.delete(
    "/api/memory/ultra/:id",
    (req, res) => {
        const deleted =
            answerUltraDeleteX({
                userId:
                    req.body?.userId ||
                    req.query?.userId ||
                    "guest",

                memoryId:
                    req.params.id
            });

        if (!deleted) {
            return res.status(404)
                .json({
                    ok: false,
                    error:
                        "Hafıza kaydı bulunamadı."
                });
        }

        res.json({
            ok: true,
            success: true,
            deleted: true
        });
    }
);

/*
========================================================================
 API — STATS
========================================================================
*/

app.get(
    "/api/memory/ultra/stats",
    (req, res) => {
        const db =
            TURKAI_ANSWER_ULTRA_DB_X;

        const categories = {};

        for (
            const item
            of db
        ) {
            const key =
                item.category ||
                "general";

            categories[key] =
                Number(
                    categories[key] ||
                    0
                ) + 1;
        }

        res.json({
            ok: true,
            success: true,

            stats: {
                total:
                    db.length,

                favorites:
                    db.filter(
                        x =>
                            x.favorite
                    ).length,

                protected:
                    db.filter(
                        x =>
                            x.protected
                    ).length,

                corrections:
                    db.filter(
                        x =>
                            x.category ===
                            "correction"
                    ).length,

                users:
                    new Set(
                        db.map(
                            x =>
                                x.userId
                        )
                    ).size,

                categories,

                averageImportance:
                    db.length
                        ? (
                            db.reduce(
                                (
                                    sum,
                                    x
                                ) =>
                                    sum +
                                    Number(
                                        x.importance ||
                                        0
                                    ),
                                0
                            ) /
                            db.length
                        ).toFixed(2)
                        : 0
            }
        });
    }
);

/*
========================================================================
 AUTO-LEARNING BRIDGE TO MAIN CHAT
========================================================================
*/

function attachAnswerUltraToChatX(
    req,
    message,
    answer,
    model
) {
    try {
        return answerUltraAutoLearnX({
            userId:
                String(
                    req.body?.userId ||
                    req.headers[
                        "x-user-id"
                    ] ||
                    "guest"
                ),

            question:
                message,

            answer,

            model
        });
    } catch (error) {
        return null;
    }
}

/*
========================================================================
 PUBLIC GLOBAL API
========================================================================
*/

global.turkAI =
    global.turkAI ||
    {};

global.turkAI.answerMemoryUltra = {
    version:
        TURKAI_ANSWER_ULTRA_CONFIG_X
            .version,

    ready: true,

    remember:
        answerUltraRememberX,

    search:
        answerUltraSearchX,

    best:
        answerUltraBestX,

    feedback:
        answerUltraFeedbackX,

    favorite:
        answerUltraFavoriteX,

    correction:
        answerUltraCorrectionX,

    autoLearn:
        answerUltraAutoLearnX,

    delete:
        answerUltraDeleteX,

    cleanup:
        answerUltraCleanupX,

    userSnapshot:
        answerUltraUserSnapshotX,

    attachToChat:
        attachAnswerUltraToChatX
};

/*
========================================================================
 SERVER STATE BRIDGE
========================================================================
*/

if (
    typeof serverState !==
    "undefined"
) {
    serverState.answerMemoryUltra = {
        ready: true,
        version:
            TURKAI_ANSWER_ULTRA_CONFIG_X
                .version,

        count:
            TURKAI_ANSWER_ULTRA_DB_X
                .length
    };
}

/*
========================================================================
 STARTUP CLEANUP
========================================================================
*/

try {
    answerUltraCleanupX();
} catch (error) {
    console.warn(
        "Answer Memory Ultra cleanup:",
        error.message
    );
}

console.log(
    "🧠 TürkAI Answer Memory Ultra 2.5 READY"
);

console.log(
    "📚 Hafıza kayıtları:",
    TURKAI_ANSWER_ULTRA_DB_X.length
);

console.log(
    "🔎 Semantic-like search: AKTİF"
);

console.log(
    "⭐ Favorite memory: AKTİF"
);

console.log(
    "🛠️ Correction memory: AKTİF"
);

console.log(
    "📈 Feedback learning: AKTİF"
);

console.log(
    "🧹 Auto cleanup: AKTİF"
);================================================== */
