"use strict";

/*
============================================================
 TÜRKAI — ANSWER MEMORY ENGINE
 PART 1 / 5
============================================================

 Dosya:
 C:\Users\OZCAN\Downloads\TURKAI\src\memory\answerMemory.js

 Görevler:
 - Cevapları kalıcı olarak saklamak
 - Soruları normalize etmek
 - Aynı soruyu bulmak
 - Benzer soruları bulmak
 - Kullanıcı bazlı hafıza
 - Cevap kullanım istatistikleri
 - Hafıza puanlama altyapısı
 - JSON veri tabanı
 - Otomatik kayıt
 - Güvenli dosya işlemleri

 PART 1:
 - Temel altyapı
 - Storage sistemi
 - Normalizasyon
 - ID sistemi
 - Token sistemi
 - Temel AnswerMemory sınıfı
============================================================
*/

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

/* =========================================================
   1. PATH CONFIG
========================================================= */

const ROOT_DIR = path.resolve(__dirname, "../..");

const DATA_DIR = path.join(
    ROOT_DIR,
    "data"
);

const MEMORY_DIR = path.join(
    DATA_DIR,
    "memory"
);

const ANSWER_MEMORY_FILE = path.join(
    MEMORY_DIR,
    "answer_memory.json"
);

const ANSWER_MEMORY_BACKUP_DIR = path.join(
    MEMORY_DIR,
    "backups"
);

const ANSWER_MEMORY_LOG_DIR = path.join(
    MEMORY_DIR,
    "logs"
);

/* =========================================================
   2. DIRECTORY INITIALIZATION
========================================================= */

function ensureDirectory(directory) {
    try {
        if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory, {
                recursive: true
            });
        }

        return true;
    } catch (error) {
        console.error(
            "[TürkAI Memory] Klasör oluşturulamadı:",
            directory,
            error.message
        );

        return false;
    }
}

ensureDirectory(DATA_DIR);
ensureDirectory(MEMORY_DIR);
ensureDirectory(ANSWER_MEMORY_BACKUP_DIR);
ensureDirectory(ANSWER_MEMORY_LOG_DIR);

/* =========================================================
   3. MEMORY CONFIG
========================================================= */

const MEMORY_CONFIG = {

    appName: "TürkAI",

    version: "1.0.0",

    storage: {

        file: ANSWER_MEMORY_FILE,

        backupDirectory: ANSWER_MEMORY_BACKUP_DIR,

        logDirectory: ANSWER_MEMORY_LOG_DIR,

        encoding: "utf8",

        prettyJSON: true,

        autoSave: true,

        backupBeforeWrite: true,

        maxBackups: 20

    },

    limits: {

        maxEntries: 100000,

        maxQuestionLength: 10000,

        maxAnswerLength: 50000,

        maxTags: 30,

        maxTagLength: 100,

        maxSources: 50,

        maxSourceLength: 2000

    },

    similarity: {

        enabled: true,

        minimumScore: 0.58,

        strongScore: 0.82,

        exactScore: 1,

        maxResults: 10

    },

    ranking: {

        usageWeight: 0.08,

        similarityWeight: 0.55,

        qualityWeight: 0.17,

        freshnessWeight: 0.10,

        successWeight: 0.10

    },

    cleanup: {

        enabled: true,

        minimumAnswerLength: 1,

        removeBrokenEntries: true,

        removeEmptyQuestions: true

    }

};

/* =========================================================
   4. DEFAULT DATABASE
========================================================= */

function createDefaultDatabase() {

    return {

        version: MEMORY_CONFIG.version,

        createdAt: new Date().toISOString(),

        updatedAt: new Date().toISOString(),

        totalEntries: 0,

        totalLookups: 0,

        totalHits: 0,

        totalMisses: 0,

        totalSaves: 0,

        totalUpdates: 0,

        totalErrors: 0,

        entries: {}

    };

}

/* =========================================================
   5. CLONE
========================================================= */

function clone(value) {

    try {

        return JSON.parse(
            JSON.stringify(value)
        );

    } catch (error) {

        return value;

    }

}

/* =========================================================
   6. SAFE JSON READ
========================================================= */

function readJSON(filePath, fallback = null) {

    try {

        if (!fs.existsSync(filePath)) {

            return fallback;

        }

        const raw = fs.readFileSync(
            filePath,
            MEMORY_CONFIG.storage.encoding
        );

        if (!raw.trim()) {

            return fallback;

        }

        return JSON.parse(raw);

    } catch (error) {

        console.error(
            "[TürkAI Memory] JSON okunamadı:",
            filePath,
            error.message
        );

        return fallback;

    }

}

/* =========================================================
   7. SAFE JSON WRITE
========================================================= */

function writeJSON(filePath, data) {

    try {

        ensureDirectory(
            path.dirname(filePath)
        );

        const tempFile =
            `${filePath}.tmp`;

        const json = JSON.stringify(
            data,
            null,
            MEMORY_CONFIG.storage.prettyJSON
                ? 2
                : 0
        );

        fs.writeFileSync(
            tempFile,
            json,
            {
                encoding:
                    MEMORY_CONFIG.storage.encoding
            }
        );

        fs.renameSync(
            tempFile,
            filePath
        );

        return true;

    } catch (error) {

        console.error(
            "[TürkAI Memory] JSON yazılamadı:",
            filePath,
            error.message
        );

        return false;

    }

}

/* =========================================================
   8. BACKUP
========================================================= */

function createBackup() {

    try {

        if (
            !fs.existsSync(
                ANSWER_MEMORY_FILE
            )
        ) {

            return null;

        }

        const timestamp =
            new Date()
                .toISOString()
                .replace(/[:.]/g, "-");

        const backupFile = path.join(
            ANSWER_MEMORY_BACKUP_DIR,
            `answer_memory_${timestamp}.json`
        );

        fs.copyFileSync(
            ANSWER_MEMORY_FILE,
            backupFile
        );

        cleanupBackups();

        return backupFile;

    } catch (error) {

        console.error(
            "[TürkAI Memory] Backup hatası:",
            error.message
        );

        return null;

    }

}

/* =========================================================
   9. BACKUP CLEANUP
========================================================= */

function cleanupBackups() {

    try {

        if (
            !fs.existsSync(
                ANSWER_MEMORY_BACKUP_DIR
            )
        ) {

            return;

        }

        const files =
            fs.readdirSync(
                ANSWER_MEMORY_BACKUP_DIR
            )
                .filter(
                    file =>
                        file.startsWith(
                            "answer_memory_"
                        ) &&
                        file.endsWith(
                            ".json"
                        )
                )
                .map(file => {

                    const fullPath =
                        path.join(
                            ANSWER_MEMORY_BACKUP_DIR,
                            file
                        );

                    const stat =
                        fs.statSync(
                            fullPath
                        );

                    return {

                        file,

                        fullPath,

                        time:
                            stat.mtimeMs

                    };

                })
                .sort(
                    (a, b) =>
                        b.time - a.time
                );

        const max =
            MEMORY_CONFIG.storage.maxBackups;

        if (files.length <= max) {

            return;

        }

        files
            .slice(max)
            .forEach(item => {

                try {

                    fs.unlinkSync(
                        item.fullPath
                    );

                } catch (_) {}

            });

    } catch (error) {

        console.error(
            "[TürkAI Memory] Backup temizleme hatası:",
            error.message
        );

    }

}

/* =========================================================
   10. INITIALIZE DATABASE
========================================================= */

function initializeDatabase() {

    let database =
        readJSON(
            ANSWER_MEMORY_FILE,
            null
        );

    if (
        !database ||
        typeof database !== "object"
    ) {

        database =
            createDefaultDatabase();

        writeJSON(
            ANSWER_MEMORY_FILE,
            database
        );

    }

    if (
        !database.entries ||
        typeof database.entries !== "object"
    ) {

        database.entries = {};

    }

    if (
        typeof database.totalEntries !==
        "number"
    ) {

        database.totalEntries =
            Object.keys(
                database.entries
            ).length;

    }

    if (
        typeof database.totalLookups !==
        "number"
    ) {

        database.totalLookups = 0;

    }

    if (
        typeof database.totalHits !==
        "number"
    ) {

        database.totalHits = 0;

    }

    if (
        typeof database.totalMisses !==
        "number"
    ) {

        database.totalMisses = 0;

    }

    if (
        typeof database.totalSaves !==
        "number"
    ) {

        database.totalSaves = 0;

    }

    if (
        typeof database.totalUpdates !==
        "number"
    ) {

        database.totalUpdates = 0;

    }

    if (
        typeof database.totalErrors !==
        "number"
    ) {

        database.totalErrors = 0;

    }

    database.updatedAt =
        new Date().toISOString();

    writeJSON(
        ANSWER_MEMORY_FILE,
        database
    );

    return database;

}

/* =========================================================
   11. DATABASE INSTANCE
========================================================= */

let database =
    initializeDatabase();

/* =========================================================
   12. ID GENERATOR
========================================================= */

function generateId(prefix = "mem") {

    const random =
        crypto.randomBytes(12)
            .toString("hex");

    const timestamp =
        Date.now().toString(36);

    return `${prefix}_${timestamp}_${random}`;

}

/* =========================================================
   13. HASH GENERATOR
========================================================= */

function createHash(value) {

    return crypto
        .createHash("sha256")
        .update(
            String(value),
            "utf8"
        )
        .digest("hex");

}

/* =========================================================
   14. TEXT CLEANER
========================================================= */

function cleanText(value) {

    if (
        value === undefined ||
        value === null
    ) {

        return "";

    }

    return String(value)
        .replace(/\u0000/g, "")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/[ \t]+/g, " ")
        .replace(/\n{4,}/g, "\n\n")
        .trim();

}

/* =========================================================
   15. QUESTION NORMALIZER
========================================================= */

function normalizeQuestion(question) {

    let text =
        cleanText(question);

    text =
        text.toLocaleLowerCase(
            "tr-TR"
        );

    text =
        text
            .replace(/[“”„"]/g, "")
            .replace(/[‘’']/g, "")
            .replace(/[!?.,;:()[\]{}]/g, " ")
            .replace(/[-_/\\]/g, " ")
            .replace(/\s+/g, " ")
            .trim();

    return text;

}

/* =========================================================
   16. ANSWER NORMALIZER
========================================================= */

function normalizeAnswer(answer) {

    return cleanText(answer);

}

/* =========================================================
   17. TOKENIZER
========================================================= */

function tokenize(text) {

    const normalized =
        normalizeQuestion(text);

    if (!normalized) {

        return [];

    }

    return normalized
        .split(/\s+/)
        .filter(Boolean);

}

/* =========================================================
   18. UNIQUE TOKENS
========================================================= */

function uniqueTokens(tokens) {

    return [
        ...new Set(
            tokens
                .filter(Boolean)
        )
    ];

}

/* =========================================================
   19. TOKEN SET
========================================================= */

function tokenSet(text) {

    return new Set(
        uniqueTokens(
            tokenize(text)
        )
    );

}

/* =========================================================
   20. JACCARD SIMILARITY
========================================================= */

function jaccardSimilarity(
    textA,
    textB
) {

    const setA =
        tokenSet(textA);

    const setB =
        tokenSet(textB);

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

    let intersection = 0;

    for (const token of setA) {

        if (setB.has(token)) {

            intersection++;

        }

    }

    const union =
        new Set([
            ...setA,
            ...setB
        ]).size;

    if (!union) {

        return 0;

    }

    return intersection / union;

}

/* =========================================================
   21. COSINE SIMILARITY
========================================================= */

function cosineSimilarity(
    textA,
    textB
) {

    const tokensA =
        tokenize(textA);

    const tokensB =
        tokenize(textB);

    if (
        tokensA.length === 0 ||
        tokensB.length === 0
    ) {

        return 0;

    }

    const frequencyA = {};
    const frequencyB = {};

    for (const token of tokensA) {

        frequencyA[token] =
            (frequencyA[token] || 0) + 1;

    }

    for (const token of tokensB) {

        frequencyB[token] =
            (frequencyB[token] || 0) + 1;

    }

    const allTokens =
        new Set([
            ...Object.keys(frequencyA),
            ...Object.keys(frequencyB)
        ]);

    let dot = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (const token of allTokens) {

        const a =
            frequencyA[token] || 0;

        const b =
            frequencyB[token] || 0;

        dot += a * b;

        magnitudeA += a * a;

        magnitudeB += b * b;

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

/* =========================================================
   22. HYBRID SIMILARITY
========================================================= */

function calculateSimilarity(
    questionA,
    questionB
) {

    const normalizedA =
        normalizeQuestion(
            questionA
        );

    const normalizedB =
        normalizeQuestion(
            questionB
        );

    if (!normalizedA || !normalizedB) {

        return 0;

    }

    if (
        normalizedA ===
        normalizedB
    ) {

        return 1;

    }

    const jaccard =
        jaccardSimilarity(
            normalizedA,
            normalizedB
        );

    const cosine =
        cosineSimilarity(
            normalizedA,
            normalizedB
        );

    return (
        (jaccard * 0.45) +
        (cosine * 0.55)
    );

}

/* =========================================================
   23. SAFE NUMBER
========================================================= */

function safeNumber(
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

/* =========================================================
   24. SAFE INTEGER
========================================================= */

function safeInteger(
    value,
    fallback = 0
) {

    const number =
        parseInt(
            value,
            10
        );

    if (
        Number.isFinite(number)
    ) {

        return number;

    }

    return fallback;

}

/* =========================================================
   25. LIMIT STRING
========================================================= */

function limitString(
    value,
    maxLength
) {

    const text =
        cleanText(value);

    if (
        text.length <= maxLength
    ) {

        return text;

    }

    return text.slice(
        0,
        maxLength
    );

}

/* =========================================================
   26. LIMIT ARRAY
========================================================= */

function limitArray(
    value,
    maxLength
) {

    if (
        !Array.isArray(value)
    ) {

        return [];

    }

    return value
        .slice(0, maxLength);

}

/* =========================================================
   27. DATE HELPERS
========================================================= */

function nowISO() {

    return new Date()
        .toISOString();

}

function timestamp() {

    return Date.now();

}

/* =========================================================
   28. ENTRY FACTORY
========================================================= */

function createEntry(data = {}) {

    const question =
        limitString(
            data.question,
            MEMORY_CONFIG.limits
                .maxQuestionLength
        );

    const answer =
        limitString(
            data.answer,
            MEMORY_CONFIG.limits
                .maxAnswerLength
        );

    const normalizedQuestion =
        normalizeQuestion(
            question
        );

    const entryId =
        data.id ||
        generateId("answer");

    const createdAt =
        data.createdAt ||
        nowISO();

    const updatedAt =
        data.updatedAt ||
        createdAt;

    const entry = {

        id: entryId,

        question,

        normalizedQuestion,

        questionHash:
            createHash(
                normalizedQuestion
            ),

        answer,

        language:
            data.language ||
            "tr",

        userId:
            data.userId ||
            null,

        sessionId:
            data.sessionId ||
            null,

        conversationId:
            data.conversationId ||
            null,

        model:
            data.model ||
            "local-memory",

        provider:
            data.provider ||
            "memory",

        category:
            data.category ||
            "general",

        tags:
            limitArray(
                data.tags,
                MEMORY_CONFIG
                    .limits
                    .maxTags
            ),

        sources:
            limitArray(
                data.sources,
                MEMORY_CONFIG
                    .limits
                    .maxSources
            ),

        createdAt,

        updatedAt,

        lastUsedAt:
            data.lastUsedAt ||
            null,

        usageCount:
            safeInteger(
                data.usageCount,
                0
            ),

        hitCount:
            safeInteger(
                data.hitCount,
                0
            ),

        missCount:
            safeInteger(
                data.missCount,
                0
            ),

        successCount:
            safeInteger(
                data.successCount,
                0
            ),

        failureCount:
            safeInteger(
                data.failureCount,
                0
            ),

        qualityScore:
            safeNumber(
                data.qualityScore,
                0.5
            ),

        confidence:
            safeNumber(
                data.confidence,
                0.5
            ),

        enabled:
            data.enabled !== false,

        pinned:
            data.pinned === true,

        archived:
            data.archived === true,

        metadata:
            data.metadata &&
            typeof data.metadata ===
                "object"
                ? clone(data.metadata)
                : {}

    };

    return entry;

}

/* =========================================================
   29. DATABASE SAVE
========================================================= */

function saveDatabase(
    options = {}
) {

    try {

        database.updatedAt =
            nowISO();

        database.totalEntries =
            Object.keys(
                database.entries
            ).length;

        if (
            MEMORY_CONFIG.storage
                .backupBeforeWrite &&
            options.skipBackup !== true
        ) {

            createBackup();

        }

        const result =
            writeJSON(
                ANSWER_MEMORY_FILE,
                database
            );

        if (!result) {

            database.totalErrors++;

        }

        return result;

    } catch (error) {

        database.totalErrors++;

        console.error(
            "[TürkAI Memory] Database save error:",
            error.message
        );

        return false;

    }

}

/* =========================================================
   30. DATABASE RELOAD
========================================================= */

function reloadDatabase() {

    const loaded =
        readJSON(
            ANSWER_MEMORY_FILE,
            null
        );

    if (
        loaded &&
        typeof loaded === "object"
    ) {

        database = loaded;

        if (
            !database.entries ||
            typeof database.entries !==
            "object"
        ) {

            database.entries = {};

        }

        return true;

    }

    return false;

}

/* =========================================================
   31. ANSWER MEMORY CLASS
========================================================= */

class AnswerMemory {

    constructor(options = {}) {

        this.options = {

            minimumSimilarity:
                options.minimumSimilarity ??
                MEMORY_CONFIG.similarity
                    .minimumScore,

            strongSimilarity:
                options.strongSimilarity ??
                MEMORY_CONFIG.similarity
                    .strongScore,

            maxResults:
                options.maxResults ??
                MEMORY_CONFIG.similarity
                    .maxResults

        };

    }

    /* =====================================================
       ADD
    ===================================================== */

    add(data = {}) {

        const question =
            cleanText(
                data.question
            );

        const answer =
            cleanText(
                data.answer
            );

        if (!question) {

            throw new Error(
                "Memory question boş olamaz."
            );

        }

        if (!answer) {

            throw new Error(
                "Memory answer boş olamaz."
            );

        }

        const normalized =
            normalizeQuestion(
                question
            );

        const hash =
            createHash(
                normalized
            );

        const existing =
            this.findExact(
                question
            );

        if (existing) {

            return this.update(
                existing.id,
                {
                    answer,
                    ...data
                }
            );

        }

        const entry =
            createEntry({
                ...data,
                question,
                answer
            });

        database.entries[
            entry.id
        ] = entry;

        database.totalSaves++;

        database.totalEntries =
            Object.keys(
                database.entries
            ).length;

        saveDatabase();

        return clone(entry);

    }

    /* =====================================================
       GET
    ===================================================== */

    get(id) {

        if (!id) {

            return null;

        }

        const entry =
            database.entries[id];

        if (!entry) {

            return null;

        }

        return clone(entry);

    }

    /* =====================================================
       DELETE
    ===================================================== */

    delete(id) {

        if (!id) {

            return false;

        }

        if (
            !database.entries[id]
        ) {

            return false;

        }

        delete database.entries[id];

        database.totalEntries =
            Object.keys(
                database.entries
            ).length;

        saveDatabase();

        return true;

    }

    /* =====================================================
       UPDATE
    ===================================================== */

    update(
        id,
        changes = {}
    ) {

        const current =
            database.entries[id];

        if (!current) {

            return null;

        }

        const next =
            {
                ...current
            };

        if (
            changes.question !==
            undefined
        ) {

            next.question =
                limitString(
                    changes.question,
                    MEMORY_CONFIG
                        .limits
                        .maxQuestionLength
                );

            next.normalizedQuestion =
                normalizeQuestion(
                    next.question
                );

            next.questionHash =
                createHash(
                    next.normalizedQuestion
                );

        }

        if (
            changes.answer !==
            undefined
        ) {

            next.answer =
                limitString(
                    changes.answer,
                    MEMORY_CONFIG
                        .limits
                        .maxAnswerLength
                );

        }

        if (
            changes.language !==
            undefined
        ) {

            next.language =
                String(
                    changes.language
                );

        }

        if (
            changes.category !==
            undefined
        ) {

            next.category =
                String(
                    changes.category
                );

        }

        if (
            changes.tags !==
            undefined
        ) {

            next.tags =
                limitArray(
                    changes.tags,
                    MEMORY_CONFIG
                        .limits
                        .maxTags
                );

        }

        if (
            changes.sources !==
            undefined
        ) {

            next.sources =
                limitArray(
                    changes.sources,
                    MEMORY_CONFIG
                        .limits
                        .maxSources
                );

        }

        if (
            changes.qualityScore !==
            undefined
        ) {

            next.qualityScore =
                safeNumber(
                    changes.qualityScore,
                    next.qualityScore
                );

        }

        if (
            changes.confidence !==
            undefined
        ) {

            next.confidence =
                safeNumber(
                    changes.confidence,
                    next.confidence
                );

        }

        if (
            changes.enabled !==
            undefined
        ) {

            next.enabled =
                Boolean(
                    changes.enabled
                );

        }

        if (
            changes.pinned !==
            undefined
        ) {

            next.pinned =
                Boolean(
                    changes.pinned
                );

        }

        if (
            changes.archived !==
            undefined
        ) {

            next.archived =
                Boolean(
                    changes.archived
                );

        }

        if (
            changes.metadata &&
            typeof changes.metadata ===
                "object"
        ) {

            next.metadata =
                {
                    ...next.metadata,
                    ...clone(
                        changes.metadata
                    )
                };

        }

        next.updatedAt =
            nowISO();

        database.entries[id] =
            next;

        database.totalUpdates++;

        saveDatabase();

        return clone(next);

    }

    /* =====================================================
       FIND EXACT
    ===================================================== */

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

        const hash =
            createHash(
                normalized
            );

        const entries =
            Object.values(
                database.entries
            );

        for (
            const entry of entries
        ) {

            if (
                entry.questionHash ===
                hash &&
                entry.enabled !== false &&
                entry.archived !== true
            ) {

                return clone(entry);

            }

        }

        return null;

    }

    /* =====================================================
       LOOKUP
    ===================================================== */

    lookup(
        question,
        options = {}
    ) {

        const query =
            cleanText(
                question
            );

        database.totalLookups++;

        if (!query) {

            database.totalMisses++;

            saveDatabase({
                skipBackup: true
            });

            return null;

        }

        const exact =
            this.findExact(
                query
            );

        if (exact) {

            this.markHit(
                exact.id
            );

            return {

                found: true,

                type: "exact",

                score: 1,

                entry:
                    this.get(exact.id)

            };

        }

        const similar =
            this.findSimilar(
                query,
                options
            );

        if (
            similar.length > 0
        ) {

            const best =
                similar[0];

            if (
                best.score >=
                (
                    options.minimumSimilarity ??
                    this.options
                        .minimumSimilarity
                )
            ) {

                this.markHit(
                    best.entry.id
                );

                return {

                    found: true,

                    type: "similar",

                    score: best.score,

                    entry:
                        this.get(
                            best.entry.id
                        ),

                    results: similar

                };

            }

        }

        database.totalMisses++;

        saveDatabase({
            skipBackup: true
        });

        return {

            found: false,

            type: "miss",

            score: 0,

            entry: null,

            results: similar

        };

    }

    /* =====================================================
       FIND SIMILAR
    ===================================================== */

    findSimilar(
        question,
        options = {}
    ) {

        const minimum =
            options.minimumSimilarity ??
            this.options
                .minimumSimilarity;

        const maxResults =
            options.maxResults ??
            this.options
                .maxResults;

        const query =
            cleanText(
                question
            );

        if (!query) {

            return [];

        }

        const results = [];

        for (
            const entry of Object.values(
                database.entries
            )
        ) {

            if (
                entry.enabled === false
            ) {

                continue;

            }

            if (
                entry.archived === true
            ) {

                continue;

            }

            const score =
                calculateSimilarity(
                    query,
                    entry.question
                );

            if (
                score >= minimum
            ) {

                results.push({

                    score,

                    entry:
                        clone(entry)

                });

            }

        }

        results.sort(
            (a, b) =>
                b.score - a.score
        );

        return results.slice(
            0,
            maxResults
        );

    }

    /* =====================================================
       MARK HIT
    ===================================================== */

    markHit(id) {

        const entry =
            database.entries[id];

        if (!entry) {

            return false;

        }

        entry.hitCount =
            safeInteger(
                entry.hitCount,
                0
            ) + 1;

        entry.usageCount =
            safeInteger(
                entry.usageCount,
                0
            ) + 1;

        entry.lastUsedAt =
            nowISO();

        database.totalHits++;

        saveDatabase({
            skipBackup: true
        });

        return true;

    }

    /* =====================================================
       MARK MISS
    ===================================================== */

    markMiss(id) {

        const entry =
            database.entries[id];

        if (!entry) {

            return false;

        }

        entry.missCount =
            safeInteger(
                entry.missCount,
                0
            ) + 1;

        saveDatabase({
            skipBackup: true
        });

        return true;

    }

    /* =====================================================
       MARK SUCCESS
    ===================================================== */

    markSuccess(id) {

        const entry =
            database.entries[id];

        if (!entry) {

            return false;

        }

        entry.successCount =
            safeInteger(
                entry.successCount,
                0
            ) + 1;

        const total =
            entry.successCount +
            entry.failureCount;

        if (total > 0) {

            entry.qualityScore =
                entry.successCount /
                total;

        }

        entry.updatedAt =
            nowISO();

        saveDatabase({
            skipBackup: true
        });

        return true;

    }

    /* =====================================================
       MARK FAILURE
    ===================================================== */

    markFailure(id) {

        const entry =
            database.entries[id];

        if (!entry) {

            return false;

        }

        entry.failureCount =
            safeInteger(
                entry.failureCount,
                0
            ) + 1;

        const total =
            entry.successCount +
            entry.failureCount;

        if (total > 0) {

            entry.qualityScore =
                entry.successCount /
                total;

        }

        entry.updatedAt =
            nowISO();

        saveDatabase({
            skipBackup: true
        });

        return true;

    }

    /* =====================================================
       GET ALL
    ===================================================== */

    getAll(
        options = {}
    ) {

        let entries =
            Object.values(
                database.entries
            );

        if (
            options.enabledOnly
        ) {

            entries =
                entries.filter(
                    entry =>
                        entry.enabled !== false
                );

        }

        if (
            options.excludeArchived
        ) {

            entries =
                entries.filter(
                    entry =>
                        entry.archived !== true
                );

        }

        if (
            options.userId
        ) {

            entries =
                entries.filter(
                    entry =>
                        entry.userId ===
                        options.userId
                );

        }

        if (
            options.category
        ) {

            entries =
                entries.filter(
                    entry =>
                        entry.category ===
                        options.category
                );

        }

        if (
            options.language
        ) {

            entries =
                entries.filter(
                    entry =>
                        entry.language ===
                        options.language
                );

        }

        return entries.map(
            clone
        );

    }

    /* =====================================================
       COUNT
    ===================================================== */

    count() {

        return Object.keys(
            database.entries
        ).length;

    }

    /* =====================================================
       STATS
    ===================================================== */

    stats() {

        const entries =
            Object.values(
                database.entries
            );

        let enabled = 0;
        let archived = 0;
        let pinned = 0;
        let totalUsage = 0;

        for (
            const entry of entries
        ) {

            if (
                entry.enabled !== false
            ) {

                enabled++;

            }

            if (
                entry.archived === true
            ) {

                archived++;

            }

            if (
                entry.pinned === true
            ) {

                pinned++;

            }

            totalUsage +=
                safeInteger(
                    entry.usageCount,
                    0
                );

        }

        return {

            total:
                entries.length,

            enabled,

            archived,

            pinned,

            totalUsage,

            totalLookups:
                database.totalLookups,

            totalHits:
                database.totalHits,

            totalMisses:
                database.totalMisses,

            totalSaves:
                database.totalSaves,

            totalUpdates:
                database.totalUpdates,

            totalErrors:
                database.totalErrors,

            hitRate:
                database.totalLookups > 0
                    ? database.totalHits /
                      database.totalLookups
                    : 0

        };

    }

}

/* =========================================================
   32. SINGLETON
========================================================= */

const answerMemory =
    new AnswerMemory();

/* =========================================================
   33. BASIC API
========================================================= */

function saveAnswer(
    question,
    answer,
    options = {}
) {

    return answerMemory.add({

        question,

        answer,

        ...options

    });

}

function findAnswer(
    question,
    options = {}
) {

    return answerMemory.lookup(
        question,
        options
    );

}

function findExactAnswer(
    question
) {

    return answerMemory.findExact(
        question
    );

}

function findSimilarAnswers(
    question,
    options = {}
) {

    return answerMemory.findSimilar(
        question,
        options
    );

}

/* =========================================================
   34. EXPORTS
========================================================= */

module.exports = {

    AnswerMemory,

    answerMemory,

    saveAnswer,

    findAnswer,

    findExactAnswer,

    findSimilarAnswers,

    calculateSimilarity,

    normalizeQuestion,

    normalizeAnswer,

    tokenize,

    createHash,

    generateId,

    MEMORY_CONFIG,

    MEMORY_FILES: {

        database:
            ANSWER_MEMORY_FILE,

        backups:
            ANSWER_MEMORY_BACKUP_DIR,

        logs:
            ANSWER_MEMORY_LOG_DIR

    }

};

/* =========================================================
   PART 1 END
========================================================= */
/* ============================================================
   TÜRKAI — ANSWER MEMORY ENGINE
   PART 2 / 5
   GELİŞMİŞ HAFIZA • PUANLAMA • KULLANICI • ÖĞRENME
============================================================ */

/* ============================================================
   35. MEMORY QUALITY ENGINE
============================================================ */

class MemoryQualityEngine {

    constructor() {

        this.weights = {

            similarity: 0.35,

            quality: 0.20,

            confidence: 0.15,

            usage: 0.10,

            success: 0.10,

            freshness: 0.05,

            personalization: 0.05

        };

    }

    clamp(value, min = 0, max = 1) {

        return Math.min(
            max,
            Math.max(
                min,
                safeNumber(value, 0)
            )
        );

    }

    calculateFreshness(entry) {

        if (!entry) {

            return 0;

        }

        const created =
            new Date(
                entry.updatedAt ||
                entry.createdAt ||
                nowISO()
            ).getTime();

        const current =
            Date.now();

        const age =
            Math.max(
                0,
                current - created
            );

        const day =
            1000 *
            60 *
            60 *
            24;

        const ageDays =
            age / day;

        /*
         * Yeni cevaplara küçük bir avantaj.
         * Ancak eski ve çok kullanılan cevaplar
         * tamamen kaybolmaz.
         */

        return this.clamp(
            1 /
            (
                1 +
                ageDays / 30
            )
        );

    }

    calculateUsage(entry) {

        if (!entry) {

            return 0;

        }

        const usage =
            safeNumber(
                entry.usageCount,
                0
            );

        return this.clamp(
            Math.log10(
                usage + 1
            ) / 3
        );

    }

    calculateSuccess(entry) {

        if (!entry) {

            return 0;

        }

        const success =
            safeNumber(
                entry.successCount,
                0
            );

        const failure =
            safeNumber(
                entry.failureCount,
                0
            );

        const total =
            success +
            failure;

        if (total === 0) {

            return 0.5;

        }

        return this.clamp(
            success / total
        );

    }

    calculatePersonalization(
        entry,
        userId
    ) {

        if (
            !entry ||
            !userId
        ) {

            return 0;

        }

        if (
            entry.userId ===
            userId
        ) {

            return 1;

        }

        if (
            !entry.userId
        ) {

            return 0.35;

        }

        return 0;

    }

    calculateScore(
        entry,
        similarity,
        userId = null
    ) {

        if (!entry) {

            return 0;

        }

        const similarityScore =
            this.clamp(
                similarity
            );

        const qualityScore =
            this.clamp(
                entry.qualityScore ??
                0.5
            );

        const confidenceScore =
            this.clamp(
                entry.confidence ??
                0.5
            );

        const usageScore =
            this.calculateUsage(
                entry
            );

        const successScore =
            this.calculateSuccess(
                entry
            );

        const freshnessScore =
            this.calculateFreshness(
                entry
            );

        const personalizationScore =
            this.calculatePersonalization(
                entry,
                userId
            );

        const score =

            similarityScore *
            this.weights.similarity +

            qualityScore *
            this.weights.quality +

            confidenceScore *
            this.weights.confidence +

            usageScore *
            this.weights.usage +

            successScore *
            this.weights.success +

            freshnessScore *
            this.weights.freshness +

            personalizationScore *
            this.weights.personalization;

        return this.clamp(
            score
        );

    }

}

/* ============================================================
   36. QUALITY ENGINE INSTANCE
============================================================ */

const memoryQuality =
    new MemoryQualityEngine();

/* ============================================================
   37. USER MEMORY INDEX
============================================================ */

class UserAnswerIndex {

    constructor() {

        this.index = new Map();

        this.rebuild();

    }

    rebuild() {

        this.index.clear();

        const entries =
            Object.values(
                database.entries
            );

        for (
            const entry of entries
        ) {

            if (!entry.userId) {

                continue;

            }

            if (
                !this.index.has(
                    entry.userId
                )
            ) {

                this.index.set(
                    entry.userId,
                    new Set()
                );

            }

            this.index
                .get(entry.userId)
                .add(entry.id);

        }

    }

    add(entry) {

        if (
            !entry ||
            !entry.userId
        ) {

            return;

        }

        if (
            !this.index.has(
                entry.userId
            )
        ) {

            this.index.set(
                entry.userId,
                new Set()
            );

        }

        this.index
            .get(entry.userId)
            .add(entry.id);

    }

    remove(entry) {

        if (
            !entry ||
            !entry.userId
        ) {

            return;

        }

        const set =
            this.index.get(
                entry.userId
            );

        if (!set) {

            return;

        }

        set.delete(
            entry.id
        );

        if (
            set.size === 0
        ) {

            this.index.delete(
                entry.userId
            );

        }

    }

    getUserEntryIds(
        userId
    ) {

        if (!userId) {

            return [];

        }

        const set =
            this.index.get(
                userId
            );

        if (!set) {

            return [];

        }

        return [
            ...set
        ];

    }

    countUserEntries(
        userId
    ) {

        return this
            .getUserEntryIds(
                userId
            )
            .length;

    }

}

/* ============================================================
   38. USER INDEX INSTANCE
============================================================ */

const userAnswerIndex =
    new UserAnswerIndex();

/* ============================================================
   39. MEMORY LEARNING ENGINE
============================================================ */

class MemoryLearningEngine {

    constructor(memory) {

        this.memory =
            memory;

        this.events = [];

        this.maxEvents = 5000;

    }

    pushEvent(event) {

        this.events.push({

            id:
                generateId(
                    "learn"
                ),

            timestamp:
                nowISO(),

            ...event

        });

        if (
            this.events.length >
            this.maxEvents
        ) {

            this.events =
                this.events.slice(
                    -this.maxEvents
                );

        }

    }

    learnFromResult(
        question,
        result,
        context = {}
    ) {

        if (!result) {

            return null;

        }

        this.pushEvent({

            type:
                result.found
                    ? "memory_hit"
                    : "memory_miss",

            question:
                cleanText(
                    question
                ),

            memoryId:
                result.entry
                    ? result.entry.id
                    : null,

            score:
                safeNumber(
                    result.score,
                    0
                ),

            userId:
                context.userId ||
                null,

            sessionId:
                context.sessionId ||
                null

        });

        return result;

    }

    learnAnswer(
        question,
        answer,
        context = {}
    ) {

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

        const existing =
            this.memory.findExact(
                cleanQuestion
            );

        if (existing) {

            const merged =
                this.mergeAnswer(
                    existing,
                    cleanAnswer
                );

            const updated =
                this.memory.update(
                    existing.id,
                    merged
                );

            this.pushEvent({

                type:
                    "answer_updated",

                question:
                    cleanQuestion,

                memoryId:
                    existing.id,

                userId:
                    context.userId ||
                    null

            });

            return updated;

        }

        const entry =
            this.memory.add({

                question:
                    cleanQuestion,

                answer:
                    cleanAnswer,

                userId:
                    context.userId ||
                    null,

                sessionId:
                    context.sessionId ||
                    null,

                conversationId:
                    context.conversationId ||
                    null,

                language:
                    context.language ||
                    "tr",

                category:
                    context.category ||
                    "general",

                tags:
                    context.tags ||
                    [],

                sources:
                    context.sources ||
                    [],

                model:
                    context.model ||
                    "local-memory",

                provider:
                    context.provider ||
                    "memory",

                confidence:
                    safeNumber(
                        context.confidence,
                        0.7
                    ),

                qualityScore:
                    safeNumber(
                        context.qualityScore,
                        0.7
                    ),

                metadata:
                    context.metadata ||
                    {}

            });

        if (entry) {

            userAnswerIndex.add(
                entry
            );

        }

        this.pushEvent({

            type:
                "answer_learned",

            question:
                cleanQuestion,

            memoryId:
                entry
                    ? entry.id
                    : null,

            userId:
                context.userId ||
                null

        });

        return entry;

    }

    mergeAnswer(
        existing,
        newAnswer
    ) {

        const oldAnswer =
            cleanText(
                existing.answer
            );

        const cleanNew =
            cleanText(
                newAnswer
            );

        if (!oldAnswer) {

            return {

                answer:
                    cleanNew,

                confidence:
                    Math.min(
                        1,
                        (
                            safeNumber(
                                existing.confidence,
                                0.5
                            ) +
                            0.1
                        )
                    )

            };

        }

        if (
            oldAnswer ===
            cleanNew
        ) {

            return {

                usageCount:
                    safeInteger(
                        existing.usageCount,
                        0
                    ) + 1,

                confidence:
                    Math.min(
                        1,
                        safeNumber(
                            existing.confidence,
                            0.5
                        ) + 0.02
                    )

            };

        }

        /*
         * Yeni cevap mevcut cevabı tamamen silmez.
         * Alternatif cevapları metadata içinde saklar.
         */

        const metadata =
            existing.metadata &&
            typeof existing.metadata ===
                "object"
                ? clone(
                    existing.metadata
                )
                : {};

        if (
            !Array.isArray(
                metadata.alternativeAnswers
            )
        ) {

            metadata.alternativeAnswers =
                [];

        }

        const alreadyExists =
            metadata.alternativeAnswers
                .some(
                    item =>
                        item &&
                        item.text ===
                        cleanNew
                );

        if (
            !alreadyExists
        ) {

            metadata.alternativeAnswers
                .push({

                    text:
                        cleanNew,

                    addedAt:
                        nowISO()

                });

        }

        if (
            metadata.alternativeAnswers
                .length > 10
        ) {

            metadata.alternativeAnswers =
                metadata.alternativeAnswers
                    .slice(-10);

        }

        return {

            metadata,

            usageCount:
                safeInteger(
                    existing.usageCount,
                    0
                ) + 1

        };

    }

    getEvents() {

        return clone(
            this.events
        );

    }

    clearEvents() {

        this.events = [];

    }

}

/* ============================================================
   40. LEARNING ENGINE INSTANCE
============================================================ */

const memoryLearning =
    new MemoryLearningEngine(
        answerMemory
    );

/* ============================================================
   41. ADVANCED SIMILAR SEARCH
============================================================ */

AnswerMemory.prototype.findAdvanced =
function(
    question,
    options = {}
) {

    const query =
        cleanText(
            question
        );

    if (!query) {

        return [];

    }

    const minimum =
        options.minimumSimilarity ??
        this.options
            .minimumSimilarity;

    const maximum =
        options.maxResults ??
        this.options
            .maxResults;

    const userId =
        options.userId ||
        null;

    const candidates = [];

    let entries;

    if (userId) {

        const ids =
            userAnswerIndex
                .getUserEntryIds(
                    userId
                );

        entries =
            ids
                .map(
                    id =>
                        database.entries[id]
                )
                .filter(Boolean);

        /*
         * Genel hafıza da aramaya dahil edilir.
         */

        const generalEntries =
            Object.values(
                database.entries
            )
                .filter(
                    entry =>
                        !entry.userId
                );

        entries.push(
            ...generalEntries
        );

    } else {

        entries =
            Object.values(
                database.entries
            );

    }

    for (
        const entry of entries
    ) {

        if (
            !entry ||
            entry.enabled === false ||
            entry.archived === true
        ) {

            continue;

        }

        const similarity =
            calculateSimilarity(
                query,
                entry.question
            );

        if (
            similarity <
            minimum
        ) {

            continue;

        }

        const finalScore =
            memoryQuality
                .calculateScore(
                    entry,
                    similarity,
                    userId
                );

        candidates.push({

            id:
                entry.id,

            score:
                finalScore,

            similarity,

            quality:
                safeNumber(
                    entry.qualityScore,
                    0.5
                ),

            confidence:
                safeNumber(
                    entry.confidence,
                    0.5
                ),

            usage:
                safeInteger(
                    entry.usageCount,
                    0
                ),

            personalized:
                Boolean(
                    userId &&
                    entry.userId ===
                    userId
                ),

            entry:
                clone(entry)

        });

    }

    candidates.sort(
        (a, b) => {

            if (
                b.score !==
                a.score
            ) {

                return (
                    b.score -
                    a.score
                );

            }

            return (
                b.similarity -
                a.similarity
            );

        }
    );

    return candidates.slice(
        0,
        maximum
    );

};

/* ============================================================
   42. SMART LOOKUP
============================================================ */

AnswerMemory.prototype.smartLookup =
function(
    question,
    options = {}
) {

    const query =
        cleanText(
            question
        );

    if (!query) {

        return {

            found: false,

            type: "empty",

            score: 0,

            entry: null,

            results: []

        };

    }

    database.totalLookups++;

    const exact =
        this.findExact(
            query
        );

    if (exact) {

        this.markHit(
            exact.id
        );

        memoryLearning.learnFromResult(
            query,
            {

                found: true,

                score: 1,

                entry: exact

            },
            options
        );

        return {

            found: true,

            type: "exact",

            score: 1,

            entry:
                this.get(
                    exact.id
                ),

            results: []

        };

    }

    const results =
        this.findAdvanced(
            query,
            options
        );

    const best =
        results[0] || null;

    if (
        best &&
        best.score >=
        (
            options.minimumScore ??
            this.options
                .minimumSimilarity
        )
    ) {

        this.markHit(
            best.id
        );

        memoryLearning.learnFromResult(
            query,
            {

                found: true,

                score:
                    best.score,

                entry:
                    best.entry

            },
            options
        );

        return {

            found: true,

            type: "advanced",

            score:
                best.score,

            entry:
                this.get(
                    best.id
                ),

            results

        };

    }

    database.totalMisses++;

    memoryLearning.learnFromResult(
        query,
        {

            found: false,

            score: 0,

            entry: null

        },
        options
    );

    saveDatabase({
        skipBackup: true
    });

    return {

        found: false,

        type: "miss",

        score: 0,

        entry: null,

        results

    };

};

/* ============================================================
   43. USER-SPECIFIC SAVE
============================================================ */

function saveUserAnswer(
    userId,
    question,
    answer,
    options = {}
) {

    if (!userId) {

        throw new Error(
            "userId gerekli."
        );

    }

    return memoryLearning.learnAnswer(
        question,
        answer,
        {

            ...options,

            userId

        }
    );

}

/* ============================================================
   44. SMART ANSWER FINDER
============================================================ */

function findSmartAnswer(
    question,
    options = {}
) {

    return answerMemory.smartLookup(
        question,
        options
    );

}

/* ============================================================
   45. MEMORY FEEDBACK
============================================================ */

function memoryFeedback(
    memoryId,
    feedback,
    options = {}
) {

    if (!memoryId) {

        return null;

    }

    const value =
        String(
            feedback ||
            ""
        ).toLocaleLowerCase(
            "tr-TR"
        );

    if (
        [
            "good",
            "iyi",
            "correct",
            "doğru",
            "dogru",
            "positive",
            "up"
        ].includes(value)
    ) {

        answerMemory.markSuccess(
            memoryId
        );

        const entry =
            answerMemory.get(
                memoryId
            );

        if (entry) {

            answerMemory.update(
                memoryId,
                {

                    confidence:
                        Math.min(
                            1,
                            safeNumber(
                                entry.confidence,
                                0.5
                            ) + 0.05
                        ),

                    qualityScore:
                        Math.min(
                            1,
                            safeNumber(
                                entry.qualityScore,
                                0.5
                            ) + 0.05
                        )

                }
            );

        }

        return {

            success: true,

            type: "positive"

        };

    }

    if (
        [
            "bad",
            "kötü",
            "kotu",
            "wrong",
            "yanlış",
            "yanlis",
            "negative",
            "down"
        ].includes(value)
    ) {

        answerMemory.markFailure(
            memoryId
        );

        const entry =
            answerMemory.get(
                memoryId
            );

        if (entry) {

            answerMemory.update(
                memoryId,
                {

                    confidence:
                        Math.max(
                            0,
                            safeNumber(
                                entry.confidence,
                                0.5
                            ) - 0.08
                        ),

                    qualityScore:
                        Math.max(
                            0,
                            safeNumber(
                                entry.qualityScore,
                                0.5
                            ) - 0.08
                        )

                }
            );

        }

        return {

            success: true,

            type: "negative"

        };

    }

    return {

        success: false,

        type: "unknown"

    };

}

/* ============================================================
   46. PIN MEMORY
============================================================ */

function pinMemory(
    memoryId
) {

    const entry =
        answerMemory.get(
            memoryId
        );

    if (!entry) {

        return false;

    }

    answerMemory.update(
        memoryId,
        {

            pinned: true

        }
    );

    return true;

}

/* ============================================================
   47. UNPIN MEMORY
============================================================ */

function unpinMemory(
    memoryId
) {

    const entry =
        answerMemory.get(
            memoryId
        );

    if (!entry) {

        return false;

    }

    answerMemory.update(
        memoryId,
        {

            pinned: false

        }
    );

    return true;

}

/* ============================================================
   48. ARCHIVE MEMORY
============================================================ */

function archiveMemory(
    memoryId
) {

    const entry =
        answerMemory.get(
            memoryId
        );

    if (!entry) {

        return false;

    }

    answerMemory.update(
        memoryId,
        {

            archived: true

        }
    );

    return true;

}

/* ============================================================
   49. RESTORE MEMORY
============================================================ */

function restoreMemory(
    memoryId
) {

    const entry =
        answerMemory.get(
            memoryId
        );

    if (!entry) {

        return false;

    }

    answerMemory.update(
        memoryId,
        {

            archived: false,

            enabled: true

        }
    );

    return true;

}

/* ============================================================
   50. DISABLE MEMORY
============================================================ */

function disableMemory(
    memoryId
) {

    const entry =
        answerMemory.get(
            memoryId
        );

    if (!entry) {

        return false;

    }

    answerMemory.update(
        memoryId,
        {

            enabled: false

        }
    );

    return true;

}

/* ============================================================
   51. ENABLE MEMORY
============================================================ */

function enableMemory(
    memoryId
) {

    const entry =
        answerMemory.get(
            memoryId
        );

    if (!entry) {

        return false;

    }

    answerMemory.update(
        memoryId,
        {

            enabled: true

        }
    );

    return true;

}

/* ============================================================
   52. USER MEMORY STATS
============================================================ */

function getUserMemoryStats(
    userId
) {

    if (!userId) {

        return {

            userId: null,

            total: 0,

            pinned: 0,

            archived: 0,

            usage: 0

        };

    }

    const ids =
        userAnswerIndex
            .getUserEntryIds(
                userId
            );

    let pinned = 0;
    let archived = 0;
    let usage = 0;

    for (
        const id of ids
    ) {

        const entry =
            database.entries[id];

        if (!entry) {

            continue;

        }

        if (
            entry.pinned
        ) {

            pinned++;

        }

        if (
            entry.archived
        ) {

            archived++;

        }

        usage +=
            safeInteger(
                entry.usageCount,
                0
            );

    }

    return {

        userId,

        total:
            ids.length,

        pinned,

        archived,

        usage

    };

}

/* ============================================================
   53. USER MEMORY LIST
============================================================ */

function getUserMemories(
    userId,
    options = {}
) {

    if (!userId) {

        return [];

    }

    const ids =
        userAnswerIndex
            .getUserEntryIds(
                userId
            );

    let entries =
        ids
            .map(
                id =>
                    database.entries[id]
            )
            .filter(Boolean);

    if (
        options.includeArchived !== true
    ) {

        entries =
            entries.filter(
                entry =>
                    entry.archived !== true
            );

    }

    if (
        options.enabledOnly
    ) {

        entries =
            entries.filter(
                entry =>
                    entry.enabled !== false
            );

    }

    if (
        options.category
    ) {

        entries =
            entries.filter(
                entry =>
                    entry.category ===
                    options.category
            );

    }

    entries.sort(
        (a, b) => {

            const aTime =
                new Date(
                    a.updatedAt ||
                    a.createdAt
                ).getTime();

            const bTime =
                new Date(
                    b.updatedAt ||
                    b.createdAt
                ).getTime();

            return bTime - aTime;

        }
    );

    const limit =
        Math.max(
            1,
            Math.min(
                1000,
                safeInteger(
                    options.limit,
                    100
                )
            )
        );

    return entries
        .slice(0, limit)
        .map(clone);

}

/* ============================================================
   54. EXPORT ADDITIONS
============================================================ */

module.exports.MemoryQualityEngine =
    MemoryQualityEngine;

module.exports.memoryQuality =
    memoryQuality;

module.exports.UserAnswerIndex =
    UserAnswerIndex;

module.exports.userAnswerIndex =
    userAnswerIndex;

module.exports.MemoryLearningEngine =
    MemoryLearningEngine;

module.exports.memoryLearning =
    memoryLearning;

module.exports.saveUserAnswer =
    saveUserAnswer;

module.exports.findSmartAnswer =
    findSmartAnswer;

module.exports.memoryFeedback =
    memoryFeedback;

module.exports.pinMemory =
    pinMemory;

module.exports.unpinMemory =
    unpinMemory;

module.exports.archiveMemory =
    archiveMemory;

module.exports.restoreMemory =
    restoreMemory;

module.exports.disableMemory =
    disableMemory;

module.exports.enableMemory =
    enableMemory;

module.exports.getUserMemoryStats =
    getUserMemoryStats;

module.exports.getUserMemories =
    getUserMemories;

/* ============================================================
   55. GLOBAL MEMORY STATUS
============================================================ */

function getMemoryStatus() {

    return {

        engine:
            "TürkAI Answer Memory",

        version:
            MEMORY_CONFIG.version,

        database:
            ANSWER_MEMORY_FILE,

        entries:
            answerMemory.count(),

        users:
            userAnswerIndex.index.size,

        statistics:
            answerMemory.stats(),

        learningEvents:
            memoryLearning.events.length,

        features: {

            exactSearch:
                true,

            similaritySearch:
                true,

            advancedRanking:
                true,

            userMemory:
                true,

            automaticLearning:
                true,

            feedbackLearning:
                true,

            backups:
                true,

            persistentStorage:
                true

        },

        timestamp:
            nowISO()

    };

}

module.exports.getMemoryStatus =
    getMemoryStatus;

/* ============================================================
   56. SAFE RELOAD
============================================================ */

function reloadAnswerMemory() {

    const result =
        reloadDatabase();

    if (result) {

        userAnswerIndex.rebuild();

    }

    return result;

}

module.exports.reloadAnswerMemory =
    reloadAnswerMemory;

/* ============================================================
   57. FORCE SAVE
============================================================ */

function forceSaveAnswerMemory() {

    return saveDatabase();

}

module.exports.forceSaveAnswerMemory =
    forceSaveAnswerMemory;

/* ============================================================
   58. RESET — ADMIN USE
============================================================ */

function resetAnswerMemory(
    confirmation
) {

    if (
        confirmation !==
        "RESET_TURKAI_ANSWER_MEMORY"
    ) {

        throw new Error(
            "Reset doğrulaması başarısız."
        );

    }

    database =
        createDefaultDatabase();

    userAnswerIndex.rebuild();

    memoryLearning.clearEvents();

    return saveDatabase({
        skipBackup: false
    });

}

module.exports.resetAnswerMemory =
    resetAnswerMemory;

/* ============================================================
   59. FINAL STATUS
============================================================ */

console.log(
    `[TürkAI] Answer Memory Engine hazır — ${answerMemory.count()} kayıt`
);

/* ============================================================
   PART 2 END
============================================================ */
/* ============================================================
   TÜRKAI — ANSWER MEMORY ENGINE
   PART 3 / 5
   GELİŞMİŞ ARAMA • TÜRKÇE VARIATION • KATEGORİ • TAG
   OTOMATİK ÖĞRENME • DUPLICATE ENGINE
============================================================ */

/* ============================================================
   60. TURKISH TEXT ENGINE
============================================================ */

class TurkishTextEngine {

    constructor() {

        this.stopWords = new Set([

            "acaba",
            "ama",
            "ancak",
            "artık",
            "aslında",
            "az",
            "bazı",
            "belki",
            "ben",
            "bence",
            "beni",
            "benim",
            "bir",
            "biraz",
            "biri",
            "birçok",
            "birkaç",
            "biz",
            "bize",
            "bizi",
            "bizim",
            "bu",
            "buna",
            "bunu",
            "bunun",
            "bütün",
            "da",
            "daha",
            "de",
            "defa",
            "diye",
            "dolayı",
            "en",
            "fakat",
            "gibi",
            "hangi",
            "hangisi",
            "hani",
            "hem",
            "hep",
            "hepsi",
            "her",
            "herhangi",
            "hiç",
            "için",
            "ile",
            "ise",
            "işte",
            "kadar",
            "karşı",
            "ki",
            "kim",
            "kime",
            "kimi",
            "kimse",
            "mu",
            "mı",
            "mi",
            "mü",
            "nasıl",
            "ne",
            "neden",
            "nerede",
            "nereye",
            "niçin",
            "niye",
            "o",
            "olan",
            "olarak",
            "onlar",
            "onlara",
            "onları",
            "onların",
            "onu",
            "onun",
            "sanki",
            "şey",
            "şu",
            "şuna",
            "şunu",
            "tarafından",
            "tüm",
            "ve",
            "veya",
            "ya",
            "yani",
            "yine",
            "yok",
            "çok",
            "şeklinde"

        ]);

    }

    normalizeTurkish(
        text
    ) {

        return normalizeQuestion(
            text
        );

    }

    removeStopWords(
        text
    ) {

        return tokenize(text)
            .filter(
                token =>
                    !this.stopWords
                        .has(token)
            );

    }

    stemSimple(
        word
    ) {

        let value =
            String(
                word || ""
            ).toLocaleLowerCase(
                "tr-TR"
            );

        const suffixes = [

            "lerinizden",
            "larınızdan",
            "leriniz",
            "larınız",
            "lerimiz",
            "larımız",
            "lerinden",
            "larından",
            "lerine",
            "larına",
            "lerini",
            "larını",
            "lerden",
            "lardan",
            "lerin",
            "ların",
            "lere",
            "lara",
            "leri",
            "ları",
            "lerin",
            "ların",
            "lik",
            "lık",
            "lük",
            "luk",
            "ci",
            "cı",
            "cu",
            "cü",
            "çı",
            "çi",
            "çu",
            "çü",
            "dan",
            "den",
            "tan",
            "ten",
            "dır",
            "dir",
            "dur",
            "dür",
            "tır",
            "tir",
            "tur",
            "tür",
            "dır",
            "dir",
            "dur",
            "dür",
            "yı",
            "yi",
            "yu",
            "yü",
            "ya",
            "ye",
            "ın",
            "in",
            "un",
            "ün",
            "ım",
            "im",
            "um",
            "üm",
            "ım",
            "im",
            "um",
            "üm",
            "a",
            "e",
            "ı",
            "i",
            "u",
            "ü"

        ];

        for (
            const suffix of suffixes
        ) {

            if (
                value.length >
                suffix.length + 3 &&
                value.endsWith(
                    suffix
                )
            ) {

                value =
                    value.slice(
                        0,
                        -suffix.length
                    );

                break;

            }

        }

        return value;

    }

    stemTokens(
        text
    ) {

        return this
            .removeStopWords(
                text
            )
            .map(
                token =>
                    this.stemSimple(
                        token
                    )
            )
            .filter(
                Boolean
            );

    }

    keywordSet(
        text
    ) {

        return new Set(
            this.stemTokens(
                text
            )
        );

    }

    keywordSimilarity(
        textA,
        textB
    ) {

        const a =
            this.keywordSet(
                textA
            );

        const b =
            this.keywordSet(
                textB
            );

        if (
            a.size === 0 ||
            b.size === 0
        ) {

            return 0;

        }

        let same = 0;

        for (
            const word of a
        ) {

            if (
                b.has(word)
            ) {

                same++;

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

        return same / union;

    }

    extractKeywords(
        text,
        limit = 20
    ) {

        const tokens =
            this.stemTokens(
                text
            );

        const frequency = {};

        for (
            const token of tokens
        ) {

            frequency[token] =
                (
                    frequency[token] ||
                    0
                ) + 1;

        }

        return Object.entries(
            frequency
        )
            .sort(
                (a, b) =>
                    b[1] - a[1]
            )
            .slice(
                0,
                limit
            )
            .map(
                item =>
                    item[0]
            );

    }

}

/* ============================================================
   61. TURKISH TEXT INSTANCE
============================================================ */

const turkishText =
    new TurkishTextEngine();

/* ============================================================
   62. QUESTION VARIATION ENGINE
============================================================ */

class QuestionVariationEngine {

    constructor() {

        this.patterns = [

            {
                regex:
                    /^nedir\s+(.+)$/i,

                transform:
                    value =>
                        `${value} nedir`

            },

            {
                regex:
                    /^(.+)\s+nedir$/i,

                transform:
                    value =>
                        `nedir ${value}`

            },

            {
                regex:
                    /^(.+)\s+ne demek$/i,

                transform:
                    value =>
                        `${value} anlamı nedir`

            },

            {
                regex:
                    /^(.+)\s+nasıl yapılır$/i,

                transform:
                    value =>
                        `${value} nasıl yapılır`

            },

            {
                regex:
                    /^(.+)\s+yapmak$/i,

                transform:
                    value =>
                        `${value} nasıl yapılır`

            }

        ];

    }

    generate(
        question
    ) {

        const original =
            cleanText(
                question
            );

        if (!original) {

            return [];

        }

        const variations =
            new Set();

        variations.add(
            original
        );

        variations.add(
            normalizeQuestion(
                original
            )
        );

        for (
            const pattern of
            this.patterns
        ) {

            const match =
                original.match(
                    pattern.regex
                );

            if (!match) {

                continue;

            }

            try {

                const variation =
                    pattern.transform(
                        match[1]
                    );

                if (
                    variation
                ) {

                    variations.add(
                        cleanText(
                            variation
                        )
                    );

                }

            } catch (_) {}

        }

        return [
            ...variations
        ]
            .filter(Boolean)
            .slice(
                0,
                20
            );

    }

}

/* ============================================================
   63. VARIATION INSTANCE
============================================================ */

const questionVariations =
    new QuestionVariationEngine();

/* ============================================================
   64. CATEGORY ENGINE
============================================================ */

class MemoryCategoryEngine {

    constructor() {

        this.categories = {

            coding: [

                "kod",
                "javascript",
                "python",
                "html",
                "css",
                "java",
                "c++",
                "c#",
                "node",
                "programlama",
                "fonksiyon",
                "değişken",
                "api",
                "backend",
                "frontend"

            ],

            technology: [

                "bilgisayar",
                "telefon",
                "android",
                "iphone",
                "windows",
                "linux",
                "işlemci",
                "ram",
                "ekran kartı",
                "internet",
                "wifi",
                "bluetooth",
                "teknoloji"

            ],

            education: [

                "ders",
                "matematik",
                "fen",
                "türkçe",
                "ingilizce",
                "tarih",
                "coğrafya",
                "ödev",
                "sınav",
                "konu",
                "öğren",
                "okul"

            ],

            science: [

                "bilim",
                "fizik",
                "kimya",
                "biyoloji",
                "uzay",
                "gezegen",
                "atom",
                "molekül",
                "enerji",
                "yerçekimi"

            ],

            general: []

        };

    }

    detect(
        question
    ) {

        const text =
            normalizeQuestion(
                question
            );

        let best =
            "general";

        let bestScore =
            0;

        for (
            const [category, words]
            of Object.entries(
                this.categories
            )
        ) {

            if (
                category ===
                "general"
            ) {

                continue;

            }

            let score = 0;

            for (
                const word of words
            ) {

                if (
                    text.includes(
                        word
                    )
                ) {

                    score++;

                }

            }

            if (
                score >
                bestScore
            ) {

                bestScore =
                    score;

                best =
                    category;

            }

        }

        return {

            category:
                best,

            score:
                bestScore

        };

    }

    addCategory(
        name,
        keywords
    ) {

        const category =
            cleanText(
                name
            );

        if (!category) {

            return false;

        }

        if (
            !Array.isArray(
                keywords
            )
        ) {

            return false;

        }

        if (
            !this.categories[
                category
            ]
        ) {

            this.categories[
                category
            ] = [];

        }

        for (
            const keyword of
            keywords
        ) {

            const clean =
                normalizeQuestion(
                    keyword
                );

            if (
                clean &&
                !this.categories[
                    category
                ].includes(
                    clean
                )
            ) {

                this.categories[
                    category
                ].push(
                    clean
                );

            }

        }

        return true;

    }

    listCategories() {

        return clone(
            this.categories
        );

    }

}

/* ============================================================
   65. CATEGORY INSTANCE
============================================================ */

const memoryCategories =
    new MemoryCategoryEngine();

/* ============================================================
   66. TAG ENGINE
============================================================ */

class MemoryTagEngine {

    constructor() {

        this.maxTags =
            MEMORY_CONFIG
                .limits
                .maxTags;

    }

    normalizeTag(
        tag
    ) {

        return cleanText(
            tag
        )
            .toLocaleLowerCase(
                "tr-TR"
            )
            .replace(
                /^#/,
                ""
            )
            .replace(
                /\s+/g,
                "-"
            );

    }

    createTags(
        question,
        options = {}
    ) {

        const tags =
            new Set();

        const keywords =
            turkishText
                .extractKeywords(
                    question,
                    15
                );

        for (
            const keyword of
            keywords
        ) {

            const tag =
                this.normalizeTag(
                    keyword
                );

            if (
                tag
            ) {

                tags.add(
                    tag
                );

            }

        }

        const category =
            options.category ||
            memoryCategories
                .detect(
                    question
                )
                .category;

        if (
            category &&
            category !==
            "general"
        ) {

            tags.add(
                this.normalizeTag(
                    category
                )
            );

        }

        if (
            options.tags &&
            Array.isArray(
                options.tags
            )
        ) {

            for (
                const item of
                options.tags
            ) {

                const tag =
                    this.normalizeTag(
                        item
                    );

                if (
                    tag
                ) {

                    tags.add(
                        tag
                    );

                }

            }

        }

        return [
            ...tags
        ].slice(
            0,
            this.maxTags
        );

    }

}

/* ============================================================
   67. TAG INSTANCE
============================================================ */

const memoryTags =
    new MemoryTagEngine();

/* ============================================================
   68. DUPLICATE DETECTOR
============================================================ */

class MemoryDuplicateEngine {

    constructor(memory) {

        this.memory =
            memory;

    }

    detect(
        question,
        options = {}
    ) {

        const normalized =
            normalizeQuestion(
                question
            );

        if (!normalized) {

            return {

                duplicate: false,

                score: 0,

                entry: null

            };

        }

        const exact =
            this.memory.findExact(
                normalized
            );

        if (exact) {

            return {

                duplicate: true,

                type: "exact",

                score: 1,

                entry: exact

            };

        }

        const results =
            this.memory.findAdvanced(
                normalized,
                {

                    minimumSimilarity:
                        options.minimumSimilarity ??
                        0.78,

                    maxResults:
                        options.maxResults ??
                        5,

                    userId:
                        options.userId ||
                        null

                }
            );

        const best =
            results[0];

        if (
            best &&
            best.similarity >=
            (
                options.duplicateThreshold ??
                0.88
            )
        ) {

            return {

                duplicate: true,

                type: "similar",

                score:
                    best.similarity,

                entry:
                    best.entry,

                results

            };

        }

        return {

            duplicate: false,

            type: "new",

            score:
                best
                    ? best.similarity
                    : 0,

            entry:
                best
                    ? best.entry
                    : null,

            results

        };

    }

}

/* ============================================================
   69. DUPLICATE INSTANCE
============================================================ */

const memoryDuplicates =
    new MemoryDuplicateEngine(
        answerMemory
    );

/* ============================================================
   70. ENHANCED ADD
============================================================ */

AnswerMemory.prototype.addSmart =
function(
    data = {}
) {

    const question =
        cleanText(
            data.question
        );

    const answer =
        cleanText(
            data.answer
        );

    if (!question) {

        throw new Error(
            "Soru gerekli."
        );

    }

    if (!answer) {

        throw new Error(
            "Cevap gerekli."
        );

    }

    const categoryResult =
        memoryCategories.detect(
            question
        );

    const category =
        data.category ||
        categoryResult.category;

    const tags =
        memoryTags.createTags(
            question,
            {

                category,

                tags:
                    data.tags ||
                    []

            }
        );

    const duplicate =
        memoryDuplicates.detect(
            question,
            {

                userId:
                    data.userId ||
                    null,

                duplicateThreshold:
                    data.duplicateThreshold ??
                    0.88

            }
        );

    if (
        duplicate.duplicate &&
        duplicate.entry
    ) {

        const updated =
            this.update(
                duplicate.entry.id,
                {

                    answer,

                    category,

                    tags,

                    confidence:
                        data.confidence ??
                        duplicate.entry
                            .confidence,

                    qualityScore:
                        data.qualityScore ??
                        duplicate.entry
                            .qualityScore,

                    metadata:
                        {

                            ...(duplicate.entry
                                .metadata ||
                                {}),

                            lastSmartUpdate:
                                nowISO()

                        }

                }
            );

        return {

            entry:
                updated,

            created:
                false,

            updated:
                true,

            duplicate:

                true,

            duplicateType:
                duplicate.type

        };

    }

    const entry =
        this.add({

            ...data,

            question,

            answer,

            category,

            tags

        });

    if (entry) {

        userAnswerIndex.add(
            entry
        );

    }

    return {

        entry,

        created:
            true,

        updated:
            false,

        duplicate:
            false

    };

};

/* ============================================================
   71. SMART QUESTION SEARCH
============================================================ */

AnswerMemory.prototype.searchQuestion =
function(
    question,
    options = {}
) {

    const query =
        cleanText(
            question
        );

    if (!query) {

        return [];

    }

    const variations =
        questionVariations
            .generate(
                query
            );

    const resultMap =
        new Map();

    for (
        const variation of
        variations
    ) {

        const direct =
            this.findAdvanced(
                variation,
                {

                    minimumSimilarity:
                        options.minimumSimilarity ??
                        0.35,

                    maxResults:
                        options.maxResults ??
                        20,

                    userId:
                        options.userId ||
                        null

                }
            );

        for (
            const result of
            direct
        ) {

            if (
                !resultMap.has(
                    result.id
                )
            ) {

                resultMap.set(
                    result.id,
                    {

                        ...result,

                        variation

                    }
                );

            } else {

                const existing =
                    resultMap.get(
                        result.id
                    );

                if (
                    result.score >
                    existing.score
                ) {

                    resultMap.set(
                        result.id,
                        {

                            ...result,

                            variation

                        }
                    );

                }

            }

        }

    }

    return [
        ...resultMap.values()
    ]
        .sort(
            (a, b) =>
                b.score -
                a.score
        )
        .slice(
            0,
            options.maxResults ??
            20
        );

};

/* ============================================================
   72. CATEGORY SEARCH
============================================================ */

AnswerMemory.prototype.searchCategory =
function(
    category,
    options = {}
) {

    const normalized =
        normalizeQuestion(
            category
        );

    if (!normalized) {

        return [];

    }

    let entries =
        Object.values(
            database.entries
        );

    entries =
        entries.filter(
            entry =>
                normalizeQuestion(
                    entry.category
                ) ===
                normalized
        );

    if (
        options.userId
    ) {

        entries =
            entries.filter(
                entry =>
                    entry.userId ===
                    options.userId ||
                    !entry.userId
            );

    }

    if (
        options.includeArchived !==
        true
    ) {

        entries =
            entries.filter(
                entry =>
                    entry.archived !== true
            );

    }

    if (
        options.enabledOnly
    ) {

        entries =
            entries.filter(
                entry =>
                    entry.enabled !== false
            );

    }

    entries.sort(
        (a, b) =>
            safeInteger(
                b.usageCount,
                0
            ) -
            safeInteger(
                a.usageCount,
                0
            )
    );

    return entries
        .slice(
            0,
            options.maxResults ??
            100
        )
        .map(
            clone
        );

};

/* ============================================================
   73. TAG SEARCH
============================================================ */

AnswerMemory.prototype.searchTag =
function(
    tag,
    options = {}
) {

    const normalizedTag =
        memoryTags.normalizeTag(
            tag
        );

    if (!normalizedTag) {

        return [];

    }

    const entries =
        Object.values(
            database.entries
        )
            .filter(
                entry => {

                    if (
                        entry.archived ===
                        true
                    ) {

                        return false;

                    }

                    if (
                        options.enabledOnly &&
                        entry.enabled ===
                        false
                    ) {

                        return false;

                    }

                    return Array.isArray(
                        entry.tags
                    ) &&
                    entry.tags.some(
                        item =>
                            memoryTags
                                .normalizeTag(
                                    item
                                ) ===
                            normalizedTag
                    );

                }
            )
            .sort(
                (a, b) =>
                    safeInteger(
                        b.usageCount,
                        0
                    ) -
                    safeInteger(
                        a.usageCount,
                        0
                    )
            );

    return entries
        .slice(
            0,
            options.maxResults ??
            100
        )
        .map(
            clone
        );

};

/* ============================================================
   74. KEYWORD SEARCH
============================================================ */

AnswerMemory.prototype.searchKeywords =
function(
    keywords,
    options = {}
) {

    let list;

    if (
        Array.isArray(
            keywords
        )
    ) {

        list =
            keywords
                .map(
                    item =>
                        normalizeQuestion(
                            item
                        )
                )
                .filter(Boolean);

    } else {

        list =
            turkishText
                .extractKeywords(
                    String(
                        keywords ||
                        ""
                    ),
                    20
                );

    }

    if (
        list.length === 0
    ) {

        return [];

    }

    const results = [];

    for (
        const entry of
        Object.values(
            database.entries
        )
    ) {

        if (
            entry.enabled === false ||
            entry.archived === true
        ) {

            continue;

        }

        const text =
            `${entry.question} ${entry.answer}`;

        const normalized =
            normalizeQuestion(
                text
            );

        let matched = 0;

        for (
            const keyword of
            list
        ) {

            if (
                normalized.includes(
                    keyword
                )
            ) {

                matched++;

            }

        }

        if (
            matched === 0
        ) {

            continue;

        }

        results.push({

            entry:
                clone(entry),

            matched,

            ratio:
                matched /
                list.length

        });

    }

    results.sort(
        (a, b) => {

            if (
                b.ratio !==
                a.ratio
            ) {

                return (
                    b.ratio -
                    a.ratio
                );

            }

            return (
                b.matched -
                a.matched
            );

        }
    );

    return results.slice(
        0,
        options.maxResults ??
        50
    );

};

/* ============================================================
   75. AUTO CATEGORY + TAG UPDATE
============================================================ */

function enrichMemoryEntry(
    memoryId
) {

    const entry =
        answerMemory.get(
            memoryId
        );

    if (!entry) {

        return null;

    }

    const categoryResult =
        memoryCategories.detect(
            entry.question
        );

    const category =
        entry.category &&
        entry.category !==
        "general"
            ? entry.category
            : categoryResult.category;

    const tags =
        memoryTags.createTags(
            entry.question,
            {

                category,

                tags:
                    entry.tags ||
                    []

            }
        );

    return answerMemory.update(
        memoryId,
        {

            category,

            tags

        }
    );

}

/* ============================================================
   76. AUTO ENRICH ALL
============================================================ */

function enrichAllMemories(
    options = {}
) {

    const entries =
        Object.values(
            database.entries
        );

    let updated = 0;

    const limit =
        options.limit ??
        entries.length;

    for (
        const entry of
        entries.slice(
            0,
            limit
        )
    ) {

        if (!entry) {

            continue;

        }

        try {

            const result =
                enrichMemoryEntry(
                    entry.id
                );

            if (result) {

                updated++;

            }

        } catch (_) {}

    }

    return {

        processed:
            Math.min(
                limit,
                entries.length
            ),

        updated

    };

}

/* ============================================================
   77. FIND BEST ANSWER
============================================================ */

function findBestMemoryAnswer(
    question,
    options = {}
) {

    const results =
        answerMemory.searchQuestion(
            question,
            {

                ...options,

                maxResults:
                    options.maxResults ??
                    10,

                minimumSimilarity:
                    options.minimumSimilarity ??
                    0.40

            }
        );

    if (
        results.length === 0
    ) {

        return null;

    }

    const first =
        results[0];

    if (
        first.score <
        (
            options.minimumScore ??
            0.55
        )
    ) {

        return null;

    }

    return {

        answer:
            first.entry.answer,

        entry:
            first.entry,

        score:
            first.score,

        similarity:
            first.similarity,

        alternatives:
            results
                .slice(1, 5)
                .map(
                    item =>
                        ({
                            answer:
                                item.entry
                                    .answer,

                            score:
                                item.score,

                            entryId:
                                item.entry
                                    .id

                        })
                )

    };

}

/* ============================================================
   78. LEARN FROM AI RESPONSE
============================================================ */

function learnAIResponse(
    question,
    answer,
    context = {}
) {

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

        return {

            success: false,

            reason:
                "question_or_answer_empty"

        };

    }

    /*
     * Çok kısa / hata benzeri cevapları
     * otomatik hafızaya almıyoruz.
     */

    if (
        cleanAnswer.length <
        (
            MEMORY_CONFIG
                .cleanup
                .minimumAnswerLength
        )
    ) {

        return {

            success: false,

            reason:
                "answer_too_short"

        };

    }

    const result =
        answerMemory.addSmart({

            question:
                cleanQuestion,

            answer:
                cleanAnswer,

            userId:
                context.userId ||
                null,

            sessionId:
                context.sessionId ||
                null,

            conversationId:
                context.conversationId ||
                null,

            language:
                context.language ||
                "tr",

            model:
                context.model ||
                "unknown",

            provider:
                context.provider ||
                "unknown",

            confidence:
                context.confidence ??
                0.65,

            qualityScore:
                context.qualityScore ??
                0.65,

            tags:
                context.tags ||
                [],

            sources:
                context.sources ||
                [],

            metadata:
                {

                    learnedAutomatically:
                        true,

                    learnedAt:
                        nowISO(),

                    ...(
                        context.metadata ||
                        {}
                    )

                }

        });

    return {

        success:
            Boolean(
                result &&
                result.entry
            ),

        ...result

    };

}

/* ============================================================
   79. LEARN ONLY IF USEFUL
============================================================ */

function learnIfUseful(
    question,
    answer,
    context = {}
) {

    const q =
        cleanText(
            question
        );

    const a =
        cleanText(
            answer
        );

    if (!q || !a) {

        return {

            learned: false,

            reason:
                "empty"

        };

    }

    const badPatterns = [

        "hata oluştu",
        "bir hata oluştu",
        "şu anda cevap veremiyorum",
        "cevap veremiyorum",
        "unknown error",
        "internal server error",
        "rate limit",
        "too many requests",
        "timeout",
        "network error"

    ];

    const normalizedAnswer =
        normalizeQuestion(
            a
        );

    for (
        const pattern of
        badPatterns
    ) {

        if (
            normalizedAnswer
                .includes(
                    pattern
                )
        ) {

            return {

                learned: false,

                reason:
                    "error_answer"

            };

        }

    }

    const result =
        learnAIResponse(
            q,
            a,
            context
        );

    return {

        learned:
            result.success,

        reason:
            result.success
                ? "saved"
                : result.reason ||
                  "not_saved",

        result

    };

}

/* ============================================================
   80. MEMORY MERGE
============================================================ */

function mergeMemories(
    targetId,
    sourceId
) {

    if (
        targetId ===
        sourceId
    ) {

        return null;

    }

    const target =
        answerMemory.get(
            targetId
        );

    const source =
        answerMemory.get(
            sourceId
        );

    if (
        !target ||
        !source
    ) {

        return null;

    }

    const targetMetadata =
        target.metadata &&
        typeof target.metadata ===
            "object"
            ? clone(
                target.metadata
            )
            : {};

    const sourceMetadata =
        source.metadata &&
        typeof source.metadata ===
            "object"
            ? clone(
                source.metadata
            )
            : {};

    const alternatives = [

        ...(
            targetMetadata
                .alternativeAnswers ||
            []
        ),

        {

            text:
                source.answer,

            sourceId:
                source.id,

            mergedAt:
                nowISO()

        },

        ...(
            sourceMetadata
                .alternativeAnswers ||
            []
        )

    ];

    const unique =
        [];

    const seen =
        new Set();

    for (
        const item of
        alternatives
    ) {

        if (
            !item ||
            !item.text
        ) {

            continue;

        }

        const key =
            normalizeQuestion(
                item.text
            );

        if (
            seen.has(
                key
            )
        ) {

            continue;

        }

        seen.add(
            key
        );

        unique.push(
            item
        );

    }

    targetMetadata
        .alternativeAnswers =
        unique.slice(
            -20
        );

    const mergedTags =
        [
            ...(target.tags || []),
            ...(source.tags || [])
        ];

    const finalTags =
        memoryTags.createTags(
            target.question,
            {

                category:
                    target.category,

                tags:
                    mergedTags

            }
        );

    const updated =
        answerMemory.update(
            target.id,
            {

                metadata:
                    targetMetadata,

                tags:
                    finalTags,

                usageCount:
                    safeInteger(
                        target.usageCount,
                        0
                    ) +
                    safeInteger(
                        source.usageCount,
                        0
                    ),

                hitCount:
                    safeInteger(
                        target.hitCount,
                        0
                    ) +
                    safeInteger(
                        source.hitCount,
                        0
                    ),

                successCount:
                    safeInteger(
                        target.successCount,
                        0
                    ) +
                    safeInteger(
                        source.successCount,
                        0
                    )

            }
        );

    answerMemory.delete(
        source.id
    );

    userAnswerIndex.rebuild();

    return updated;

}

/* ============================================================
   81. FIND DUPLICATES
============================================================ */

function findMemoryDuplicates(
    options = {}
) {

    const entries =
        Object.values(
            database.entries
        );

    const duplicates = [];

    const threshold =
        options.threshold ??
        0.88;

    for (
        let i = 0;
        i < entries.length;
        i++
    ) {

        const a =
            entries[i];

        if (!a) {

            continue;

        }

        for (
            let j = i + 1;
            j < entries.length;
            j++
        ) {

            const b =
                entries[j];

            if (!b) {

                continue;

            }

            if (
                a.userId &&
                b.userId &&
                a.userId !==
                b.userId
            ) {

                continue;

            }

            const score =
                calculateSimilarity(
                    a.question,
                    b.question
                );

            if (
                score >=
                threshold
            ) {

                duplicates.push({

                    first:
                        clone(a),

                    second:
                        clone(b),

                    score

                });

            }

            if (
                duplicates.length >=
                (
                    options.limit ??
                    100
                )
            ) {

                return duplicates;

            }

        }

    }

    duplicates.sort(
        (a, b) =>
            b.score -
            a.score
    );

    return duplicates;

}

/* ============================================================
   82. AUTO CLEAN DUPLICATES
============================================================ */

function cleanupDuplicateMemories(
    options = {}
) {

    const duplicates =
        findMemoryDuplicates(
            options
        );

    let merged = 0;

    for (
        const duplicate of
        duplicates
    ) {

        const first =
            duplicate.first;

        const second =
            duplicate.second;

        if (
            !first ||
            !second
        ) {

            continue;

        }

        /*
         * Daha kaliteli olanı hedef olarak seçiyoruz.
         */

        const firstQuality =
            safeNumber(
                first.qualityScore,
                0.5
            );

        const secondQuality =
            safeNumber(
                second.qualityScore,
                0.5
            );

        const target =
            firstQuality >=
            secondQuality
                ? first
                : second;

        const source =
            target.id ===
            first.id
                ? second
                : first;

        try {

            mergeMemories(
                target.id,
                source.id
            );

            merged++;

        } catch (_) {}

    }

    return {

        found:
            duplicates.length,

        merged

    };

}

/* ============================================================
   83. EXPORT PART 3
============================================================ */

module.exports.TurkishTextEngine =
    TurkishTextEngine;

module.exports.turkishText =
    turkishText;

module.exports.QuestionVariationEngine =
    QuestionVariationEngine;

module.exports.questionVariations =
    questionVariations;

module.exports.MemoryCategoryEngine =
    MemoryCategoryEngine;

module.exports.memoryCategories =
    memoryCategories;

module.exports.MemoryTagEngine =
    MemoryTagEngine;

module.exports.memoryTags =
    memoryTags;

module.exports.MemoryDuplicateEngine =
    MemoryDuplicateEngine;

module.exports.memoryDuplicates =
    memoryDuplicates;

module.exports.enrichMemoryEntry =
    enrichMemoryEntry;

module.exports.enrichAllMemories =
    enrichAllMemories;

module.exports.findBestMemoryAnswer =
    findBestMemoryAnswer;

module.exports.learnAIResponse =
    learnAIResponse;

module.exports.learnIfUseful =
    learnIfUseful;

module.exports.mergeMemories =
    mergeMemories;

module.exports.findMemoryDuplicates =
    findMemoryDuplicates;

module.exports.cleanupDuplicateMemories =
    cleanupDuplicateMemories;

/* ============================================================
   84. MEMORY SEARCH API OBJECT
============================================================ */

const memorySearch = {

    exact(
        question
    ) {

        return answerMemory.findExact(
            question
        );

    },

    similar(
        question,
        options = {}
    ) {

        return answerMemory.findSimilar(
            question,
            options
        );

    },

    smart(
        question,
        options = {}
    ) {

        return answerMemory.smartLookup(
            question,
            options
        );

    },

    question(
        question,
        options = {}
    ) {

        return answerMemory.searchQuestion(
            question,
            options
        );

    },

    category(
        category,
        options = {}
    ) {

        return answerMemory.searchCategory(
            category,
            options
        );

    },

    tag(
        tag,
        options = {}
    ) {

        return answerMemory.searchTag(
            tag,
            options
        );

    },

    keywords(
        keywords,
        options = {}
    ) {

        return answerMemory.searchKeywords(
            keywords,
            options
        );

    },

    best(
        question,
        options = {}
    ) {

        return findBestMemoryAnswer(
            question,
            options
        );

    }

};

module.exports.memorySearch =
    memorySearch;

/* ============================================================
   85. MEMORY LEARNING API
============================================================ */

const memoryLearningAPI = {

    learn(
        question,
        answer,
        context = {}
    ) {

        return learnAIResponse(
            question,
            answer,
            context
        );

    },

    learnIfUseful(
        question,
        answer,
        context = {}
    ) {

        return learnIfUseful(
            question,
            answer,
            context
        );

    },

    feedback(
        memoryId,
        feedback
    ) {

        return memoryFeedback(
            memoryId,
            feedback
        );

    },

    enrich(
        memoryId
    ) {

        return enrichMemoryEntry(
            memoryId
        );

    },

    enrichAll(
        options = {}
    ) {

        return enrichAllMemories(
            options
        );

    },

    merge(
        targetId,
        sourceId
    ) {

        return mergeMemories(
            targetId,
            sourceId
        );

    },

    cleanupDuplicates(
        options = {}
    ) {

        return cleanupDuplicateMemories(
            options
        );

    }

};

module.exports.memoryLearningAPI =
    memoryLearningAPI;

/* ============================================================
   86. MEMORY ENGINE HEALTH
============================================================ */

function getMemoryHealth() {

    const stats =
        answerMemory.stats();

    const hitRate =
        stats.hitRate;

    let status =
        "healthy";

    if (
        stats.totalErrors > 10
    ) {

        status =
            "warning";

    }

    if (
        stats.totalEntries === 0
    ) {

        status =
            "empty";

    }

    return {

        status,

        database:
            ANSWER_MEMORY_FILE,

        entries:
            stats.total,

        hitRate,

        users:
            userAnswerIndex.index.size,

        learningEvents:
            memoryLearning
                .events
                .length,

        backupDirectory:
            ANSWER_MEMORY_BACKUP_DIR,

        timestamp:
            nowISO()

    };

}

module.exports.getMemoryHealth =
    getMemoryHealth;

/* ============================================================
   87. AUTO SAVE TIMER
============================================================ */

let memoryAutoSaveTimer =
    null;

function startMemoryAutoSave(
    interval = 60000
) {

    if (
        memoryAutoSaveTimer
    ) {

        clearInterval(
            memoryAutoSaveTimer
        );

    }

    memoryAutoSaveTimer =
        setInterval(
            () => {

                try {

                    saveDatabase({
                        skipBackup: true
                    });

                } catch (error) {

                    database.totalErrors++;

                }

            },
            Math.max(
                10000,
                interval
            )
        );

    /*
     * Node.js uygulamasının kapanmasını
     * engellememesi için unref.
     */

    if (
        memoryAutoSaveTimer &&
        typeof memoryAutoSaveTimer.unref ===
            "function"
    ) {

        memoryAutoSaveTimer.unref();

    }

    return true;

}

function stopMemoryAutoSave() {

    if (
        memoryAutoSaveTimer
    ) {

        clearInterval(
            memoryAutoSaveTimer
        );

        memoryAutoSaveTimer =
            null;

    }

    return true;

}

module.exports.startMemoryAutoSave =
    startMemoryAutoSave;

module.exports.stopMemoryAutoSave =
    stopMemoryAutoSave;

/* ============================================================
   88. START AUTOMATIC MEMORY SAVE
============================================================ */

if (
    MEMORY_CONFIG.storage.autoSave
) {

    startMemoryAutoSave(
        60000
    );

}

/* ============================================================
   89. PROCESS SHUTDOWN SAVE
============================================================ */

function registerMemoryShutdownHandlers() {

    const shutdown =
        () => {

            try {

                saveDatabase({
                    skipBackup: true
                });

            } catch (_) {}

        };

    process.once(
        "beforeExit",
        shutdown
    );

}

registerMemoryShutdownHandlers();

/* ============================================================
   90. PART 3 READY
============================================================ */

console.log(
    "[TürkAI] Advanced Answer Memory Part 3 aktif."
);

/* ============================================================
   PART 3 END
============================================================ */
// ============================================================
// TÜRKAI ANSWER MEMORY ENGINE
// PART 4 / 5
// Advanced ranking, context memory, user profiles,
// semantic groups, confidence management and maintenance
// ============================================================

/* ------------------------------------------------------------
   1. ADVANCED CONTEXT ENGINE
------------------------------------------------------------ */

class MemoryContextEngine {
    constructor() {
        this.maxContextItems = 12;
        this.maxContextChars = 12000;
        this.defaultWindow = 8;
    }

    clean(value) {
        if (value === undefined || value === null) return "";
        return String(value).trim();
    }

    createContextItem(item) {
        if (!item || typeof item !== "object") return null;

        return {
            id: item.id || null,
            question: this.clean(item.question),
            answer: this.clean(item.answer),
            category: item.category || "general",
            tags: Array.isArray(item.tags) ? item.tags : [],
            confidence: Number(item.confidence || 0),
            quality: Number(item.quality || 0),
            createdAt: item.createdAt || null,
            updatedAt: item.updatedAt || null
        };
    }

    buildContext(items, options = {}) {
        const list = Array.isArray(items)
            ? items
                .map(item => this.createContextItem(item))
                .filter(Boolean)
            : [];

        const maxItems = Number(options.maxItems || this.maxContextItems);
        const maxChars = Number(options.maxChars || this.maxContextChars);

        const selected = [];
        let totalChars = 0;

        for (const item of list) {
            const estimated = (
                item.question.length +
                item.answer.length +
                100
            );

            if (
                selected.length >= maxItems ||
                totalChars + estimated > maxChars
            ) {
                break;
            }

            selected.push(item);
            totalChars += estimated;
        }

        return selected;
    }

    formatContext(items) {
        const context = this.buildContext(items);

        if (!context.length) {
            return "";
        }

        return context
            .map((item, index) => {
                return [
                    `# Hafıza ${index + 1}`,
                    `Soru: ${item.question}`,
                    `Cevap: ${item.answer}`,
                    `Kategori: ${item.category}`
                ].join("\n");
            })
            .join("\n\n");
    }

    findRelevant(question, entries, limit = 6) {
        if (!question || !Array.isArray(entries)) {
            return [];
        }

        const results = entries
            .map(entry => {
                const similarity = typeof hybridSimilarity === "function"
                    ? hybridSimilarity(question, entry.question || "")
                    : 0;

                return {
                    entry,
                    score: similarity
                };
            })
            .filter(result => result.score > 0.05)
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);

        return results;
    }
}

const memoryContextEngine = new MemoryContextEngine();

/* ------------------------------------------------------------
   2. USER MEMORY PROFILE ENGINE
------------------------------------------------------------ */

class UserMemoryProfileEngine {
    constructor() {
        this.profiles = new Map();
        this.maxInterests = 50;
        this.maxPreferences = 50;
        this.maxHistory = 100;
    }

    normalizeUserId(userId) {
        if (
            userId === undefined ||
            userId === null ||
            userId === ""
        ) {
            return "anonymous";
        }

        return String(userId).trim().slice(0, 200);
    }

    createProfile(userId) {
        const id = this.normalizeUserId(userId);

        if (!this.profiles.has(id)) {
            this.profiles.set(id, {
                userId: id,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),

                interests: [],
                preferences: {},
                topics: {},
                categories: {},
                history: [],

                totalQuestions: 0,
                totalMemoryHits: 0,
                totalMemoryMisses: 0,

                lastQuestion: null,
                lastAnswer: null,
                lastCategory: null
            });
        }

        return this.profiles.get(id);
    }

    touch(profile) {
        profile.updatedAt = new Date().toISOString();
        return profile;
    }

    addInterest(userId, interest) {
        const profile = this.createProfile(userId);
        const value = String(interest || "").trim();

        if (!value) {
            return profile;
        }

        if (!profile.interests.includes(value)) {
            profile.interests.push(value);
        }

        if (profile.interests.length > this.maxInterests) {
            profile.interests = profile.interests.slice(-this.maxInterests);
        }

        return this.touch(profile);
    }

    setPreference(userId, key, value) {
        const profile = this.createProfile(userId);

        if (!key) {
            return profile;
        }

        profile.preferences[String(key)] = value;

        if (
            Object.keys(profile.preferences).length >
            this.maxPreferences
        ) {
            const keys = Object.keys(profile.preferences);
            const excess =
                keys.length - this.maxPreferences;

            for (let i = 0; i < excess; i++) {
                delete profile.preferences[keys[i]];
            }
        }

        return this.touch(profile);
    }

    incrementTopic(userId, topic) {
        const profile = this.createProfile(userId);
        const value = String(topic || "").trim();

        if (!value) {
            return profile;
        }

        profile.topics[value] =
            Number(profile.topics[value] || 0) + 1;

        return this.touch(profile);
    }

    incrementCategory(userId, category) {
        const profile = this.createProfile(userId);
        const value = category || "general";

        profile.categories[value] =
            Number(profile.categories[value] || 0) + 1;

        return this.touch(profile);
    }

    recordQuestion(userId, data = {}) {
        const profile = this.createProfile(userId);

        const question =
            String(data.question || "").trim();

        const answer =
            String(data.answer || "").trim();

        const category =
            data.category || "general";

        profile.totalQuestions += 1;
        profile.lastQuestion = question;
        profile.lastAnswer = answer;
        profile.lastCategory = category;

        this.incrementCategory(userId, category);

        if (question) {
            const words = question
                .toLowerCase()
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 15);

            for (const word of words) {
                if (word.length >= 4) {
                    this.incrementTopic(userId, word);
                }
            }
        }

        profile.history.push({
            question,
            answer,
            category,
            timestamp: new Date().toISOString()
        });

        if (profile.history.length > this.maxHistory) {
            profile.history =
                profile.history.slice(-this.maxHistory);
        }

        return this.touch(profile);
    }

    recordHit(userId) {
        const profile = this.createProfile(userId);
        profile.totalMemoryHits += 1;
        return this.touch(profile);
    }

    recordMiss(userId) {
        const profile = this.createProfile(userId);
        profile.totalMemoryMisses += 1;
        return this.touch(profile);
    }

    getProfile(userId) {
        return this.createProfile(userId);
    }

    deleteProfile(userId) {
        const id = this.normalizeUserId(userId);
        return this.profiles.delete(id);
    }

    clear() {
        this.profiles.clear();
    }

    getAll() {
        return Array.from(this.profiles.values());
    }

    stats() {
        const profiles = this.getAll();

        let questions = 0;
        let hits = 0;
        let misses = 0;

        for (const profile of profiles) {
            questions += Number(profile.totalQuestions || 0);
            hits += Number(profile.totalMemoryHits || 0);
            misses += Number(profile.totalMemoryMisses || 0);
        }

        return {
            users: profiles.length,
            questions,
            hits,
            misses,
            hitRate: hits + misses > 0
                ? hits / (hits + misses)
                : 0
        };
    }
}

const userMemoryProfiles =
    new UserMemoryProfileEngine();

/* ------------------------------------------------------------
   3. CONTEXT-AWARE SEARCH
------------------------------------------------------------ */

answerMemory.contextLookup = function(question, options = {}) {
    const source = this.getAll();

    if (!question || !source.length) {
        return {
            found: false,
            results: [],
            context: ""
        };
    }

    const relevant =
        memoryContextEngine.findRelevant(
            question,
            source,
            Number(options.limit || 8)
        );

    const entries = relevant.map(item => item.entry);

    return {
        found: entries.length > 0,
        results: relevant,
        context:
            memoryContextEngine.formatContext(entries)
    };
};

/* ------------------------------------------------------------
   4. USER-AWARE MEMORY SEARCH
------------------------------------------------------------ */

answerMemory.userLookup = function(
    userId,
    question,
    options = {}
) {
    const profile =
        userMemoryProfiles.getProfile(userId);

    const result =
        this.contextLookup(question, options);

    if (result.found) {
        userMemoryProfiles.recordHit(userId);
    } else {
        userMemoryProfiles.recordMiss(userId);
    }

    return {
        ...result,
        user: {
            userId: profile.userId,
            interests: profile.interests,
            preferences: profile.preferences,
            categories: profile.categories
        }
    };
};

/* ------------------------------------------------------------
   5. PERSONALIZATION SCORE
------------------------------------------------------------ */

function calculatePersonalizationScore(
    entry,
    profile
) {
    if (!entry || !profile) {
        return 0;
    }

    let score = 0;

    const category =
        entry.category || "general";

    if (
        profile.categories &&
        Number(profile.categories[category] || 0) > 0
    ) {
        score += 0.4;
    }

    const tags =
        Array.isArray(entry.tags)
            ? entry.tags
            : [];

    for (const tag of tags) {
        if (
            profile.interests &&
            profile.interests.includes(tag)
        ) {
            score += 0.1;
        }
    }

    if (score > 1) {
        score = 1;
    }

    return score;
}

/* ------------------------------------------------------------
   6. PERSONALIZED SEARCH
------------------------------------------------------------ */

answerMemory.personalizedLookup =
function(userId, question, options = {}) {

    const profile =
        userMemoryProfiles.getProfile(userId);

    const entries = this.getAll();

    if (!question || !entries.length) {
        return {
            found: false,
            results: []
        };
    }

    const results = entries
        .map(entry => {

            const similarity =
                typeof hybridSimilarity === "function"
                    ? hybridSimilarity(
                        question,
                        entry.question || ""
                    )
                    : 0;

            const quality =
                Number(entry.quality || 0);

            const confidence =
                Number(entry.confidence || 0);

            const usage =
                Number(entry.hits || entry.usage || 0);

            const personalization =
                calculatePersonalizationScore(
                    entry,
                    profile
                );

            const finalScore =
                similarity * 0.50 +
                quality * 0.15 +
                confidence * 0.15 +
                Math.min(usage / 20, 1) * 0.05 +
                personalization * 0.15;

            return {
                entry,
                similarity,
                personalization,
                score: finalScore
            };
        })
        .filter(item => item.similarity >= 0.08)
        .sort((a, b) => b.score - a.score)
        .slice(0, Number(options.limit || 10));

    if (results.length) {
        userMemoryProfiles.recordHit(userId);
    } else {
        userMemoryProfiles.recordMiss(userId);
    }

    return {
        found: results.length > 0,
        results,
        best: results[0] || null
    };
};

/* ------------------------------------------------------------
   7. MEMORY CONFIDENCE ENGINE
------------------------------------------------------------ */

class MemoryConfidenceEngine {
    calculate(entry) {
        if (!entry) {
            return 0;
        }

        const quality =
            Number(entry.quality || 0);

        const confidence =
            Number(entry.confidence || 0);

        const successes =
            Number(entry.successCount || 0);

        const failures =
            Number(entry.failureCount || 0);

        const total =
            successes + failures;

        const successRate =
            total > 0
                ? successes / total
                : 0.5;

        const usage =
            Number(entry.hits || entry.usage || 0);

        const usageScore =
            Math.min(usage / 50, 1);

        const score =
            quality * 0.30 +
            confidence * 0.30 +
            successRate * 0.25 +
            usageScore * 0.15;

        return Math.max(
            0,
            Math.min(1, score)
        );
    }

    classify(score) {
        if (score >= 0.85) {
            return "very_high";
        }

        if (score >= 0.70) {
            return "high";
        }

        if (score >= 0.50) {
            return "medium";
        }

        if (score >= 0.30) {
            return "low";
        }

        return "very_low";
    }

    explain(entry) {
        const score = this.calculate(entry);

        return {
            score,
            level: this.classify(score)
        };
    }
}

const memoryConfidenceEngine =
    new MemoryConfidenceEngine();

/* ------------------------------------------------------------
   8. CONFIDENCE UPDATE
------------------------------------------------------------ */

answerMemory.updateConfidence =
function(id, feedback = {}) {

    const entry = this.get(id);

    if (!entry) {
        return null;
    }

    let confidence =
        Number(entry.confidence || 0.5);

    const positive =
        Boolean(feedback.positive);

    const negative =
        Boolean(feedback.negative);

    if (positive) {
        confidence += 0.08;
    }

    if (negative) {
        confidence -= 0.12;
    }

    if (
        typeof feedback.score === "number"
    ) {
        confidence =
            confidence * 0.7 +
            feedback.score * 0.3;
    }

    confidence =
        Math.max(0, Math.min(1, confidence));

    entry.confidence = confidence;
    entry.confidenceLevel =
        memoryConfidenceEngine.classify(
            confidence
        );

    entry.updatedAt =
        new Date().toISOString();

    this.save();

    return entry;
};

/* ------------------------------------------------------------
   9. MEMORY DECAY ENGINE
------------------------------------------------------------ */

class MemoryDecayEngine {
    constructor() {
        this.halfLifeDays = 90;
    }

    ageInDays(date) {
        if (!date) {
            return 0;
        }

        const timestamp =
            new Date(date).getTime();

        if (!Number.isFinite(timestamp)) {
            return 0;
        }

        const diff =
            Date.now() - timestamp;

        return Math.max(
            0,
            diff / 86400000
        );
    }

    calculate(entry) {
        const date =
            entry.updatedAt ||
            entry.createdAt;

        const age =
            this.ageInDays(date);

        const decay =
            Math.pow(
                0.5,
                age / this.halfLifeDays
            );

        return Math.max(
            0,
            Math.min(1, decay)
        );
    }

    apply(entry) {
        if (!entry) {
            return null;
        }

        const decay =
            this.calculate(entry);

        entry.decayScore = decay;

        return entry;
    }
}

const memoryDecayEngine =
    new MemoryDecayEngine();

/* ------------------------------------------------------------
   10. ADVANCED MEMORY RANKER
------------------------------------------------------------ */

class AdvancedMemoryRanker {
    score(question, entry, profile = null) {
        if (!question || !entry) {
            return 0;
        }

        const similarity =
            typeof hybridSimilarity === "function"
                ? hybridSimilarity(
                    question,
                    entry.question || ""
                )
                : 0;

        const quality =
            Number(entry.quality || 0);

        const confidence =
            memoryConfidenceEngine.calculate(entry);

        const decay =
            memoryDecayEngine.calculate(entry);

        const personalization =
            profile
                ? calculatePersonalizationScore(
                    entry,
                    profile
                )
                : 0;

        const hits =
            Number(
                entry.hits ||
                entry.usage ||
                0
            );

        const usageScore =
            Math.min(hits / 50, 1);

        const exactBoost =
            String(question).trim().toLowerCase() ===
            String(entry.question || "")
                .trim()
                .toLowerCase()
                ? 0.20
                : 0;

        const score =
            similarity * 0.40 +
            quality * 0.10 +
            confidence * 0.15 +
            decay * 0.05 +
            personalization * 0.10 +
            usageScore * 0.05 +
            exactBoost;

        return Math.max(
            0,
            Math.min(1, score)
        );
    }

    rank(question, entries, profile = null, limit = 10) {
        return entries
            .map(entry => ({
                entry,
                score: this.score(
                    question,
                    entry,
                    profile
                )
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    }
}

const advancedMemoryRanker =
    new AdvancedMemoryRanker();

/* ------------------------------------------------------------
   11. BEST ANSWER ENGINE
------------------------------------------------------------ */

answerMemory.getBestAnswer =
function(question, options = {}) {

    const entries = this.getAll();

    if (!question || !entries.length) {
        return null;
    }

    const userId =
        options.userId || "anonymous";

    const profile =
        userMemoryProfiles.getProfile(userId);

    const ranked =
        advancedMemoryRanker.rank(
            question,
            entries,
            profile,
            Number(options.limit || 10)
        );

    const minimum =
        Number(
            options.minimumScore || 0.42
        );

    const valid =
        ranked.filter(
            item => item.score >= minimum
        );

    if (!valid.length) {
        userMemoryProfiles.recordMiss(userId);
        return null;
    }

    const best = valid[0];

    userMemoryProfiles.recordHit(userId);

    if (best.entry && best.entry.id) {
        this.markHit(best.entry.id);
    }

    return {
        id: best.entry.id,
        question: best.entry.question,
        answer: best.entry.answer,
        category: best.entry.category,
        tags: best.entry.tags,
        score: best.score,
        confidence:
            memoryConfidenceEngine.calculate(
                best.entry
            ),
        confidenceLevel:
            memoryConfidenceEngine.classify(
                memoryConfidenceEngine.calculate(
                    best.entry
                )
            )
    };
};

/* ------------------------------------------------------------
   12. QUESTION + ANSWER CONTEXT LEARNING
------------------------------------------------------------ */

function learnConversationToMemory(
    userId,
    question,
    answer,
    options = {}
) {
    const q =
        String(question || "").trim();

    const a =
        String(answer || "").trim();

    if (!q || !a) {
        return null;
    }

    const category =
        options.category ||
        MemoryCategoryEngine.detectCategory(q);

    const tags =
        Array.isArray(options.tags)
            ? options.tags
            : MemoryTagEngine.generateTags(
                q,
                category
            );

    const result =
        answerMemory.addSmart({
            question: q,
            answer: a,
            category,
            tags,
            source: options.source || "conversation",
            confidence:
                typeof options.confidence === "number"
                    ? options.confidence
                    : 0.65,
            quality:
                typeof options.quality === "number"
                    ? options.quality
                    : 0.60
        });

    userMemoryProfiles.recordQuestion(
        userId,
        {
            question: q,
            answer: a,
            category
        }
    );

    return result;
}

/* ------------------------------------------------------------
   13. PUBLIC CONVERSATION LEARNING API
------------------------------------------------------------ */

const conversationMemoryAPI = {

    learn(userId, question, answer, options = {}) {
        return learnConversationToMemory(
            userId,
            question,
            answer,
            options
        );
    },

    find(userId, question, options = {}) {
        return answerMemory.personalizedLookup(
            userId,
            question,
            options
        );
    },

    best(userId, question, options = {}) {
        return answerMemory.getBestAnswer(
            question,
            {
                ...options,
                userId
            }
        );
    },

    profile(userId) {
        return userMemoryProfiles.getProfile(
            userId
        );
    },

    addInterest(userId, interest) {
        return userMemoryProfiles.addInterest(
            userId,
            interest
        );
    },

    setPreference(userId, key, value) {
        return userMemoryProfiles.setPreference(
            userId,
            key,
            value
        );
    }
};

/* ------------------------------------------------------------
   14. MEMORY QUALITY RE-EVALUATION
------------------------------------------------------------ */

function recalculateAllMemoryConfidence() {

    const entries =
        answerMemory.getAll();

    let changed = 0;

    for (const entry of entries) {

        const confidence =
            memoryConfidenceEngine.calculate(
                entry
            );

        const old =
            Number(entry.confidence || 0);

        if (
            Math.abs(old - confidence) >
            0.001
        ) {
            entry.confidence =
                Number(
                    confidence.toFixed(4)
                );

            entry.confidenceLevel =
                memoryConfidenceEngine.classify(
                    confidence
                );

            entry.updatedAt =
                new Date().toISOString();

            changed++;
        }
    }

    if (changed > 0) {
        answerMemory.save();
    }

    return {
        changed,
        total: entries.length
    };
}

/* ------------------------------------------------------------
   15. DECAY MAINTENANCE
------------------------------------------------------------ */

function applyMemoryDecay() {

    const entries =
        answerMemory.getAll();

    for (const entry of entries) {
        memoryDecayEngine.apply(entry);
    }

    answerMemory.save();

    return {
        processed: entries.length,
        timestamp: new Date().toISOString()
    };
}

/* ------------------------------------------------------------
   16. LOW QUALITY MEMORY CLEANER
------------------------------------------------------------ */

function cleanupLowQualityMemories(
    options = {}
) {
    const minimum =
        Number(
            options.minimumConfidence || 0.10
        );

    const removeArchived =
        options.removeArchived !== false;

    const entries =
        answerMemory.getAll();

    let removed = 0;

    for (const entry of entries) {

        const confidence =
            memoryConfidenceEngine.calculate(
                entry
            );

        const archived =
            Boolean(entry.archived);

        const shouldRemove =
            confidence < minimum &&
            (
                !removeArchived ||
                archived
            );

        if (shouldRemove) {
            if (answerMemory.delete(entry.id)) {
                removed++;
            }
        }
    }

    return {
        removed,
        remaining: answerMemory.count()
    };
}

/* ------------------------------------------------------------
   17. MEMORY EXPORT ENGINE
------------------------------------------------------------ */

function exportMemorySnapshot(
    options = {}
) {
    const entries =
        answerMemory.getAll();

    const profiles =
        userMemoryProfiles.getAll();

    return {
        version: "4.0.0",
        exportedAt: new Date().toISOString(),

        metadata: {
            memoryCount: entries.length,
            profileCount: profiles.length
        },

        memory: options.includeMemory !== false
            ? entries
            : [],

        profiles: options.includeProfiles !== false
            ? profiles
            : []
    };
}

/* ------------------------------------------------------------
   18. MEMORY IMPORT ENGINE
------------------------------------------------------------ */

function importMemorySnapshot(
    snapshot,
    options = {}
) {
    if (
        !snapshot ||
        typeof snapshot !== "object"
    ) {
        return {
            imported: 0,
            skipped: 0,
            error: "Geçersiz snapshot."
        };
    }

    const memory =
        Array.isArray(snapshot.memory)
            ? snapshot.memory
            : [];

    let imported = 0;
    let skipped = 0;

    for (const item of memory) {

        if (
            !item ||
            !item.question ||
            !item.answer
        ) {
            skipped++;
            continue;
        }

        try {

            if (
                options.skipDuplicates !== false
            ) {
                const duplicate =
                    answerMemory.findExact(
                        item.question
                    );

                if (duplicate) {
                    skipped++;
                    continue;
                }
            }

            answerMemory.addSmart({
                ...item,
                source:
                    item.source ||
                    "import"
            });

            imported++;

        } catch (error) {
            skipped++;
        }
    }

    answerMemory.save();

    return {
        imported,
        skipped,
        total: answerMemory.count()
    };
}

/* ------------------------------------------------------------
   19. MEMORY BACKUP ROTATION
------------------------------------------------------------ */

function rotateMemoryBackups(
    maxBackups = 20
) {
    try {

        ensureDirectory(MEMORY_BACKUP_DIR);

        const files =
            fs.readdirSync(
                MEMORY_BACKUP_DIR
            )
            .filter(file =>
                file.endsWith(".json")
            )
            .map(file => {

                const full =
                    path.join(
                        MEMORY_BACKUP_DIR,
                        file
                    );

                const stat =
                    fs.statSync(full);

                return {
                    file,
                    full,
                    time: stat.mtimeMs
                };
            })
            .sort(
                (a, b) =>
                    b.time - a.time
            );

        const remove =
            files.slice(
                Math.max(
                    0,
                    Number(maxBackups)
                )
            );

        for (const item of remove) {
            try {
                fs.unlinkSync(item.full);
            } catch (_) {}
        }

        return {
            kept: Math.min(
                files.length,
                Number(maxBackups)
            ),
            removed: remove.length
        };

    } catch (error) {

        return {
            kept: 0,
            removed: 0,
            error: error.message
        };
    }
}

/* ------------------------------------------------------------
   20. MEMORY HEALTH REPORT
------------------------------------------------------------ */

function getAdvancedMemoryHealth() {

    const entries =
        answerMemory.getAll();

    let highConfidence = 0;
    let mediumConfidence = 0;
    let lowConfidence = 0;

    let archived = 0;
    let pinned = 0;

    for (const entry of entries) {

        const confidence =
            memoryConfidenceEngine.calculate(
                entry
            );

        if (confidence >= 0.70) {
            highConfidence++;
        } else if (confidence >= 0.40) {
            mediumConfidence++;
        } else {
            lowConfidence++;
        }

        if (entry.archived) {
            archived++;
        }

        if (entry.pinned) {
            pinned++;
        }
    }

    const profiles =
        userMemoryProfiles.stats();

    return {
        status: "ok",

        memory: {
            total: entries.length,
            highConfidence,
            mediumConfidence,
            lowConfidence,
            archived,
            pinned
        },

        users: profiles,

        timestamp:
            new Date().toISOString()
    };
}

/* ------------------------------------------------------------
   21. MEMORY SEARCH PIPELINE
------------------------------------------------------------ */

async function executeMemoryPipeline(
    userId,
    question,
    options = {}
) {
    const q =
        String(question || "").trim();

    if (!q) {
        return {
            found: false,
            answer: null,
            source: "memory"
        };
    }

    const exact =
        answerMemory.findExact(q);

    if (exact) {

        answerMemory.markHit(
            exact.id
        );

        userMemoryProfiles.recordHit(
            userId
        );

        return {
            found: true,
            exact: true,
            answer: exact.answer,
            entry: exact,
            score: 1,
            source: "memory_exact"
        };
    }

    const best =
        answerMemory.getBestAnswer(
            q,
            {
                ...options,
                userId
            }
        );

    if (
        best &&
        best.score >=
        Number(
            options.minimumScore || 0.55
        )
    ) {
        return {
            found: true,
            exact: false,
            answer: best.answer,
            entry: best,
            score: best.score,
            source: "memory_smart"
        };
    }

    return {
        found: false,
        exact: false,
        answer: null,
        entry: null,
        score: 0,
        source: "memory"
    };
}

/* ------------------------------------------------------------
   22. MEMORY ANSWER GUARD
------------------------------------------------------------ */

function isMemoryAnswerUsable(
    result,
    options = {}
) {
    if (!result) {
        return false;
    }

    if (!result.found) {
        return false;
    }

    const minimum =
        Number(
            options.minimumScore || 0.55
        );

    if (
        typeof result.score === "number" &&
        result.score < minimum
    ) {
        return false;
    }

    const answer =
        String(
            result.answer || ""
        ).trim();

    if (!answer) {
        return false;
    }

    const badPatterns = [
        /^bilmiyorum$/i,
        /^emin değilim$/i,
        /^hata oluştu/i,
        /^error/i,
        /^undefined$/i,
        /^null$/i
    ];

    for (const pattern of badPatterns) {
        if (pattern.test(answer)) {
            return false;
        }
    }

    return true;
}

/* ------------------------------------------------------------
   23. MEMORY RESPONSE FORMATTER
------------------------------------------------------------ */

function formatMemoryResponse(
    result,
    options = {}
) {
    if (
        !isMemoryAnswerUsable(
            result,
            options
        )
    ) {
        return null;
    }

    const answer =
        String(result.answer).trim();

    if (
        options.includeMeta !== true
    ) {
        return answer;
    }

    return {
        answer,
        source:
            result.source || "memory",
        score:
            Number(
                result.score || 0
            ),
        category:
            result.entry &&
            result.entry.category
                ? result.entry.category
                : "general"
    };
}

/* ------------------------------------------------------------
   24. MEMORY AUTO-LEARNING FILTER
------------------------------------------------------------ */

function shouldLearnResponse(
    question,
    answer,
    options = {}
) {
    const q =
        String(question || "").trim();

    const a =
        String(answer || "").trim();

    if (!q || !a) {
        return false;
    }

    if (q.length < 3) {
        return false;
    }

    if (a.length < 3) {
        return false;
    }

    if (a.length > 50000) {
        return false;
    }

    const blockedAnswerPatterns = [
        /internal server error/i,
        /rate limit/i,
        /too many requests/i,
        /quota exceeded/i,
        /api key/i,
        /invalid api/i,
        /network error/i
    ];

    for (
        const pattern
        of blockedAnswerPatterns
    ) {
        if (pattern.test(a)) {
            return false;
        }
    }

    if (
        options.force === true
    ) {
        return true;
    }

    return true;
}

/* ------------------------------------------------------------
   25. AUTO LEARN WRAPPER
------------------------------------------------------------ */

function autoLearnConversation(
    userId,
    question,
    answer,
    options = {}
) {
    if (
        !shouldLearnResponse(
            question,
            answer,
            options
        )
    ) {
        return {
            learned: false,
            reason: "filtered"
        };
    }

    try {

        const result =
            learnConversationToMemory(
                userId,
                question,
                answer,
                options
            );

        return {
            learned: Boolean(result),
            result
        };

    } catch (error) {

        return {
            learned: false,
            error: error.message
        };
    }
}

/* ------------------------------------------------------------
   26. MEMORY FEEDBACK PROCESSOR
------------------------------------------------------------ */

function processMemoryFeedback(
    id,
    feedback = {}
) {
    const entry =
        answerMemory.get(id);

    if (!entry) {
        return null;
    }

    if (
        feedback.positive === true
    ) {
        answerMemory.markSuccess(id);
    }

    if (
        feedback.negative === true
    ) {
        answerMemory.markFailure(id);
    }

    const updated =
        answerMemory.updateConfidence(
            id,
            feedback
        );

    return {
        entry: updated,
        confidence:
            memoryConfidenceEngine.explain(
                updated
            )
    };
}

/* ------------------------------------------------------------
   27. MEMORY QUERY ANALYTICS
------------------------------------------------------------ */

class MemoryQueryAnalytics {
    constructor() {
        this.queries = [];
        this.maxQueries = 5000;
    }

    record(data = {}) {

        const item = {
            question:
                String(
                    data.question || ""
                ).slice(0, 1000),

            userId:
                String(
                    data.userId ||
                    "anonymous"
                ).slice(0, 200),

            found:
                Boolean(data.found),

            score:
                Number(data.score || 0),

            source:
                data.source ||
                "memory",

            timestamp:
                new Date().toISOString()
        };

        this.queries.push(item);

        if (
            this.queries.length >
            this.maxQueries
        ) {
            this.queries =
                this.queries.slice(
                    -this.maxQueries
                );
        }

        return item;
    }

    getRecent(limit = 100) {
        return this.queries.slice(
            -Number(limit)
        );
    }

    stats() {

        const total =
            this.queries.length;

        let found = 0;
        let scoreTotal = 0;

        for (
            const query
            of this.queries
        ) {
            if (query.found) {
                found++;
            }

            scoreTotal +=
                Number(
                    query.score || 0
                );
        }

        return {
            total,
            found,
            misses: total - found,
            hitRate:
                total > 0
                    ? found / total
                    : 0,

            averageScore:
                total > 0
                    ? scoreTotal / total
                    : 0
        };
    }

    clear() {
        this.queries = [];
    }
}

const memoryQueryAnalytics =
    new MemoryQueryAnalytics();

/* ------------------------------------------------------------
   28. ANALYTICS-AWARE SEARCH
------------------------------------------------------------ */

async function searchMemoryWithAnalytics(
    userId,
    question,
    options = {}
) {
    const result =
        await executeMemoryPipeline(
            userId,
            question,
            options
        );

    memoryQueryAnalytics.record({
        userId,
        question,
        found: result.found,
        score: result.score,
        source: result.source
    });

    return result;
}

/* ------------------------------------------------------------
   29. FINAL PUBLIC API
------------------------------------------------------------ */

const advancedMemoryAPI = {

    contextLookup(question, options) {
        return answerMemory.contextLookup(
            question,
            options
        );
    },

    personalizedLookup(
        userId,
        question,
        options
    ) {
        return answerMemory.personalizedLookup(
            userId,
            question,
            options
        );
    },

    bestAnswer(
        userId,
        question,
        options
    ) {
        return answerMemory.getBestAnswer(
            question,
            {
                ...options,
                userId
            }
        );
    },

    pipeline(
        userId,
        question,
        options
    ) {
        return executeMemoryPipeline(
            userId,
            question,
            options
        );
    },

    search(
        userId,
        question,
        options
    ) {
        return searchMemoryWithAnalytics(
            userId,
            question,
            options
        );
    },

    learn(
        userId,
        question,
        answer,
        options
    ) {
        return autoLearnConversation(
            userId,
            question,
            answer,
            options
        );
    },

    feedback(id, feedback) {
        return processMemoryFeedback(
            id,
            feedback
        );
    },

    health() {
        return getAdvancedMemoryHealth();
    },

    analytics() {
        return memoryQueryAnalytics.stats();
    },

    export(options) {
        return exportMemorySnapshot(
            options
        );
    },

    import(snapshot, options) {
        return importMemorySnapshot(
            snapshot,
            options
        );
    },

    maintenance() {
        return {
            confidence:
                recalculateAllMemoryConfidence(),

            decay:
                applyMemoryDecay(),

            backups:
                rotateMemoryBackups()
        };
    }
};

/* ------------------------------------------------------------
   30. EXTENDED EXPORTS
------------------------------------------------------------ */

module.exports = {
    ...module.exports,

    MemoryContextEngine,
    memoryContextEngine,

    UserMemoryProfileEngine,
    userMemoryProfiles,

    MemoryConfidenceEngine,
    memoryConfidenceEngine,

    MemoryDecayEngine,
    memoryDecayEngine,

    AdvancedMemoryRanker,
    advancedMemoryRanker,

    MemoryQueryAnalytics,
    memoryQueryAnalytics,

    calculatePersonalizationScore,

    learnConversationToMemory,
    conversationMemoryAPI,

    recalculateAllMemoryConfidence,
    applyMemoryDecay,
    cleanupLowQualityMemories,

    exportMemorySnapshot,
    importMemorySnapshot,

    rotateMemoryBackups,
    getAdvancedMemoryHealth,

    executeMemoryPipeline,
    isMemoryAnswerUsable,
    formatMemoryResponse,

    shouldLearnResponse,
    autoLearnConversation,

    processMemoryFeedback,
    searchMemoryWithAnalytics,

    advancedMemoryAPI
};

/* ------------------------------------------------------------
   31. GLOBAL TURKAI MEMORY BRIDGE
------------------------------------------------------------ */

if (
    typeof global !== "undefined"
) {
    global.turkAIMemory = {
        answerMemory,
        userProfiles:
            userMemoryProfiles,

        context:
            memoryContextEngine,

        confidence:
            memoryConfidenceEngine,

        decay:
            memoryDecayEngine,

        ranker:
            advancedMemoryRanker,

        analytics:
            memoryQueryAnalytics,

        api:
            advancedMemoryAPI
    };
}

/* ------------------------------------------------------------
   32. MEMORY ENGINE STATUS
------------------------------------------------------------ */

try {

    const health =
        getAdvancedMemoryHealth();

    console.log(
        "[TürkAI Memory] Advanced engine hazır."
    );

    console.log(
        `[TürkAI Memory] Hafıza: ${health.memory.total}`
    );

    console.log(
        `[TürkAI Memory] Kullanıcı profili: ${health.users.users}`
    );

} catch (error) {

    console.warn(
        "[TürkAI Memory] Durum okunamadı:",
        error.message
    );
}

/* ------------------------------------------------------------
   PART 4 END
------------------------------------------------------------ */
// ============================================================
// TÜRKAI ANSWER MEMORY ENGINE
// PART 5 / 5 — FINAL
// Production bridge, persistence, import/export,
// API helpers, diagnostics and server integration
// ============================================================

/* ------------------------------------------------------------
   1. FINAL MEMORY CONFIGURATION
------------------------------------------------------------ */

const FINAL_MEMORY_CONFIG = {
    version: "5.0.0",

    enabled: true,

    autoLearn: true,

    autoSave: true,

    smartSearch: true,

    personalizedSearch: true,

    contextSearch: true,

    analytics: true,

    confidenceEngine: true,

    decayEngine: true,

    duplicateProtection: true,

    maxAnswerLength: 50000,

    minimumLearnConfidence: 0.45,

    minimumSearchScore: 0.55,

    maximumContextItems: 12,

    maximumSearchResults: 15,

    maintenanceInterval:
        1000 * 60 * 30
};


/* ------------------------------------------------------------
   2. SAFE MEMORY STATE
------------------------------------------------------------ */

const finalMemoryState = {

    initialized: false,

    lastInitialization:
        null,

    lastSave:
        null,

    lastSearch:
        null,

    lastLearning:
        null,

    lastMaintenance:
        null,

    searches:
        0,

    learned:
        0,

    hits:
        0,

    misses:
        0,

    errors:
        0
};


/* ------------------------------------------------------------
   3. SAFE STRING
------------------------------------------------------------ */

function memorySafeString(
    value,
    maxLength = 100000
) {
    if (
        value === undefined ||
        value === null
    ) {
        return "";
    }

    return String(value)
        .replace(/\u0000/g, "")
        .slice(0, maxLength)
        .trim();
}


/* ------------------------------------------------------------
   4. USER ID NORMALIZER
------------------------------------------------------------ */

function memoryUserId(
    userId
) {
    return memorySafeString(
        userId || "anonymous",
        200
    ) || "anonymous";
}


/* ------------------------------------------------------------
   5. QUESTION NORMALIZER
------------------------------------------------------------ */

function memoryQuestion(
    question
) {
    return memorySafeString(
        question,
        10000
    );
}


/* ------------------------------------------------------------
   6. ANSWER NORMALIZER
------------------------------------------------------------ */

function memoryAnswer(
    answer
) {
    return memorySafeString(
        answer,
        FINAL_MEMORY_CONFIG.maxAnswerLength
    );
}


/* ------------------------------------------------------------
   7. MEMORY ELIGIBILITY
------------------------------------------------------------ */

function isEligibleMemory(
    question,
    answer,
    options = {}
) {
    const q =
        memoryQuestion(question);

    const a =
        memoryAnswer(answer);

    if (!q || !a) {
        return false;
    }

    if (q.length < 2) {
        return false;
    }

    if (a.length < 2) {
        return false;
    }

    if (
        options.skipFilter === true
    ) {
        return true;
    }

    const badAnswers = [
        "undefined",
        "null",
        "[object object]",
        "internal server error",
        "service unavailable",
        "gateway timeout",
        "rate limit exceeded",
        "too many requests",
        "quota exceeded"
    ];

    const lower =
        a.toLowerCase();

    for (
        const bad
        of badAnswers
    ) {
        if (
            lower === bad ||
            lower.includes(bad)
        ) {
            return false;
        }
    }

    return true;
}


/* ------------------------------------------------------------
   8. FINAL MEMORY INITIALIZER
------------------------------------------------------------ */

function initializeFinalMemory() {

    if (
        finalMemoryState.initialized
    ) {
        return true;
    }

    try {

        if (
            typeof initializeDatabase ===
            "function"
        ) {
            initializeDatabase();
        }

    } catch (_) {
        // Database may already be initialized.
    }

    try {

        if (
            typeof reloadDatabase ===
            "function"
        ) {
            reloadDatabase();
        }

    } catch (_) {
        // Existing in-memory database is usable.
    }

    finalMemoryState.initialized =
        true;

    finalMemoryState.lastInitialization =
        new Date().toISOString();

    return true;
}


/* ------------------------------------------------------------
   9. FINAL SEARCH
------------------------------------------------------------ */

async function finalMemorySearch(
    userId,
    question,
    options = {}
) {
    initializeFinalMemory();

    const uid =
        memoryUserId(userId);

    const q =
        memoryQuestion(question);

    if (!q) {
        return {
            found: false,
            answer: null,
            score: 0,
            source: "memory"
        };
    }

    finalMemoryState.searches++;
    finalMemoryState.lastSearch =
        new Date().toISOString();

    try {

        if (
            options.exact !== false &&
            typeof answerMemory.findExact ===
            "function"
        ) {

            const exact =
                answerMemory.findExact(q);

            if (exact) {

                finalMemoryState.hits++;

                if (
                    typeof answerMemory.markHit ===
                    "function"
                ) {
                    answerMemory.markHit(
                        exact.id
                    );
                }

                try {
                    userMemoryProfiles
                        .recordHit(uid);
                } catch (_) {}

                return {
                    found: true,
                    answer: exact.answer,
                    entry: exact,
                    score: 1,
                    exact: true,
                    source: "memory_exact"
                };
            }
        }

        let result = null;

        if (
            FINAL_MEMORY_CONFIG.personalizedSearch &&
            typeof answerMemory.getBestAnswer ===
            "function"
        ) {

            result =
                answerMemory.getBestAnswer(
                    q,
                    {
                        ...options,
                        userId: uid,

                        minimumScore:
                            options.minimumScore ||
                            FINAL_MEMORY_CONFIG.minimumSearchScore
                    }
                );
        }

        if (
            result &&
            typeof result.answer ===
            "string"
        ) {

            finalMemoryState.hits++;

            return {
                found: true,
                answer: result.answer,
                entry: result,
                score:
                    Number(
                        result.score || 0
                    ),
                exact: false,
                source: "memory_smart"
            };
        }

        finalMemoryState.misses++;

        return {
            found: false,
            answer: null,
            entry: null,
            score: 0,
            exact: false,
            source: "memory"
        };

    } catch (error) {

        finalMemoryState.errors++;

        return {
            found: false,
            answer: null,
            entry: null,
            score: 0,
            source: "memory_error",
            error: error.message
        };
    }
}


/* ------------------------------------------------------------
   10. SYNCHRONOUS SEARCH
------------------------------------------------------------ */

function finalMemorySearchSync(
    userId,
    question,
    options = {}
) {
    initializeFinalMemory();

    const uid =
        memoryUserId(userId);

    const q =
        memoryQuestion(question);

    if (!q) {
        return {
            found: false,
            answer: null,
            score: 0,
            source: "memory"
        };
    }

    try {

        const exact =
            answerMemory.findExact(q);

        if (exact) {

            finalMemoryState.hits++;

            answerMemory.markHit(
                exact.id
            );

            try {
                userMemoryProfiles
                    .recordHit(uid);
            } catch (_) {}

            return {
                found: true,
                answer: exact.answer,
                entry: exact,
                score: 1,
                exact: true,
                source: "memory_exact"
            };
        }

        const best =
            answerMemory.getBestAnswer(
                q,
                {
                    ...options,
                    userId: uid
                }
            );

        if (
            best &&
            Number(best.score || 0) >=
            Number(
                options.minimumScore ||
                FINAL_MEMORY_CONFIG.minimumSearchScore
            )
        ) {

            finalMemoryState.hits++;

            return {
                found: true,
                answer: best.answer,
                entry: best,
                score:
                    Number(
                        best.score || 0
                    ),
                exact: false,
                source: "memory_smart"
            };
        }

        finalMemoryState.misses++;

        return {
            found: false,
            answer: null,
            entry: null,
            score: 0,
            source: "memory"
        };

    } catch (error) {

        finalMemoryState.errors++;

        return {
            found: false,
            answer: null,
            score: 0,
            source: "memory_error",
            error: error.message
        };
    }
}


/* ------------------------------------------------------------
   11. FINAL LEARN FUNCTION
------------------------------------------------------------ */

function finalMemoryLearn(
    userId,
    question,
    answer,
    options = {}
) {
    initializeFinalMemory();

    const uid =
        memoryUserId(userId);

    const q =
        memoryQuestion(question);

    const a =
        memoryAnswer(answer);

    if (
        !isEligibleMemory(
            q,
            a,
            options
        )
    ) {
        return {
            learned: false,
            reason: "not_eligible"
        };
    }

    try {

        let result;

        if (
            typeof answerMemory.addSmart ===
            "function"
        ) {

            result =
                answerMemory.addSmart({
                    question: q,
                    answer: a,

                    category:
                        options.category ||
                        MemoryCategoryEngine
                            .detectCategory(q),

                    tags:
                        Array.isArray(options.tags)
                            ? options.tags
                            : MemoryTagEngine
                                .generateTags(
                                    q,
                                    options.category ||
                                    "general"
                                ),

                    source:
                        options.source ||
                        "ai_response",

                    userId: uid,

                    confidence:
                        typeof options.confidence ===
                        "number"
                            ? options.confidence
                            : 0.65,

                    quality:
                        typeof options.quality ===
                        "number"
                            ? options.quality
                            : 0.65
                });

        } else {

            result =
                answerMemory.add({
                    question: q,
                    answer: a
                });
        }

        try {

            userMemoryProfiles.recordQuestion(
                uid,
                {
                    question: q,
                    answer: a,

                    category:
                        options.category ||
                        "general"
                }
            );

        } catch (_) {}

        finalMemoryState.learned++;

        finalMemoryState.lastLearning =
            new Date().toISOString();

        if (
            options.save !== false &&
            typeof answerMemory.save ===
            "function"
        ) {
            answerMemory.save();
        }

        return {
            learned: true,
            result
        };

    } catch (error) {

        finalMemoryState.errors++;

        return {
            learned: false,
            error: error.message
        };
    }
}


/* ------------------------------------------------------------
   12. LEARN ONLY IF USEFUL
------------------------------------------------------------ */

function finalMemoryLearnIfUseful(
    userId,
    question,
    answer,
    options = {}
) {

    if (
        options.force !== true &&
        !shouldLearnResponse(
            question,
            answer,
            options
        )
    ) {
        return {
            learned: false,
            reason: "filtered"
        };
    }

    return finalMemoryLearn(
        userId,
        question,
        answer,
        options
    );
}


/* ------------------------------------------------------------
   13. FEEDBACK
------------------------------------------------------------ */

function finalMemoryFeedback(
    id,
    feedback = {}
) {
    initializeFinalMemory();

    if (!id) {
        return {
            success: false,
            error: "Memory ID gerekli."
        };
    }

    try {

        const result =
            processMemoryFeedback(
                id,
                feedback
            );

        return {
            success: Boolean(result),
            result
        };

    } catch (error) {

        finalMemoryState.errors++;

        return {
            success: false,
            error: error.message
        };
    }
}


/* ------------------------------------------------------------
   14. PIN MEMORY
------------------------------------------------------------ */

function finalPinMemory(
    id
) {
    const entry =
        answerMemory.get(id);

    if (!entry) {
        return null;
    }

    entry.pinned = true;
    entry.archived = false;

    entry.updatedAt =
        new Date().toISOString();

    answerMemory.save();

    return entry;
}


/* ------------------------------------------------------------
   15. UNPIN MEMORY
------------------------------------------------------------ */

function finalUnpinMemory(
    id
) {
    const entry =
        answerMemory.get(id);

    if (!entry) {
        return null;
    }

    entry.pinned = false;

    entry.updatedAt =
        new Date().toISOString();

    answerMemory.save();

    return entry;
}


/* ------------------------------------------------------------
   16. ARCHIVE MEMORY
------------------------------------------------------------ */

function finalArchiveMemory(
    id
) {
    const entry =
        answerMemory.get(id);

    if (!entry) {
        return null;
    }

    entry.archived = true;

    entry.updatedAt =
        new Date().toISOString();

    answerMemory.save();

    return entry;
}


/* ------------------------------------------------------------
   17. RESTORE MEMORY
------------------------------------------------------------ */

function finalRestoreMemory(
    id
) {
    const entry =
        answerMemory.get(id);

    if (!entry) {
        return null;
    }

    entry.archived = false;

    entry.updatedAt =
        new Date().toISOString();

    answerMemory.save();

    return entry;
}


/* ------------------------------------------------------------
   18. USER MEMORY
------------------------------------------------------------ */

function getUserMemory(
    userId,
    options = {}
) {
    const uid =
        memoryUserId(userId);

    const profile =
        userMemoryProfiles
            .getProfile(uid);

    let entries =
        answerMemory.getAll();

    if (
        options.category
    ) {
        entries =
            entries.filter(
                item =>
                    item.category ===
                    options.category
            );
    }

    if (
        options.limit
    ) {
        entries =
            entries.slice(
                0,
                Number(options.limit)
            );
    }

    return {
        userId: uid,

        profile,

        memories: entries,

        total: entries.length
    };
}


/* ------------------------------------------------------------
   19. USER MEMORY CLEAR
------------------------------------------------------------ */

function clearUserMemory(
    userId
) {
    const uid =
        memoryUserId(userId);

    userMemoryProfiles
        .deleteProfile(uid);

    return {
        success: true,
        userId: uid
    };
}


/* ------------------------------------------------------------
   20. MEMORY STATS FINAL
------------------------------------------------------------ */

function finalMemoryStats() {

    const basic =
        typeof answerMemory.stats ===
        "function"
            ? answerMemory.stats()
            : {};

    const health =
        typeof getAdvancedMemoryHealth ===
        "function"
            ? getAdvancedMemoryHealth()
            : {};

    const analytics =
        memoryQueryAnalytics.stats();

    return {

        version:
            FINAL_MEMORY_CONFIG.version,

        enabled:
            FINAL_MEMORY_CONFIG.enabled,

        basic,

        health,

        analytics,

        state: {
            ...finalMemoryState
        },

        timestamp:
            new Date().toISOString()
    };
}


/* ------------------------------------------------------------
   21. MEMORY MAINTENANCE
------------------------------------------------------------ */

function runFinalMemoryMaintenance(
    options = {}
) {
    initializeFinalMemory();

    const started =
        Date.now();

    const result = {
        startedAt:
            new Date().toISOString(),

        confidence: null,

        decay: null,

        duplicates: null,

        backups: null,

        durationMs: 0
    };

    try {

        if (
            options.confidence !== false &&
            typeof recalculateAllMemoryConfidence ===
            "function"
        ) {
            result.confidence =
                recalculateAllMemoryConfidence();
        }

    } catch (error) {

        result.confidence = {
            error: error.message
        };
    }

    try {

        if (
            options.decay !== false &&
            typeof applyMemoryDecay ===
            "function"
        ) {
            result.decay =
                applyMemoryDecay();
        }

    } catch (error) {

        result.decay = {
            error: error.message
        };
    }

    try {

        if (
            options.duplicates !== false &&
            typeof cleanupDuplicateMemories ===
            "function"
        ) {
            result.duplicates =
                cleanupDuplicateMemories();
        }

    } catch (error) {

        result.duplicates = {
            error: error.message
        };
    }

    try {

        if (
            typeof rotateMemoryBackups ===
            "function"
        ) {
            result.backups =
                rotateMemoryBackups(
                    options.maxBackups || 20
                );
        }

    } catch (error) {

        result.backups = {
            error: error.message
        };
    }

    try {

        answerMemory.save();

    } catch (_) {}

    result.durationMs =
        Date.now() - started;

    result.finishedAt =
        new Date().toISOString();

    finalMemoryState.lastMaintenance =
        result.finishedAt;

    return result;
}


/* ------------------------------------------------------------
   22. MAINTENANCE TIMER
------------------------------------------------------------ */

let finalMaintenanceTimer =
    null;

function startFinalMaintenanceTimer() {

    if (
        finalMaintenanceTimer
    ) {
        return;
    }

    finalMaintenanceTimer =
        setInterval(
            () => {

                try {

                    runFinalMemoryMaintenance({
                        confidence: true,
                        decay: true,
                        duplicates: true
                    });

                } catch (error) {

                    finalMemoryState.errors++;

                    console.warn(
                        "[TürkAI Memory] Maintenance:",
                        error.message
                    );
                }

            },
            FINAL_MEMORY_CONFIG
                .maintenanceInterval
        );

    if (
        finalMaintenanceTimer &&
        typeof finalMaintenanceTimer.unref ===
        "function"
    ) {
        finalMaintenanceTimer.unref();
    }
}


function stopFinalMaintenanceTimer() {

    if (
        finalMaintenanceTimer
    ) {
        clearInterval(
            finalMaintenanceTimer
        );

        finalMaintenanceTimer =
            null;
    }
}


/* ------------------------------------------------------------
   23. CHAT MEMORY BRIDGE
------------------------------------------------------------ */

async function processChatMemory(
    data = {}
) {
    const userId =
        memoryUserId(
            data.userId
        );

    const question =
        memoryQuestion(
            data.question
        );

    const answer =
        memoryAnswer(
            data.answer
        );

    if (!question) {
        return {
            memoryFound: false,
            answer: null
        };
    }

    const search =
        await finalMemorySearch(
            userId,
            question,
            {
                minimumScore:
                    data.minimumScore ||
                    FINAL_MEMORY_CONFIG
                        .minimumSearchScore
            }
        );

    if (
        search.found &&
        search.answer
    ) {
        return {
            memoryFound: true,

            answer:
                search.answer,

            source:
                search.source,

            score:
                search.score,

            entry:
                search.entry
        };
    }

    if (
        answer &&
        data.learn !== false &&
        FINAL_MEMORY_CONFIG.autoLearn
    ) {

        const learned =
            finalMemoryLearnIfUseful(
                userId,
                question,
                answer,
                {
                    source:
                        data.source ||
                        "chat",

                    category:
                        data.category,

                    tags:
                        data.tags,

                    confidence:
                        data.confidence,

                    quality:
                        data.quality
                }
            );

        return {
            memoryFound: false,

            answer: null,

            learned:
                learned.learned,

            learningResult:
                learned
        };
    }

    return {
        memoryFound: false,
        answer: null
    };
}


/* ------------------------------------------------------------
   24. EXPRESS ROUTE FACTORY
------------------------------------------------------------ */

function createMemoryRoutes(
    express
) {
    if (!express) {
        return null;
    }

    const router =
        express.Router();

    /* GET MEMORY STATUS */

    router.get(
        "/status",
        (req, res) => {

            try {

                res.json({
                    success: true,
                    memory:
                        finalMemoryStats()
                });

            } catch (error) {

                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        }
    );


    /* POST MEMORY SEARCH */

    router.post(
        "/search",
        async (req, res) => {

            try {

                const body =
                    req.body || {};

                const result =
                    await finalMemorySearch(
                        body.userId,
                        body.question,
                        body.options || {}
                    );

                res.json({
                    success: true,
                    ...result
                });

            } catch (error) {

                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        }
    );


    /* POST MEMORY LEARN */

    router.post(
        "/learn",
        (req, res) => {

            try {

                const body =
                    req.body || {};

                const result =
                    finalMemoryLearnIfUseful(
                        body.userId,
                        body.question,
                        body.answer,
                        body.options || {}
                    );

                res.json({
                    success: true,
                    ...result
                });

            } catch (error) {

                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        }
    );


    /* POST MEMORY FEEDBACK */

    router.post(
        "/feedback",
        (req, res) => {

            try {

                const body =
                    req.body || {};

                const result =
                    finalMemoryFeedback(
                        body.id,
                        body.feedback || {}
                    );

                res.json({
                    success: true,
                    ...result
                });

            } catch (error) {

                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        }
    );


    /* GET USER MEMORY */

    router.get(
        "/user/:userId",
        (req, res) => {

            try {

                const result =
                    getUserMemory(
                        req.params.userId
                    );

                res.json({
                    success: true,
                    ...result
                });

            } catch (error) {

                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        }
    );


    /* POST MAINTENANCE */

    router.post(
        "/maintenance",
        (req, res) => {

            try {

                const result =
                    runFinalMemoryMaintenance(
                        req.body || {}
                    );

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
        }
    );


    return router;
}


/* ------------------------------------------------------------
   25. EXPRESS ATTACH HELPER
------------------------------------------------------------ */

function attachMemoryRoutes(
    app,
    prefix = "/api/memory"
) {
    if (
        !app ||
        typeof app.use !== "function"
    ) {
        return false;
    }

    if (
        typeof require !== "function"
    ) {
        return false;
    }

    try {

        const express =
            require("express");

        const router =
            createMemoryRoutes(
                express
            );

        if (!router) {
            return false;
        }

        app.use(
            prefix,
            router
        );

        return true;

    } catch (error) {

        console.warn(
            "[TürkAI Memory] Route attach:",
            error.message
        );

        return false;
    }
}


/* ------------------------------------------------------------
   26. SOCKET MEMORY BRIDGE
------------------------------------------------------------ */

function attachMemorySocket(
    io
) {
    if (
        !io ||
        typeof io.on !== "function"
    ) {
        return false;
    }

    try {

        io.on(
            "connection",
            socket => {

                socket.on(
                    "memory:search",
                    async payload => {

                        try {

                            const data =
                                payload || {};

                            const result =
                                await finalMemorySearch(
                                    data.userId,
                                    data.question,
                                    data.options || {}
                                );

                            socket.emit(
                                "memory:search:result",
                                result
                            );

                        } catch (error) {

                            socket.emit(
                                "memory:search:result",
                                {
                                    found: false,
                                    error:
                                        error.message
                                }
                            );
                        }
                    }
                );


                socket.on(
                    "memory:learn",
                    payload => {

                        try {

                            const data =
                                payload || {};

                            const result =
                                finalMemoryLearnIfUseful(
                                    data.userId,
                                    data.question,
                                    data.answer,
                                    data.options || {}
                                );

                            socket.emit(
                                "memory:learn:result",
                                result
                            );

                        } catch (error) {

                            socket.emit(
                                "memory:learn:result",
                                {
                                    learned: false,
                                    error:
                                        error.message
                                }
                            );
                        }
                    }
                );


                socket.on(
                    "memory:feedback",
                    payload => {

                        try {

                            const data =
                                payload || {};

                            const result =
                                finalMemoryFeedback(
                                    data.id,
                                    data.feedback || {}
                                );

                            socket.emit(
                                "memory:feedback:result",
                                result
                            );

                        } catch (error) {

                            socket.emit(
                                "memory:feedback:result",
                                {
                                    success: false,
                                    error:
                                        error.message
                                }
                            );
                        }
                    }
                );
            }
        );

        return true;

    } catch (error) {

        console.warn(
            "[TürkAI Memory] Socket attach:",
            error.message
        );

        return false;
    }
}


/* ------------------------------------------------------------
   27. SERVER INTEGRATION OBJECT
------------------------------------------------------------ */

const memoryServerIntegration = {

    initialize:
        initializeFinalMemory,

    search:
        finalMemorySearch,

    searchSync:
        finalMemorySearchSync,

    learn:
        finalMemoryLearn,

    learnIfUseful:
        finalMemoryLearnIfUseful,

    feedback:
        finalMemoryFeedback,

    chat:
        processChatMemory,

    stats:
        finalMemoryStats,

    health:
        getAdvancedMemoryHealth,

    maintenance:
        runFinalMemoryMaintenance,

    createRoutes:
        createMemoryRoutes,

    attachRoutes:
        attachMemoryRoutes,

    attachSocket:
        attachMemorySocket,

    userMemory:
        getUserMemory,

    clearUser:
        clearUserMemory,

    pin:
        finalPinMemory,

    unpin:
        finalUnpinMemory,

    archive:
        finalArchiveMemory,

    restore:
        finalRestoreMemory
};


/* ------------------------------------------------------------
   28. TURKAI MEMORY SERVICE
------------------------------------------------------------ */

const TurkAIMemoryService = {

    name:
        "TürkAI Answer Memory",

    version:
        FINAL_MEMORY_CONFIG.version,

    config:
        FINAL_MEMORY_CONFIG,

    state:
        finalMemoryState,

    initialize() {
        return initializeFinalMemory();
    },

    async search(
        userId,
        question,
        options
    ) {
        return finalMemorySearch(
            userId,
            question,
            options
        );
    },

    searchSync(
        userId,
        question,
        options
    ) {
        return finalMemorySearchSync(
            userId,
            question,
            options
        );
    },

    learn(
        userId,
        question,
        answer,
        options
    ) {
        return finalMemoryLearn(
            userId,
            question,
            answer,
            options
        );
    },

    learnIfUseful(
        userId,
        question,
        answer,
        options
    ) {
        return finalMemoryLearnIfUseful(
            userId,
            question,
            answer,
            options
        );
    },

    feedback(
        id,
        feedback
    ) {
        return finalMemoryFeedback(
            id,
            feedback
        );
    },

    chat(
        data
    ) {
        return processChatMemory(
            data
        );
    },

    stats() {
        return finalMemoryStats();
    },

    maintenance(
        options
    ) {
        return runFinalMemoryMaintenance(
            options
        );
    }
};


/* ------------------------------------------------------------
   29. FINAL GLOBAL BRIDGE
------------------------------------------------------------ */

if (
    typeof global !== "undefined"
) {

    global.TurkAIMemoryService =
        TurkAIMemoryService;

    global.memoryServerIntegration =
        memoryServerIntegration;

    global.processChatMemory =
        processChatMemory;

    global.searchTurkAIMemory =
        finalMemorySearch;

    global.learnTurkAIMemory =
        finalMemoryLearnIfUseful;
}


/* ------------------------------------------------------------
   30. FINAL AUTO SAVE
------------------------------------------------------------ */

let finalAutoSaveTimer =
    null;

function startFinalAutoSave() {

    if (
        finalAutoSaveTimer
    ) {
        return;
    }

    if (
        FINAL_MEMORY_CONFIG.autoSave !== true
    ) {
        return;
    }

    finalAutoSaveTimer =
        setInterval(
            () => {

                try {

                    if (
                        typeof answerMemory.save ===
                        "function"
                    ) {
                        answerMemory.save();
                    }

                    finalMemoryState.lastSave =
                        new Date().toISOString();

                } catch (error) {

                    finalMemoryState.errors++;

                    console.warn(
                        "[TürkAI Memory] Auto-save:",
                        error.message
                    );
                }

            },
            1000 * 60
        );

    if (
        finalAutoSaveTimer &&
        typeof finalAutoSaveTimer.unref ===
        "function"
    ) {
        finalAutoSaveTimer.unref();
    }
}


function stopFinalAutoSave() {

    if (
        finalAutoSaveTimer
    ) {

        clearInterval(
            finalAutoSaveTimer
        );

        finalAutoSaveTimer =
            null;
    }
}


/* ------------------------------------------------------------
   31. PROCESS SHUTDOWN SAVE
------------------------------------------------------------ */

function registerFinalShutdownHooks() {

    if (
        typeof process ===
        "undefined"
    ) {
        return;
    }

    const saveOnExit = () => {

        try {

            if (
                typeof answerMemory.save ===
                "function"
            ) {
                answerMemory.save();
            }

        } catch (_) {}

        stopFinalAutoSave();
        stopFinalMaintenanceTimer();
    };

    try {

        process.once(
            "SIGINT",
            () => {
                saveOnExit();
                process.exit(0);
            }
        );

    } catch (_) {}

    try {

        process.once(
            "SIGTERM",
            () => {
                saveOnExit();
                process.exit(0);
            }
        );

    } catch (_) {}

    try {

        process.once(
            "beforeExit",
            saveOnExit
        );

    } catch (_) {}
}


/* ------------------------------------------------------------
   32. FINAL INITIALIZATION
------------------------------------------------------------ */

try {

    initializeFinalMemory();

    startFinalAutoSave();

    startFinalMaintenanceTimer();

    registerFinalShutdownHooks();

} catch (error) {

    finalMemoryState.errors++;

    console.warn(
        "[TürkAI Memory] Final initialization:",
        error.message
    );
}


/* ------------------------------------------------------------
   33. FINAL EXPORTS
------------------------------------------------------------ */

module.exports = {

    ...module.exports,

    FINAL_MEMORY_CONFIG,

    finalMemoryState,

    initializeFinalMemory,

    memorySafeString,
    memoryUserId,
    memoryQuestion,
    memoryAnswer,

    isEligibleMemory,

    finalMemorySearch,
    finalMemorySearchSync,

    finalMemoryLearn,
    finalMemoryLearnIfUseful,

    finalMemoryFeedback,

    finalPinMemory,
    finalUnpinMemory,

    finalArchiveMemory,
    finalRestoreMemory,

    getUserMemory,
    clearUserMemory,

    finalMemoryStats,

    runFinalMemoryMaintenance,

    startFinalMaintenanceTimer,
    stopFinalMaintenanceTimer,

    processChatMemory,

    createMemoryRoutes,
    attachMemoryRoutes,
    attachMemorySocket,

    memoryServerIntegration,
    TurkAIMemoryService,

    startFinalAutoSave,
    stopFinalAutoSave
};


/* ------------------------------------------------------------
   34. FINAL READY MESSAGE
------------------------------------------------------------ */

try {

    const stats =
        finalMemoryStats();

    console.log(
        "============================================================"
    );

    console.log(
        " TURKAI ANSWER MEMORY ENGINE 5.0"
    );

    console.log(
        "============================================================"
    );

    console.log(
        ` Hafıza: ${stats.basic.count || stats.health?.memory?.total || 0}`
    );

    console.log(
        ` Kullanıcılar: ${stats.health?.users?.users || 0}`
    );

    console.log(
        ` Arama: ${stats.analytics?.total || 0}`
    );

    console.log(
        ` Hit rate: ${(
            Number(
                stats.analytics?.hitRate || 0
            ) * 100
        ).toFixed(1)}%`
    );

    console.log(
        " Smart Search: AKTİF"
    );

    console.log(
        " Auto Learn: AKTİF"
    );

    console.log(
        " Auto Save: AKTİF"
    );

    console.log(
        " Personalization: AKTİF"
    );

    console.log(
        " Confidence Engine: AKTİF"
    );

    console.log(
        " Context Engine: AKTİF"
    );

    console.log(
        "============================================================"
    );

} catch (error) {

    console.warn(
        "[TürkAI Memory] Ready message:",
        error.message
    );
}


/* ============================================================
   TÜRKAI ANSWER MEMORY ENGINE
   PART 5 / 5 — END
============================================================ */
