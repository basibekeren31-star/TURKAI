// ============================================================
// TÜRKAI — ANSWER MEMORY INTEGRATION LAYER
// server.js'ye bağlanacak sistem
// ============================================================

"use strict";

const path = require("path");


// ============================================================
// ANSWER MEMORY YÜKLE
// ============================================================

let answerMemory = null;

try {

    const loaded =
        require(
            path.join(
                __dirname,
                "answerMemory.js"
            )
        );

    answerMemory =
        loaded?.answerMemory ||
        loaded?.default ||
        loaded;

    if (
        answerMemory &&
        typeof answerMemory === "object"
    ) {

        console.log(
            "[AnswerMemory] Modül başarıyla yüklendi."
        );

    } else {

        console.error(
            "[AnswerMemory] Modül yüklenmiş fakat instance bulunamadı."
        );

    }

} catch (error) {

    console.error(
        "[AnswerMemory] Yükleme hatası:",
        error.message
    );

}


// ============================================================
// YARDIMCI
// ============================================================

function amSafeText(
    value,
    fallback = ""
) {

    try {

        return String(
            value ??
            fallback
        ).trim();

    } catch {

        return fallback;
    }
}


function amUserId(
    req
) {

    try {

        return amSafeText(
            req?.get?.("X-User-ID") ||
            req?.body?.userId ||
            req?.headers?.["x-user-id"] ||
            "anonymous"
        );

    } catch {

        return "anonymous";
    }
}


function amIsAvailable() {

    return Boolean(
        answerMemory &&
        typeof answerMemory ===
            "object"
    );
}


function amCall(
    method,
    ...args
) {

    if (
        !amIsAvailable()
    ) {
        return null;
    }

    if (
        typeof answerMemory[method] !==
        "function"
    ) {
        return null;
    }

    try {

        return answerMemory[
            method
        ](
            ...args
        );

    } catch (error) {

        console.error(
            "[AnswerMemory]",
            method,
            "HATASI:",
            error.message
        );

        return null;
    }
}


// ============================================================
// LOCAL CEVAP BUL
// ============================================================

function amFindLocalAnswer(
    message,
    userId,
    options = {}
) {

    const clean =
        amSafeText(
            message
        );

    if (
        !clean ||
        !amIsAvailable()
    ) {

        return {
            found: false,
            answer: null,
            source: "unavailable"
        };
    }


    // --------------------------------------------------------
    // 1. FINAL SEARCH
    // --------------------------------------------------------

    let result =
        amCall(
            "finalSearch",
            clean,
            {
                ...options,
                userId
            }
        );

    if (
        result &&
        result.found &&
        result.answer
    ) {

        return {
            ...result,

            found: true,

            answer:
                amSafeText(
                    result.answer
                )
        };
    }


    // --------------------------------------------------------
    // 2. SIMPLE ENGINE
    // --------------------------------------------------------

    result =
        amCall(
            "simpleEngine",
            clean,
            {
                ...options,
                userId
            }
        );

    if (
        result &&
        result.found &&
        (
            result.answer ||
            result.reply
        )
    ) {

        return {

            ...result,

            found: true,

            answer:
                amSafeText(
                    result.answer ||
                    result.reply
                ),

            source:
                result.source ||
                "simple-message"
        };
    }


    // --------------------------------------------------------
    // 3. MEMORY ENGINE
    // --------------------------------------------------------

    result =
        amCall(
            "memoryEngine",
            clean,
            {
                ...options,
                userId
            }
        );

    if (
        result &&
        result.found &&
        (
            result.answer ||
            result.reply
        )
    ) {

        return {

            ...result,

            found: true,

            answer:
                amSafeText(
                    result.answer ||
                    result.reply
                ),

            source:
                result.source ||
                "answer-memory"
        };
    }


    // --------------------------------------------------------
    // 4. KNOWLEDGE ENGINE
    // --------------------------------------------------------

    result =
        amCall(
            "knowledgeEngine",
            clean,
            {
                ...options,
                userId
            }
        );

    if (
        result &&
        result.found &&
        (
            result.answer ||
            result.reply
        )
    ) {

        return {

            ...result,

            found: true,

            answer:
                amSafeText(
                    result.answer ||
                    result.reply
                ),

            source:
                result.source ||
                "knowledge"
        };
    }


    return {

        found: false,

        answer: null,

        source:
            "not-found"
    };
}


// ============================================================
// ANSWER MEMORY ENTEGRASYONU
// ============================================================

function installAnswerMemoryIntegration(
    app
) {

    if (
        !app ||
        typeof app.use !==
            "function"
    ) {

        throw new Error(
            "Express app bulunamadı."
        );
    }


    // ========================================================
    // DOUBLE INSTALL KORUMASI
    // ========================================================

    if (
        app.__TURKAI_ANSWER_MEMORY_INSTALLED__
    ) {

        console.log(
            "[AnswerMemory] Integration zaten aktif."
        );

        return {
            ok: true,
            alreadyInstalled: true
        };
    }


    app.__TURKAI_ANSWER_MEMORY_INSTALLED__ =
        true;


    // ========================================================
    // CHAT MEMORY PREFLIGHT
    //
    // BU KISIM MEVCUT /api/chat ROUTE'UNDAN ÖNCE ÇALIŞMALI
    // ========================================================

    app.post(
        "/api/chat",
        async function (
            req,
            res,
            next
        ) {

            const started =
                Date.now();

            try {

                const message =
                    amSafeText(
                        req.body?.message
                    );

                const userId =
                    amUserId(
                        req
                    );


                // --------------------------------------------
                // BOŞ MESAJ
                // --------------------------------------------

                if (
                    !message
                ) {

                    return next();
                }


                // --------------------------------------------
                // ANSWER MEMORY LOCAL SEARCH
                // --------------------------------------------

                if (
                    amIsAvailable()
                ) {

                    const local =
                        amFindLocalAnswer(
                            message,
                            userId,
                            {
                                source:
                                    "server-chat"
                            }
                        );


                    // ----------------------------------------
                    // LOCAL CEVAP BULUNDU
                    // ----------------------------------------

                    if (
                        local &&
                        local.found &&
                        local.answer
                    ) {

                        const elapsed =
                            Date.now() -
                            started;

                        console.log(
                            "[AnswerMemory] LOCAL CEVAP:"
                        );

                        console.log(
                            "Soru:",
                            message
                        );

                        console.log(
                            "Cevap:",
                            local.answer
                        );

                        console.log(
                            "Kaynak:",
                            local.source
                        );

                        console.log(
                            "Süre:",
                            elapsed,
                            "ms"
                        );


                        // ------------------------------------
                        // USER MEMORY HIT
                        // ------------------------------------

                        try {

                            amCall(
                                "recordUserAnswerHit",
                                userId,
                                {
                                    question:
                                        message,

                                    answer:
                                        local.answer,

                                    recordId:
                                        local.record?.id ||
                                        local.item?.id ||
                                        "",

                                    score:
                                        local.score ||
                                        1,

                                    confidence:
                                        local.confidence ||
                                        local.score ||
                                        1,

                                    source:
                                        local.source ||
                                        "answer-memory"
                                },
                                {
                                    save:
                                        false
                                }
                            );

                        } catch {
                            // sessiz
                        }


                        // ------------------------------------
                        // USER MEMORY LOG
                        // ------------------------------------

                        try {

                            if (
                                typeof answerMemory?.learnFromUserMessage ===
                                "function"
                            ) {

                                answerMemory.learnFromUserMessage(
                                    userId,
                                    message,
                                    {
                                        source:
                                            "chat-local-hit",

                                        save:
                                            false
                                    }
                                );
                            }

                        } catch {
                            // sessiz
                        }


                        // ------------------------------------
                        // RESPONSE
                        // ------------------------------------

                        return res.json({

                            ok: true,

                            reply:
                                local.answer,

                            answer:
                                local.answer,

                            timeMs:
                                elapsed,

                            model:
                                "answer-memory",

                            source:
                                local.source ||
                                "answer-memory",

                            score:
                                local.score ||
                                1,

                            confidence:
                                local.confidence ||
                                local.score ||
                                1,

                            currentDate:
                                new Date()
                                    .toLocaleString(
                                        "tr-TR",
                                        {
                                            timeZone:
                                                "Europe/Istanbul"
                                        }
                                    ),

                            userMemory:
                                true,

                            memory:
                                true,

                            local:
                                true,

                            needsAI:
                                false,

                            needsResearch:
                                false,

                            userId,

                            researchUsed:
                                false,

                            sources:
                                [],

                            answerMemory:
                                true
                        });
                    }

                }


                // --------------------------------------------
                // LOCAL CEVAP YOKSA
                // MEVCUT GROQ / AI ROUTE'A DEVAM
                // --------------------------------------------

                return next();

            } catch (error) {

                console.error(
                    "[AnswerMemory] Chat preflight:",
                    error.message
                );

                return next();
            }
        }
    );


    // ========================================================
    // SMART CHAT
    // ========================================================

    app.post(
        "/api/chat/smart",
        async function (
            req,
            res
        ) {

            const started =
                Date.now();

            try {

                const message =
                    amSafeText(
                        req.body?.message ||
                        req.body?.question ||
                        req.body?.prompt
                    );

                const userId =
                    amUserId(
                        req
                    );


                if (
                    !message
                ) {

                    return res.status(
                        400
                    ).json({

                        ok: false,

                        reply:
                            "Lütfen bir mesaj yaz.",

                        found:
                            false
                    });
                }


                if (
                    !amIsAvailable()
                ) {

                    return res.status(
                        503
                    ).json({

                        ok: false,

                        reply:
                            "AnswerMemory şu anda kullanılamıyor.",

                        found:
                            false,

                        needsAI:
                            true
                    });
                }


                const result =
                    amFindLocalAnswer(
                        message,
                        userId,
                        {
                            source:
                                "chat-smart"
                        }
                    );


                if (
                    result &&
                    result.found &&
                    result.answer
                ) {

                    return res.json({

                        ok: true,

                        found: true,

                        reply:
                            result.answer,

                        answer:
                            result.answer,

                        source:
                            result.source ||
                            "answer-memory",

                        model:
                            "answer-memory",

                        score:
                            result.score ||
                            1,

                        confidence:
                            result.confidence ||
                            result.score ||
                            1,

                        memory: true,

                        local: true,

                        answerMemory: true,

                        needsAI: false,

                        needsResearch: false,

                        userId,

                        timeMs:
                            Date.now() -
                            started,

                        researchUsed:
                            false,

                        sources:
                            []
                    });
                }


                return res.status(
                    404
                ).json({

                    ok: false,

                    found: false,

                    reply:
                        null,

                    answer:
                        null,

                    source:
                        "not-found",

                    model:
                        null,

                    memory:
                        false,

                    local:
                        false,

                    answerMemory:
                        true,

                    needsAI:
                        true,

                    needsResearch:
                        false,

                    userId,

                    timeMs:
                        Date.now() -
                        started
                });

            } catch (error) {

                console.error(
                    "[AnswerMemory] /api/chat/smart:",
                    error.message
                );

                return res.status(
                    500
                ).json({

                    ok: false,

                    found: false,

                    reply:
                        "AnswerMemory işlenirken hata oluştu.",

                    error:
                        error.message
                });
            }
        }
    );


    // ========================================================
    // MEMORY SEARCH
    // ========================================================

    app.post(
        "/api/memory/search",
        async function (
            req,
            res
        ) {

            try {

                const query =
                    amSafeText(
                        req.body?.query ||
                        req.body?.question ||
                        req.body?.message
                    );

                const userId =
                    amUserId(
                        req
                    );


                if (
                    !query
                ) {

                    return res.status(
                        400
                    ).json({

                        ok: false,

                        error:
                            "query_required"
                    });
                }


                if (
                    !amIsAvailable()
                ) {

                    return res.status(
                        503
                    ).json({

                        ok: false,

                        error:
                            "answer_memory_unavailable"
                    });
                }


                let result =
                    amCall(
                        "handleMemorySearchRequest",
                        {
                            query,
                            question:
                                query,
                            userId
                        },
                        {
                            userId
                        }
                    );


                if (
                    !result
                ) {

                    result =
                        amCall(
                            "finalSearch",
                            query,
                            {
                                userId
                            }
                        );
                }


                return res.json({

                    ok: true,

                    query,

                    userId,

                    result:
                        result || null,

                    found:
                        Boolean(
                            result?.found
                        ),

                    answer:
                        result?.answer ||
                        result?.reply ||
                        null,

                    generatedAt:
                        new Date()
                            .toISOString()
                });

            } catch (error) {

                console.error(
                    "[AnswerMemory] /api/memory/search:",
                    error.message
                );

                return res.status(
                    500
                ).json({

                    ok: false,

                    error:
                        error.message
                });
            }
        }
    );


    // ========================================================
    // MEMORY SAVE
    // ========================================================

    app.post(
        "/api/memory/save",
        async function (
            req,
            res
        ) {

            try {

                const question =
                    amSafeText(
                        req.body?.question
                    );

                const answer =
                    amSafeText(
                        req.body?.answer ||
                        req.body?.reply
                    );

                const userId =
                    amUserId(
                        req
                    );


                if (
                    !question ||
                    !answer
                ) {

                    return res.status(
                        400
                    ).json({

                        ok: false,

                        error:
                            "question_and_answer_required"
                    });
                }


                if (
                    !amIsAvailable()
                ) {

                    return res.status(
                        503
                    ).json({

                        ok: false,

                        error:
                            "answer_memory_unavailable"
                    });
                }


                let result =
                    amCall(
                        "handleMemorySaveRequest",
                        {
                            question,
                            answer,
                            userId
                        },
                        {
                            userId,

                            source:
                                req.body?.source ||
                                "api"
                        }
                    );


                if (
                    !result
                ) {

                    result =
                        amCall(
                            "autoLearn",
                            question,
                            answer,
                            {
                                userId,

                                source:
                                    req.body?.source ||
                                    "api"
                            }
                        );
                }


                return res.json({

                    ok:
                        Boolean(
                            result?.ok ??
                            result?.saved ??
                            result?.updated ??
                            true
                        ),

                    question,

                    answer,

                    userId,

                    result:
                        result || null
                });

            } catch (error) {

                console.error(
                    "[AnswerMemory] /api/memory/save:",
                    error.message
                );

                return res.status(
                    500
                ).json({

                    ok: false,

                    error:
                        error.message
                });
            }
        }
    );


    // ========================================================
    // MEMORY STATUS
    // ========================================================

    app.get(
        "/api/memory/status",
        function (
            req,
            res
        ) {

            try {

                if (
                    !amIsAvailable()
                ) {

                    return res.json({

                        ok: false,

                        enabled: false,

                        ready: false,

                        message:
                            "AnswerMemory yüklenemedi."
                    });
                }


                let status =
                    amCall(
                        "getFinalStatus"
                    );


                if (
                    !status
                ) {

                    status = {

                        ok: true,

                        ready: true,

                        version:
                            "unknown"
                    };
                }


                return res.json({

                    ...status,

                    answerMemory:
                        true,

                    enabled:
                        true,

                    generatedAt:
                        new Date()
                            .toISOString()
                });

            } catch (error) {

                return res.status(
                    500
                ).json({

                    ok: false,

                    error:
                        error.message
                });
            }
        }
    );


    // ========================================================
    // MEMORY HEALTH
    // ========================================================

    app.get(
        "/api/memory/health",
        function (
            req,
            res
        ) {

            try {

                if (
                    !amIsAvailable()
                ) {

                    return res.json({

                        ok: false,

                        healthy: false,

                        answerMemory:
                            false
                    });
                }


                let health =
                    amCall(
                        "getSystemHealth"
                    );


                if (
                    !health
                ) {

                    health = {

                        ok: true,

                        healthy: true
                    };
                }


                return res.json({

                    ok:
                        health.ok !== false,

                    healthy:
                        health.healthy !== false,

                    answerMemory:
                        true,

                    health,

                    generatedAt:
                        new Date()
                            .toISOString()
                });

            } catch (error) {

                return res.status(
                    500
                ).json({

                    ok: false,

                    healthy: false,

                    error:
                        error.message
                });
            }
        }
    );


    // ========================================================
    // MEMORY COMMAND
    // ========================================================

    app.post(
        "/api/memory/command",
        function (
            req,
            res
        ) {

            try {

                const command =
                    amSafeText(
                        req.body?.command ||
                        req.body?.message
                    );

                const userId =
                    amUserId(
                        req
                    );


                if (
                    !command
                ) {

                    return res.status(
                        400
                    ).json({

                        ok: false,

                        error:
                            "command_required"
                    });
                }


                const result =
                    amCall(
                        "commandEngine",
                        command,
                        {
                            userId
                        }
                    ) ||
                    amCall(
                        "handleCommand",
                        command,
                        {
                            userId
                        }
                    );


                return res.json({

                    ok: true,

                    command,

                    userId,

                    result:
                        result || null
                });

            } catch (error) {

                return res.status(
                    500
                ).json({

                    ok: false,

                    error:
                        error.message
                });
            }
        }
    );


    // ========================================================
    // KNOWLEDGE SEARCH
    // ========================================================

    app.post(
        "/api/knowledge/search",
        function (
            req,
            res
        ) {

            try {

                const query =
                    amSafeText(
                        req.body?.query ||
                        req.body?.question ||
                        req.body?.message
                    );

                const userId =
                    amUserId(
                        req
                    );


                const result =
                    amCall(
                        "knowledgeEngine",
                        query,
                        {
                            userId
                        }
                    ) ||
                    amCall(
                        "findKnowledgeAnswer",
                        query,
                        {
                            userId
                        }
                    );


                return res.json({

                    ok: true,

                    query,

                    found:
                        Boolean(
                            result?.found
                        ),

                    answer:
                        result?.answer ||
                        result?.reply ||
                        null,

                    result:
                        result || null
                });

            } catch (error) {

                return res.status(
                    500
                ).json({

                    ok: false,

                    error:
                        error.message
                });
            }
        }
    );


    // ========================================================
    // KNOWLEDGE SAVE
    // ========================================================

    app.post(
        "/api/knowledge/save",
        function (
            req,
            res
        ) {

            try {

                const question =
                    amSafeText(
                        req.body?.question
                    );

                const answer =
                    amSafeText(
                        req.body?.answer ||
                        req.body?.reply
                    );


                let result =
                    amCall(
                        "saveKnowledgeItem",
                        question,
                        answer,
                        {
                            source:
                                req.body?.source ||
                                "api",

                            category:
                                req.body?.category ||
                                "general",

                            userId:
                                amUserId(req),

                            save:
                                true
                        }
                    );


                if (
                    !result
                ) {

                    result =
                        amCall(
                            "autoLearn",
                            question,
                            answer,
                            {
                                source:
                                    req.body?.source ||
                                    "knowledge-api",

                                userId:
                                    amUserId(req)
                            }
                        );
                }


                return res.json({

                    ok:
                        Boolean(
                            result?.ok ??
                            result?.saved ??
                            result?.updated ??
                            true
                        ),

                    question,

                    answer,

                    result:
                        result || null
                });

            } catch (error) {

                return res.status(
                    500
                ).json({

                    ok: false,

                    error:
                        error.message
                });
            }
        }
    );


    // ========================================================
    // SIMPLE MESSAGE SEARCH
    // ========================================================

    app.post(
        "/api/simple-message/search",
        function (
            req,
            res
        ) {

            try {

                const message =
                    amSafeText(
                        req.body?.message ||
                        req.body?.query ||
                        req.body?.question
                    );


                const result =
                    amCall(
                        "simpleEngine",
                        message,
                        {
                            userId:
                                amUserId(req)
                        }
                    ) ||
                    amCall(
                        "getSimpleResponse",
                        message,
                        {
                            userId:
                                amUserId(req)
                        }
                    );


                return res.json({

                    ok: true,

                    found:
                        Boolean(
                            result?.found
                        ),

                    message,

                    reply:
                        result?.answer ||
                        result?.reply ||
                        null,

                    answer:
                        result?.answer ||
                        result?.reply ||
                        null,

                    result:
                        result || null
                });

            } catch (error) {

                return res.status(
                    500
                ).json({

                    ok: false,

                    error:
                        error.message
                });
            }
        }
    );


    // ========================================================
    // SIMPLE MESSAGE SAVE
    // ========================================================

    app.post(
        "/api/simple-message/save",
        function (
            req,
            res
        ) {

            try {

                const message =
                    amSafeText(
                        req.body?.message ||
                        req.body?.question
                    );

                const answer =
                    amSafeText(
                        req.body?.answer ||
                        req.body?.reply
                    );


                const result =
                    amCall(
                        "setSimpleMessage",
                        message,
                        answer,
                        {
                            source:
                                req.body?.source ||
                                "api",

                            confidence:
                                1,

                            quality:
                                1,

                            save:
                                true
                        }
                    );


                return res.json({

                    ok:
                        Boolean(
                            result?.ok ??
                            result?.saved ??
                            true
                        ),

                    message,

                    answer,

                    result:
                        result || null
                });

            } catch (error) {

                return res.status(
                    500
                ).json({

                    ok: false,

                    error:
                        error.message
                });
            }
        }
    );


    // ========================================================
    // FINAL ANSWER MEMORY ROUTE
    // ========================================================

    app.post(
        "/api/answer-memory",
        function (
            req,
            res
        ) {

            try {

                const message =
                    amSafeText(
                        req.body?.message ||
                        req.body?.question
                    );

                const userId =
                    amUserId(
                        req
                    );


                if (
                    !message
                ) {

                    return res.status(
                        400
                    ).json({

                        ok: false,

                        reply:
                            "Lütfen bir soru yaz."
                    });
                }


                const result =
                    amCall(
                        "safeFinalAnswer",
                        message,
                        {
                            userId
                        }
                    );


                return res.json({

                    ok:
                        Boolean(
                            result?.ok !== false
                        ),

                    found:
                        Boolean(
                            result?.found
                        ),

                    reply:
                        result?.answer ||
                        result?.reply ||
                        null,

                    answer:
                        result?.answer ||
                        result?.reply ||
                        null,

                    source:
                        result?.source ||
                        "answer-memory",

                    score:
                        result?.score ||
                        0,

                    confidence:
                        result?.confidence ||
                        0,

                    memory:
                        Boolean(
                            result?.found
                        ),

                    answerMemory:
                        true,

                    needsAI:
                        Boolean(
                            result?.needsAI
                        ),

                    needsResearch:
                        Boolean(
                            result?.needsResearch
                        ),

                    userId
                });

            } catch (error) {

                return res.status(
                    500
                ).json({

                    ok: false,

                    reply:
                        "AnswerMemory hatası.",

                    error:
                        error.message
                });
            }
        }
    );


    // ========================================================
    // AI CEVAPLARINI OTOMATİK ÖĞREN
    //
    // BU GLOBAL MIDDLEWARE, MEVCUT /api/chat RESPONSE'UNU
    // YAKALAR VE AI'DAN GELEN NORMAL CEVABI HAFIZAYA KAYDEDER
    // ========================================================

    app.use(
        function (
            req,
            res,
            next
        ) {

            if (
                req.method !==
                    "POST" ||
                req.path !==
                    "/api/chat"
            ) {

                return next();
            }


            const originalJson =
                res.json.bind(
                    res
                );

            const question =
                amSafeText(
                    req.body?.message
                );

            const userId =
                amUserId(
                    req
                );


            res.json =
                function (
                    payload
                ) {

                    try {

                        const safePayload =
                            payload &&
                            typeof payload ===
                                "object"
                                ? payload
                                : null;


                        if (
                            safePayload &&
                            safePayload.ok === true &&
                            question &&
                            safePayload.reply &&
                            safePayload.model &&
                            safePayload.model !==
                                "answer-memory"
                        ) {

                            const reply =
                                amSafeText(
                                    safePayload.reply
                                );


                            if (
                                reply
                            ) {

                                setImmediate(
                                    function () {

                                        try {

                                            console.log(
                                                "[AnswerMemory] AI cevabı öğreniliyor..."
                                            );

                                            const learned =
                                                amCall(
                                                    "finalizeAIAnswer",
                                                    question,
                                                    reply,
                                                    {
                                                        userId,

                                                        source:
                                                            safePayload.model ||
                                                            "ai",

                                                        model:
                                                            safePayload.model ||
                                                            "ai",

                                                        score:
                                                            0.78,

                                                        confidence:
                                                            0.78,

                                                        researchUsed:
                                                            safePayload.researchUsed ===
                                                            true
                                                    }
                                                );


                                            if (
                                                learned
                                            ) {

                                                console.log(
                                                    "[AnswerMemory] AI cevabı hafızaya işlendi."
                                                );
                                            }

                                        } catch (learnError) {

                                            console.error(
                                                "[AnswerMemory] AI auto-learn:",
                                                learnError.message
                                            );
                                        }

                                    }
                                );
                            }
                        }

                    } catch (error) {

                        console.error(
                            "[AnswerMemory] response hook:",
                            error.message
                        );
                    }


                    return originalJson(
                        payload
                    );
                };


            return next();
        }
    );


    // ========================================================
    // GLOBAL ERROR-SAFE
    // ========================================================

    app.use(
        function (
            error,
            req,
            res,
            next
        ) {

            if (
                error
            ) {

                console.error(
                    "[AnswerMemory] GLOBAL:",
                    error.message
                );
            }

            if (
                res.headersSent
            ) {

                return next(
                    error
                );
            }

            return res.status(
                500
            ).json({

                ok: false,

                reply:
                    "AnswerMemory entegrasyonunda hata oluştu.",

                error:
                    error?.message ||
                    "Unknown error"
            });
        }
    );


    // ========================================================
    // LOG
    // ========================================================

    console.log(
        "[AnswerMemory] ========================================"
    );

    console.log(
        "[AnswerMemory] Server integration aktif."
    );

    console.log(
        "[AnswerMemory] /api/chat local memory: AKTİF"
    );

    console.log(
        "[AnswerMemory] /api/chat/smart: AKTİF"
    );

    console.log(
        "[AnswerMemory] /api/memory/search: AKTİF"
    );

    console.log(
        "[AnswerMemory] /api/memory/save: AKTİF"
    );

    console.log(
        "[AnswerMemory] /api/memory/status: AKTİF"
    );

    console.log(
        "[AnswerMemory] /api/memory/health: AKTİF"
    );

    console.log(
        "[AnswerMemory] /api/memory/command: AKTİF"
    );

    console.log(
        "[AnswerMemory] /api/knowledge/search: AKTİF"
    );

    console.log(
        "[AnswerMemory] /api/knowledge/save: AKTİF"
    );

    console.log(
        "[AnswerMemory] /api/simple-message/search: AKTİF"
    );

    console.log(
        "[AnswerMemory] AI auto-learning: AKTİF"
    );

    console.log(
        "[AnswerMemory] SLM/SELAM/MRB sistemi: AKTİF"
    );

    console.log(
        "[AnswerMemory] ========================================"
    );


    return {

        ok: true,

        answerMemory:
            amIsAvailable(),

        routes: [

            "/api/chat",

            "/api/chat/smart",

            "/api/memory/search",

            "/api/memory/save",

            "/api/memory/status",

            "/api/memory/health",

            "/api/memory/command",

            "/api/knowledge/search",

            "/api/knowledge/save",

            "/api/simple-message/search",

            "/api/simple-message/save",

            "/api/answer-memory"
        ]
    };
}


// ============================================================
// EXPORT
// ============================================================

module.exports = {

    answerMemory,

    installAnswerMemoryIntegration
};
