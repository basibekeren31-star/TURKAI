"use strict";

/* ============================================================
   TÜRKAI FRONTEND 40.0
   APP.JS — PART 1 / 3
   CORE + AUTH + ADMIN GATE + API + CHAT STATE
============================================================ */

(() => {
    /* ========================================================
       1.0 - GLOBAL CONFIG
    ======================================================== */

    const TURKAI_APP = {
        version: "40.0.0",
        name: "TürkAI",

        storage: {
            session:
                "turkai_session_v40",
            user:
                "turkai_user_v40",
            settings:
                "turkai_settings_v40",
            conversation:
                "turkai_conversation_v40",
            admin:
                "turkai_admin_v40",
            draft:
                "turkai_draft_v40"
        },

        endpoints: {
            chat:
                "/api/chat",

            smartChat:
                "/api/chat/smart",

            account:
                "/api/account",

            plans:
                "/api/plans",

            authMe:
                "/api/auth/me",

            login:
                "/api/auth/login",

            register:
                "/api/auth/register",

            logout:
                "/api/auth/logout",

            refresh:
                "/api/auth/refresh",

            health:
                "/api/health",

            systemStatus:
                "/api/system/status",

            memorySearch:
                "/api/memory/search",

            memorySave:
                "/api/memory/save",

            research:
                "/api/research",

            weather:
                "/api/weather",

            conversations:
                "/api/conversations",

            files:
                "/api/files",

            upload:
                "/api/files/upload",

            voiceTTS:
                "/api/voice/tts",

            voiceSTT:
                "/api/voice/stt",

            mediaImage:
                "/api/media/image",

            mediaVideo:
                "/api/media/video"
        },

        requestTimeout:
            60000,

        chatTimeout:
            120000,

        maxMessageLength:
            30000,

        maxHistory:
            200,

        defaultModel:
            "auto",

        defaultUser: {
            id:
                "guest",

            name:
                "TürkAI Kullanıcısı",

            plan:
                "free"
        }
    };


    /* ========================================================
       1.1 - STATE
    ======================================================== */

    const state = {
        initialized:
            false,

        connected:
            false,

        online:
            navigator.onLine !== false,

        loading:
            false,

        sending:
            false,

        researching:
            false,

        speaking:
            false,

        recording:
            false,

        authenticated:
            false,

        adminUnlocked:
            false,

        adminSession:
            null,

        user:
            null,

        sessionToken:
            null,

        refreshToken:
            null,

        conversationId:
            null,

        messages:
            [],

        conversations:
            [],

        draft:
            "",

        settings: {},

        currentModel:
            TURKAI_APP
                .defaultModel,

        abortController:
            null,

        speechRecognition:
            null,

        mediaRecorder:
            null,

        audioChunks:
            [],

        currentAudio:
            null,

        socket:
            null
    };


    /* ========================================================
       1.2 - DOM HELPER
    ======================================================== */

    const $ = (
        selector,
        root = document
    ) => {
        try {
            return root.querySelector(
                selector
            );
        } catch {
            return null;
        }
    };


    const $$ = (
        selector,
        root = document
    ) => {
        try {
            return [
                ...root.querySelectorAll(
                    selector
                )
            ];
        } catch {
            return [];
        }
    };


    const getElement = (
        id
    ) => {
        return document.getElementById(
            id
        );
    };


    /* ========================================================
       1.3 - SAFE JSON
    ======================================================== */

    function safeJSONParse(
        value,
        fallback = null
    ) {
        if (
            value ===
            null ||
            value ===
            undefined ||
            value ===
            ""
        ) {
            return fallback;
        }

        try {
            return JSON.parse(
                value
            );
        } catch {
            return fallback;
        }
    }


    function safeJSONStringify(
        value,
        fallback = "{}"
    ) {
        try {
            return JSON.stringify(
                value
            );
        } catch {
            return fallback;
        }
    }


    /* ========================================================
       1.4 - STORAGE
    ======================================================== */

    function storageGet(
        key,
        fallback = null
    ) {
        try {
            const value =
                localStorage.getItem(
                    key
                );

            if (
                value ===
                null
            ) {
                return fallback;
            }

            return safeJSONParse(
                value,
                fallback
            );
        } catch {
            return fallback;
        }
    }


    function storageSet(
        key,
        value
    ) {
        try {
            localStorage.setItem(
                key,
                safeJSONStringify(
                    value
                )
            );

            return true;
        } catch {
            return false;
        }
    }


    function storageRemove(
        key
    ) {
        try {
            localStorage.removeItem(
                key
            );

            return true;
        } catch {
            return false;
        }
    }


    /* ========================================================
       1.5 - TEXT HELPERS
    ======================================================== */

    function safeText(
        value,
        fallback = ""
    ) {
        if (
            value ===
            null ||
            value ===
            undefined
        ) {
            return fallback;
        }

        return String(
            value
        );
    }


    function escapeHTML(
        value
    ) {
        return safeText(
            value
        )
            .replaceAll(
                "&",
                "&amp;"
            )
            .replaceAll(
                "<",
                "&lt;"
            )
            .replaceAll(
                ">",
                "&gt;"
            )
            .replaceAll(
                '"',
                "&quot;"
            )
            .replaceAll(
                "'",
                "&#039;"
            );
    }


    function normalizeText(
        value
    ) {
        return safeText(
            value
        )
            .normalize(
                "NFKC"
            )
            .replace(
                /\s+/g,
                " "
            )
            .trim();
    }


    function createId(
        prefix = "turkai"
    ) {
        const random =
            Math.random()
                .toString(36)
                .slice(
                    2,
                    10
                );

        return (
            prefix +
            "_" +
            Date.now().toString(
                36
            ) +
            "_" +
            random
        );
    }


    /* ========================================================
       1.6 - TOAST
    ======================================================== */

    function showToast(
        message,
        type = "info",
        duration = 2800
    ) {
        const existing =
            getElement(
                "toast"
            );

        if (
            existing
        ) {
            existing.textContent =
                safeText(
                    message
                );

            existing.dataset.type =
                type;

            existing.classList.add(
                "active"
            );

            window.clearTimeout(
                existing._turkaiTimer
            );

            existing._turkaiTimer =
                window.setTimeout(
                    () => {
                        existing.classList.remove(
                            "active"
                        );
                    },
                    duration
                );

            return;
        }

        const stack =
            getElement(
                "toastStack"
            ) ||
            getElement(
                "toast-container"
            );

        const toast =
            document.createElement(
                "div"
            );

        toast.className =
            "toast active";

        toast.dataset.type =
            type;

        toast.textContent =
            safeText(
                message
            );

        if (
            stack
        ) {
            stack.appendChild(
                toast
            );
        } else {
            document.body.appendChild(
                toast
            );
        }

        window.setTimeout(
            () => {
                toast.classList.remove(
                    "active"
                );

                window.setTimeout(
                    () => {
                        toast.remove();
                    },
                    250
                );
            },
            duration
        );
    }


    /* ========================================================
       1.7 - BUTTON STATE
    ======================================================== */

    function setButtonLoading(
        button,
        loading,
        loadingText = "Bekleyin..."
    ) {
        if (
            !button
        ) {
            return;
        }

        if (
            loading
        ) {
            if (
                button.dataset
                    .originalHTML ===
                undefined
            ) {
                button.dataset
                    .originalHTML =
                    button.innerHTML;
            }

            button.disabled =
                true;

            button.classList.add(
                "loading"
            );

            button.textContent =
                loadingText;

            return;
        }

        button.disabled =
            false;

        button.classList.remove(
            "loading"
        );

        if (
            button.dataset
                .originalHTML !==
            undefined
        ) {
            button.innerHTML =
                button.dataset
                    .originalHTML;
        }
    }


    /* ========================================================
       1.8 - API REQUEST CORE
    ======================================================== */

    async function apiRequest(
        url,
        options = {}
    ) {
        const controller =
            new AbortController();

        const timeout =
            Number(
                options.timeout ||
                TURKAI_APP
                    .requestTimeout
            );

        const timer =
            window.setTimeout(
                () => {
                    controller.abort();
                },
                timeout
            );

        const headers = {
            Accept:
                "application/json",

            ...(options.body &&
            typeof options.body !==
                "string"
                ? {
                      "Content-Type":
                          "application/json"
                  }
                : {}),

            ...(options.headers ||
                {})
        };

        if (
            state.sessionToken
        ) {
            headers.Authorization =
                "Bearer " +
                state.sessionToken;
        }

        let response;

        try {
            response =
                await fetch(
                    url,
                    {
                        ...options,

                        headers,

                        signal:
                            controller.signal
                    }
                );
        } catch (
            error
        ) {
            if (
                error?.name ===
                "AbortError"
            ) {
                throw new Error(
                    "İstek zaman aşımına uğradı."
                );
            }

            throw new Error(
                "Sunucuya bağlanılamadı."
            );
        } finally {
            window.clearTimeout(
                timer
            );
        }

        const raw =
            await response.text();

        let data =
            safeJSONParse(
                raw,
                null
            );

        if (
            data ===
            null
        ) {
            data = {
                ok:
                    response.ok,

                raw
            };
        }

        if (
            response.status ===
                401 &&
            state.refreshToken
        ) {
            const refreshed =
                await tryRefreshToken();

            if (
                refreshed
            ) {
                return apiRequest(
                    url,
                    options
                );
            }
        }

        if (
            !response.ok
        ) {
            const error =
                new Error(
                    data?.message ||
                    data?.error ||
                    `HTTP ${response.status}`
                );

            error.status =
                response.status;

            error.data =
                data;

            throw error;
        }

        return {
            response,
            data
        };
    }


    /* ========================================================
       1.9 - REFRESH TOKEN
    ======================================================== */

    async function tryRefreshToken() {
        if (
            !state.refreshToken
        ) {
            return false;
        }

        try {
            const response =
                await fetch(
                    TURKAI_APP
                        .endpoints
                        .refresh,
                    {
                        method:
                            "POST",

                        headers: {
                            "Content-Type":
                                "application/json",

                            Accept:
                                "application/json"
                        },

                        body:
                            JSON.stringify(
                                {
                                    refreshToken:
                                        state.refreshToken
                                }
                            )
                    }
                );

            if (
                !response.ok
            ) {
                throw new Error(
                    "refresh_failed"
                );
            }

            const data =
                await response.json();

            const payload =
                data?.data ||
                data;

            state.sessionToken =
                payload?.accessToken ||
                payload?.token ||
                state.sessionToken;

            state.refreshToken =
                payload?.refreshToken ||
                state.refreshToken;

            saveSession();

            return Boolean(
                state.sessionToken
            );
        } catch {
            state.sessionToken =
                null;

            state.refreshToken =
                null;

            state.authenticated =
                false;

            saveSession();

            return false;
        }
    }


    /* ========================================================
       1.10 - SESSION
    ======================================================== */

    function saveSession() {
        storageSet(
            TURKAI_APP.storage.session,
            {
                accessToken:
                    state.sessionToken,

                refreshToken:
                    state.refreshToken,

                authenticated:
                    state.authenticated
            }
        );
    }


    function loadSession() {
        const saved =
            storageGet(
                TURKAI_APP.storage.session,
                {}
            );

        state.sessionToken =
            saved?.accessToken ||
            null;

        state.refreshToken =
            saved?.refreshToken ||
            null;

        state.authenticated =
            Boolean(
                saved?.authenticated &&
                state.sessionToken
            );
    }


    /* ========================================================
       1.11 - USER
    ======================================================== */

    function loadUser() {
        const saved =
            storageGet(
                TURKAI_APP.storage.user,
                null
            );

        if (
            saved &&
            typeof saved ===
                "object"
        ) {
            state.user =
                {
                    ...TURKAI_APP
                        .defaultUser,

                    ...saved
                };

            return state.user;
        }

        state.user =
            {
                ...TURKAI_APP
                    .defaultUser
            };

        return state.user;
    }


    function saveUser() {
        if (
            !state.user
        ) {
            return;
        }

        storageSet(
            TURKAI_APP.storage.user,
            state.user
        );
    }


    function getUserName() {
        return normalizeText(
            state.user?.name ||
            state.user?.displayName ||
            "TürkAI Kullanıcısı"
        );
    }


    function updateAccountUI() {
        const accountButton =
            getElement(
                "accountButton"
            );

        if (
            !accountButton
        ) {
            return;
        }

        const strong =
            accountButton.querySelector(
                "strong"
            );

        if (
            strong
        ) {
            strong.textContent =
                getUserName();
        }

        const avatar =
            accountButton.querySelector(
                ".account-avatar"
            );

        if (
            avatar
        ) {
            avatar.textContent =
                getUserName()
                    .charAt(
                        0
                    )
                    .toUpperCase();
        }

        const plan =
            accountButton.querySelector(
                "#accountPlanText"
            );

        if (
            plan
        ) {
            const currentPlan =
                state.user?.plan ||
                "free";

            plan.textContent =
                currentPlan
                    .toString()
                    .toUpperCase();
        }
    }


    /* ========================================================
       1.12 - MODAL CORE
    ======================================================== */

    function openModal(
        id
    ) {
        const modal =
            getElement(
                id
            );

        if (
            !modal
        ) {
            return false;
        }

        modal.classList.add(
            "active"
        );

        modal.setAttribute(
            "aria-hidden",
            "false"
        );

        return true;
    }


    function closeModal(
        id
    ) {
        const modal =
            getElement(
                id
            );

        if (
            !modal
        ) {
            return false;
        }

        modal.classList.remove(
            "active"
        );

        modal.setAttribute(
            "aria-hidden",
            "true"
        );

        return true;
    }


    function closeAllModals() {
        $$(".modal").forEach(
            modal => {
                modal.classList.remove(
                    "active"
                );

                modal.setAttribute(
                    "aria-hidden",
                    "true"
                );
            }
        );
    }


    /* ========================================================
       1.13 - LOGIN UI
    ======================================================== */

    function ensureLoginModal() {
        let modal =
            getElement(
                "turkaiLoginModal"
            );

        if (
            modal
        ) {
            return modal;
        }

        modal =
            document.createElement(
                "div"
            );

        modal.id =
            "turkaiLoginModal";

        modal.className =
            "modal";

        modal.setAttribute(
            "aria-hidden",
            "true"
        );

        modal.innerHTML = `
            <div class="modal-box small">
                <div class="modal-header">
                    <div>
                        <h2>TürkAI Hesabı</h2>
                        <p>Hesabına giriş yap</p>
                    </div>

                    <button
                        class="modal-close"
                        type="button"
                        data-turkai-close-login
                        aria-label="Kapat"
                    >
                        ×
                    </button>
                </div>

                <div class="turkai-login-content">

                    <label>
                        Kullanıcı adı
                    </label>

                    <input
                        id="turkaiLoginName"
                        type="text"
                        autocomplete="name"
                        placeholder="Adın"
                        maxlength="100"
                    >

                    <label>
                        E-posta
                    </label>

                    <input
                        id="turkaiLoginEmail"
                        type="email"
                        autocomplete="email"
                        placeholder="ornek@mail.com"
                        maxlength="200"
                    >

                    <label>
                        Şifre
                    </label>

                    <input
                        id="turkaiLoginPassword"
                        type="password"
                        autocomplete="current-password"
                        placeholder="Şifre"
                        maxlength="200"
                    >

                    <button
                        id="turkaiLoginSubmit"
                        class="primary-button"
                        type="button"
                    >
                        Giriş Yap
                    </button>

                    <button
                        id="turkaiGuestLogin"
                        class="secondary-button"
                        type="button"
                    >
                        Misafir Olarak Devam Et
                    </button>

                    <div
                        id="googleLoginButton"
                    ></div>

                    <small>
                        TürkAI hesabın cihazlar arasında
                        sohbet ve ayarlarını koruyabilir.
                    </small>

                </div>
            </div>
        `;

        document.body.appendChild(
            modal
        );

        return modal;
    }


    function openLogin() {
        const modal =
            ensureLoginModal();

        const nameInput =
            getElement(
                "turkaiLoginName"
            );

        const emailInput =
            getElement(
                "turkaiLoginEmail"
            );

        if (
            nameInput
        ) {
            nameInput.value =
                state.user?.name ===
                TURKAI_APP
                    .defaultUser
                    .name
                    ? ""
                    : state.user?.name ||
                      "";
        }

        if (
            emailInput
        ) {
            emailInput.value =
                state.user?.email ||
                "";
        }

        openModal(
            modal.id
        );
    }


    function completeGuestLogin(
        name
    ) {
        const finalName =
            normalizeText(
                name
            ) ||
            "TürkAI Kullanıcısı";

        state.user = {
            ...TURKAI_APP
                .defaultUser,

            id:
                "guest_" +
                createId(
                    "u"
                ),

            name:
                finalName,

            displayName:
                finalName,

            plan:
                "free",

            guest:
                true,

            loggedInAt:
                new Date()
                    .toISOString()
        };

        state.authenticated =
            true;

        state.sessionToken =
            null;

        state.refreshToken =
            null;

        saveUser();
        saveSession();
        updateAccountUI();

        closeModal(
            "turkaiLoginModal"
        );

        showToast(
            `${finalName}, TürkAI'ye hoş geldin.`,
            "success"
        );

        renderWelcome();
    }


    async function loginWithBackend() {
        const name =
            normalizeText(
                getElement(
                    "turkaiLoginName"
                )?.value
            );

        const email =
            normalizeText(
                getElement(
                    "turkaiLoginEmail"
                )?.value
            );

        const password =
            safeText(
                getElement(
                    "turkaiLoginPassword"
                )?.value
            );

        if (
            !email ||
            !password
        ) {
            showToast(
                "E-posta ve şifre gerekli.",
                "error"
            );

            return;
        }

        const button =
            getElement(
                "turkaiLoginSubmit"
            );

        setButtonLoading(
            button,
            true,
            "Giriş yapılıyor..."
        );

        try {
            const result =
                await apiRequest(
                    TURKAI_APP
                        .endpoints
                        .login,
                    {
                        method:
                            "POST",

                        body:
                            JSON.stringify(
                                {
                                    email,
                                    password,
                                    name
                                }
                            )
                    }
                );

            const data =
                result.data
                    ?.data ||
                result.data;

            state.sessionToken =
                data?.accessToken ||
                data?.token ||
                null;

            state.refreshToken =
                data?.refreshToken ||
                null;

            state.user =
                data?.user ||
                {
                    ...TURKAI_APP
                        .defaultUser,

                    id:
                        data?.userId ||
                        email,

                    name:
                        name ||
                        email
                };

            state.authenticated =
                true;

            saveSession();
            saveUser();
            updateAccountUI();

            closeModal(
                "turkaiLoginModal"
            );

            showToast(
                "Giriş başarılı.",
                "success"
            );

            renderWelcome();
        } catch (
            error
        ) {
            /*
            Backend login endpoint yoksa kullanıcıyı
            tamamen kilitlemiyoruz. Misafir modu yine
            kullanılabilir.
            */

            showToast(
                error?.message ||
                    "Giriş başarısız.",
                "error"
            );
        } finally {
            setButtonLoading(
                button,
                false
            );
        }
    }


    /* ========================================================
       1.14 - ADMIN GATE
    ======================================================== */

    /*
    ÖNEMLİ:
    Bu frontend'deki admin kapısı sadece UI kontrolüdür.
    Gerçek admin yetkisi backend tarafında doğrulanmalıdır.
    Şifreyi doğrudan JS içine sabitlemiyoruz.
    */

    const ADMIN_CONFIG = {
        unlockEndpoint:
            "/api/security/admin/unlock",

        stateKey:
            TURKAI_APP
                .storage
                .admin,

        maxAttempts:
            5,

        cooldownMs:
            5 * 60 * 1000
    };


    function loadAdminState() {
        const stored =
            storageGet(
                ADMIN_CONFIG.stateKey,
                {}
            );

        if (
            !stored ||
            typeof stored !==
                "object"
        ) {
            return;
        }

        const expires =
            Number(
                stored.expiresAt ||
                0
            );

        if (
            expires > Date.now()
        ) {
            state.adminUnlocked =
                true;

            state.adminSession =
                stored;

            return;
        }

        storageRemove(
            ADMIN_CONFIG.stateKey
        );

        state.adminUnlocked =
            false;

        state.adminSession =
            null;
    }


    function saveAdminState(
        payload
    ) {
        state.adminSession =
            payload;

        state.adminUnlocked =
            true;

        storageSet(
            ADMIN_CONFIG.stateKey,
            payload
        );
    }


    function createAdminModal() {
        let modal =
            getElement(
                "turkaiAdminUnlockModal"
            );

        if (
            modal
        ) {
            return modal;
        }

        modal =
            document.createElement(
                "div"
            );

        modal.id =
            "turkaiAdminUnlockModal";

        modal.className =
            "modal";

        modal.setAttribute(
            "aria-hidden",
            "true"
        );

        modal.innerHTML = `
            <div class="modal-box small">

                <div class="modal-header">

                    <div>
                        <h2>Yönetici Girişi</h2>
                        <p>Yönetim alanını aç</p>
                    </div>

                    <button
                        class="modal-close"
                        type="button"
                        data-turkai-close-admin
                    >
                        ×
                    </button>

                </div>

                <div class="turkai-admin-login">

                    <label>
                        Yönetici şifresi
                    </label>

                    <input
                        id="turkaiAdminPassword"
                        type="password"
                        autocomplete="off"
                        maxlength="256"
                        placeholder="Şifreyi gir"
                    >

                    <button
                        id="turkaiAdminUnlockButton"
                        class="primary-button"
                        type="button"
                    >
                        Yönetici Alanını Aç
                    </button>

                    <small>
                        Yönetici işlemleri sunucu tarafından
                        ayrıca doğrulanmalıdır.
                    </small>

                    <div
                        id="turkaiAdminMessage"
                    ></div>

                </div>

            </div>
        `;

        document.body.appendChild(
            modal
        );

        return modal;
    }


    async function unlockAdmin() {
        const input =
            getElement(
                "turkaiAdminPassword"
            );

        const message =
            getElement(
                "turkaiAdminMessage"
            );

        const button =
            getElement(
                "turkaiAdminUnlockButton"
            );

        const password =
            safeText(
                input?.value
            );

        if (
            !password
        ) {
            if (
                message
            ) {
                message.textContent =
                    "Şifre gerekli.";
            }

            return;
        }

        setButtonLoading(
            button,
            true,
            "Kontrol ediliyor..."
        );

        try {
            const result =
                await apiRequest(
                    ADMIN_CONFIG
                        .unlockEndpoint,
                    {
                        method:
                            "POST",

                        timeout:
                            15000,

                        body:
                            JSON.stringify(
                                {
                                    password
                                }
                            )
                    }
                );

            const data =
                result.data
                    ?.data ||
                result.data;

            /*
            Backend başarılıysa gelen token/session
            yalnızca admin UI için tutuluyor.
            */

            saveAdminState({
                unlockedAt:
                    Date.now(),

                expiresAt:
                    Date.now() +
                    (
                        1000 *
                        60 *
                        60 *
                        8
                    ),

                adminToken:
                    data?.adminToken ||
                    data?.token ||
                    null,

                role:
                    data?.role ||
                    "admin"
            });

            if (
                input
            ) {
                input.value =
                    "";
            }

            closeModal(
                "turkaiAdminUnlockModal"
            );

            showAdminPanel();

            showToast(
                "Yönetici alanı açıldı.",
                "success"
            );
        } catch (
            error
        ) {
            /*
            Backend endpoint mevcut değilse
            admin kapısını açmıyoruz.
            Böylece frontend üzerinde yazılan
            rastgele bir değer gerçek yetki
            vermez.
            */

            if (
                message
            ) {
                message.textContent =
                    error?.message ||
                    "Yönetici doğrulaması başarısız.";
            }

            showToast(
                "Yönetici doğrulaması başarısız.",
                "error"
            );
        } finally {
            setButtonLoading(
                button,
                false
            );
        }
    }


    function showAdminPanel() {
        /*
        Mevcut bir admin paneli varsa göster.
        Yoksa güvenli şekilde küçük bir panel
        oluşturuyoruz.
        */

        let panel =
            getElement(
                "turkaiAdminPanel"
            );

        if (
            !panel
        ) {
            panel =
                document.createElement(
                    "section"
                );

            panel.id =
                "turkaiAdminPanel";

            panel.className =
                "turkai-admin-panel";

            panel.innerHTML = `
                <div class="turkai-admin-panel-inner">

                    <div class="turkai-admin-header">
                        <div>
                            <strong>
                                TürkAI Yönetim Merkezi
                            </strong>

                            <small>
                                Yönetici oturumu aktif
                            </small>
                        </div>

                        <button
                            type="button"
                            id="turkaiAdminLogout"
                            class="secondary-button"
                        >
                            Yönetici Oturumunu Kapat
                        </button>
                    </div>

                    <div class="turkai-admin-grid">

                        <button
                            type="button"
                            data-admin-action="system"
                        >
                            Sistem Durumu
                        </button>

                        <button
                            type="button"
                            data-admin-action="users"
                        >
                            Kullanıcılar
                        </button>

                        <button
                            type="button"
                            data-admin-action="memory"
                        >
                            Cevap Hafızası
                        </button>

                        <button
                            type="button"
                            data-admin-action="logs"
                        >
                            Loglar
                        </button>

                    </div>

                    <div
                        id="turkaiAdminOutput"
                    ></div>

                </div>
            `;

            /*
            Sidebar'a veya body'ye ekle.
            */

            const sidebar =
                document.querySelector(
                    ".sidebar"
                );

            (
                sidebar ||
                document.body
            ).appendChild(
                panel
            );
        }

        panel.classList.add(
            "active"
        );

        const output =
            getElement(
                "turkaiAdminOutput"
            );

        if (
            output
        ) {
            output.innerHTML = `
                <div class="admin-status-card">
                    <strong>Admin hazır</strong>
                    <span>
                        Yönetici API işlemleri
                        backend doğrulamasından geçer.
                    </span>
                </div>
            `;
        }
    }


    function closeAdminPanel() {
        state.adminUnlocked =
            false;

        state.adminSession =
            null;

        storageRemove(
            ADMIN_CONFIG.stateKey
        );

        const panel =
            getElement(
                "turkaiAdminPanel"
            );

        if (
            panel
        ) {
            panel.classList.remove(
                "active"
            );
        }

        showToast(
            "Yönetici oturumu kapatıldı.",
            "info"
        );
    }


    function openAdminUnlock() {
        if (
            state.adminUnlocked
        ) {
            showAdminPanel();

            return;
        }

        const modal =
            createAdminModal();

        openModal(
            modal.id
        );

        window.setTimeout(
            () => {
                getElement(
                    "turkaiAdminPassword"
                )?.focus();
            },
            50
        );
    }


    /* ========================================================
       1.15 - WELCOME
    ======================================================== */

    function renderWelcome() {
        const welcome =
            getElement(
                "welcome"
            );

        if (
            !welcome
        ) {
            return;
        }

        const possibleName =
            welcome.querySelector(
                "[data-user-name]"
            );

        if (
            possibleName
        ) {
            possibleName.textContent =
                getUserName();
        }

        const heading =
            welcome.querySelector(
                "h1,h2"
            );

        if (
            heading &&
            !heading.dataset
                .turkaiOriginal
        ) {
            heading.dataset
                .turkaiOriginal =
                heading.textContent;
        }

        /*
        Var olan tasarımı bozmayalım.
        Sadece kullanıcı adı için açık bir
        placeholder varsa değiştir.
        */

        welcome.dataset.user =
            getUserName();
    }


    /* ========================================================
       1.16 - CHAT MESSAGE STATE
    ======================================================== */

    function saveConversationState() {
        storageSet(
            TURKAI_APP
                .storage
                .conversation,
            {
                id:
                    state.conversationId,

                messages:
                    state.messages.slice(
                        -TURKAI_APP
                            .maxHistory
                    )
            }
        );
    }


    function loadConversationState() {
        const saved =
            storageGet(
                TURKAI_APP
                    .storage
                    .conversation,
                {}
            );

        state.conversationId =
            saved?.id ||
            null;

        state.messages =
            Array.isArray(
                saved?.messages
            )
                ? saved.messages
                : [];
    }


    function addMessage(
        role,
        content,
        extra = {}
    ) {
        const message = {
            id:
                extra.id ||
                createId(
                    "msg"
                ),

            role:

                role ===
                "assistant"
                    ? "assistant"
                    : "user",

            content:
                safeText(
                    content
                ),

            createdAt:
                extra.createdAt ||
                new Date()
                    .toISOString(),

            model:
                extra.model ||
                null,

            sources:
                Array.isArray(
                    extra.sources
                )
                    ? extra.sources
                    : [],

            metadata:
                extra.metadata ||
                {}
        };

        state.messages.push(
            message
        );

        if (
            state.messages.length >
            TURKAI_APP
                .maxHistory
        ) {
            state.messages =
                state.messages.slice(
                    -TURKAI_APP
                        .maxHistory
                );
        }

        saveConversationState();

        return message;
    }


    function clearMessages() {
        state.messages =
            [];

        state.conversationId =
            null;

        saveConversationState();

        const container =
            getMessageContainer();

        if (
            container
        ) {
            container.innerHTML =
                "";
        }

        renderWelcome();
    }


    function getMessageContainer() {
        return (
            getElement(
                "messages"
            ) ||
            getElement(
                "chatMessages"
            ) ||
            $(
                ".messages"
            ) ||
            $(
                ".chat-messages"
            )
        );
    }


    /* ========================================================
       1.17 - MARKDOWN-LITE RENDERER
    ======================================================== */

    function renderText(
        text
    ) {
        let value =
            escapeHTML(
                text
            );

        value =
            value.replace(
                /```([\s\S]*?)```/g,
                (
                    _,
                    code
                ) =>
                    `<pre class="code-block"><code>${code}</code></pre>`
            );

        value =
            value.replace(
                /\*\*(.*?)\*\*/g,
                "<strong>$1</strong>"
            );

        value =
            value.replace(
                /\*(.*?)\*/g,
                "<em>$1</em>"
            );

        value =
            value.replace(
                /`([^`]+)`/g,
                "<code>$1</code>"
            );

        value =
            value.replace(
                /\n/g,
                "<br>"
            );

        return value;
    }


    function renderMessage(
        message
    ) {
        const wrapper =
            document.createElement(
                "div"
            );

        wrapper.className =
            "message " +
            (
                message.role ===
                "assistant"
                    ? "assistant-message"
                    : "user-message"
            );

        wrapper.dataset.messageId =
            message.id;

        const content =
            renderText(
                message.content
            );

        wrapper.innerHTML = `
            <div class="message-inner">
                <div class="message-role">
                    ${
                        message.role ===
                        "assistant"
                            ? "TürkAI"
                            : escapeHTML(
                                  getUserName()
                              )
                    }
                </div>

                <div class="message-content">
                    ${content}
                </div>
            </div>
        `;

        return wrapper;
    }


    function renderMessages() {
        const container =
            getMessageContainer();

        if (
            !container
        ) {
            return;
        }

        container.innerHTML =
            "";

        for (
            const message
            of state.messages
        ) {
            container.appendChild(
                renderMessage(
                    message
                )
            );
        }

        container.scrollTop =
            container.scrollHeight;
    }


    /* ========================================================
       1.18 - SEND CHAT
    ======================================================== */

    async function sendMessage(
        text = null
    ) {
        if (
            state.sending
        ) {
            return;
        }

        const input =
            getElement(
                "messageInput"
            );

        const value =
            normalizeText(
                text ??
                input?.value
            );

        if (
            !value
        ) {
            return;
        }

        if (
            value.length >
            TURKAI_APP
                .maxMessageLength
        ) {
            showToast(
                "Mesaj çok uzun.",
                "error"
            );

            return;
        }

        state.sending =
            true;

        state.loading =
            true;

        const sendButton =
            getElement(
                "sendButton"
            );

        setButtonLoading(
            sendButton,
            true,
            "..."
        );

        if (
            input &&
            text ===
                null
        ) {
            input.value =
                "";
        }

        const userMessage =
            addMessage(
                "user",
                value
            );

        renderMessages();

        state.abortController =
            new AbortController();

        try {
            const result =
                await apiRequest(
                    TURKAI_APP
                        .endpoints
                        .smartChat,
                    {
                        method:
                            "POST",

                        timeout:
                            TURKAI_APP
                                .chatTimeout,

                        signal:
                            state.abortController
                                .signal,

                        body:
                            JSON.stringify(
                                {
                                    message:
                                        value,

                                    question:
                                        value,

                                    conversationId:
                                        state.conversationId,

                                    sessionId:
                                        state.sessionToken ||
                                        null,

                                    userId:
                                        state.user
                                            ?.id ||
                                        "guest",

                                    userName:
                                        getUserName(),

                                    model:
                                        state.currentModel
                                }
                            )
                    }
                );

            const data =
                result.data
                    ?.data ||
                result.data ||
                {};

            const answer =
                data.answer ||
                data.response ||
                data.message ||
                data.text ||
                "TürkAI cevap üretemedi.";

            state.conversationId =
                data.conversationId ||
                data.sessionId ||
                state.conversationId;

            addMessage(
                "assistant",
                answer,
                {
                    model:
                        data.model ||
                        state.currentModel,

                    sources:
                        data.sources ||
                        [],

                    metadata:
                        data
                }
            );

            renderMessages();
        } catch (
            error
        ) {
            if (
                error?.name ===
                "AbortError"
            ) {
                showToast(
                    "Mesaj durduruldu.",
                    "info"
                );
            } else {
                addMessage(
                    "assistant",
                    "Bağlantı hatası: " +
                        (
                            error?.message ||
                            "Bilinmeyen hata"
                        )
                );

                renderMessages();

                showToast(
                    error?.message ||
                        "TürkAI sunucusuna bağlanılamadı.",
                    "error"
                );
            }
        } finally {
            state.sending =
                false;

            state.loading =
                false;

            state.abortController =
                null;

            setButtonLoading(
                sendButton,
                false
            );
        }
    }


    /* ========================================================
       1.19 - STOP CHAT
    ======================================================== */

    function stopMessage() {
        if (
            state.abortController
        ) {
            state.abortController.abort();
        }

        state.sending =
            false;

        state.loading =
            false;
    }


    /* ========================================================
       1.20 - SYSTEM STATUS
    ======================================================== */

    async function checkServer() {
        try {
            const result =
                await apiRequest(
                    TURKAI_APP
                        .endpoints
                        .systemStatus,
                    {
                        method:
                            "GET",

                        timeout:
                            10000
                    }
                );

            state.connected =
                Boolean(
                    result.data
                        ?.ok ||
                    result.data
                        ?.status ===
                        "ready"
                );

            updateConnectionUI();

            return result.data;
        } catch {
            state.connected =
                false;

            updateConnectionUI();

            return null;
        }
    }


    function updateConnectionUI() {
        const indicators =
            [
                getElement(
                    "connectionStatus"
                ),

                getElement(
                    "statusText"
                ),

                $(
                    ".connection-status"
                )
            ].filter(
                Boolean
            );

        const text =
            state.connected
                ? "Bağlı"
                : "Bağlantı yok";

        for (
            const indicator
            of indicators
        ) {
            indicator.textContent =
                text;

            indicator.dataset.state =
                state.connected
                    ? "online"
                    : "offline";
        }
    }


    /* ========================================================
       1.21 - MODAL EVENTS
    ======================================================== */

    function bindModalEvents() {
        document.addEventListener(
            "click",
            event => {
                const close =
                    event.target.closest(
                        "[data-close]"
                    );

                if (
                    close
                ) {
                    const id =
                        close.dataset
                            .close;

                    if (
                        id
                    ) {
                        closeModal(
                            id
                        );
                    }
                }

                if (
                    event.target.closest(
                        "[data-turkai-close-login]"
                    )
                ) {
                    closeModal(
                        "turkaiLoginModal"
                    );
                }

                if (
                    event.target.closest(
                        "[data-turkai-close-admin]"
                    )
                ) {
                    closeModal(
                        "turkaiAdminUnlockModal"
                    );
                }

                if (
                    event.target.classList.contains(
                        "modal"
                    )
                ) {
                    event.target.classList.remove(
                        "active"
                    );
                }
            }
        );
    }


    /* ========================================================
       1.22 - ACCOUNT BUTTON
    ======================================================== */

    function bindAccountButton() {
        const button =
            getElement(
                "accountButton"
            );

        if (
            !button ||
            button.dataset
                .turkaiBound ===
                "1"
        ) {
            return;
        }

        button.dataset
            .turkaiBound =
            "1";

        button.addEventListener(
            "click",
            () => {
                openLogin();
            }
        );
    }


    /* ========================================================
       1.23 - LOGIN BUTTONS
    ======================================================== */

    function bindLoginEvents() {
        document.addEventListener(
            "click",
            event => {
                if (
                    event.target.id ===
                    "turkaiLoginSubmit"
                ) {
                    loginWithBackend();
                }

                if (
                    event.target.id ===
                    "turkaiGuestLogin"
                ) {
                    completeGuestLogin(
                        getElement(
                            "turkaiLoginName"
                        )?.value
                    );
                }

                if (
                    event.target.id ===
                    "turkaiAdminUnlockButton"
                ) {
                    unlockAdmin();
                }

                if (
                    event.target.id ===
                    "turkaiAdminLogout"
                ) {
                    closeAdminPanel();
                }
            }
        );

        document.addEventListener(
            "keydown",
            event => {
                const active =
                    document
                        .activeElement;

                if (
                    active?.id ===
                    "turkaiLoginPassword" &&
                    event.key ===
                    "Enter"
                ) {
                    loginWithBackend();
                }

                if (
                    active?.id ===
                    "turkaiAdminPassword" &&
                    event.key ===
                    "Enter"
                ) {
                    unlockAdmin();
                }
            }
        );
    }


    /* ========================================================
       1.24 - ADMIN SHORTCUT
    ======================================================== */

    function bindAdminShortcut() {
        /*
        Admin modalı açan görünür bir buton yoksa
        Ctrl + Shift + A kullanılabilir.
        Bu yalnızca UI kapısını açar.
        */

        document.addEventListener(
            "keydown",
            event => {
                if (
                    event.ctrlKey &&
                    event.shiftKey &&
                    event.key
                        .toLowerCase() ===
                        "a"
                ) {
                    event.preventDefault();

                    openAdminUnlock();
                }
            }
        );
    }


    /* ========================================================
       1.25 - SEND BUTTON
    ======================================================== */

    function bindSendButton() {
        const button =
            getElement(
                "sendButton"
            );

        if (
            !button ||
            button.dataset
                .turkaiBound ===
            "1"
        ) {
            return;
        }

        button.dataset
            .turkaiBound =
            "1";

        button.addEventListener(
            "click",
            () => {
                sendMessage();
            }
        );
    }


    /* ========================================================
       1.26 - MESSAGE INPUT
    ======================================================== */

    function bindMessageInput() {
        const input =
            getElement(
                "messageInput"
            );

        if (
            !input ||
            input.dataset
                .turkaiBound ===
            "1"
        ) {
            return;
        }

        input.dataset
            .turkaiBound =
            "1";

        input.addEventListener(
            "keydown",
            event => {
                if (
                    event.key ===
                    "Enter" &&
                    !event.shiftKey
                ) {
                    event.preventDefault();

                    sendMessage();
                }
            }
        );

        input.addEventListener(
            "input",
            () => {
                state.draft =
                    input.value;

                storageSet(
                    TURKAI_APP
                        .storage
                        .draft,
                    {
                        value:
                            input.value,

                        savedAt:
                            Date.now()
                    }
                );
            }
        );
    }


    /* ========================================================
       1.27 - CLEAR CHAT
    ======================================================== */

    function bindClearChat() {
        const button =
            getElement(
                "clearChatButton"
            );

        if (
            !button ||
            button.dataset
                .turkaiBound ===
            "1"
        ) {
            return;
        }

        button.dataset
            .turkaiBound =
            "1";

        button.addEventListener(
            "click",
            () => {
                clearMessages();

                showToast(
                    "Sohbet temizlendi.",
                    "success"
                );
            }
        );
    }


    /* ========================================================
       1.28 - SEARCH
    ======================================================== */

    function bindSearchButton() {
        const button =
            getElement(
                "searchButton"
            );

        if (
            !button ||
            button.dataset
                .turkaiBound ===
            "1"
        ) {
            return;
        }

        button.dataset
            .turkaiBound =
            "1";

        button.addEventListener(
            "click",
            () => {
                openModal(
                    "searchModal"
                );

                getElement(
                    "chatSearchInput"
                )?.focus();
            }
        );
    }


    /* ========================================================
       1.29 - SETTINGS
    ======================================================== */

    function bindSettingsButton() {
        const button =
            getElement(
                "settingsButton"
            );

        if (
            !button ||
            button.dataset
                .turkaiBound ===
            "1"
        ) {
            return;
        }

        button.dataset
            .turkaiBound =
            "1";

        button.addEventListener(
            "click",
            () => {
                openModal(
                    "settingsModal"
                );
            }
        );
    }


    /* ========================================================
       1.30 - ADMIN EXISTING BUTTONS
    ======================================================== */

    function bindExistingAdminButtons() {
        $$(
            "[data-admin-open], #adminButton, #adminPanelButton"
        ).forEach(
            button => {
                if (
                    button.dataset
                        .turkaiBound ===
                    "1"
                ) {
                    return;
                }

                button.dataset
                    .turkaiBound =
                    "1";

                button.addEventListener(
                    "click",
                    () => {
                        openAdminUnlock();
                    }
                );
            }
        );
    }


    /* ========================================================
       1.31 - DRAFT LOAD
    ======================================================== */

    function loadDraft() {
        const saved =
            storageGet(
                TURKAI_APP
                    .storage
                    .draft,
                null
            );

        if (
            !saved?.value
        ) {
            return;
        }

        const input =
            getElement(
                "messageInput"
            );

        if (
            input &&
            !input.value
        ) {
            input.value =
                safeText(
                    saved.value
                );

            state.draft =
                input.value;
        }
    }


    /* ========================================================
       1.32 - INITIALIZE
    ======================================================== */

    function initCore() {
        if (
            state.initialized
        ) {
            return;
        }

        loadSession();
        loadUser();
        loadAdminState();
        loadConversationState();

        ensureLoginModal();

        bindModalEvents();
        bindAccountButton();
        bindLoginEvents();
        bindAdminShortcut();
        bindSendButton();
        bindMessageInput();
        bindClearChat();
        bindSearchButton();
        bindSettingsButton();
        bindExistingAdminButtons();

        loadDraft();
        updateAccountUI();
        renderWelcome();
        renderMessages();

        state.initialized =
            true;

        window.setTimeout(
            () => {
                checkServer();
            },
            300
        );

        console.log(
            "TürkAI app.js Part 1/3 hazır."
        );
    }


    /* ========================================================
       1.33 - PUBLIC API
    ======================================================== */

    window.TURKAI =
        window.TURKAI || {};

    Object.assign(
        window.TURKAI,
        {
            app:
                TURKAI_APP,

            state,

            send:
                sendMessage,

            stop:
                stopMessage,

            login:
                openLogin,

            admin:
                openAdminUnlock,

            closeAdmin:
                closeAdminPanel,

            toast:
                showToast,

            api:
                apiRequest,

            clearChat:
                clearMessages,

            refreshStatus:
                checkServer
        }
    );


    /* ========================================================
       1.34 - DOM READY
    ======================================================== */

    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            initCore,
            {
                once: true
            }
        );
    } else {
        initCore();
    }

})();
/* ============================================================
   TÜRKAI FRONTEND ENGINE 40.0
   APP.JS — PART 2 / 3
   RESEARCH + WEATHER + MEMORY + FILES
   VOICE + IMAGE + VIDEO + PLANS + CONVERSATIONS
   SOCKET BRIDGE + ACCOUNT + REAL UI ACTIONS
============================================================ */

(() => {
    "use strict";

    /* ========================================================
       2.0 - EXISTING CORE
    ======================================================== */

    const CORE =
        window.TURKAI || {};

    const state =
        CORE.state || {
            user: null,
            messages: [],
            conversationId: null,
            currentModel: "auto",
            sessionToken: null,
            socket: null
        };

    const app =
        CORE.app || {
            endpoints: {}
        };

    const endpoints = {
        research:
            app.endpoints?.research ||
            "/api/research",

        weather:
            app.endpoints?.weather ||
            "/api/weather",

        memorySearch:
            app.endpoints?.memorySearch ||
            "/api/memory/search",

        memorySave:
            app.endpoints?.memorySave ||
            "/api/memory/save",

        conversations:
            app.endpoints?.conversations ||
            "/api/conversations",

        files:
            app.endpoints?.files ||
            "/api/files",

        upload:
            app.endpoints?.upload ||
            "/api/files/upload",

        voiceTTS:
            app.endpoints?.voiceTTS ||
            "/api/voice/tts",

        voiceSTT:
            app.endpoints?.voiceSTT ||
            "/api/voice/stt",

        mediaImage:
            app.endpoints?.mediaImage ||
            "/api/media/image",

        mediaVideo:
            app.endpoints?.mediaVideo ||
            "/api/media/video",

        account:
            app.endpoints?.account ||
            "/api/account",

        plans:
            app.endpoints?.plans ||
            "/api/plans",

        authMe:
            app.endpoints?.authMe ||
            "/api/auth/me",

        googleAuth:
            "/api/auth/google",

        usage:
            "/api/usage",

        notifications:
            "/api/notifications",

        events:
            "/api/events"
    };


    /* ========================================================
       2.1 - DOM
    ======================================================== */

    const $ = (
        selector,
        root = document
    ) => {
        try {
            return root.querySelector(
                selector
            );
        } catch {
            return null;
        }
    };

    const $$ = (
        selector,
        root = document
    ) => {
        try {
            return [
                ...root.querySelectorAll(
                    selector
                )
            ];
        } catch {
            return [];
        }
    };

    const id = name =>
        document.getElementById(
            name
        );


    /* ========================================================
       2.2 - SAFE HELPERS
    ======================================================== */

    function text(
        value,
        fallback = ""
    ) {
        if (
            value ===
                null ||
            value ===
                undefined
        ) {
            return fallback;
        }

        return String(
            value
        );
    }


    function cleanText(
        value
    ) {
        return text(
            value
        )
            .replace(
                /\r\n/g,
                "\n"
            )
            .replace(
                /\r/g,
                "\n"
            )
            .trim();
    }


    function escapeHTML(
        value
    ) {
        return text(
            value
        )
            .replaceAll(
                "&",
                "&amp;"
            )
            .replaceAll(
                "<",
                "&lt;"
            )
            .replaceAll(
                ">",
                "&gt;"
            )
            .replaceAll(
                '"',
                "&quot;"
            )
            .replaceAll(
                "'",
                "&#039;"
            );
    }


    function json(
        value
    ) {
        try {
            return JSON.stringify(
                value
            );
        } catch {
            return "{}";
        }
    }


    function parseJSON(
        value,
        fallback = null
    ) {
        try {
            return JSON.parse(
                value
            );
        } catch {
            return fallback;
        }
    }


    function notify(
        message,
        type = "info"
    ) {
        if (
            typeof CORE.toast ===
            "function"
        ) {
            CORE.toast(
                message,
                type
            );

            return;
        }

        const toast =
            id("toast");

        if (
            toast
        ) {
            toast.textContent =
                text(
                    message
                );

            toast.dataset.type =
                type;

            toast.classList.add(
                "active"
            );

            window.clearTimeout(
                toast._turkaiTimer
            );

            toast._turkaiTimer =
                window.setTimeout(
                    () => {
                        toast.classList.remove(
                            "active"
                        );
                    },
                    3000
                );
        }
    }


    /* ========================================================
       2.3 - API REQUEST
    ======================================================== */

    async function api(
        endpoint,
        options = {}
    ) {
        const url =
            endpoint.startsWith(
                "http"
            )
                ? endpoint
                : endpoint.startsWith(
                      "/"
                  )
                ? endpoint
                : `/api/${endpoint}`;

        const method =
            (
                options.method ||
                "GET"
            ).toUpperCase();

        const headers = {
            Accept:
                "application/json",

            "X-TurkAI-Version":
                "40.0.0",

            ...(options.headers ||
                {})
        };

        const token =
            state.sessionToken ||
            localStorage.getItem(
                "turkai_access_token"
            );

        if (
            token
        ) {
            headers.Authorization =
                `Bearer ${token}`;
        }

        let body =
            options.body;

        if (
            options.json !==
                undefined
        ) {
            body =
                JSON.stringify(
                    options.json
                );

            headers[
                "Content-Type"
            ] =
                "application/json";
        }

        const controller =
            new AbortController();

        const timeout =
            Number(
                options.timeout ||
                30000
            );

        const timer =
            window.setTimeout(
                () => {
                    controller.abort();
                },
                timeout
            );

        let response;

        try {
            response =
                await fetch(
                    url,
                    {
                        method,

                        headers,

                        body,

                        credentials:
                            "same-origin",

                        signal:
                            controller.signal
                    }
                );
        } catch (
            error
        ) {
            window.clearTimeout(
                timer
            );

            if (
                error.name ===
                "AbortError"
            ) {
                throw new Error(
                    "İstek zaman aşımına uğradı."
                );
            }

            throw new Error(
                "Sunucuya bağlanılamadı."
            );
        }

        window.clearTimeout(
            timer
        );

        const raw =
            await response.text();

        const data =
            parseJSON(
                raw,
                raw
            );

        if (
            !response.ok
        ) {
            const error =
                new Error(
                    data?.message ||
                    data?.error ||
                    `HTTP ${response.status}`
                );

            error.status =
                response.status;

            error.data =
                data;

            throw error;
        }

        return {
            ok:
                true,

            status:
                response.status,

            data
        };
    }


    /* ========================================================
       2.4 - GENERIC RESULT EXTRACTION
    ======================================================== */

    function unwrap(
        data
    ) {
        if (
            data &&
            typeof data ===
                "object" &&
            data.data &&
            typeof data.data ===
                "object"
        ) {
            return data.data;
        }

        return data;
    }


    function firstValue(
        object,
        keys
    ) {
        for (
            const key
            of keys
        ) {
            if (
                object &&
                object[key] !==
                    undefined &&
                object[key] !==
                    null
            ) {
                return object[key];
            }
        }

        return null;
    }


    /* ========================================================
       2.5 - RESEARCH ENGINE
    ======================================================== */

    async function runResearch(
        query,
        options = {}
    ) {
        const value =
            cleanText(
                query
            );

        if (
            !value
        ) {
            notify(
                "Araştırılacak bir şey yaz.",
                "error"
            );

            return null;
        }

        const button =
            id(
                "researchToolButton"
            );

        if (
            button
        ) {
            button.disabled =
                true;
            button.classList.add(
                "loading"
            );
        }

        state.researching =
            true;

        try {
            const result =
                await api(
                    endpoints.research,
                    {
                        method:
                            "POST",

                        timeout:
                            90000,

                        json:
                            {
                                query:
                                    value,

                                q:
                                    value,

                                userId:
                                    state.user
                                        ?.id ||
                                    "guest",

                                userName:
                                    state.user
                                        ?.name ||
                                    state.user
                                        ?.displayName ||
                                    "TürkAI Kullanıcısı",

                                category:
                                    options.category ||
                                    "general",

                                maxSources:
                                    options.maxSources ||
                                    10,

                                fresh:
                                    options.fresh !==
                                    false
                            }
                    }
                );

            const data =
                unwrap(
                    result.data
                );

            renderResearchResult(
                data,
                value
            );

            notify(
                "Araştırma tamamlandı.",
                "success"
            );

            return data;
        } catch (
            error
        ) {
            notify(
                error.message ||
                    "Araştırma başarısız.",
                "error"
            );

            return null;
        } finally {
            state.researching =
                false;

            if (
                button
            ) {
                button.disabled =
                    false;
                button.classList.remove(
                    "loading"
                );
            }
        }
    }


    function renderResearchResult(
        data,
        query
    ) {
        const panel =
            id(
                "researchPanel"
            );

        if (
            !panel
        ) {
            return;
        }

        const sources =
            data?.sources ||
            data?.results ||
            data?.items ||
            [];

        const summary =
            data?.summary ||
            data?.answer ||
            data?.text ||
            "";

        let container =
            panel.querySelector(
                "#researchResults"
            );

        if (
            !container
        ) {
            container =
                document.createElement(
                    "div"
                );

            container.id =
                "researchResults";

            container.className =
                "research-results";

            panel.appendChild(
                container
            );
        }

        container.innerHTML = `
            <div class="research-result-header">
                <strong>Araştırma</strong>
                <span>${escapeHTML(
                    query
                )}</span>
            </div>

            ${
                summary
                    ? `
                        <div class="research-summary">
                            ${escapeHTML(
                                summary
                            ).replace(
                                /\n/g,
                                "<br>"
                            )}
                        </div>
                    `
                    : ""
            }

            <div class="research-source-list">
                ${
                    Array.isArray(
                        sources
                    )
                        ? sources
                              .slice(
                                  0,
                                  15
                              )
                              .map(
                                  source => {
                                      const title =
                                          source.title ||
                                          source.name ||
                                          source.url ||
                                          "Kaynak";

                                      const url =
                                          source.url ||
                                          source.link ||
                                          "#";

                                      return `
                                        <a
                                            class="research-source"
                                            href="${escapeHTML(
                                                url
                                            )}"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <strong>
                                                ${escapeHTML(
                                                    title
                                                )}
                                            </strong>
                                            <small>
                                                ${escapeHTML(
                                                    source.description ||
                                                    source.snippet ||
                                                    url
                                                )}
                                            </small>
                                        </a>
                                    `;
                                  }
                              )
                              .join("")
                        : ""
                }
            </div>
        `;

        openAnyPanel(
            "researchPanel"
        );
    }


    /* ========================================================
       2.6 - RESEARCH BUTTON
    ======================================================== */

    function bindResearchButton() {
        const button =
            id(
                "researchToolButton"
            );

        if (
            !button ||
            button.dataset
                .turkaiPart2Bound ===
                "1"
        ) {
            return;
        }

        button.dataset
            .turkaiPart2Bound =
            "1";

        button.addEventListener(
            "click",
            async () => {
                const input =
                    getComposer();

                const query =
                    cleanText(
                        input?.value
                    );

                if (
                    query
                ) {
                    await runResearch(
                        query
                    );

                    return;
                }

                openAnyPanel(
                    "researchPanel"
                );

                const researchInput =
                    id(
                        "researchQueryInput"
                    );

                researchInput?.focus();
            }
        );
    }


    /* ========================================================
       2.7 - WEATHER
    ======================================================== */

    async function getWeather(
        city = null
    ) {
        const value =
            cleanText(
                city ||
                prompt(
                    "Şehir adı:",
                    "Konya"
                ) ||
                ""
            );

        if (
            !value
        ) {
            return null;
        }

        try {
            const result =
                await api(
                    endpoints.weather,
                    {
                        method:
                            "POST",

                        timeout:
                            30000,

                        json:
                            {
                                city:
                                    value,

                                location:
                                    value,

                                userId:
                                    state.user
                                        ?.id ||
                                    "guest"
                            }
                    }
                );

            const data =
                unwrap(
                    result.data
                );

            renderWeather(
                data,
                value
            );

            notify(
                "Hava durumu getirildi.",
                "success"
            );

            return data;
        } catch (
            error
        ) {
            notify(
                error.message ||
                    "Hava durumu alınamadı.",
                "error"
            );

            return null;
        }
    }


    function renderWeather(
        data,
        city
    ) {
        const panel =
            id(
                "systemPanel"
            ) ||
            id(
                "researchPanel"
            );

        if (
            !panel
        ) {
            return;
        }

        let weatherBox =
            id(
                "turkaiWeatherBox"
            );

        if (
            !weatherBox
        ) {
            weatherBox =
                document.createElement(
                    "div"
                );

            weatherBox.id =
                "turkaiWeatherBox";

            weatherBox.className =
                "turkai-weather-box";

            panel.appendChild(
                weatherBox
            );
        }

        const current =
            data?.current ||
            data?.currentWeather ||
            data?.weather ||
            data ||
            {};

        weatherBox.innerHTML = `
            <div class="weather-header">
                <strong>${escapeHTML(
                    data?.city ||
                    city
                )}</strong>

                <span>
                    ${escapeHTML(
                        data?.country ||
                        "Türkiye"
                    )}
                </span>
            </div>

            <div class="weather-main">
                <strong>
                    ${escapeHTML(
                        current.temperature ??
                        current.temperature_2m ??
                        current.temp ??
                        "—"
                    )}${(
                        current.temperature ??
                        current.temperature_2m ??
                        current.temp
                    ) !== undefined
                        ? "°"
                        : ""}
                </strong>

                <span>
                    ${escapeHTML(
                        current.description ||
                        current.weatherDescription ||
                        "Hava durumu"
                    )}
                </span>
            </div>

            <div class="weather-details">
                <span>
                    Nem:
                    ${escapeHTML(
                        current.humidity ??
                        current.relative_humidity_2m ??
                        "—"
                    )}${(
                        current.humidity ??
                        current.relative_humidity_2m
                    ) !== undefined
                        ? "%"
                        : ""}
                </span>

                <span>
                    Rüzgar:
                    ${escapeHTML(
                        current.windSpeed ??
                        current.wind_speed_10m ??
                        "—"
                    )}
                </span>
            </div>
        `;

        openAnyPanel(
            "systemPanel"
        );
    }


    /* ========================================================
       2.8 - MEMORY ENGINE
    ======================================================== */

    async function searchMemory(
        query = null
    ) {
        const input =
            query ||
            cleanText(
                getComposer()?.value
            );

        if (
            !input
        ) {
            notify(
                "Hafızada aranacak bir şey yaz.",
                "error"
            );

            return null;
        }

        try {
            const result =
                await api(
                    endpoints.memorySearch,
                    {
                        method:
                            "POST",

                        timeout:
                            30000,

                        json:
                            {
                                query:
                                    input,

                                question:
                                    input,

                                userId:
                                    state.user
                                        ?.id ||
                                    "guest",

                                topK:
                                    10
                            }
                    }
                );

            const data =
                unwrap(
                    result.data
                );

            renderMemory(
                data,
                input
            );

            notify(
                "Hafıza tarandı.",
                "success"
            );

            return data;
        } catch (
            error
        ) {
            notify(
                error.message ||
                    "Hafıza aranamadı.",
                "error"
            );

            return null;
        }
    }


    function renderMemory(
        data,
        query
    ) {
        const panel =
            id(
                "memoryPanel"
            );

        if (
            !panel
        ) {
            return;
        }

        let results =
            panel.querySelector(
                "#memoryResults"
            );

        if (
            !results
        ) {
            results =
                document.createElement(
                    "div"
                );

            results.id =
                "memoryResults";

            results.className =
                "memory-results";

            panel.appendChild(
                results
            );
        }

        const items =
            data?.results ||
            data?.items ||
            data?.matches ||
            [];

        results.innerHTML = `
            <div class="memory-result-header">
                <strong>Hafıza Sonuçları</strong>
                <span>${escapeHTML(
                    query
                )}</span>
            </div>

            ${
                Array.isArray(
                    items
                )
                    ? items
                          .slice(
                              0,
                              20
                          )
                          .map(
                              item => `
                                <div
                                    class="memory-result-item"
                                    data-memory-id="${escapeHTML(
                                        item.id ||
                                        ""
                                    )}"
                                >
                                    <strong>
                                        ${escapeHTML(
                                            item.question ||
                                            item.prompt ||
                                            ""
                                        )}
                                    </strong>

                                    <div>
                                        ${escapeHTML(
                                            item.answer ||
                                            item.response ||
                                            ""
                                        ).replace(
                                            /\n/g,
                                            "<br>"
                                        )}
                                    </div>

                                    <small>
                                        ${escapeHTML(
                                            item.score !==
                                            undefined
                                                ? `Benzerlik: ${(Number(
                                                      item.score
                                                  ) * 100).toFixed(
                                                      0
                                                  )}%`
                                                : ""
                                        )}
                                    </small>
                                </div>
                            `
                          )
                          .join("")
                    : ""
            }

            ${
                !items.length
                    ? `
                        <div class="memory-empty">
                            Bu soruyla eşleşen kayıt bulunamadı.
                        </div>
                    `
                    : ""
            }
        `;

        openAnyPanel(
            "memoryPanel"
        );
    }


    /* ========================================================
       2.9 - MEMORY SAVE
    ======================================================== */

    async function saveMemory(
        question,
        answer
    ) {
        const q =
            cleanText(
                question
            );

        const a =
            cleanText(
                answer
            );

        if (
            !q ||
            !a
        ) {
            return null;
        }

        try {
            const result =
                await api(
                    endpoints.memorySave,
                    {
                        method:
                            "POST",

                        timeout:
                            30000,

                        json:
                            {
                                question:
                                    q,

                                answer:
                                    a,

                                userId:
                                    state.user
                                        ?.id ||
                                    "guest",

                                userName:
                                    state.user
                                        ?.name ||
                                    state.user
                                        ?.displayName ||
                                    "TürkAI Kullanıcısı",

                                source:
                                    "web",

                                auto:
                                    false
                            }
                    }
                );

            return unwrap(
                result.data
            );
        } catch (
            error
        ) {
            console.warn(
                "[TürkAI] Memory save:",
                error.message
            );

            return null;
        }
    }


    /* ========================================================
       2.10 - FILES
    ======================================================== */

    function getFileInput() {
        return (
            id(
                "globalFilePicker"
            ) ||
            id(
                "fileInput"
            ) ||
            id(
                "uploadInput"
            )
        );
    }


    async function uploadFiles(
        files
    ) {
        const list =
            Array.from(
                files || []
            );

        if (
            !list.length
        ) {
            return null;
        }

        const form =
            new FormData();

        for (
            const file
            of list.slice(
                0,
                10
            )
        ) {
            form.append(
                "files",
                file
            );
        }

        form.append(
            "userId",
            state.user?.id ||
                "guest"
        );

        form.append(
            "userName",
            state.user?.name ||
                state.user
                    ?.displayName ||
                "TürkAI Kullanıcısı"
        );

        try {
            state.uploading =
                true;

            const result =
                await api(
                    endpoints.upload,
                    {
                        method:
                            "POST",

                        timeout:
                            120000,

                        body:
                            form
                    }
                );

            const data =
                unwrap(
                    result.data
                );

            renderUploadedFiles(
                data
            );

            notify(
                `${list.length} dosya işlendi.`,
                "success"
            );

            return data;
        } catch (
            error
        ) {
            notify(
                error.message ||
                    "Dosya yüklenemedi.",
                "error"
            );

            return null;
        } finally {
            state.uploading =
                false;
        }
    }


    function renderUploadedFiles(
        data
    ) {
        const panel =
            id(
                "fileCenterPanel"
            );

        if (
            !panel
        ) {
            return;
        }

        let box =
            panel.querySelector(
                "#uploadedFiles"
            );

        if (
            !box
        ) {
            box =
                document.createElement(
                    "div"
                );

            box.id =
                "uploadedFiles";

            box.className =
                "uploaded-files";

            panel.appendChild(
                box
            );
        }

        const files =
            data?.files ||
            data?.items ||
            data?.uploads ||
            [];

        box.innerHTML = `
            <div class="uploaded-files-title">
                Son yüklemeler
            </div>

            ${
                Array.isArray(
                    files
                )
                    ? files
                          .map(
                              file => `
                                <div class="uploaded-file">
                                    <span>
                                        ${escapeHTML(
                                            file.name ||
                                            file.filename ||
                                            "Dosya"
                                        )}
                                    </span>

                                    <small>
                                        ${escapeHTML(
                                            file.mime ||
                                            file.mimetype ||
                                            ""
                                        )}
                                    </small>
                                </div>
                            `
                          )
                          .join("")
                    : ""
            }
        `;

        openAnyPanel(
            "fileCenterPanel"
        );
    }


    async function loadFiles() {
        try {
            const result =
                await api(
                    endpoints.files,
                    {
                        method:
                            "GET",

                        timeout:
                            30000
                    }
                );

            const data =
                unwrap(
                    result.data
                );

            renderUploadedFiles(
                data
            );

            return data;
        } catch (
            error
        ) {
            notify(
                error.message ||
                    "Dosyalar alınamadı.",
                "error"
            );

            return null;
        }
    }


    /* ========================================================
       2.11 - FILE BUTTON
    ======================================================== */

    function bindFileButton() {
        const button =
            id(
                "fileButton"
            );

        if (
            button &&
            button.dataset
                .turkaiPart2Bound !==
            "1"
        ) {
            button.dataset
                .turkaiPart2Bound =
                "1";

            button.addEventListener(
                "click",
                () => {
                    openAnyPanel(
                        "fileCenterPanel"
                    );

                    loadFiles();
                }
            );
        }

        const picker =
            getFileInput();

        if (
            picker &&
            picker.dataset
                .turkaiPart2FilesBound !==
            "1"
        ) {
            picker.dataset
                .turkaiPart2FilesBound =
                "1";

            picker.addEventListener(
                "change",
                event => {
                    uploadFiles(
                        event.target
                            .files
                    );

                    /*
                    Aynı dosya yeniden seçilebilsin.
                    */

                    event.target.value =
                        "";
                }
            );
        }
    }


    /* ========================================================
       2.12 - VOICE TTS
    ======================================================== */

    async function speakText(
        message
    ) {
        const value =
            cleanText(
                message
            );

        if (
            !value
        ) {
            return null;
        }

        /*
        Browser speech synthesis önce.
        Backend TTS yoksa da ses özelliği çalışır.
        */

        if (
            window.speechSynthesis
        ) {
            try {
                window.speechSynthesis.cancel();

                const utterance =
                    new SpeechSynthesisUtterance(
                        value
                    );

                utterance.lang =
                    "tr-TR";

                utterance.rate =
                    0.95;

                utterance.pitch =
                    1;

                utterance.onstart =
                    () => {
                        state.speaking =
                            true;
                    };

                utterance.onend =
                    () => {
                        state.speaking =
                            false;
                    };

                utterance.onerror =
                    () => {
                        state.speaking =
                            false;
                    };

                window.speechSynthesis.speak(
                    utterance
                );

                return {
                    ok: true,
                    browser:
                        true
                };
            } catch {}
        }

        try {
            const result =
                await api(
                    endpoints.voiceTTS,
                    {
                        method:
                            "POST",

                        timeout:
                            60000,

                        json:
                            {
                                text:
                                    value,

                                language:
                                    "tr",

                                voice:
                                    "default",

                                userId:
                                    state.user
                                        ?.id ||
                                    "guest"
                            }
                    }
                );

            const data =
                unwrap(
                    result.data
                );

            const base64 =
                firstValue(
                    data,
                    [
                        "audioBase64",
                        "base64",
                        "audio",
                        "data"
                    ]
                );

            if (
                typeof base64 ===
                    "string" &&
                base64.length > 100
            ) {
                playBase64Audio(
                    base64,
                    data?.mime ||
                        "audio/mpeg"
                );
            }

            return data;
        } catch (
            error
        ) {
            notify(
                error.message ||
                    "Ses üretilemedi.",
                "error"
            );

            return null;
        }
    }


    function playBase64Audio(
        base64,
        mime
    ) {
        try {
            const binary =
                atob(
                    base64
                        .replace(
                            /^data:.*?;base64,/,
                            ""
                        )
                );

            const bytes =
                new Uint8Array(
                    binary.length
                );

            for (
                let i = 0;
                i <
                binary.length;
                i++
            ) {
                bytes[i] =
                    binary.charCodeAt(
                        i
                    );
            }

            const blob =
                new Blob(
                    [bytes],
                    {
                        type:
                            mime
                    }
                );

            const url =
                URL.createObjectURL(
                    blob
                );

            const audio =
                new Audio(
                    url
                );

            state.currentAudio =
                audio;

            audio.onended =
                () => {
                    URL.revokeObjectURL(
                        url
                    );

                    if (
                        state.currentAudio ===
                        audio
                    ) {
                        state.currentAudio =
                            null;
                    }
                };

            audio.play().catch(
                () => {}
            );

            return audio;
        } catch {
            return null;
        }
    }


    function stopSpeaking() {
        try {
            window.speechSynthesis?.cancel();
        } catch {}

        try {
            state.currentAudio?.pause();
        } catch {}

        state.speaking =
            false;
    }


    /* ========================================================
       2.13 - SPEECH RECOGNITION
    ======================================================== */

    function setupRecognition() {
        const Recognition =
            window.SpeechRecognition ||
            window.webkitSpeechRecognition;

        if (
            !Recognition
        ) {
            return null;
        }

        const recognition =
            new Recognition();

        recognition.lang =
            "tr-TR";

        recognition.continuous =
            false;

        recognition.interimResults =
            true;

        recognition.maxAlternatives =
            1;

        recognition.onstart =
            () => {
                state.recording =
                    true;

                updateVoiceButton(
                    true
                );

                notify(
                    "Dinliyorum...",
                    "info",
                    1800
                );
            };

        recognition.onresult =
            event => {
                let transcript =
                    "";

                for (
                    let i =
                        event
                            .resultIndex;
                    i <
                        event
                            .results
                            .length;
                    i++
                ) {
                    transcript +=
                        event
                            .results[i][0]
                            .transcript;
                }

                transcript =
                    cleanText(
                        transcript
                    );

                if (
                    event.results[
                        event
                            .results
                            .length -
                        1
                    ]?.isFinal
                ) {
                    const input =
                        getComposer();

                    if (
                        input
                    ) {
                        input.value =
                            transcript;

                        input.dispatchEvent(
                            new Event(
                                "input",
                                {
                                    bubbles:
                                        true
                                }
                            )
                        );
                    }

                    state.voiceTranscript =
                        transcript;
                }
            };

        recognition.onerror =
            event => {
                state.recording =
                    false;

                updateVoiceButton(
                    false
                );

                if (
                    event.error !==
                    "aborted"
                ) {
                    notify(
                        "Ses tanınamadı.",
                        "error"
                    );
                }
            };

        recognition.onend =
            () => {
                state.recording =
                    false;

                updateVoiceButton(
                    false
                );
            };

        return recognition;
    }


    function toggleVoice() {
        if (
            state.recording &&
            state.speechRecognition
        ) {
            try {
                state.speechRecognition.stop();
            } catch {}

            return;
        }

        if (
            !state.speechRecognition
        ) {
            state.speechRecognition =
                setupRecognition();
        }

        if (
            !state.speechRecognition
        ) {
            notify(
                "Bu tarayıcı ses tanımayı desteklemiyor.",
                "error"
            );

            return;
        }

        try {
            state.speechRecognition.start();
        } catch {}
    }


    function updateVoiceButton(
        active
    ) {
        const button =
            id(
                "voiceButton"
            );

        if (
            !button
        ) {
            return;
        }

        button.classList.toggle(
            "recording",
            active
        );

        button.setAttribute(
            "aria-pressed",
            active
                ? "true"
                : "false"
        );

        button.title =
            active
                ? "Dinlemeyi durdur"
                : "TürkAI ile konuş";
    }


    function bindVoiceButton() {
        const button =
            id(
                "voiceButton"
            );

        if (
            !button ||
            button.dataset
                .turkaiPart2Bound ===
            "1"
        ) {
            return;
        }

        button.dataset
            .turkaiPart2Bound =
            "1";

        button.addEventListener(
            "click",
            () => {
                toggleVoice();
            }
        );
    }


    /* ========================================================
       2.14 - IMAGE GENERATION
    ======================================================== */

    async function generateImage(
        prompt = null
    ) {
        const input =
            id(
                "imagePrompt"
            ) ||
            id(
                "imageCreatePrompt"
            ) ||
            $(
                "#imageCreateModal textarea"
            );

        const value =
            cleanText(
                prompt ??
                input?.value
            );

        if (
            !value
        ) {
            notify(
                "Görsel açıklaması yaz.",
                "error"
            );

            input?.focus();

            return null;
        }

        state.generatingImage =
            true;

        const button =
            id(
                "generateImageButton"
            );

        if (
            button
        ) {
            button.disabled =
                true;

            button.dataset
                .originalText =
                button.textContent;

            button.textContent =
                "Oluşturuluyor...";
        }

        try {
            const result =
                await api(
                    endpoints.mediaImage,
                    {
                        method:
                            "POST",

                        timeout:
                            120000,

                        json:
                            {
                                prompt:
                                    value,

                                userId:
                                    state.user
                                        ?.id ||
                                    "guest",

                                userName:
                                    state.user
                                        ?.name ||
                                    state.user
                                        ?.displayName ||
                                    "TürkAI Kullanıcısı",

                                model:
                                    state.currentModel ||
                                    "auto"
                            }
                    }
                );

            const data =
                unwrap(
                    result.data
                );

            state.lastImage =
                data;

            renderGeneratedImage(
                data
            );

            notify(
                "Görsel hazır.",
                "success"
            );

            return data;
        } catch (
            error
        ) {
            notify(
                error.message ||
                    "Görsel oluşturulamadı.",
                "error"
            );

            return null;
        } finally {
            state.generatingImage =
                false;

            if (
                button
            ) {
                button.disabled =
                    false;

                button.textContent =
                    button.dataset
                        .originalText ||
                    "Görsel Oluştur";
            }
        }
    }


    function renderGeneratedImage(
        data
    ) {
        const container =
            id(
                "generatedImage"
            ) ||
            id(
                "imageResult"
            );

        if (
            !container
        ) {
            return;
        }

        const url =
            data?.url ||
            data?.imageUrl ||
            data?.asset?.url ||
            data?.data?.url ||
            (
                data?.b64_json
                    ? `data:image/png;base64,${data.b64_json}`
                    : null
            ) ||
            (
                data?.base64
                    ? `data:image/png;base64,${data.base64}`
                    : null
            );

        if (
            !url
        ) {
            container.textContent =
                "Görsel üretildi fakat görüntü adresi döndürülmedi.";

            return;
        }

        container.innerHTML = `
            <div class="generated-media-card">
                <img
                    src="${escapeHTML(
                        url
                    )}"
                    alt="TürkAI tarafından oluşturulan görsel"
                >

                <div class="generated-media-actions">
                    <a
                        href="${escapeHTML(
                            url
                        )}"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Aç
                    </a>
                </div>
            </div>
        `;
    }


    function bindImageButton() {
        const openButton =
            id(
                "imageButton"
            );

        if (
            openButton &&
            openButton.dataset
                .turkaiPart2Bound !==
            "1"
        ) {
            openButton.dataset
                .turkaiPart2Bound =
                "1";

            openButton.addEventListener(
                "click",
                () => {
                    openModalSafe(
                        "imageCreateModal"
                    );
                }
            );
        }

        const generate =
            id(
                "generateImageButton"
            );

        if (
            generate &&
            generate.dataset
                .turkaiPart2GenerateBound !==
            "1"
        ) {
            generate.dataset
                .turkaiPart2GenerateBound =
                "1";

            generate.addEventListener(
                "click",
                () => {
                    generateImage();
                }
            );
        }
    }


    /* ========================================================
       2.15 - VIDEO GENERATION
    ======================================================== */

    async function generateVideo(
        prompt = null
    ) {
        const input =
            id(
                "videoPrompt"
            ) ||
            id(
                "videoCreatePrompt"
            ) ||
            $(
                "#videoModal textarea"
            );

        const value =
            cleanText(
                prompt ??
                input?.value
            );

        if (
            !value
        ) {
            notify(
                "Video açıklaması yaz.",
                "error"
            );

            input?.focus();

            return null;
        }

        state.generatingVideo =
            true;

        try {
            const result =
                await api(
                    endpoints.mediaVideo,
                    {
                        method:
                            "POST",

                        timeout:
                            120000,

                        json:
                            {
                                prompt:
                                    value,

                                userId:
                                    state.user
                                        ?.id ||
                                    "guest",

                                userName:
                                    state.user
                                        ?.name ||
                                    state.user
                                        ?.displayName ||
                                    "TürkAI Kullanıcısı",

                                model:
                                    state.currentModel ||
                                    "auto"
                            }
                    }
                );

            const data =
                unwrap(
                    result.data
                );

            state.lastVideo =
                data;

            renderGeneratedVideo(
                data
            );

            notify(
                "Video işi oluşturuldu.",
                "success"
            );

            return data;
        } catch (
            error
        ) {
            notify(
                error.message ||
                    "Video oluşturulamadı.",
                "error"
            );

            return null;
        } finally {
            state.generatingVideo =
                false;
        }
    }


    function renderGeneratedVideo(
        data
    ) {
        const container =
            id(
                "generatedVideo"
            ) ||
            id(
                "videoResult"
            );

        if (
            !container
        ) {
            return;
        }

        const url =
            data?.url ||
            data?.videoUrl ||
            data?.asset?.url ||
            null;

        const jobId =
            data?.jobId ||
            data?.id ||
            data?.job?.id ||
            null;

        container.innerHTML = `
            ${
                url
                    ? `
                        <video
                            controls
                            playsinline
                            src="${escapeHTML(
                                url
                            )}"
                        ></video>
                    `
                    : ""
            }

            ${
                jobId
                    ? `
                        <div class="video-job-status">
                            Video işi:
                            ${escapeHTML(
                                jobId
                            )}
                        </div>
                    `
                    : ""
            }
        `;
    }


    function bindVideoButton() {
        const button =
            id(
                "videoButton"
            );

        if (
            button &&
            button.dataset
                .turkaiPart2Bound !==
            "1"
        ) {
            button.dataset
                .turkaiPart2Bound =
                "1";

            button.addEventListener(
                "click",
                () => {
                    openModalSafe(
                        "videoModal"
                    );
                }
            );
        }

        const generate =
            id(
                "generateVideoButton"
            );

        if (
            generate &&
            generate.dataset
                .turkaiPart2GenerateBound !==
            "1"
        ) {
            generate.dataset
                .turkaiPart2GenerateBound =
                "1";

            generate.addEventListener(
                "click",
                () => {
                    generateVideo();
                }
            );
        }
    }


    /* ========================================================
       2.16 - CONVERSATION LIST
    ======================================================== */

    async function loadConversations() {
        try {
            const result =
                await api(
                    endpoints.conversations,
                    {
                        method:
                            "GET",

                        timeout:
                            30000
                    }
                );

            const data =
                unwrap(
                    result.data
                );

            const items =
                data?.items ||
                data?.conversations ||
                data ||
                [];

            state.conversations =
                Array.isArray(
                    items
                )
                    ? items
                    : [];

            renderConversationList();

            return state.conversations;
        } catch (
            error
        ) {
            console.warn(
                "[TürkAI] Conversations:",
                error.message
            );

            return [];
        }
    }


    function renderConversationList() {
        const containers = [
            id(
                "conversationList"
            ),
            id(
                "chatHistory"
            ),
            $(
                ".conversation-list"
            )
        ].filter(
            Boolean
        );

        if (
            !containers.length
        ) {
            return;
        }

        const html =
            state.conversations
                .slice(
                    0,
                    100
                )
                .map(
                    conversation => {
                        const cid =
                            conversation.id ||
                            conversation.conversationId ||
                            "";

                        const title =
                            conversation.title ||
                            conversation.name ||
                            conversation.lastMessage ||
                            "Yeni sohbet";

                        return `
                            <button
                                type="button"
                                class="conversation-item ${
                                    cid ===
                                    state.conversationId
                                        ? "active"
                                        : ""
                                }"
                                data-conversation-id="${escapeHTML(
                                    cid
                                )}"
                            >
                                <span>
                                    ${escapeHTML(
                                        title
                                    )}
                                </span>
                            </button>
                        `;
                    }
                )
                .join("");

        containers.forEach(
            container => {
                container.innerHTML =
                    html;
            }
        );
    }


    async function loadConversation(
        conversationId
    ) {
        const cid =
            cleanText(
                conversationId
            );

        if (
            !cid
        ) {
            return null;
        }

        try {
            const result =
                await api(
                    `${endpoints.conversations}/${encodeURIComponent(
                        cid
                    )}`,
                    {
                        method:
                            "GET",

                        timeout:
                            30000
                    }
                );

            const data =
                unwrap(
                    result.data
                );

            const messages =
                data?.messages ||
                data?.items ||
                [];

            state.conversationId =
                cid;

            if (
                Array.isArray(
                    messages
                )
            ) {
                state.messages =
                    messages.map(
                        message => ({
                            id:
                                message.id ||
                                `msg_${Math.random()
                                    .toString(
                                        36
                                    )
                                    .slice(
                                        2,
                                        8
                                    )}`,

                            role:
                                message.role ===
                                "user"
                                    ? "user"
                                    : "assistant",

                            content:
                                message.content ||
                                message.text ||
                                message.message ||
                                "",

                            createdAt:
                                message.createdAt ||
                                message.timestamp ||
                                new Date().toISOString()
                        })
                    );
            }

            window.localStorage.setItem(
                "turkai_conversation_v40",
                JSON.stringify({
                    id:
                        state.conversationId,

                    messages:
                        state.messages
                })
            );

            if (
                typeof CORE.state ===
                "object"
            ) {
                CORE.state.conversationId =
                    state.conversationId;

                CORE.state.messages =
                    state.messages;
            }

            if (
                typeof window.TURKAI?.refreshStatus ===
                "function"
            ) {
                /*
                Burada yalnızca UI tarafındaki
                ortak state korunuyor.
                */
            }

            /*
            Part 1'in renderMessages fonksiyonuna
            erişilemiyorsa burada kendi render'ımız.
            */

            if (
                typeof window.renderTurkAIChat ===
                "function"
            ) {
                window.renderTurkAIChat();
            } else {
                fallbackRenderMessages();
            }

            renderConversationList();

            notify(
                "Sohbet açıldı.",
                "success"
            );

            return data;
        } catch (
            error
        ) {
            notify(
                error.message ||
                    "Sohbet açılamadı.",
                "error"
            );

            return null;
        }
    }


    function fallbackRenderMessages() {
        const container =
            id(
                "messages"
            ) ||
            id(
                "chatMessages"
            ) ||
            $(
                ".messages"
            ) ||
            $(
                ".chat-messages"
            );

        if (
            !container
        ) {
            return;
        }

        container.innerHTML =
            state.messages
                .map(
                    message => `
                        <div
                            class="message ${
                                message.role ===
                                "user"
                                    ? "user-message"
                                    : "assistant-message"
                            }"
                        >
                            <div class="message-inner">
                                <div class="message-role">
                                    ${
                                        message.role ===
                                        "user"
                                            ? "Sen"
                                            : "TürkAI"
                                    }
                                </div>

                                <div class="message-content">
                                    ${escapeHTML(
                                        message.content
                                    ).replace(
                                        /\n/g,
                                        "<br>"
                                    )}
                                </div>
                            </div>
                        </div>
                    `
                )
                .join("");

        container.scrollTop =
            container.scrollHeight;
    }


    function bindConversationList() {
        document.addEventListener(
            "click",
            event => {
                const button =
                    event.target.closest(
                        "[data-conversation-id]"
                    );

                if (
                    !button
                ) {
                    return;
                }

                const cid =
                    button.dataset
                        .conversationId;

                if (
                    cid
                ) {
                    loadConversation(
                        cid
                    );
                }
            }
        );
    }


    /* ========================================================
       2.17 - SEARCH MODAL
    ======================================================== */

    async function searchConversations(
        query
    ) {
        const value =
            cleanText(
                query
            );

        if (
            !value
        ) {
            return;
        }

        try {
            const result =
                await api(
                    `${endpoints.conversations}/search?q=${encodeURIComponent(
                        value
                    )}`,
                    {
                        method:
                            "GET",

                        timeout:
                            30000
                    }
                );

            const data =
                unwrap(
                    result.data
                );

            renderConversationSearch(
                data
            );

            return data;
        } catch (
            error
        ) {
            notify(
                error.message ||
                    "Arama başarısız.",
                "error"
            );

            return null;
        }
    }


    function renderConversationSearch(
        data
    ) {
        const results =
            id(
                "searchResults"
            );

        if (
            !results
        ) {
            return;
        }

        const items =
            data?.results ||
            data?.items ||
            [];

        results.innerHTML =
            Array.isArray(
                items
            )
                ? items
                      .map(
                          item => `
                            <button
                                type="button"
                                class="search-result-item"
                                data-conversation-id="${escapeHTML(
                                    item.conversationId ||
                                    item.id ||
                                    ""
                                )}"
                            >
                                <strong>
                                    ${escapeHTML(
                                        item.title ||
                                        item.question ||
                                        item.text ||
                                        "Sohbet"
                                    )}
                                </strong>

                                <small>
                                    ${escapeHTML(
                                        item.snippet ||
                                        item.answer ||
                                        ""
                                    )}
                                </small>
                            </button>
                        `
                      )
                      .join("")
                : "";
    }


    function bindConversationSearch() {
        const input =
            id(
                "chatSearchInput"
            );

        if (
            input &&
            input.dataset
                .turkaiPart2Bound !==
            "1"
        ) {
            input.dataset
                .turkaiPart2Bound =
                "1";

            let timer =
                null;

            input.addEventListener(
                "input",
                () => {
                    window.clearTimeout(
                        timer
                    );

                    timer =
                        window.setTimeout(
                            () => {
                                searchConversations(
                                    input.value
                                );
                            },
                            350
                        );
                }
            );
        }
    }


    /* ========================================================
       2.18 - ACCOUNT
    ======================================================== */

    async function loadAccount() {
        try {
            const result =
                await api(
                    endpoints.account,
                    {
                        method:
                            "GET",

                        timeout:
                            20000
                    }
                );

            const data =
                unwrap(
                    result.data
                );

            if (
                data?.user
            ) {
                state.user =
                    {
                        ...state.user,
                        ...data.user
                    };
            } else if (
                data &&
                (
                    data.id ||
                    data.email ||
                    data.name
                )
            ) {
                state.user =
                    {
                        ...state.user,
                        ...data
                    };
            }

            updateAccountInformation();

            return data;
        } catch {
            /*
            Eski backend'de /api/account olmayabilir.
            auth/me varsa ikinci yol.
            */

            try {
                const result =
                    await api(
                        endpoints.authMe,
                        {
                            method:
                                "GET",

                            timeout:
                                15000
                        }
                    );

                const data =
                    unwrap(
                        result.data
                    );

                const user =
                    data?.user ||
                    data;

                if (
                    user?.id ||
                    user?.email
                ) {
                    state.user =
                        {
                            ...state.user,
                            ...user
                        };

                    updateAccountInformation();
                }

                return data;
            } catch {
                return null;
            }
        }
    }


    function updateAccountInformation() {
        const user =
            state.user || {};

        const name =
            user.displayName ||
            user.name ||
            user.email ||
            "TürkAI Kullanıcısı";

        const plan =
            user.plan ||
            user.subscription?.plan ||
            "free";

        state.plan =
            String(
                plan
            ).toLowerCase();

        $$(
            "#accountButton strong, [data-account-name]"
        ).forEach(
            element => {
                element.textContent =
                    name;
            }
        );

        $(
            "#accountPlanText"
        ) &&
            (
                $(
                    "#accountPlanText"
                ).textContent =
                    state.plan
                        .toUpperCase()
            );

        $$(
            "[data-user-name]"
        ).forEach(
            element => {
                element.textContent =
                    name;
            }
        );
    }


    /* ========================================================
       2.19 - PLANS
    ======================================================== */

    const fallbackPlans = [
        {
            id:
                "free",

            name:
                "Free",

            price:
                0
        },

        {
            id:
                "pro",

            name:
                "Pro",

            price:
                250,

            monthly:
                250
        },

        {
            id:
                "plus",

            name:
                "Plus",

            price:
                500,

            monthly:
                500
        },

        {
            id:
                "ultra",

            name:
                "Ultra",

            price:
                1000,

            monthly:
                1000,

            comingSoon:
                true
        }
    ];


    async function loadPlans() {
        try {
            const result =
                await api(
                    endpoints.plans,
                    {
                        method:
                            "GET",

                        timeout:
                            20000
                    }
                );

            const data =
                unwrap(
                    result.data
                );

            const plans =
                data?.plans ||
                data?.items ||
                data;

            if (
                Array.isArray(
                    plans
                )
            ) {
                renderPlans(
                    plans
                );

                return plans;
            }
        } catch {}

        renderPlans(
            fallbackPlans
        );

        return fallbackPlans;
    }


    function renderPlans(
        plans
    ) {
        const container =
            id(
                "plansContainer"
            ) ||
            id(
                "planGrid"
            ) ||
            $(
                ".plans-grid"
            );

        if (
            !container
        ) {
            return;
        }

        container.innerHTML =
            plans
                .map(
                    plan => {
                        const pid =
                            plan.id ||
                            plan.code ||
                            "free";

                        const price =
                            plan.price ??
                            plan.monthly ??
                            0;

                        return `
                            <div
                                class="plan-card plan-${escapeHTML(
                                    pid
                                )}"
                                data-plan="${escapeHTML(
                                    pid
                                )}"
                            >
                                <div class="plan-card-header">
                                    <strong>
                                        ${escapeHTML(
                                            plan.name ||
                                            pid.toUpperCase()
                                        )}
                                    </strong>

                                    ${
                                        plan.comingSoon
                                            ? `
                                                <span>
                                                    Yakında
                                                </span>
                                            `
                                            : ""
                                    }
                                </div>

                                <div class="plan-price">
                                    ${
                                        Number(
                                            price
                                        ) ===
                                        0
                                            ? "Ücretsiz"
                                            : `${escapeHTML(
                                                  price
                                              )} TL / ay`
                                    }
                                </div>

                                <div class="plan-features">
                                    ${
                                        Array.isArray(
                                            plan.features
                                        )
                                            ? plan.features
                                                  .slice(
                                                      0,
                                                      12
                                                  )
                                                  .map(
                                                      feature =>
                                                          `<div>${escapeHTML(
                                                              typeof feature ===
                                                              "string"
                                                                  ? feature
                                                                  : feature.name ||
                                                                    feature.title ||
                                                                    ""
                                                          )}</div>`
                                                  )
                                                  .join(
                                                      ""
                                                  )
                                            : ""
                                    }
                                </div>

                                ${
                                    pid !==
                                    "free"
                                        ? `
                                            <button
                                                type="button"
                                                data-plan-select="${escapeHTML(
                                                    pid
                                                )}"
                                            >
                                                ${
                                                    plan.comingSoon
                                                        ? "Yakında"
                                                        : "Satın Al"
                                                }
                                            </button>
                                        `
                                        : ""
                                }
                            </div>
                        `;
                    }
                )
                .join("");
    }


    async function selectPlan(
        plan
    ) {
        if (
            plan ===
            "free"
        ) {
            return;
        }

        const current =
            state.plan;

        if (
            current ===
            plan
        ) {
            notify(
                "Bu plan zaten aktif.",
                "info"
            );

            return;
        }

        /*
        Gerçek ödeme frontend'den başarıyla
        aktif edilmiş sayılmıyor.
        */

        try {
            const result =
                await api(
                    "/billing/order",
                    {
                        method:
                            "POST",

                        timeout:
                            30000,

                        json:
                            {
                                plan,

                                period:
                                    "monthly",

                                userId:
                                    state.user
                                        ?.id ||
                                    "guest"
                            }
                    }
                );

            const data =
                unwrap(
                    result.data
                );

            const paymentUrl =
                data?.paymentUrl ||
                data?.checkoutUrl ||
                data?.url ||
                null;

            if (
                paymentUrl
            ) {
                window.open(
                    paymentUrl,
                    "_blank",
                    "noopener,noreferrer"
                );

                return data;
            }

            notify(
                data?.message ||
                    "Ödeme işlemi başlatıldı.",
                "success"
            );

            return data;
        } catch (
            error
        ) {
            notify(
                error.message ||
                    "Satın alma işlemi başlatılamadı.",
                "error"
            );

            return null;
        }
    }


    function bindPlans() {
        const purchase =
            id(
                "purchaseButton"
            );

        if (
            purchase &&
            purchase.dataset
                .turkaiPart2Bound !==
            "1"
        ) {
            purchase.dataset
                .turkaiPart2Bound =
                "1";

            purchase.addEventListener(
                "click",
                () => {
                    openModalSafe(
                        "plansModal"
                    );

                    loadPlans();
                }
            );
        }

        document.addEventListener(
            "click",
            event => {
                const button =
                    event.target.closest(
                        "[data-plan-select]"
                    );

                if (
                    !button
                ) {
                    return;
                }

                selectPlan(
                    button.dataset
                        .planSelect
                );
            }
        );
    }


    /* ========================================================
       2.20 - OPEN/CLOSE HELPERS
    ======================================================== */

    function openModalSafe(
        name
    ) {
        const modal =
            id(
                name
            );

        if (
            !modal
        ) {
            notify(
                "Bu ekran bu arayüzde bulunamadı.",
                "error"
            );

            return false;
        }

        modal.classList.add(
            "active"
        );

        modal.setAttribute(
            "aria-hidden",
            "false"
        );

        modal.hidden =
            false;

        return true;
    }


    function closeModalSafe(
        name
    ) {
        const modal =
            id(
                name
            );

        if (
            !modal
        ) {
            return false;
        }

        modal.classList.remove(
            "active"
        );

        modal.setAttribute(
            "aria-hidden",
            "true"
        );

        modal.hidden =
            true;

        return true;
    }


    function openAnyPanel(
        name
    ) {
        const panel =
            id(
                name
            );

        if (
            !panel
        ) {
            notify(
                "Panel bulunamadı.",
                "error"
            );

            return false;
        }

        $$(".panel.active").forEach(
            current => {
                if (
                    current !==
                    panel
                ) {
                    current.classList.remove(
                        "active"
                    );
                }
            }
        );

        panel.classList.add(
            "active"
        );

        panel.hidden =
            false;

        return true;
    }


    function closeAnyPanel(
        name
    ) {
        const panel =
            id(
                name
            );

        if (
            !panel
        ) {
            return false;
        }

        panel.classList.remove(
            "active"
        );

        return true;
    }


    /* ========================================================
       2.21 - NOTIFICATIONS
    ======================================================== */

    async function loadNotifications() {
        try {
            const result =
                await api(
                    endpoints.notifications,
                    {
                        method:
                            "GET",

                        timeout:
                            20000
                    }
                );

            const data =
                unwrap(
                    result.data
                );

            renderNotifications(
                data
            );

            return data;
        } catch (
            error
        ) {
            notify(
                error.message ||
                    "Bildirimler alınamadı.",
                "error"
            );

            return null;
        }
    }


    function renderNotifications(
        data
    ) {
        const panel =
            id(
                "notificationPanel"
            );

        if (
            !panel
        ) {
            return;
        }

        const items =
            data?.items ||
            data?.notifications ||
            data ||
            [];

        let container =
            panel.querySelector(
                "#notificationList"
            );

        if (
            !container
        ) {
            container =
                document.createElement(
                    "div"
                );

            container.id =
                "notificationList";

            container.className =
                "notification-list";

            panel.appendChild(
                container
            );
        }

        container.innerHTML =
            Array.isArray(
                items
            )
                ? items
                      .slice(
                          0,
                          50
                      )
                      .map(
                          item => `
                            <div
                                class="notification-item ${
                                    item.read
                                        ? "read"
                                        : "unread"
                                }"
                            >
                                <strong>
                                    ${escapeHTML(
                                        item.title ||
                                        "TürkAI"
                                    )}
                                </strong>

                                <span>
                                    ${escapeHTML(
                                        item.message ||
                                        item.text ||
                                        ""
                                    )}
                                </span>

                                <small>
                                    ${escapeHTML(
                                        item.createdAt ||
                                        item.timestamp ||
                                        ""
                                    )}
                                </small>
                            </div>
                        `
                      )
                      .join("")
                : "";
    }


    function bindNotifications() {
        const button =
            id(
                "notificationButton"
            );

        if (
            button &&
            button.dataset
                .turkaiPart2Bound !==
            "1"
        ) {
            button.dataset
                .turkaiPart2Bound =
                "1";

            button.addEventListener(
                "click",
                () => {
                    openAnyPanel(
                        "notificationPanel"
                    );

                    loadNotifications();
                }
            );
        }
    }


    /* ========================================================
       2.22 - SYSTEM PANEL
    ======================================================== */

    async function loadSystemPanel() {
        try {
            const result =
                await api(
                    "/system/status",
                    {
                        method:
                            "GET",

                        timeout:
                            15000
                    }
                );

            renderSystemPanel(
                result.data
            );

            return result.data;
        } catch (
            error
        ) {
            renderSystemPanel({
                ok: false,

                error:
                    error.message
            });

            return null;
        }
    }


    function renderSystemPanel(
        data
    ) {
        const panel =
            id(
                "systemPanel"
            );

        if (
            !panel
        ) {
            return;
        }

        let box =
            panel.querySelector(
                "#systemStatusBox"
            );

        if (
            !box
        ) {
            box =
                document.createElement(
                    "div"
                );

            box.id =
                "systemStatusBox";

            box.className =
                "system-status-box";

            panel.appendChild(
                box
            );
        }

        const server =
            data?.server ||
            {};

        const integration =
            data?.integration ||
            {};

        const modules =
            data?.modules ||
            [];

        box.innerHTML = `
            <div class="system-status-header">
                <strong>
                    ${
                        data?.status ===
                        "ready"
                            ? "Sistem hazır"
                            : "Sistem durumu"
                    }
                </strong>

                <span>
                    ${escapeHTML(
                        server.version ||
                        "40.0.0"
                    )}
                </span>
            </div>

            <div class="system-status-grid">

                <div>
                    <strong>Sunucu</strong>
                    <span>
                        ${escapeHTML(
                            server.name ||
                            "TürkAI Master Server"
                        )}
                    </span>
                </div>

                <div>
                    <strong>Node</strong>
                    <span>
                        ${escapeHTML(
                            server.node ||
                            "—"
                        )}
                    </span>
                </div>

                <div>
                    <strong>Çalışma süresi</strong>
                    <span>
                        ${escapeHTML(
                            server.uptimeSeconds ??
                            "—"
                        )}
                    </span>
                </div>

                <div>
                    <strong>Integration</strong>
                    <span>
                        ${escapeHTML(
                            integration.version ||
                            "—"
                        )}
                    </span>
                </div>

            </div>

            <div class="system-modules">
                ${
                    Array.isArray(
                        modules
                    )
                        ? modules
                              .map(
                                  module => `
                                    <span
                                        class="${
                                            module.state ||
                                            module.available
                                                ? "module-ready"
                                                : "module-off"
                                        }"
                                    >
                                        ${escapeHTML(
                                            module.key ||
                                            "module"
                                        )}
                                    </span>
                                `
                              )
                              .join("")
                        : ""
                }
            </div>
        `;
    }


    function bindSystemButton() {
        const button =
            id(
                "systemButton"
            );

        if (
            button &&
            button.dataset
                .turkaiPart2Bound !==
            "1"
        ) {
            button.dataset
                .turkaiPart2Bound =
                "1";

            button.addEventListener(
                "click",
                () => {
                    openAnyPanel(
                        "systemPanel"
                    );

                    loadSystemPanel();
                }
            );
        }
    }


    /* ========================================================
       2.23 - MEMORY BUTTON
    ======================================================== */

    function bindMemoryButton() {
        const button =
            id(
                "memoryButton"
            );

        if (
            button &&
            button.dataset
                .turkaiPart2Bound !==
            "1"
        ) {
            button.dataset
                .turkaiPart2Bound =
                "1";

            button.addEventListener(
                "click",
                () => {
                    openAnyPanel(
                        "memoryPanel"
                    );

                    const input =
                        getComposer();

                    if (
                        cleanText(
                            input?.value
                        )
                    ) {
                        searchMemory(
                            input.value
                        );
                    }
                }
            );
        }

        const tool =
            id(
                "memoryToolButton"
            );

        if (
            tool &&
            tool.dataset
                .turkaiPart2Bound !==
            "1"
        ) {
            tool.dataset
                .turkaiPart2Bound =
                "1";

            tool.addEventListener(
                "click",
                () => {
                    openAnyPanel(
                        "memoryPanel"
                    );

                    const query =
                        cleanText(
                            getComposer()
                                ?.value
                        );

                    if (
                        query
                    ) {
                        searchMemory(
                            query
                        );
                    }
                }
            );
        }
    }


    /* ========================================================
       2.24 - WEATHER BUTTON
    ======================================================== */

    function bindWeatherButton() {
        const button =
            id(
                "weatherToolButton"
            );

        if (
            !button ||
            button.dataset
                .turkaiPart2Bound ===
            "1"
        ) {
            return;
        }

        button.dataset
            .turkaiPart2Bound =
            "1";

        button.addEventListener(
            "click",
            () => {
                const query =
                    cleanText(
                        getComposer()
                            ?.value
                    );

                const city =
                    query
                        .replace(
                            /hava durumu/iu,
                            ""
                        )
                        .trim() ||
                    "Konya";

                getWeather(
                    city
                );
            }
        );
    }


    /* ========================================================
       2.25 - SIDEBAR / SETTINGS BUTTONS
    ======================================================== */

    function bindBasicPanels() {
        const mappings = {
            "researchButton":
                "researchPanel",

            "researchToolButton":
                "researchPanel",

            "memoryButton":
                "memoryPanel",

            "memoryToolButton":
                "memoryPanel",

            "fileButton":
                "fileCenterPanel",

            "notificationButton":
                "notificationPanel",

            "systemButton":
                "systemPanel"
        };

        Object.entries(
            mappings
        ).forEach(
            ([
                buttonId,
                panelId
            ]) => {
                const button =
                    id(
                        buttonId
                    );

                if (
                    !button ||
                    button.dataset
                        .turkaiPart2GenericBound ===
                    "1"
                ) {
                    return;
                }

                button.dataset
                    .turkaiPart2GenericBound =
                    "1";

                /*
                Specialized handler zaten bağlıysa
                genel handler eklemiyoruz.
                */

                if (
                    button.dataset
                        .turkaiPart2Bound ===
                    "1"
                ) {
                    return;
                }

                button.addEventListener(
                    "click",
                    () => {
                        openAnyPanel(
                            panelId
                        );
                    }
                );
            }
        );
    }


    /* ========================================================
       2.26 - MODAL CLOSE
    ======================================================== */

    function bindGlobalClose() {
        document.addEventListener(
            "click",
            event => {
                const close =
                    event.target.closest(
                        "[data-close], [data-close-modal], [data-modal-close]"
                    );

                if (
                    close
                ) {
                    const target =
                        close.dataset
                            .close ||
                        close.dataset
                            .closeModal ||
                        close.dataset
                            .modalClose;

                    if (
                        target
                    ) {
                        closeModalSafe(
                            target
                        );

                        closeAnyPanel(
                            target
                        );
                    }
                }

                if (
                    event.target.classList.contains(
                        "modal"
                    )
                ) {
                    event.target.classList.remove(
                        "active"
                    );
                }
            }
        );
    }


    /* ========================================================
       2.27 - FILE DRAG DROP
    ======================================================== */

    function bindDragDrop() {
        let dragCounter =
            0;

        const overlay =
            id(
                "dropOverlay"
            );

        document.addEventListener(
            "dragenter",
            event => {
                if (
                    !event.dataTransfer
                        ?.types?.includes(
                            "Files"
                        )
                ) {
                    return;
                }

                event.preventDefault();

                dragCounter++;

                overlay &&
                    (
                        overlay.hidden =
                            false
                    );
            }
        );

        document.addEventListener(
            "dragover",
            event => {
                if (
                    !event.dataTransfer
                        ?.types?.includes(
                            "Files"
                        )
                ) {
                    return;
                }

                event.preventDefault();
            }
        );

        document.addEventListener(
            "dragleave",
            event => {
                if (
                    !event.dataTransfer
                        ?.types?.includes(
                            "Files"
                        )
                ) {
                    return;
                }

                dragCounter--;

                if (
                    dragCounter <=
                    0
                ) {
                    dragCounter =
                        0;

                    if (
                        overlay
                    ) {
                        overlay.hidden =
                            true;
                    }
                }
            }
        );

        document.addEventListener(
            "drop",
            event => {
                if (
                    !event.dataTransfer
                        ?.files
                        ?.length
                ) {
                    return;
                }

                event.preventDefault();

                dragCounter =
                    0;

                if (
                    overlay
                ) {
                    overlay.hidden =
                        true;
                }

                uploadFiles(
                    event
                        .dataTransfer
                        .files
                );
            }
        );
    }


    /* ========================================================
       2.28 - SOCKET BRIDGE
    ======================================================== */

    function setupSocketBridge() {
        const socket =
            state.socket ||
            window.TURKAI?.state
                ?.socket;

        if (
            !socket ||
            socket._turkaiPart2Bound
        ) {
            return;
        }

        socket._turkaiPart2Bound =
            true;

        socket.on(
            "notification:new",
            payload => {
                renderNotifications({
                    items:
                        [
                            payload
                        ]
                });
            }
        );

        socket.on(
            "research:update",
            payload => {
                if (
                    payload
                ) {
                    renderResearchResult(
                        unwrap(
                            payload
                        ),
                        payload.query ||
                            ""
                    );
                }
            }
        );

        socket.on(
            "media:job",
            payload => {
                const target =
                    id(
                        "mediaStatus"
                    );

                if (
                    target
                ) {
                    target.textContent =
                        JSON.stringify(
                            payload,
                            null,
                            2
                        );
                }
            }
        );

        socket.on(
            "voice:job",
            payload => {
                const target =
                    id(
                        "voiceStatus"
                    );

                if (
                    target
                ) {
                    target.textContent =
                        JSON.stringify(
                            payload,
                            null,
                            2
                        );
                }
            }
        );

        socket.on(
            "turkai:event",
            payload => {
                window.dispatchEvent(
                    new CustomEvent(
                        "turkai:event",
                        {
                            detail:
                                payload
                        }
                    )
                );
            }
        );
    }


    /* ========================================================
       2.29 - PLAN SELECT EVENT
    ======================================================== */

    function bindPlanSelection() {
        document.addEventListener(
            "click",
            event => {
                const element =
                    event.target.closest(
                        "[data-plan-select]"
                    );

                if (
                    !element
                ) {
                    return;
                }

                event.preventDefault();

                selectPlan(
                    element.dataset
                        .planSelect
                );
            }
        );
    }


    /* ========================================================
       2.30 - MEDIA QUICK ACTIONS
    ======================================================== */

    function bindMediaQuickActions() {
        $$(
            "[data-generate-image]"
        ).forEach(
            button => {
                if (
                    button.dataset
                        .turkaiMediaBound
                ) {
                    return;
                }

                button.dataset
                    .turkaiMediaBound =
                    "1";

                button.addEventListener(
                    "click",
                    () => {
                        generateImage(
                            button.dataset
                                .generateImage
                        );
                    }
                );
            }
        );

        $$(
            "[data-generate-video]"
        ).forEach(
            button => {
                if (
                    button.dataset
                        .turkaiMediaBound
                ) {
                    return;
                }

                button.dataset
                    .turkaiMediaBound =
                    "1";

                button.addEventListener(
                    "click",
                    () => {
                        generateVideo(
                            button.dataset
                                .generateVideo
                        );
                    }
                );
            }
        );
    }


    /* ========================================================
       2.31 - LAST ASSISTANT MESSAGE -> TTS
    ======================================================== */

    function bindSpeakButtons() {
        document.addEventListener(
            "click",
            event => {
                const button =
                    event.target.closest(
                        "[data-speak-message], [data-action='speak-message']"
                    );

                if (
                    !button
                ) {
                    return;
                }

                const messageId =
                    button.dataset
                        .speakMessage ||
                    button.dataset
                        .messageId;

                let message =
                    null;

                if (
                    messageId
                ) {
                    message =
                        state.messages.find(
                            item =>
                                item.id ===
                                messageId
                        );
                }

                const content =
                    message?.content ||
                    button.dataset
                        .text ||
                    "";

                speakText(
                    content
                );
            }
        );
    }


    /* ========================================================
       2.32 - ESC / SHORT PANELS
    ======================================================== */

    function bindEscapePanels() {
        document.addEventListener(
            "keydown",
            event => {
                if (
                    event.key !==
                    "Escape"
                ) {
                    return;
                }

                $$(".modal.active").forEach(
                    modal => {
                        modal.classList.remove(
                            "active"
                        );
                    }
                );

                $$(".panel.active").forEach(
                    panel => {
                        panel.classList.remove(
                            "active"
                        );
                    }
                );
            }
        );
    }


    /* ========================================================
       2.33 - AUTO SAVE
    ======================================================== */

    function autoSaveState() {
        try {
            const payload = {
                conversationId:
                    state.conversationId ||
                    null,

                messages:
                    Array.isArray(
                        state.messages
                    )
                        ? state.messages.slice(
                              -200
                          )
                        : [],

                user:
                    state.user ||
                    null,

                currentModel:
                    state.currentModel ||
                    "auto",

                savedAt:
                    new Date()
                        .toISOString()
            };

            localStorage.setItem(
                "turkai_frontend_backup_v40",
                JSON.stringify(
                    payload
                )
            );
        } catch {}
    }


    function restoreFrontendBackup() {
        try {
            const raw =
                localStorage.getItem(
                    "turkai_frontend_backup_v40"
                );

            if (
                !raw
            ) {
                return;
            }

            const saved =
                JSON.parse(
                    raw
                );

            if (
                !state.conversationId &&
                saved.conversationId
            ) {
                state.conversationId =
                    saved.conversationId;
            }

            if (
                (!Array.isArray(
                    state.messages
                ) ||
                state.messages.length ===
                    0) &&
                Array.isArray(
                    saved.messages
                )
            ) {
                state.messages =
                    saved.messages;
            }

            if (
                !state.user &&
                saved.user
            ) {
                state.user =
                    saved.user;
            }
        } catch {}
    }


    /* ========================================================
       2.34 - DRAFT RESTORE
    ======================================================== */

    function restoreDraft() {
        const input =
            getComposer();

        if (
            !input ||
            input.value
        ) {
            return;
        }

        try {
            const raw =
                localStorage.getItem(
                    "turkai_draft_v40"
                );

            if (
                raw
            ) {
                const saved =
                    parseJSON(
                        raw,
                        {}
                    );

                input.value =
                    saved.value ||
                    "";

                input.dispatchEvent(
                    new Event(
                        "input",
                        {
                            bubbles:
                                true
                        }
                    )
                );
            }
        } catch {}
    }


    function bindDraftSaver() {
        const input =
            getComposer();

        if (
            !input ||
            input.dataset
                .turkaiDraftBound ===
            "1"
        ) {
            return;
        }

        input.dataset
            .turkaiDraftBound =
            "1";

        let timer =
            null;

        input.addEventListener(
            "input",
            () => {
                window.clearTimeout(
                    timer
                );

                timer =
                    window.setTimeout(
                        () => {
                            storageDraft(
                                input.value
                            );
                        },
                        300
                    );
            }
        );
    }


    function storageDraft(
        value
    ) {
        try {
            localStorage.setItem(
                "turkai_draft_v40",
                JSON.stringify({
                    value:
                        text(
                            value
                        ),

                    updatedAt:
                        Date.now()
                })
            );
        } catch {}
    }


    /* ========================================================
       2.35 - COMPOSER FINDER
    ======================================================== */

    function getComposer() {
        return (
            id(
                "messageInput"
            ) ||
            id(
                "chatInput"
            ) ||
            $(
                "textarea"
            )
        );
    }


    /* ========================================================
       2.36 - GENERIC ACTION BUTTONS
    ======================================================== */

    function bindActionButtons() {
        const map = {
            "new-chat":
                () => {
                    if (
                        typeof CORE.clearChat ===
                        "function"
                    ) {
                        CORE.clearChat();
                    }

                    state.messages =
                        [];

                    state.conversationId =
                        null;

                    fallbackRenderMessages();
                },

            "open-research":
                () => {
                    openAnyPanel(
                        "researchPanel"
                    );
                },

            "open-memory":
                () => {
                    openAnyPanel(
                        "memoryPanel"
                    );
                },

            "open-files":
                () => {
                    openAnyPanel(
                        "fileCenterPanel"
                    );

                    loadFiles();
                },

            "open-notifications":
                () => {
                    openAnyPanel(
                        "notificationPanel"
                    );

                    loadNotifications();
                },

            "open-system":
                () => {
                    openAnyPanel(
                        "systemPanel"
                    );

                    loadSystemPanel();
                },

            "open-plans":
                () => {
                    openModalSafe(
                        "plansModal"
                    );

                    loadPlans();
                },

            "open-image":
                () => {
                    openModalSafe(
                        "imageCreateModal"
                    );
                },

            "open-video":
                () => {
                    openModalSafe(
                        "videoModal"
                    );
                },

            "open-login":
                () => {
                    if (
                        typeof CORE.login ===
                        "function"
                    ) {
                        CORE.login();
                    }
                },

            "admin":
                () => {
                    if (
                        typeof CORE.admin ===
                        "function"
                    ) {
                        CORE.admin();
                    }
                },

            "speak":
                () => {
                    const latest =
                        state.messages[
                            state.messages.length -
                            1
                        ];

                    if (
                        latest?.content
                    ) {
                        speakText(
                            latest.content
                        );
                    }
                }
        };

        document.addEventListener(
            "click",
            event => {
                const element =
                    event.target.closest(
                        "[data-action]"
                    );

                if (
                    !element
                ) {
                    return;
                }

                const action =
                    element.dataset
                        .action;

                const handler =
                    map[action];

                if (
                    typeof handler !==
                    "function"
                ) {
                    return;
                }

                /*
                Part 1'in kendi handler'ını
                bozmamak için yalnızca özel
                ikinci işlemleri burada ele al.
                */

                if (
                    [
                        "open-research",
                        "open-memory",
                        "open-files",
                        "open-notifications",
                        "open-system",
                        "open-plans",
                        "open-image",
                        "open-video",
                        "admin",
                        "speak"
                    ].includes(
                        action
                    )
                ) {
                    event.preventDefault();

                    try {
                        handler();
                    } catch (
                        error
                    ) {
                        notify(
                            error.message ||
                                "İşlem başarısız.",
                            "error"
                        );
                    }
                }
            }
        );
    }


    /* ========================================================
       2.37 - ACCOUNT CARD
    ======================================================== */

    function bindAccountCard() {
        const button =
            id(
                "accountButton"
            );

        if (
            !button ||
            button.dataset
                .turkaiPart2AccountBound ===
            "1"
        ) {
            return;
        }

        button.dataset
            .turkaiPart2AccountBound =
            "1";

        button.addEventListener(
            "click",
            () => {
                loadAccount();

                if (
                    typeof CORE.login ===
                    "function"
                ) {
                    CORE.login();
                }
            }
        );
    }


    /* ========================================================
       2.38 - AUTH STATUS
    ======================================================== */

    async function refreshAuthentication() {
        if (
            !state.sessionToken
        ) {
            updateAccountInformation();

            return null;
        }

        const data =
            await loadAccount();

        if (
            data
        ) {
            state.authenticated =
                true;
        }

        return data;
    }


    /* ========================================================
       2.39 - CONNECTION WATCHDOG
    ======================================================== */

    let connectionTimer =
        null;

    function startConnectionWatchdog() {
        if (
            connectionTimer
        ) {
            return;
        }

        connectionTimer =
            window.setInterval(
                async () => {
                    if (
                        document.hidden
                    ) {
                        return;
                    }

                    try {
                        const result =
                            await api(
                                "/system/status",
                                {
                                    method:
                                        "GET",

                                    timeout:
                                        8000
                                }
                            );

                        state.connected =
                            Boolean(
                                result.data
                                    ?.ok ||
                                result.data
                                    ?.status ===
                                    "ready"
                            );

                        updateConnectionDot(
                            state.connected
                        );
                    } catch {
                        state.connected =
                            false;

                        updateConnectionDot(
                            false
                        );
                    }
                },
                30000
            );

        if (
            typeof connectionTimer.unref ===
            "function"
        ) {
            connectionTimer.unref();
        }
    }


    function updateConnectionDot(
        connected
    ) {
        const elements = [
            id(
                "connectionStatus"
            ),
            id(
                "serverStatus"
            ),
            $(
                ".connection-status"
            )
        ].filter(
            Boolean
        );

        elements.forEach(
            element => {
                element.dataset.state =
                    connected
                        ? "online"
                        : "offline";

                element.classList.toggle(
                    "online",
                    connected
                );

                element.classList.toggle(
                    "offline",
                    !connected
                );
            }
        );
    }


    /* ========================================================
       2.40 - WINDOW EVENTS
    ======================================================== */

    function bindWindowEvents() {
        window.addEventListener(
            "online",
            () => {
                state.online =
                    true;

                notify(
                    "İnternet bağlantısı geri geldi.",
                    "success",
                    1800
                );

                startConnectionWatchdog();
            }
        );

        window.addEventListener(
            "offline",
            () => {
                state.online =
                    false;

                notify(
                    "İnternet bağlantısı kesildi.",
                    "error",
                    2200
                );
            }
        );

        document.addEventListener(
            "visibilitychange",
            () => {
                if (
                    document.hidden
                ) {
                    autoSaveState();
                    return;
                }

                refreshAuthentication()
                    .catch(
                        () => {}
                    );

                startConnectionWatchdog();
            }
        );

        window.addEventListener(
            "beforeunload",
            () => {
                autoSaveState();
            }
        );
    }


    /* ========================================================
       2.41 - PUBLIC API
    ======================================================== */

    window.TURKAI =
        window.TURKAI || {};

    Object.assign(
        window.TURKAI,
        {
            research:
                runResearch,

            weather:
                getWeather,

            memorySearch:
                searchMemory,

            memorySave:
                saveMemory,

            upload:
                uploadFiles,

            files:
                loadFiles,

            speak:
                speakText,

            stopSpeaking,

            voice:
                toggleVoice,

            image:
                generateImage,

            video:
                generateVideo,

            conversations:
                loadConversations,

            openConversation:
                loadConversation,

            searchConversations,

            account:
                loadAccount,

            plans:
                loadPlans,

            selectPlan,

            system:
                loadSystemPanel,

            notifications:
                loadNotifications
        }
    );


    /* ========================================================
       2.42 - INITIALIZATION
    ======================================================== */

    async function initPart2() {
        restoreFrontendBackup();

        restoreDraft();

        bindResearchButton();
        bindWeatherButton();
        bindMemoryButton();
        bindFileButton();
        bindVoiceButton();
        bindImageButton();
        bindVideoButton();

        bindPlans();
        bindPlanSelection();

        bindNotifications();
        bindSystemButton();

        bindBasicPanels();
        bindGlobalClose();
        bindDragDrop();

        bindConversationList();
        bindConversationSearch();

        bindSpeakButtons();
        bindEscapePanels();

        bindMediaQuickActions();
        bindActionButtons();

        bindAccountCard();

        bindDraftSaver();
        bindWindowEvents();

        setupSocketBridge();

        updateAccountInformation();

        /*
        Ağır işlemleri ilk render'ın önüne koymuyoruz.
        */

        window.setTimeout(
            () => {
                loadConversations().catch(
                    () => {}
                );
            },
            500
        );

        window.setTimeout(
            () => {
                loadPlans().catch(
                    () => {}
                );
            },
            700
        );

        window.setTimeout(
            () => {
                refreshAuthentication().catch(
                    () => {}
                );
            },
            900
        );

        startConnectionWatchdog();

        console.log(
            "TürkAI app.js Part 2/3 hazır."
        );

        console.log(
            "[TürkAI] Research       : ACTIVE"
        );

        console.log(
            "[TürkAI] Weather        : ACTIVE"
        );

        console.log(
            "[TürkAI] Memory         : ACTIVE"
        );

        console.log(
            "[TürkAI] Files          : ACTIVE"
        );

        console.log(
            "[TürkAI] Voice          : ACTIVE"
        );

        console.log(
            "[TürkAI] Image          : ACTIVE"
        );

        console.log(
            "[TürkAI] Video          : ACTIVE"
        );

        console.log(
            "[TürkAI] Conversations   : ACTIVE"
        );

        console.log(
            "[TürkAI] Plans           : ACTIVE"
        );

        console.log(
            "[TürkAI] Notifications   : ACTIVE"
        );

        console.log(
            "[TürkAI] System monitor  : ACTIVE"
        );
    }


    /* ========================================================
       2.43 - SAFE START
    ======================================================== */

    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            initPart2,
            {
                once: true
            }
        );
    } else {
        initPart2();
    }

})();
/* ============================================================
   TÜRKAI FRONTEND ENGINE 40.0
   APP.JS — PART 3 / 3
   ADVANCED UI + ADMIN BRIDGE + COMMAND CENTER
   SHORTCUTS + SEARCH + DRAFTS + AUTOSAVE
   MOBILE + SOCKET + ERROR RECOVERY + FINAL BOOT
============================================================ */

(() => {
    "use strict";

    const TURKAI =
        window.TURKAI ||
        {};

    const state =
        TURKAI.state ||
        {};

    const app =
        TURKAI.app ||
        {};

    const $ = (
        selector,
        root = document
    ) => {
        try {
            return root.querySelector(
                selector
            );
        } catch {
            return null;
        }
    };

    const $$ = (
        selector,
        root = document
    ) => {
        try {
            return [
                ...root.querySelectorAll(
                    selector
                )
            ];
        } catch {
            return [];
        }
    };

    const el = id =>
        document.getElementById(
            id
        );

    const safeText = (
        value,
        fallback = ""
    ) => {
        if (
            value ===
                null ||
            value ===
                undefined
        ) {
            return fallback;
        }

        return String(
            value
        );
    };

    const cleanText = value =>
        safeText(
            value
        )
            .normalize(
                "NFKC"
            )
            .trim();

    const escapeHTML = value =>
        safeText(
            value
        )
            .replaceAll(
                "&",
                "&amp;"
            )
            .replaceAll(
                "<",
                "&lt;"
            )
            .replaceAll(
                ">",
                "&gt;"
            )
            .replaceAll(
                '"',
                "&quot;"
            )
            .replaceAll(
                "'",
                "&#039;"
            );

    const toast =
        typeof TURKAI.toast ===
        "function"
            ? TURKAI.toast
            : (
                  message
              ) => {
                  console.log(
                      "[TürkAI]",
                      message
                  );
              };


    /* ========================================================
       3.0 - APP STATE EXTENSION
    ======================================================== */

    state.part3 =
        state.part3 ||
        {
            commandOpen:
                false,

            searchOpen:
                false,

            keyboardHelpOpen:
                false,

            mobileMenuOpen:
                false,

            autosaveTimer:
                null,

            healthTimer:
                null,

            draftTimer:
                null,

            searchTimer:
                null,

            commandResults:
                [],

            lastHealth:
                null,

            adminActions:
                {},

            initialized:
                false,

            eventBound:
                false
        };


    /* ========================================================
       3.1 - LOCAL STORAGE
    ======================================================== */

    const STORAGE = {
        draft:
            "turkai_draft_v40",

        shortcuts:
            "turkai_shortcuts_v40",

        recentCommands:
            "turkai_recent_commands_v40",

        recentSearch:
            "turkai_recent_search_v40",

        ui:
            "turkai_ui_v40",

        admin:
            "turkai_admin_v40",

        backup:
            "turkai_app_backup_v40"
    };


    function storageGet(
        key,
        fallback = null
    ) {
        try {
            const raw =
                localStorage.getItem(
                    key
                );

            if (
                raw ===
                null
            ) {
                return fallback;
            }

            try {
                return JSON.parse(
                    raw
                );
            } catch {
                return raw;
            }
        } catch {
            return fallback;
        }
    }


    function storageSet(
        key,
        value
    ) {
        try {
            localStorage.setItem(
                key,
                typeof value ===
                    "string"
                    ? value
                    : JSON.stringify(
                          value
                      )
            );

            return true;
        } catch {
            return false;
        }
    }


    function storageRemove(
        key
    ) {
        try {
            localStorage.removeItem(
                key
            );

            return true;
        } catch {
            return false;
        }
    }


    /* ========================================================
       3.2 - API BRIDGE
    ======================================================== */

    async function api(
        url,
        options = {}
    ) {
        if (
            typeof TURKAI.api ===
            "function"
        ) {
            try {
                return (
                    await TURKAI.api(
                        url,
                        options
                    )
                ).data;
            } catch (
                error
            ) {
                throw error;
            }
        }

        const endpoint =
            url.startsWith(
                "/"
            )
                ? url
                : `/api/${url}`;

        const headers = {
            Accept:
                "application/json",
            ...(options.headers ||
                {})
        };

        if (
            options.json !==
            undefined
        ) {
            headers[
                "Content-Type"
            ] =
                "application/json";
        }

        if (
            state.sessionToken
        ) {
            headers.Authorization =
                `Bearer ${state.sessionToken}`;
        }

        let response;

        try {
            response =
                await fetch(
                    endpoint,
                    {
                        method:
                            (
                                options.method ||
                                "GET"
                            ).toUpperCase(),

                        headers,

                        body:
                            options.json !==
                            undefined
                                ? JSON.stringify(
                                      options.json
                                  )
                                : options.body,

                        credentials:
                            "same-origin",

                        signal:
                            options.signal
                    }
                );
        } catch (
            error
        ) {
            throw new Error(
                error?.message ||
                    "Sunucuya bağlanılamadı."
            );
        }

        const raw =
            await response.text();

        let data;

        try {
            data =
                JSON.parse(
                    raw
                );
        } catch {
            data =
                raw;
        }

        if (
            !response.ok
        ) {
            const error =
                new Error(
                    data?.message ||
                    data?.error ||
                    `HTTP ${response.status}`
                );

            error.status =
                response.status;

            error.data =
                data;

            throw error;
        }

        return data;
    }


    /* ========================================================
       3.3 - GENERIC PANEL
    ======================================================== */

    function openPanel(
        id
    ) {
        const panel =
            el(id);

        if (
            !panel
        ) {
            return false;
        }

        $$(".panel.active").forEach(
            current => {
                if (
                    current !==
                    panel
                ) {
                    current.classList.remove(
                        "active"
                    );

                    current.setAttribute(
                        "aria-hidden",
                        "true"
                    );
                }
            }
        );

        panel.classList.add(
            "active"
        );

        panel.hidden =
            false;

        panel.setAttribute(
            "aria-hidden",
            "false"
        );

        return true;
    }


    function closePanel(
        id
    ) {
        const panel =
            el(id);

        if (
            !panel
        ) {
            return false;
        }

        panel.classList.remove(
            "active"
        );

        panel.setAttribute(
            "aria-hidden",
            "true"
        );

        return true;
    }


    function openModal(
        id
    ) {
        const modal =
            el(id);

        if (
            !modal
        ) {
            return false;
        }

        modal.hidden =
            false;

        modal.classList.add(
            "active"
        );

        modal.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.classList.add(
            "modal-open"
        );

        return true;
    }


    function closeModal(
        id
    ) {
        const modal =
            el(id);

        if (
            !modal
        ) {
            return false;
        }

        modal.classList.remove(
            "active"
        );

        modal.setAttribute(
            "aria-hidden",
            "true"
        );

        modal.hidden =
            true;

        if (
            !$(".modal.active")
        ) {
            document.body.classList.remove(
                "modal-open"
            );
        }

        return true;
    }


    /* ========================================================
       3.4 - COMMAND CENTER
    ======================================================== */

    const COMMANDS = [
        {
            id:
                "new-chat",

            title:
                "Yeni sohbet",

            description:
                "Boş bir sohbet başlat",

            keywords:
                "yeni sohbet temizle chat"
        },

        {
            id:
                "research",

            title:
                "İnternet araştırması",

            description:
                "Web üzerinde araştır",

            keywords:
                "araştır internet web kaynak haber"
        },

        {
            id:
                "weather",

            title:
                "Hava durumu",

            description:
                "Şehir hava durumunu getir",

            keywords:
                "hava sıcaklık yağmur meteoroloji"
        },

        {
            id:
                "memory",

            title:
                "Cevap hafızası",

            description:
                "Hafızada arama yap",

            keywords:
                "memory hafıza cevap kayıt"
        },

        {
            id:
                "files",

            title:
                "Dosyalar",

            description:
                "Dosya merkezini aç",

            keywords:
                "dosya upload yükle belge"
        },

        {
            id:
                "image",

            title:
                "Görsel oluştur",

            description:
                "Yapay zekâ ile görsel üret",

            keywords:
                "görsel resim image"
        },

        {
            id:
                "video",

            title:
                "Video oluştur",

            description:
                "Video üretim ekranını aç",

            keywords:
                "video film"
        },

        {
            id:
                "plans",

            title:
                "Planlar",

            description:
                "TürkAI planlarını görüntüle",

            keywords:
                "plan pro plus ultra satın alma"
        },

        {
            id:
                "notifications",

            title:
                "Bildirimler",

            description:
                "Bildirim merkezini aç",

            keywords:
                "bildirim notification"
        },

        {
            id:
                "system",

            title:
                "Sistem durumu",

            description:
                "Sunucu ve modülleri kontrol et",

            keywords:
                "sistem status health server"
        },

        {
            id:
                "settings",

            title:
                "Ayarlar",

            description:
                "TürkAI ayarlarını aç",

            keywords:
                "ayar settings tema"
        },

        {
            id:
                "account",

            title:
                "Hesap",

            description:
                "Hesap ekranını aç",

            keywords:
                "hesap giriş login account"
        },

        {
            id:
                "admin",

            title:
                "Yönetici girişi",

            description:
                "Yönetici doğrulama ekranını aç",

            keywords:
                "admin yönetici yönetim"
        }
    ];


    function ensureCommandCenter() {
        let panel =
            el(
                "turkaiCommandCenter"
            );

        if (
            panel
        ) {
            return panel;
        }

        panel =
            document.createElement(
                "section"
            );

        panel.id =
            "turkaiCommandCenter";

        panel.className =
            "panel turkai-command-center";

        panel.setAttribute(
            "aria-hidden",
            "true"
        );

        panel.innerHTML = `
            <div class="panel-header">
                <div>
                    <strong>TürkAI Komut Merkezi</strong>
                    <small>Komut ara veya bir işlem seç</small>
                </div>

                <button
                    type="button"
                    class="panel-close"
                    data-part3-close-command
                >
                    ×
                </button>
            </div>

            <div class="command-search-wrap">
                <input
                    id="turkaiCommandInput"
                    type="search"
                    autocomplete="off"
                    placeholder="Komut ara..."
                >
            </div>

            <div
                id="turkaiCommandResults"
                class="command-results"
            ></div>
        `;

        const target =
            $(
                ".workspace"
            ) ||
            $(
                "main"
            ) ||
            document.body;

        target.appendChild(
            panel
        );

        return panel;
    }


    function renderCommands(
        query = ""
    ) {
        const results =
            el(
                "turkaiCommandResults"
            );

        if (
            !results
        ) {
            return;
        }

        const search =
            cleanText(
                query
            )
                .toLocaleLowerCase(
                    "tr-TR"
                );

        const items =
            COMMANDS.filter(
                command => {
                    if (
                        !search
                    ) {
                        return true;
                    }

                    const haystack =
                        (
                            command.title +
                            " " +
                            command.description +
                            " " +
                            command.keywords
                        ).toLocaleLowerCase(
                            "tr-TR"
                        );

                    return haystack.includes(
                        search
                    );
                }
            );

        state.part3.commandResults =
            items;

        results.innerHTML =
            items
                .map(
                    command => `
                        <button
                            type="button"
                            class="command-result"
                            data-command="${escapeHTML(
                                command.id
                            )}"
                        >
                            <span class="command-result-title">
                                ${escapeHTML(
                                    command.title
                                )}
                            </span>

                            <small>
                                ${escapeHTML(
                                    command.description
                                )}
                            </small>
                        </button>
                    `
                )
                .join("");

        if (
            !items.length
        ) {
            results.innerHTML =
                `
                    <div class="command-empty">
                        Komut bulunamadı.
                    </div>
                `;
        }
    }


    function openCommandCenter() {
        ensureCommandCenter();

        renderCommands(
            ""
        );

        openPanel(
            "turkaiCommandCenter"
        );

        state.part3.commandOpen =
            true;

        window.setTimeout(
            () => {
                el(
                    "turkaiCommandInput"
                )?.focus();
            },
            50
        );
    }


    function closeCommandCenter() {
        closePanel(
            "turkaiCommandCenter"
        );

        state.part3.commandOpen =
            false;
    }


    async function executeCommand(
        commandId
    ) {
        switch (
            commandId
        ) {
            case "new-chat":
                TURKAI.clearChat?.();
                closeCommandCenter();
                break;

            case "research":
                openPanel(
                    "researchPanel"
                );
                closeCommandCenter();
                break;

            case "weather":
                if (
                    typeof TURKAI.weather ===
                    "function"
                ) {
                    await TURKAI.weather();
                }
                closeCommandCenter();
                break;

            case "memory":
                openPanel(
                    "memoryPanel"
                );
                closeCommandCenter();
                break;

            case "files":
                openPanel(
                    "fileCenterPanel"
                );

                TURKAI.files?.();

                closeCommandCenter();
                break;

            case "image":
                openModal(
                    "imageCreateModal"
                );

                closeCommandCenter();
                break;

            case "video":
                openModal(
                    "videoModal"
                );

                closeCommandCenter();
                break;

            case "plans":
                openModal(
                    "plansModal"
                );

                TURKAI.plans?.();

                closeCommandCenter();
                break;

            case "notifications":
                openPanel(
                    "notificationPanel"
                );

                TURKAI.notifications?.();

                closeCommandCenter();
                break;

            case "system":
                openPanel(
                    "systemPanel"
                );

                TURKAI.system?.();

                closeCommandCenter();
                break;

            case "settings":
                openModal(
                    "settingsModal"
                );

                closeCommandCenter();
                break;

            case "account":
                TURKAI.login?.();

                closeCommandCenter();
                break;

            case "admin":
                TURKAI.admin?.();

                closeCommandCenter();
                break;

            default:
                break;
        }

        const recent =
            storageGet(
                STORAGE.recentCommands,
                []
            );

        const updated =
            [
                commandId,
                ...(
                    Array.isArray(
                        recent
                    )
                        ? recent
                        : []
                ).filter(
                    item =>
                        item !==
                        commandId
                )
            ].slice(
                0,
                20
            );

        storageSet(
            STORAGE.recentCommands,
            updated
        );
    }


    /* ========================================================
       3.5 - SLASH COMMANDS
    ======================================================== */

    function parseSlashCommand(
        value
    ) {
        const input =
            cleanText(
                value
            );

        if (
            !input.startsWith(
                "/"
            )
        ) {
            return null;
        }

        const parts =
            input
                .slice(1)
                .split(/\s+/);

        const command =
            (
                parts.shift() ||
                ""
            ).toLocaleLowerCase(
                "tr-TR"
            );

        return {
            command,

            args:
                parts,

            raw:
                input
        };
    }


    async function executeSlashCommand(
        value
    ) {
        const parsed =
            parseSlashCommand(
                value
            );

        if (
            !parsed
        ) {
            return false;
        }

        switch (
            parsed.command
        ) {
            case "new":
            case "newchat":
            case "clear":
                TURKAI.clearChat?.();
                return true;

            case "research":
            case "araştır":
                if (
                    typeof TURKAI.research ===
                    "function"
                ) {
                    await TURKAI.research(
                        parsed.args.join(
                            " "
                        )
                    );
                }
                return true;

            case "weather":
            case "hava":
                if (
                    typeof TURKAI.weather ===
                    "function"
                ) {
                    await TURKAI.weather(
                        parsed.args.join(
                            " "
                        )
                    );
                }
                return true;

            case "memory":
            case "hafıza":
                if (
                    typeof TURKAI.memorySearch ===
                    "function"
                ) {
                    await TURKAI.memorySearch(
                        parsed.args.join(
                            " "
                        )
                    );
                }
                return true;

            case "files":
            case "dosya":
                openPanel(
                    "fileCenterPanel"
                );
                return true;

            case "image":
            case "gorsel":
            case "görsel":
                openModal(
                    "imageCreateModal"
                );
                return true;

            case "video":
                openModal(
                    "videoModal"
                );
                return true;

            case "plans":
            case "plan":
                openModal(
                    "plansModal"
                );
                return true;

            case "settings":
            case "ayar":
                openModal(
                    "settingsModal"
                );
                return true;

            case "system":
            case "sistem":
                openPanel(
                    "systemPanel"
                );

                TURKAI.system?.();

                return true;

            case "admin":
                TURKAI.admin?.();
                return true;

            case "help":
            case "yardım":
                openCommandCenter();
                return true;

            default:
                toast(
                    "Bilinmeyen komut. Komut merkezini açmak için Ctrl+K kullan.",
                    "info"
                );

                return true;
        }
    }


    /* ========================================================
       3.6 - ADVANCED CHAT SEARCH
    ======================================================== */

    function ensureSearchPanel() {
        let panel =
            el(
                "turkaiChatSearchPanel"
            );

        if (
            panel
        ) {
            return panel;
        }

        panel =
            document.createElement(
                "section"
            );

        panel.id =
            "turkaiChatSearchPanel";

        panel.className =
            "turkai-search-panel";

        panel.innerHTML = `
            <div class="turkai-search-inner">

                <div class="turkai-search-head">
                    <strong>
                        Sohbetlerde ara
                    </strong>

                    <button
                        type="button"
                        data-part3-close-search
                    >
                        ×
                    </button>
                </div>

                <input
                    id="turkaiLocalSearchInput"
                    type="search"
                    placeholder="Mesajlarda ara..."
                    autocomplete="off"
                >

                <div
                    id="turkaiLocalSearchResults"
                    class="turkai-local-search-results"
                ></div>

            </div>
        `;

        document.body.appendChild(
            panel
        );

        return panel;
    }


    function searchLocalMessages(
        query
    ) {
        const value =
            cleanText(
                query
            )
                .toLocaleLowerCase(
                    "tr-TR"
                );

        const results =
            state.messages.filter(
                message =>
                    cleanText(
                        message.content ||
                        message.text ||
                        ""
                    )
                        .toLocaleLowerCase(
                            "tr-TR"
                        )
                        .includes(
                            value
                        )
            );

        return results;
    }


    function renderLocalSearch(
        query
    ) {
        const results =
            el(
                "turkaiLocalSearchResults"
            );

        if (
            !results
        ) {
            return;
        }

        if (
            !cleanText(
                query
            )
        ) {
            results.innerHTML =
                `
                    <div class="search-empty">
                        Aramak için yazmaya başla.
                    </div>
                `;

            return;
        }

        const items =
            searchLocalMessages(
                query
            );

        results.innerHTML =
            items
                .slice(
                    0,
                    100
                )
                .map(
                    message => `
                        <button
                            type="button"
                            class="local-search-result"
                            data-message-target="${escapeHTML(
                                message.id
                            )}"
                        >
                            <strong>
                                ${
                                    message.role ===
                                    "user"
                                        ? "Sen"
                                        : "TürkAI"
                                }
                            </strong>

                            <span>
                                ${escapeHTML(
                                    message.content ||
                                    ""
                                )}
                            </span>
                        </button>
                    `
                )
                .join("");

        if (
            !items.length
        ) {
            results.innerHTML =
                `
                    <div class="search-empty">
                        Sonuç bulunamadı.
                    </div>
                `;
        }
    }


    function openSearchPanel() {
        ensureSearchPanel();

        const panel =
            el(
                "turkaiChatSearchPanel"
            );

        panel.classList.add(
            "active"
        );

        state.part3.searchOpen =
            true;

        window.setTimeout(
            () => {
                el(
                    "turkaiLocalSearchInput"
                )?.focus();
            },
            50
        );
    }


    function closeSearchPanel() {
        el(
            "turkaiChatSearchPanel"
        )?.classList.remove(
            "active"
        );

        state.part3.searchOpen =
            false;
    }


    function focusMessage(
        messageId
    ) {
        const node =
            document.querySelector(
                `[data-message-id="${CSS.escape(
                    messageId
                )}"]`
            );

        if (
            !node
        ) {
            return;
        }

        node.scrollIntoView(
            {
                behavior:
                    "smooth",

                block:
                    "center"
            }
        );

        node.classList.add(
            "search-highlight"
        );

        window.setTimeout(
            () => {
                node.classList.remove(
                    "search-highlight"
                );
            },
            1800
        );
    }


    /* ========================================================
       3.7 - AUTOSAVE
    ======================================================== */

    function getComposer() {
        return (
            el(
                "messageInput"
            ) ||
            el(
                "chatInput"
            ) ||
            $(
                "textarea"
            )
        );
    }


    function saveDraft() {
        const input =
            getComposer();

        if (
            !input
        ) {
            return;
        }

        const value =
            safeText(
                input.value
            );

        state.draft =
            value;

        storageSet(
            STORAGE.draft,
            {
                value,

                updatedAt:
                    new Date()
                        .toISOString()
            }
        );
    }


    function restoreDraft() {
        const input =
            getComposer();

        if (
            !input ||
            input.value
        ) {
            return;
        }

        const saved =
            storageGet(
                STORAGE.draft,
                null
            );

        const value =
            typeof saved ===
            "string"
                ? saved
                : saved?.value ||
                  "";

        if (
            value
        ) {
            input.value =
                value;

            input.dispatchEvent(
                new Event(
                    "input",
                    {
                        bubbles:
                            true
                    }
                )
            );
        }
    }


    function clearDraft() {
        storageRemove(
            STORAGE.draft
        );

        state.draft =
            "";
    }


    function startAutosave() {
        if (
            state.part3.autosaveTimer
        ) {
            return;
        }

        state.part3.autosaveTimer =
            window.setInterval(
                () => {
                    saveDraft();
                    backupApplication();
                },
                5000
            );
    }


    /* ========================================================
       3.8 - APPLICATION BACKUP
    ======================================================== */

    function backupApplication() {
        try {
            const backup = {
                version:
                    "40.0.0",

                user:
                    state.user ||
                    null,

                conversationId:
                    state.conversationId ||
                    null,

                messages:
                    Array.isArray(
                        state.messages
                    )
                        ? state.messages.slice(
                              -200
                          )
                        : [],

                timestamp:
                    new Date()
                        .toISOString()
            };

            storageSet(
                STORAGE.backup,
                backup
            );
        } catch {}
    }


    function restoreBackup() {
        const backup =
            storageGet(
                STORAGE.backup,
                null
            );

        if (
            !backup ||
            !Array.isArray(
                backup.messages
            )
        ) {
            return;
        }

        if (
            state.messages?.length
        ) {
            return;
        }

        state.messages =
            backup.messages;

        if (
            !state.conversationId &&
            backup.conversationId
        ) {
            state.conversationId =
                backup.conversationId;
        }

        if (
            typeof TURKAI.refreshStatus ===
            "function"
        ) {
            /*
            State ortak tutulduğu için sadece
            mesaj renderını tetiklemeye çalışıyoruz.
            */
        }
    }


    /* ========================================================
       3.9 - MODEL SELECT
    ======================================================== */

    function bindModelSelectors() {
        $$(
            "select[name='model'], #modelSelect, [data-model-select]"
        ).forEach(
            select => {
                if (
                    select.dataset
                        .part3Bound
                ) {
                    return;
                }

                select.dataset
                    .part3Bound =
                    "1";

                if (
                    state.currentModel
                ) {
                    try {
                        select.value =
                            state.currentModel;
                    } catch {}
                }

                select.addEventListener(
                    "change",
                    () => {
                        state.currentModel =
                            select.value;

                        storageSet(
                            "turkai_model_v40",
                            state.currentModel
                        );
                    }
                );
            }
        );
    }


    /* ========================================================
       3.10 - KEYBOARD SHORTCUTS
    ======================================================== */

    function handleKeyboard(
        event
    ) {
        const target =
            event.target;

        const inputLike =
            target?.tagName ===
                "INPUT" ||
            target?.tagName ===
                "TEXTAREA" ||
            target?.isContentEditable;

        /*
        --------------------------------------------------------
        CTRL/CMD + K
        --------------------------------------------------------
        */

        if (
            (
                event.ctrlKey ||
                event.metaKey
            ) &&
            event.key.toLowerCase() ===
                "k"
        ) {
            event.preventDefault();

            if (
                state.part3.commandOpen
            ) {
                closeCommandCenter();
            } else {
                openCommandCenter();
            }

            return;
        }

        /*
        --------------------------------------------------------
        CTRL/CMD + F
        --------------------------------------------------------
        */

        if (
            (
                event.ctrlKey ||
                event.metaKey
            ) &&
            event.key.toLowerCase() ===
                "f"
        ) {
            event.preventDefault();

            openSearchPanel();

            return;
        }

        /*
        --------------------------------------------------------
        CTRL/CMD + N
        --------------------------------------------------------
        */

        if (
            (
                event.ctrlKey ||
                event.metaKey
            ) &&
            event.key.toLowerCase() ===
                "n"
        ) {
            event.preventDefault();

            TURKAI.clearChat?.();

            return;
        }

        /*
        --------------------------------------------------------
        CTRL/CMD + B
        --------------------------------------------------------
        */

        if (
            (
                event.ctrlKey ||
                event.metaKey
            ) &&
            event.key.toLowerCase() ===
                "b" &&
            !inputLike
        ) {
            event.preventDefault();

            $(
                "#sidebar"
            )?.classList.toggle(
                "open"
            );

            return;
        }

        /*
        --------------------------------------------------------
        CTRL/CMD + SHIFT + A
        Admin UI gate.
        --------------------------------------------------------
        */

        if (
            event.ctrlKey &&
            event.shiftKey &&
            event.key.toLowerCase() ===
                "a"
        ) {
            event.preventDefault();

            TURKAI.admin?.();

            return;
        }

        /*
        --------------------------------------------------------
        Escape
        --------------------------------------------------------
        */

        if (
            event.key ===
            "Escape"
        ) {
            if (
                state.part3.commandOpen
            ) {
                closeCommandCenter();

                return;
            }

            if (
                state.part3.searchOpen
            ) {
                closeSearchPanel();

                return;
            }

            $$(".modal.active").forEach(
                modal => {
                    modal.classList.remove(
                        "active"
                    );
                }
            );

            $$(".panel.active").forEach(
                panel => {
                    panel.classList.remove(
                        "active"
                    );
                }
            );

            return;
        }

        /*
        --------------------------------------------------------
        Slash command.
        Composer'ın içinde "/" yazıldığında çalışır.
        --------------------------------------------------------
        */

        if (
            inputLike
        ) {
            return;
        }
    }


    /* ========================================================
       3.11 - SLASH COMMAND INPUT
    ======================================================== */

    function bindSlashCommandInput() {
        const input =
            getComposer();

        if (
            !input ||
            input.dataset
                .part3SlashBound
        ) {
            return;
        }

        input.dataset
            .part3SlashBound =
            "1";

        input.addEventListener(
            "keydown",
            async event => {
                if (
                    event.key !==
                    "Enter" ||
                    event.shiftKey ||
                    event.ctrlKey ||
                    event.metaKey
                ) {
                    return;
                }

                const value =
                    cleanText(
                        input.value
                    );

                if (
                    !value.startsWith(
                        "/"
                    )
                ) {
                    return;
                }

                event.preventDefault();

                const handled =
                    await executeSlashCommand(
                        value
                    );

                if (
                    handled
                ) {
                    input.value =
                        "";

                    clearDraft();
                }
            }
        );
    }


    /* ========================================================
       3.12 - SEARCH BUTTON BIND
    ======================================================== */

    function bindSearchButtons() {
        $$(
            "#searchButton, [data-part3-search]"
        ).forEach(
            button => {
                if (
                    button.dataset
                        .part3SearchBound
                ) {
                    return;
                }

                button.dataset
                    .part3SearchBound =
                    "1";

                button.addEventListener(
                    "click",
                    event => {
                        event.preventDefault();

                        openSearchPanel();
                    }
                );
            }
        );
    }


    /* ========================================================
       3.13 - COMMAND BUTTON BIND
    ======================================================== */

    function bindCommandButtons() {
        $$(
            "#commandButton, [data-part3-command]"
        ).forEach(
            button => {
                if (
                    button.dataset
                        .part3CommandBound
                ) {
                    return;
                }

                button.dataset
                    .part3CommandBound =
                    "1";

                button.addEventListener(
                    "click",
                    event => {
                        event.preventDefault();

                        openCommandCenter();
                    }
                );
            }
        );
    }


    /* ========================================================
       3.14 - EVENT DELEGATION
    ======================================================== */

    function bindDocumentDelegation() {
        if (
            state.part3.eventBound
        ) {
            return;
        }

        state.part3.eventBound =
            true;

        document.addEventListener(
            "click",
            async event => {
                const command =
                    event.target.closest(
                        "[data-command]"
                    );

                if (
                    command
                ) {
                    event.preventDefault();

                    await executeCommand(
                        command.dataset
                            .command
                    );

                    return;
                }

                const messageTarget =
                    event.target.closest(
                        "[data-message-target]"
                    );

                if (
                    messageTarget
                ) {
                    event.preventDefault();

                    focusMessage(
                        messageTarget.dataset
                            .messageTarget
                    );

                    closeSearchPanel();

                    return;
                }

                if (
                    event.target.closest(
                        "[data-part3-close-command]"
                    )
                ) {
                    closeCommandCenter();

                    return;
                }

                if (
                    event.target.closest(
                        "[data-part3-close-search]"
                    )
                ) {
                    closeSearchPanel();

                    return;
                }

                /*
                Plan seçimi
                */

                const planButton =
                    event.target.closest(
                        "[data-plan-select]"
                    );

                if (
                    planButton
                ) {
                    return;
                }
            }
        );
    }


    /* ========================================================
       3.15 - COMMAND INPUT
    ======================================================== */

    function bindCommandInput() {
        document.addEventListener(
            "input",
            event => {
                if (
                    event.target.id !==
                    "turkaiCommandInput"
                ) {
                    return;
                }

                renderCommands(
                    event.target.value
                );
            }
        );
    }


    /* ========================================================
       3.16 - SEARCH INPUT
    ======================================================== */

    function bindLocalSearchInput() {
        document.addEventListener(
            "input",
            event => {
                if (
                    event.target.id !==
                    "turkaiLocalSearchInput"
                ) {
                    return;
                }

                window.clearTimeout(
                    state.part3.searchTimer
                );

                state.part3.searchTimer =
                    window.setTimeout(
                        () => {
                            renderLocalSearch(
                                event.target.value
                            );

                            storageSet(
                                STORAGE
                                    .recentSearch,
                                {
                                    query:
                                        event.target.value,

                                    timestamp:
                                        Date.now()
                                }
                            );
                        },
                        120
                    );
            }
        );
    }


    /* ========================================================
       3.17 - SYSTEM HEALTH MONITOR
    ======================================================== */

    async function healthCheck() {
        try {
            const result =
                await api(
                    "/api/system/status",
                    {
                        method:
                            "GET"
                    }
                );

            state.part3.lastHealth =
                result;

            const ready =
                Boolean(
                    result?.ok ||
                    result?.status ===
                        "ready"
                );

            updateHealthUI(
                ready,
                result
            );

            return result;
        } catch (
            error
        ) {
            state.part3.lastHealth =
                {
                    ok: false,

                    error:
                        error.message
                };

            updateHealthUI(
                false,
                null
            );

            return null;
        }
    }


    function updateHealthUI(
        ready,
        data
    ) {
        const indicators = [
            el(
                "connectionStatus"
            ),

            el(
                "serverStatus"
            ),

            el(
                "statusText"
            ),

            $(
                ".connection-status"
            )
        ].filter(
            Boolean
        );

        indicators.forEach(
            element => {
                element.dataset.state =
                    ready
                        ? "online"
                        : "offline";

                element.classList.toggle(
                    "online",
                    ready
                );

                element.classList.toggle(
                    "offline",
                    !ready
                );

                /*
                Var olan tasarımın metnini
                gereksiz yere değiştirmiyoruz.
                Sadece tamamen boşsa yazıyoruz.
                */

                if (
                    !element.textContent.trim()
                ) {
                    element.textContent =
                        ready
                            ? "Bağlı"
                            : "Bağlantı yok";
                }

                if (
                    element.title ===
                    ""
                ) {
                    element.title =
                        ready
                            ? "TürkAI sunucusu hazır"
                            : "TürkAI sunucusuna ulaşılamıyor";
                }
            }
        );

        const systemVersion =
            data?.server?.version ||
            data?.version ||
            null;

        $$(
            "[data-server-version]"
        ).forEach(
            element => {
                element.textContent =
                    systemVersion ||
                    "—";
            }
        );
    }


    function startHealthMonitor() {
        if (
            state.part3.healthTimer
        ) {
            return;
        }

        state.part3.healthTimer =
            window.setInterval(
                () => {
                    if (
                        document.hidden
                    ) {
                        return;
                    }

                    healthCheck();
                },
                30000
            );
    }


    /* ========================================================
       3.18 - MOBILE NAV
    ======================================================== */

    function toggleMobileMenu() {
        const sidebar =
            el(
                "sidebar"
            );

        const overlay =
            el(
                "mobileOverlay"
            ) ||
            el(
                "globalOverlay"
            );

        if (
            sidebar
        ) {
            sidebar.classList.toggle(
                "mobile-open"
            );

            sidebar.classList.toggle(
                "open"
            );
        }

        document.body.classList.toggle(
            "mobile-menu-open"
        );

        if (
            overlay
        ) {
            overlay.classList.toggle(
                "active",
                document.body.classList.contains(
                    "mobile-menu-open"
                )
            );
        }

        state.part3.mobileMenuOpen =
            document.body.classList.contains(
                "mobile-menu-open"
            );
    }


    function bindMobileButtons() {
        $$(
            "#menuButton, #mobileMenuButton, [data-mobile-menu]"
        ).forEach(
            button => {
                if (
                    button.dataset
                        .part3MobileBound
                ) {
                    return;
                }

                button.dataset
                    .part3MobileBound =
                    "1";

                button.addEventListener(
                    "click",
                    event => {
                        event.preventDefault();

                        toggleMobileMenu();
                    }
                );
            }
        );

        const overlay =
            el(
                "mobileOverlay"
            ) ||
            el(
                "globalOverlay"
            );

        if (
            overlay &&
            !overlay.dataset
                .part3MobileBound
        ) {
            overlay.dataset
                .part3MobileBound =
                "1";

            overlay.addEventListener(
                "click",
                () => {
                    document.body.classList.remove(
                        "mobile-menu-open"
                    );

                    $(
                        "#sidebar"
                    )?.classList.remove(
                        "mobile-open"
                    );

                    overlay.classList.remove(
                        "active"
                    );

                    state.part3.mobileMenuOpen =
                        false;
                }
            );
        }
    }


    /* ========================================================
       3.19 - RESPONSIVE BEHAVIOR
    ======================================================== */

    function handleResponsiveLayout() {
        if (
            window.innerWidth >
            900
        ) {
            document.body.classList.remove(
                "mobile-menu-open"
            );

            $(
                "#sidebar"
            )?.classList.remove(
                "mobile-open"
            );

            state.part3.mobileMenuOpen =
                false;
        }

        const composer =
            getComposer();

        if (
            composer &&
            composer.tagName ===
                "TEXTAREA"
        ) {
            composer.style.height =
                "auto";

            composer.style.height =
                Math.min(
                    composer.scrollHeight,
                    220
                ) +
                "px";
        }
    }


    /* ========================================================
       3.20 - AUTO RESIZE
    ======================================================== */

    function bindAutoResize() {
        const composer =
            getComposer();

        if (
            !composer ||
            composer.dataset
                .part3ResizeBound
        ) {
            return;
        }

        composer.dataset
            .part3ResizeBound =
            "1";

        composer.addEventListener(
            "input",
            () => {
                if (
                    composer.tagName !==
                    "TEXTAREA"
                ) {
                    return;
                }

                composer.style.height =
                    "auto";

                composer.style.height =
                    Math.min(
                        composer.scrollHeight,
                        220
                    ) +
                    "px";
            }
        );
    }


    /* ========================================================
       3.21 - ACCOUNT NAME SYNC
    ======================================================== */

    function syncNames() {
        const user =
            state.user ||
            {};

        const name =
            user.displayName ||
            user.name ||
            user.email ||
            "TürkAI Kullanıcısı";

        $$(
            "[data-user-name], #welcomeName, #profileName"
        ).forEach(
            element => {
                element.textContent =
                    name;
            }
        );

        const account =
            el(
                "accountButton"
            );

        if (
            account
        ) {
            const strong =
                account.querySelector(
                    "strong"
                );

            if (
                strong
            ) {
                strong.textContent =
                    name;
            }
        }
    }


    /* ========================================================
       3.22 - ADMIN DASHBOARD BRIDGE
    ======================================================== */

    async function adminRequest(
        endpoint,
        options = {}
    ) {
        if (
            !state.adminUnlocked
        ) {
            throw new Error(
                "Yönetici oturumu aktif değil."
            );
        }

        const adminToken =
            state.adminSession
                ?.adminToken ||
            null;

        const headers = {
            ...(options.headers ||
                {})
        };

        if (
            adminToken
        ) {
            headers[
                "X-TurkAI-Admin-Token"
            ] =
                adminToken;
        }

        return api(
            endpoint,
            {
                ...options,

                headers
            }
        );
    }


    async function adminSystemStatus() {
        try {
            const data =
                await adminRequest(
                    "/api/system/status",
                    {
                        method:
                            "GET"
                    }
                );

            renderAdminOutput(
                data
            );

            return data;
        } catch (
            error
        ) {
            renderAdminOutput({
                ok: false,

                error:
                    error.message
            });

            return null;
        }
    }


    async function adminMemoryStatus() {
        try {
            const data =
                await adminRequest(
                    "/api/memory/health",
                    {
                        method:
                            "GET"
                    }
                );

            renderAdminOutput(
                data
            );

            return data;
        } catch (
            error
        ) {
            renderAdminOutput({
                ok: false,

                error:
                    error.message
            });

            return null;
        }
    }


    async function adminUsers() {
        try {
            const data =
                await adminRequest(
                    "/api/admin/users",
                    {
                        method:
                            "GET"
                    }
                );

            renderAdminOutput(
                data
            );

            return data;
        } catch (
            error
        ) {
            renderAdminOutput({
                ok: false,

                error:
                    error.message
            });

            return null;
        }
    }


    function renderAdminOutput(
        data
    ) {
        const output =
            el(
                "turkaiAdminOutput"
            );

        if (
            !output
        ) {
            return;
        }

        output.innerHTML = `
            <pre class="admin-output-pre"></pre>
        `;

        const pre =
            output.querySelector(
                "pre"
            );

        if (
            pre
        ) {
            pre.textContent =
                JSON.stringify(
                    data,
                    null,
                    2
                );
        }
    }


    function bindAdminActions() {
        document.addEventListener(
            "click",
            async event => {
                const button =
                    event.target.closest(
                        "[data-admin-action]"
                    );

                if (
                    !button
                ) {
                    return;
                }

                const action =
                    button.dataset
                        .adminAction;

                switch (
                    action
                ) {
                    case "system":
                        await adminSystemStatus();
                        break;

                    case "memory":
                        await adminMemoryStatus();
                        break;

                    case "users":
                        await adminUsers();
                        break;

                    default:
                        break;
                }
            }
        );
    }


    /* ========================================================
       3.23 - ADMIN INPUT BRIDGE
    ======================================================== */

    /*
    Mevcut HTML içinde proCodeInput bulunuyorsa,
    bunu direkt frontend'de admin yetkisi veren
    bir şifre olarak kullanmıyoruz.

    Alan varsa Enter'a basınca backend doğrulama
    ekranını açıyoruz. Böylece gizli kod JS içine
    gömülmüyor.
    */

    function bindAdminInput() {
        const input =
            el(
                "proCodeInput"
            );

        if (
            !input ||
            input.dataset
                .part3AdminBound
        ) {
            return;
        }

        input.dataset
            .part3AdminBound =
            "1";

        input.addEventListener(
            "keydown",
            event => {
                if (
                    event.key !==
                    "Enter"
                ) {
                    return;
                }

                event.preventDefault();

                /*
                Alan zaten doldurulmuşsa admin modalı aç.
                Gerçek doğrulama yine backend'de yapılır.
                */

                if (
                    cleanText(
                        input.value
                    )
                ) {
                    TURKAI.admin?.();
                }
            }
        );
    }


    /* ========================================================
       3.24 - SAVE SESSION ON PAGE HIDE
    ======================================================== */

    function bindLifecycle() {
        document.addEventListener(
            "visibilitychange",
            () => {
                if (
                    document.hidden
                ) {
                    saveDraft();
                    backupApplication();
                }
            }
        );

        window.addEventListener(
            "pagehide",
            () => {
                saveDraft();
                backupApplication();
            }
        );

        window.addEventListener(
            "online",
            () => {
                healthCheck();

                toast(
                    "Bağlantı yeniden aktif.",
                    "success",
                    1800
                );
            }
        );

        window.addEventListener(
            "offline",
            () => {
                toast(
                    "İnternet bağlantısı kesildi.",
                    "error",
                    2200
                );
            }
        );
    }


    /* ========================================================
       3.25 - SOCKET FINAL BRIDGE
    ======================================================== */

    function bindSocketFinal() {
        const socket =
            state.socket ||
            TURKAI.state
                ?.socket;

        if (
            !socket ||
            socket._turkaiPart3Bound
        ) {
            return;
        }

        socket._turkaiPart3Bound =
            true;

        socket.on(
            "connect",
            () => {
                state.connected =
                    true;

                window.dispatchEvent(
                    new CustomEvent(
                        "turkai:connected"
                    )
                );
            }
        );

        socket.on(
            "disconnect",
            () => {
                state.connected =
                    false;

                window.dispatchEvent(
                    new CustomEvent(
                        "turkai:disconnected"
                    )
                );
            }
        );

        socket.on(
            "chat:stream:start",
            () => {
                state.typing =
                    true;
            }
        );

        socket.on(
            "chat:stream:end",
            () => {
                state.typing =
                    false;
            }
        );

        socket.on(
            "turkai:event",
            event => {
                window.dispatchEvent(
                    new CustomEvent(
                        "turkai:server-event",
                        {
                            detail:
                                event
                        }
                    )
                );
            }
        );
    }


    /* ========================================================
       3.26 - UI ACTION SHORTCUT HELP
    ======================================================== */

    function ensureShortcutHint() {
        if (
            el(
                "turkaiShortcutHint"
            )
        ) {
            return;
        }

        const hint =
            document.createElement(
                "div"
            );

        hint.id =
            "turkaiShortcutHint";

        hint.className =
            "turkai-shortcut-hint";

        hint.hidden =
            true;

        hint.innerHTML = `
            <div class="shortcut-box">

                <div class="shortcut-header">
                    <strong>
                        TürkAI Kısayolları
                    </strong>

                    <button
                        type="button"
                        data-part3-close-shortcuts
                    >
                        ×
                    </button>
                </div>

                <div class="shortcut-grid">

                    <div>
                        <kbd>Ctrl</kbd>
                        <kbd>K</kbd>
                        <span>Komut merkezi</span>
                    </div>

                    <div>
                        <kbd>Ctrl</kbd>
                        <kbd>F</kbd>
                        <span>Sohbet ara</span>
                    </div>

                    <div>
                        <kbd>Ctrl</kbd>
                        <kbd>N</kbd>
                        <span>Yeni sohbet</span>
                    </div>

                    <div>
                        <kbd>Ctrl</kbd>
                        <kbd>Shift</kbd>
                        <kbd>A</kbd>
                        <span>Yönetici girişini aç</span>
                    </div>

                    <div>
                        <kbd>Esc</kbd>
                        <span>Ekranı kapat</span>
                    </div>

                </div>

            </div>
        `;

        document.body.appendChild(
            hint
        );
    }


    function openShortcutHint() {
        ensureShortcutHint();

        const hint =
            el(
                "turkaiShortcutHint"
            );

        hint.hidden =
            false;

        state.part3.keyboardHelpOpen =
            true;
    }


    function closeShortcutHint() {
        const hint =
            el(
                "turkaiShortcutHint"
            );

        if (
            hint
        ) {
            hint.hidden =
                true;
        }

        state.part3.keyboardHelpOpen =
            false;
    }


    function bindShortcutHint() {
        document.addEventListener(
            "click",
            event => {
                if (
                    event.target.closest(
                        "[data-part3-shortcuts]"
                    )
                ) {
                    openShortcutHint();

                    return;
                }

                if (
                    event.target.closest(
                        "[data-part3-close-shortcuts]"
                    )
                ) {
                    closeShortcutHint();

                    return;
                }
            }
        );
    }


    /* ========================================================
       3.27 - EXPORT CHAT
    ======================================================== */

    function exportChat() {
        const messages =
            Array.isArray(
                state.messages
            )
                ? state.messages
                : [];

        const lines = [
            "TürkAI Sohbet Dışa Aktarım",
            "",
            `Tarih: ${new Date().toLocaleString(
                "tr-TR"
            )}`,
            ""
        ];

        messages.forEach(
            message => {
                const author =
                    message.role ===
                    "user"
                        ? (
                              state.user
                                  ?.name ||
                              "Sen"
                          )
                        : "TürkAI";

                lines.push(
                    `${author}:`
                );

                lines.push(
                    safeText(
                        message.content
                    )
                );

                lines.push(
                    ""
                );
            }
        );

        const blob =
            new Blob(
                [
                    lines.join(
                        "\n"
                    )
                ],
                {
                    type:
                        "text/plain;charset=utf-8"
                }
            );

        const url =
            URL.createObjectURL(
                blob
            );

        const a =
            document.createElement(
                "a"
            );

        a.href =
            url;

        a.download =
            `turkai-sohbet-${Date.now()}.txt`;

        document.body.appendChild(
            a
        );

        a.click();

        a.remove();

        URL.revokeObjectURL(
            url
        );

        toast(
            "Sohbet dışa aktarıldı.",
            "success"
        );
    }


    /* ========================================================
       3.28 - COPY FULL CHAT
    ======================================================== */

    async function copyFullChat() {
        const messages =
            Array.isArray(
                state.messages
            )
                ? state.messages
                : [];

        const textValue =
            messages
                .map(
                    message =>
                        (
                            message.role ===
                            "user"
                                ? "Sen"
                                : "TürkAI"
                        ) +
                        ":\n" +
                        safeText(
                            message.content
                        )
                )
                .join(
                    "\n\n"
                );

        if (
            !textValue
        ) {
            toast(
                "Kopyalanacak sohbet yok.",
                "info"
            );

            return;
        }

        try {
            await navigator
                .clipboard
                .writeText(
                    textValue
                );

            toast(
                "Tüm sohbet kopyalandı.",
                "success"
            );
        } catch {
            toast(
                "Sohbet kopyalanamadı.",
                "error"
            );
        }
    }


    /* ========================================================
       3.29 - ACTION BUTTONS
    ======================================================== */

    function bindExportButtons() {
        $$(
            "[data-export-chat], #exportChatButton"
        ).forEach(
            button => {
                if (
                    button.dataset
                        .part3ExportBound
                ) {
                    return;
                }

                button.dataset
                    .part3ExportBound =
                    "1";

                button.addEventListener(
                    "click",
                    event => {
                        event.preventDefault();

                        exportChat();
                    }
                );
            }
        );

        $$(
            "[data-copy-chat], #copyChatButton"
        ).forEach(
            button => {
                if (
                    button.dataset
                        .part3CopyBound
                ) {
                    return;
                }

                button.dataset
                    .part3CopyBound =
                    "1";

                button.addEventListener(
                    "click",
                    event => {
                        event.preventDefault();

                        copyFullChat();
                    }
                );
            }
        );
    }


    /* ========================================================
       3.30 - MESSAGE ACTIONS
    ======================================================== */

    function bindMessageActions() {
        document.addEventListener(
            "click",
            async event => {
                const copy =
                    event.target.closest(
                        "[data-copy-message]"
                    );

                if (
                    copy
                ) {
                    const messageId =
                        copy.dataset
                            .copyMessage;

                    const message =
                        state.messages.find(
                            item =>
                                item.id ===
                                messageId
                        );

                    if (
                        message
                    ) {
                        try {
                            await navigator
                                .clipboard
                                .writeText(
                                    message.content ||
                                        ""
                                );

                            toast(
                                "Mesaj kopyalandı.",
                                "success"
                            );
                        } catch {
                            toast(
                                "Kopyalama başarısız.",
                                "error"
                            );
                        }
                    }

                    return;
                }

                const speak =
                    event.target.closest(
                        "[data-speak-message]"
                    );

                if (
                    speak
                ) {
                    const messageId =
                        speak.dataset
                            .speakMessage;

                    const message =
                        state.messages.find(
                            item =>
                                item.id ===
                                messageId
                        );

                    if (
                        message &&
                        typeof TURKAI.speak ===
                            "function"
                    ) {
                        TURKAI.speak(
                            message.content
                        );
                    }
                }
            }
        );
    }


    /* ========================================================
       3.31 - ERROR RECOVERY
    ======================================================== */

    function bindErrorRecovery() {
        window.addEventListener(
            "error",
            event => {
                console.error(
                    "[TürkAI] UI Error:",
                    event.error ||
                        event.message
                );
            }
        );

        window.addEventListener(
            "unhandledrejection",
            event => {
                console.error(
                    "[TürkAI] Promise Error:",
                    event.reason
                );
            }
        );
    }


    /* ========================================================
       3.32 - SERVER READY EVENT
    ======================================================== */

    function emitReadyEvent() {
        window.dispatchEvent(
            new CustomEvent(
                "turkai:ready",
                {
                    detail: {
                        version:
                            "40.0.0",

                        user:
                            state.user ||
                            null,

                        connected:
                            Boolean(
                                state.connected
                            )
                    }
                }
            )
        );
    }


    /* ========================================================
       3.33 - PUBLIC ADVANCED API
    ======================================================== */

    Object.assign(
        window.TURKAI,
        {
            openCommandCenter,

            closeCommandCenter,

            executeCommand,

            openSearch:
                openSearchPanel,

            closeSearch:
                closeSearchPanel,

            searchLocal:
                searchLocalMessages,

            saveDraft,

            restoreDraft,

            clearDraft,

            backup:
                backupApplication,

            restoreBackup,

            health:
                healthCheck,

            exportChat,

            copyFullChat,

            adminRequest,

            adminSystemStatus,

            adminMemoryStatus,

            adminUsers,

            openShortcuts:
                openShortcutHint,

            closeShortcuts:
                closeShortcutHint
        }
    );


    /* ========================================================
       3.34 - FINAL INITIALIZATION
    ======================================================== */

    async function initPart3() {
        if (
            state.part3.initialized
        ) {
            return;
        }

        state.part3.initialized =
            true;

        restoreBackup();

        restoreDraft();

        bindDocumentDelegation();

        bindCommandInput();

        bindLocalSearchInput();

        bindSearchButtons();

        bindCommandButtons();

        bindSlashCommandInput();

        bindModelSelectors();

        bindMobileButtons();

        bindAutoResize();

        bindAdminInput();

        bindAdminActions();

        bindLifecycle();

        bindSocketFinal();

        bindShortcutHint();

        bindExportButtons();

        bindMessageActions();

        bindErrorRecovery();

        /*
        Keyboard global listener
        */

        document.addEventListener(
            "keydown",
            handleKeyboard
        );

        /*
        Responsive
        */

        window.addEventListener(
            "resize",
            handleResponsiveLayout
        );

        handleResponsiveLayout();

        /*
        Composer mevcutsa draftı tekrar al.
        */

        window.setTimeout(
            () => {
                restoreDraft();

                syncNames();

                healthCheck();
            },
            300
        );

        /*
        Background işlemler
        */

        startAutosave();

        startHealthMonitor();

        /*
        İlk durum
        */

        await healthCheck();

        emitReadyEvent();

        console.log(
            "=================================================="
        );

        console.log(
            "TürkAI app.js — 3/3 YÜKLENDİ"
        );

        console.log(
            "Core              : ACTIVE"
        );

        console.log(
            "Authentication    : ACTIVE"
        );

        console.log(
            "Admin Gate        : ACTIVE"
        );

        console.log(
            "Chat              : ACTIVE"
        );

        console.log(
            "Research          : ACTIVE"
        );

        console.log(
            "Weather           : ACTIVE"
        );

        console.log(
            "Memory            : ACTIVE"
        );

        console.log(
            "Files             : ACTIVE"
        );

        console.log(
            "Voice             : ACTIVE"
        );

        console.log(
            "Image             : ACTIVE"
        );

        console.log(
            "Video             : ACTIVE"
        );

        console.log(
            "Plans             : ACTIVE"
        );

        console.log(
            "Notifications     : ACTIVE"
        );

        console.log(
            "Conversations     : ACTIVE"
        );

        console.log(
            "Command Center    : ACTIVE"
        );

        console.log(
            "Search            : ACTIVE"
        );

        console.log(
            "Slash Commands    : ACTIVE"
        );

        console.log(
            "Autosave          : ACTIVE"
        );

        console.log(
            "Health Monitor    : ACTIVE"
        );

        console.log(
            "Mobile Engine     : ACTIVE"
        );

        console.log(
            "Socket Bridge     : ACTIVE"
        );

        console.log(
            "=================================================="
        );
    }


    /* ========================================================
       3.35 - DOM START
    ======================================================== */

    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            initPart3,
            {
                once:
                    true
            }
        );
    } else {
        initPart3();
    }

})();
