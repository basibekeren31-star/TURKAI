/* =========================================================
   TÜRKAI — APP.JS
   PART 1 / 3
   CORE + STATE + API + CHAT ENGINE
   ========================================================= */

"use strict";

/* =========================================================
   GLOBAL CONFIG
   ========================================================= */

const TURKAI_APP_CONFIG = {
    name: "TürkAI",
    version: "20.0.0",
    apiBase: window.location.origin,
    requestTimeout: 45000,

    storage: {
        token: "turkai_access_token",
        refreshToken: "turkai_refresh_token",
        user: "turkai_user",
        settings: "turkai_settings",
        conversation: "turkai_conversation",
        theme: "turkai_theme"
    },

    features: {
        memory: true,
        research: true,
        weather: true,
        coding: true,
        files: true,
        image: true,
        video: true,
        realtime: true
    }
};


/* =========================================================
   GLOBAL STATE
   ========================================================= */

const TURKAI_STATE = {
    user: null,

    authenticated: false,

    accessToken: null,

    refreshToken: null,

    conversationId:
        localStorage.getItem(
            TURKAI_APP_CONFIG.storage.conversation
        ) ||
        crypto.randomUUID?.() ||
        `conversation-${Date.now()}`,

    messages: [],

    isGenerating: false,

    isResearching: false,

    isUploading: false,

    isGeneratingImage: false,

    isGeneratingVideo: false,

    currentAbortController: null,

    currentTaskId: null,

    currentMode: "chat",

    activeModel: "auto",

    plan: "free",

    notifications: [],

    unreadNotifications: 0,

    online: navigator.onLine,

    socket: null,

    socketConnected: false,

    settings: {
        enterToSend: true,
        sound: true,
        autoResearch: true,
        saveHistory: true,
        compactMode: false,
        theme: "dark"
    },

    ui: {
        sidebarOpen: false,
        settingsOpen: false,
        imageModalOpen: false,
        fileModalOpen: false,
        notificationOpen: false,
        modelMenuOpen: false
    }
};


/* =========================================================
   DOM CACHE
   ========================================================= */

const TURKAI_DOM = {};


function turkAICacheDOM() {

    const selectors = {
        app: "#app",
        chat: "#chat",
        chatContainer: "#chatContainer",
        messages: "#messages",
        messageInput: "#messageInput",
        promptInput: "#promptInput",
        sendButton: "#sendButton",
        submitButton: "#submitButton",

        voiceButton: "#voiceButton",
        researchButton: "#researchButton",
        weatherButton: "#weatherButton",
        memoryButton: "#memoryButton",
        uploadButton: "#uploadButton",
        imageButton: "#imageButton",
        videoButton: "#videoButton",

        fileInput: "#fileInput",

        sidebar: "#sidebar",
        sidebarOverlay: "#sidebarOverlay",
        menuButton: "#menuButton",
        closeSidebar: "#closeSidebar",

        settingsButton: "#settingsButton",
        settingsModal: "#settingsModal",
        closeSettings: "#closeSettings",

        imageModal: "#imageCreateModal",
        closeImageModal: "#closeImageModal",
        generateImageButton: "#generateImageButton",

        videoModal: "#videoCreateModal",
        closeVideoModal: "#closeVideoModal",
        generateVideoButton: "#generateVideoButton",

        notificationButton: "#notificationButton",
        notificationPanel: "#notificationPanel",

        modelButton: "#modelButton",
        modelMenu: "#modelMenu",

        newChatButton: "#newChatButton",
        clearChatButton: "#clearChatButton",

        userName: "#userName",
        userAvatar: "#userAvatar",
        planBadge: "#planBadge",

        onlineIndicator: "#onlineIndicator",
        typingIndicator: "#typingIndicator",

        filePreview: "#filePreview",
        uploadProgress: "#uploadProgress"
    };

    for (const [key, selector] of Object.entries(selectors)) {
        TURKAI_DOM[key] =
            document.querySelector(selector);
    }

    return TURKAI_DOM;
}


/* =========================================================
   SAFE DOM HELPERS
   ========================================================= */

function turkAI$(selector) {
    return document.querySelector(selector);
}


function turkAI$$(selector) {
    return [
        ...document.querySelectorAll(selector)
    ];
}


function turkAIEscapeHTML(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function turkAIText(value) {

    return String(value ?? "")
        .replace(/\r\n/g, "\n")
        .trim();
}


function turkAIIsEmpty(value) {
    return !turkAIText(value);
}


/* =========================================================
   STORAGE
   ========================================================= */

function turkAIStorageGet(key, fallback = null) {

    try {

        const value =
            localStorage.getItem(key);

        if (value === null) {
            return fallback;
        }

        try {
            return JSON.parse(value);
        } catch (_) {
            return value;
        }

    } catch (_) {

        return fallback;
    }
}


function turkAIStorageSet(key, value) {

    try {

        if (
            typeof value === "string"
        ) {
            localStorage.setItem(
                key,
                value
            );
        } else {
            localStorage.setItem(
                key,
                JSON.stringify(value)
            );
        }

        return true;

    } catch (_) {

        return false;
    }
}


function turkAIStorageRemove(key) {

    try {
        localStorage.removeItem(key);
    } catch (_) {}
}


/* =========================================================
   SETTINGS LOAD
   ========================================================= */

function turkAILoadSettings() {

    const saved =
        turkAIStorageGet(
            TURKAI_APP_CONFIG.storage.settings,
            {}
        );

    if (
        saved &&
        typeof saved === "object"
    ) {

        TURKAI_STATE.settings = {
            ...TURKAI_STATE.settings,
            ...saved
        };
    }

    const theme =
        turkAIStorageGet(
            TURKAI_APP_CONFIG.storage.theme,
            "dark"
        );

    TURKAI_STATE.settings.theme =
        theme;

    turkAIApplyTheme();
}


function turkAISaveSettings() {

    turkAIStorageSet(
        TURKAI_APP_CONFIG.storage.settings,
        TURKAI_STATE.settings
    );

    turkAIStorageSet(
        TURKAI_APP_CONFIG.storage.theme,
        TURKAI_STATE.settings.theme
    );
}


/* =========================================================
   THEME
   ========================================================= */

function turkAIApplyTheme() {

    document.documentElement
        .setAttribute(
            "data-theme",
            TURKAI_STATE.settings.theme
        );

    document.body?.classList.toggle(
        "compact-mode",
        Boolean(
            TURKAI_STATE.settings.compactMode
        )
    );
}


/* =========================================================
   TOKEN MANAGEMENT
   ========================================================= */

function turkAILoadAuth() {

    TURKAI_STATE.accessToken =
        turkAIStorageGet(
            TURKAI_APP_CONFIG.storage.token,
            null
        );

    TURKAI_STATE.refreshToken =
        turkAIStorageGet(
            TURKAI_APP_CONFIG.storage.refreshToken,
            null
        );

    TURKAI_STATE.user =
        turkAIStorageGet(
            TURKAI_APP_CONFIG.storage.user,
            null
        );

    TURKAI_STATE.authenticated =
        Boolean(
            TURKAI_STATE.accessToken &&
            TURKAI_STATE.user
        );
}


function turkAISaveAuth(data) {

    if (!data) return;

    if (data.accessToken) {

        TURKAI_STATE.accessToken =
            data.accessToken;

        turkAIStorageSet(
            TURKAI_APP_CONFIG.storage.token,
            data.accessToken
        );
    }

    if (data.refreshToken) {

        TURKAI_STATE.refreshToken =
            data.refreshToken;

        turkAIStorageSet(
            TURKAI_APP_CONFIG.storage.refreshToken,
            data.refreshToken
        );
    }

    if (data.user) {

        TURKAI_STATE.user =
            data.user;

        turkAIStorageSet(
            TURKAI_APP_CONFIG.storage.user,
            data.user
        );
    }

    TURKAI_STATE.authenticated =
        Boolean(
            TURKAI_STATE.accessToken &&
            TURKAI_STATE.user
        );
}


function turkAIClearAuth() {

    TURKAI_STATE.accessToken = null;
    TURKAI_STATE.refreshToken = null;
    TURKAI_STATE.user = null;
    TURKAI_STATE.authenticated = false;

    turkAIStorageRemove(
        TURKAI_APP_CONFIG.storage.token
    );

    turkAIStorageRemove(
        TURKAI_APP_CONFIG.storage.refreshToken
    );

    turkAIStorageRemove(
        TURKAI_APP_CONFIG.storage.user
    );
}


/* =========================================================
   API REQUEST ENGINE
   ========================================================= */

async function turkAIApi(
    endpoint,
    options = {}
) {

    const {
        method = "GET",
        body = undefined,
        headers = {},
        timeout =
            TURKAI_APP_CONFIG.requestTimeout,
        retry = true
    } = options;

    const controller =
        new AbortController();

    const timer =
        setTimeout(
            () => {
                try {
                    controller.abort();
                } catch (_) {}
            },
            timeout
        );

    const finalHeaders = {
        "Accept":
            "application/json",
        ...headers
    };

    if (
        body !== undefined &&
        !(body instanceof FormData)
    ) {

        finalHeaders[
            "Content-Type"
        ] =
            "application/json";
    }

    if (
        TURKAI_STATE.accessToken
    ) {

        finalHeaders[
            "Authorization"
        ] =
            `Bearer ${TURKAI_STATE.accessToken}`;
    }

    let requestBody = body;

    if (
        body !== undefined &&
        !(body instanceof FormData) &&
        typeof body !== "string"
    ) {

        requestBody =
            JSON.stringify(body);
    }

    try {

        const response =
            await fetch(
                `${TURKAI_APP_CONFIG.apiBase}${endpoint}`,
                {
                    method,
                    headers:
                        finalHeaders,
                    body:
                        method === "GET" ||
                        method === "HEAD"
                            ? undefined
                            : requestBody,
                    signal:
                        controller.signal
                }
            );

        clearTimeout(timer);

        let data = null;

        const contentType =
            response.headers
                .get("content-type") ||
            "";

        if (
            contentType.includes(
                "application/json"
            )
        ) {

            data =
                await response.json();

        } else {

            const text =
                await response.text();

            data = {
                success:
                    response.ok,
                text
            };
        }

        if (
            response.status === 401 &&
            retry &&
            TURKAI_STATE.refreshToken
        ) {

            const refreshed =
                await turkAIRefreshToken();

            if (refreshed) {

                return turkAIApi(
                    endpoint,
                    {
                        ...options,
                        retry: false
                    }
                );
            }
        }

        if (!response.ok) {

            const error =
                new Error(
                    data?.error ||
                    data?.message ||
                    `HTTP ${response.status}`
                );

            error.status =
                response.status;

            error.data =
                data;

            throw error;
        }

        return data;

    } catch (error) {

        clearTimeout(timer);

        if (
            error?.name ===
            "AbortError"
        ) {

            throw new Error(
                "İstek zaman aşımına uğradı."
            );
        }

        throw error;
    }
}


/* =========================================================
   TOKEN REFRESH
   ========================================================= */

async function turkAIRefreshToken() {

    if (
        !TURKAI_STATE.refreshToken
    ) {
        return false;
    }

    try {

        const data =
            await fetch(
                `${TURKAI_APP_CONFIG.apiBase}/api/auth/refresh`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            refreshToken:
                                TURKAI_STATE
                                    .refreshToken
                        })
                }
            );

        if (!data.ok) {

            turkAIClearAuth();

            return false;
        }

        const result =
            await data.json();

        if (
            result.accessToken ||
            result.token
        ) {

            turkAISaveAuth({
                accessToken:
                    result.accessToken ||
                    result.token,

                refreshToken:
                    result.refreshToken ||
                    TURKAI_STATE
                        .refreshToken,

                user:
                    result.user ||
                    TURKAI_STATE.user
            });

            return true;
        }

    } catch (_) {}

    return false;
}


/* =========================================================
   AUTH — CURRENT USER
   ========================================================= */

async function turkAILoadCurrentUser() {

    try {

        const data =
            await turkAIApi(
                "/api/auth/me"
            );

        const user =
            data?.user ||
            data?.account ||
            data;

        if (user) {

            TURKAI_STATE.user =
                user;

            TURKAI_STATE.authenticated =
                true;

            turkAIStorageSet(
                TURKAI_APP_CONFIG
                    .storage.user,
                user
            );

            turkAIUpdateUserUI(
                user
            );

            return user;
        }

    } catch (error) {

        if (
            error?.status === 401
        ) {
            turkAIClearAuth();
        }
    }

    return null;
}


/* =========================================================
   USER UI
   ========================================================= */

function turkAIGetUserName() {

    const user =
        TURKAI_STATE.user;

    if (!user) {
        return "Misafir";
    }

    return (
        user.name ||
        user.displayName ||
        user.username ||
        user.email?.split("@")[0] ||
        "Kullanıcı"
    );
}


function turkAIGetPlan() {

    const user =
        TURKAI_STATE.user;

    return (
        user?.plan ||
        user?.subscription?.plan ||
        TURKAI_STATE.plan ||
        "free"
    ).toLowerCase();
}


function turkAIUpdateUserUI(user) {

    if (!user) return;

    const name =
        user.name ||
        user.displayName ||
        user.username ||
        user.email?.split("@")[0] ||
        "Kullanıcı";

    const plan =
        turkAIGetPlan();

    TURKAI_STATE.plan =
        plan;

    if (TURKAI_DOM.userName) {
        TURKAI_DOM.userName
            .textContent =
            name;
    }

    if (TURKAI_DOM.planBadge) {

        TURKAI_DOM.planBadge
            .textContent =
            plan.toUpperCase();
    }

    if (TURKAI_DOM.userAvatar) {

        const image =
            user.avatar ||
            user.picture ||
            user.photoURL;

        if (image) {

            TURKAI_DOM.userAvatar
                .style.backgroundImage =
                `url("${image}")`;

            TURKAI_DOM.userAvatar
                .textContent = "";

        } else {

            TURKAI_DOM.userAvatar
                .textContent =
                name
                    .charAt(0)
                    .toUpperCase();
        }
    }
}


/* =========================================================
   NETWORK STATUS
   ========================================================= */

function turkAISetOnlineStatus(
    online
) {

    TURKAI_STATE.online =
        Boolean(online);

    document.body?.classList.toggle(
        "offline",
        !online
    );

    if (
        TURKAI_DOM.onlineIndicator
    ) {

        TURKAI_DOM.onlineIndicator
            .classList.toggle(
                "offline",
                !online
            );
    }
}


window.addEventListener(
    "online",
    () => {
        turkAISetOnlineStatus(true);
        turkAIShowToast(
            "İnternet bağlantısı yeniden aktif.",
            "success"
        );
    }
);


window.addEventListener(
    "offline",
    () => {
        turkAISetOnlineStatus(false);
        turkAIShowToast(
            "İnternet bağlantısı kesildi.",
            "warning"
        );
    }
);


/* =========================================================
   TOAST SYSTEM
   ========================================================= */

function turkAIShowToast(
    message,
    type = "info",
    duration = 3200
) {

    let container =
        document.querySelector(
            "#turkaiToastContainer"
        );

    if (!container) {

        container =
            document.createElement(
                "div"
            );

        container.id =
            "turkaiToastContainer";

        container.className =
            "turkai-toast-container";

        document.body.appendChild(
            container
        );
    }

    const toast =
        document.createElement(
            "div"
        );

    toast.className =
        `turkai-toast turkai-toast-${type}`;

    toast.innerHTML = `
        <div class="turkai-toast-icon"></div>
        <div class="turkai-toast-content">
            ${turkAIEscapeHTML(message)}
        </div>
        <button
            type="button"
            class="turkai-toast-close"
            aria-label="Kapat"
        >
            ×
        </button>
    `;

    const close =
        () => {

            toast.classList.add(
                "closing"
            );

            setTimeout(
                () => toast.remove(),
                250
            );
        };

    toast
        .querySelector(
            ".turkai-toast-close"
        )
        ?.addEventListener(
            "click",
            close
        );

    container.appendChild(
        toast
    );

    requestAnimationFrame(
        () => {
            toast.classList.add(
                "visible"
            );
        }
    );

    setTimeout(
        close,
        duration
    );
}


/* =========================================================
   CHAT STORAGE
   ========================================================= */

function turkAISaveConversation() {

    if (
        !TURKAI_STATE.settings.saveHistory
    ) {
        return;
    }

    const safeMessages =
        TURKAI_STATE.messages
            .slice(-200)
            .map(message => ({
                id: message.id,
                role: message.role,
                content:
                    message.content,
                timestamp:
                    message.timestamp,
                mode:
                    message.mode ||
                    "chat"
            }));

    turkAIStorageSet(
        TURKAI_APP_CONFIG
            .storage.conversation,
        TURKAI_STATE
            .conversationId
    );

    turkAIStorageSet(
        "turkai_messages",
        safeMessages
    );
}


function turkAILoadConversation() {

    const saved =
        turkAIStorageGet(
            "turkai_messages",
            []
        );

    if (
        !Array.isArray(saved)
    ) {
        return;
    }

    TURKAI_STATE.messages =
        saved;

    turkAIRenderMessages();
}


/* =========================================================
   MESSAGE ID
   ========================================================= */

function turkAICreateMessageId(
    prefix = "msg"
) {

    if (
        crypto &&
        typeof crypto.randomUUID ===
        "function"
    ) {

        return `${prefix}-${crypto.randomUUID()}`;
    }

    return `${prefix}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 10)}`;
}


/* =========================================================
   ADD MESSAGE
   ========================================================= */

function turkAIAddMessage(
    role,
    content,
    options = {}
) {

    const message = {
        id:
            options.id ||
            turkAICreateMessageId(),

        role,

        content:
            turkAIText(content),

        timestamp:
            options.timestamp ||
            new Date().toISOString(),

        mode:
            options.mode ||
            TURKAI_STATE.currentMode,

        metadata:
            options.metadata ||
            {}
    };

    TURKAI_STATE.messages.push(
        message
    );

    if (
        TURKAI_STATE.messages.length >
        200
    ) {

        TURKAI_STATE.messages =
            TURKAI_STATE.messages
                .slice(-200);
    }

    turkAISaveConversation();

    turkAIRenderMessages();

    return message;
}


/* =========================================================
   MESSAGE RENDER
   ========================================================= */

function turkAIRenderMessages() {

    const container =
        TURKAI_DOM.messages ||
        TURKAI_DOM.chat ||
        document.querySelector(
            "#messages"
        ) ||
        document.querySelector(
            "#chat"
        );

    if (!container) {
        return;
    }

    container.innerHTML = "";

    if (
        TURKAI_STATE.messages.length ===
        0
    ) {

        turkAIRenderWelcome(
            container
        );

        return;
    }

    for (
        const message
        of TURKAI_STATE.messages
    ) {

        const element =
            turkAICreateMessageElement(
                message
            );

        container.appendChild(
            element
        );
    }

    turkAIScrollToBottom();
}


function turkAIRenderWelcome(
    container
) {

    const name =
        turkAIGetUserName();

    const welcome =
        document.createElement(
            "div"
        );

    welcome.className =
        "turkai-welcome";

    welcome.innerHTML = `
        <div class="turkai-welcome-icon">
            <span></span>
        </div>

        <div class="turkai-welcome-title">
            Merhaba ${turkAIEscapeHTML(name)}
        </div>

        <div class="turkai-welcome-text">
            Ben TürkAI. Ne yapmak istediğini yaz,
            birlikte başlayalım.
        </div>
    `;

    container.appendChild(
        welcome
    );
}


/* =========================================================
   MESSAGE ELEMENT
   ========================================================= */

function turkAICreateMessageElement(
    message
) {

    const wrapper =
        document.createElement(
            "article"
        );

    wrapper.className =
        `turkai-message turkai-message-${message.role}`;

    wrapper.dataset.messageId =
        message.id;

    const isUser =
        message.role === "user";

    const content =
        turkAIFormatMessage(
            message.content
        );

    wrapper.innerHTML = `
        <div class="turkai-message-avatar">
            ${isUser ? "U" : "T"}
        </div>

        <div class="turkai-message-body">

            <div class="turkai-message-header">
                <span class="turkai-message-name">
                    ${isUser ? "Sen" : "TürkAI"}
                </span>

                <span class="turkai-message-time">
                    ${turkAIFormatTime(
                        message.timestamp
                    )}
                </span>
            </div>

            <div class="turkai-message-content">
                ${content}
            </div>

            ${
                !isUser
                    ? `
                    <div class="turkai-message-actions">

                        <button
                            type="button"
                            data-action="copy"
                            data-message-id="${message.id}"
                            title="Kopyala"
                        >
                            <span></span>
                        </button>

                        <button
                            type="button"
                            data-action="regenerate"
                            data-message-id="${message.id}"
                            title="Yeniden oluştur"
                        >
                            <span></span>
                        </button>

                    </div>
                    `
                    : ""
            }

        </div>
    `;

    return wrapper;
}


/* =========================================================
   MESSAGE FORMATTER
   ========================================================= */

function turkAIFormatMessage(
    content
) {

    let text =
        turkAIEscapeHTML(
            content
        );

    /*
      Kod blokları
    */

    text =
        text.replace(
            /```([\w#+.-]*)\n?([\s\S]*?)```/g,
            (_, language, code) => {

                return `
                    <div class="turkai-code-block">

                        <div class="turkai-code-header">

                            <span>
                                ${turkAIEscapeHTML(
                                    language ||
                                    "code"
                                )}
                            </span>

                            <button
                                type="button"
                                data-copy-code
                            >
                                Kopyala
                            </button>

                        </div>

                        <pre><code>${code}</code></pre>

                    </div>
                `;
            }
        );

    /*
      Inline code
    */

    text =
        text.replace(
            /`([^`]+)`/g,
            "<code>$1</code>"
        );

    /*
      Kalın
    */

    text =
        text.replace(
            /\*\*(.*?)\*\*/g,
            "<strong>$1</strong>"
        );

    /*
      Satır sonları
    */

    text =
        text.replace(
            /\n/g,
            "<br>"
        );

    return text;
}


function turkAIFormatTime(
    timestamp
) {

    try {

        return new Date(
            timestamp
        ).toLocaleTimeString(
            "tr-TR",
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );

    } catch (_) {

        return "";
    }
}


/* =========================================================
   SCROLL
   ========================================================= */

function turkAIScrollToBottom(
    smooth = true
) {

    const container =
        TURKAI_DOM.messages ||
        document.querySelector(
            "#messages"
        );

    if (!container) {
        return;
    }

    requestAnimationFrame(
        () => {

            container.scrollTo({
                top:
                    container.scrollHeight,

                behavior:
                    smooth
                        ? "smooth"
                        : "auto"
            });
        }
    );
}


/* =========================================================
   TYPING INDICATOR
   ========================================================= */

function turkAISetTyping(
    visible,
    text = "TürkAI düşünüyor..."
) {

    const existing =
        TURKAI_DOM.typingIndicator ||
        document.querySelector(
            "#typingIndicator"
        );

    if (!visible) {

        if (existing) {
            existing.remove();
        }

        return;
    }

    if (existing) {

        existing.innerHTML = `
            <span class="turkai-typing-dots">
                <i></i><i></i><i></i>
            </span>
            <span>
                ${turkAIEscapeHTML(text)}
            </span>
        `;

        return;
    }

    const container =
        TURKAI_DOM.messages ||
        document.querySelector(
            "#messages"
        );

    if (!container) {
        return;
    }

    const element =
        document.createElement(
            "div"
        );

    element.id =
        "typingIndicator";

    element.className =
        "turkai-typing-indicator";

    element.innerHTML = `
        <span class="turkai-typing-dots">
            <i></i><i></i><i></i>
        </span>

        <span>
            ${turkAIEscapeHTML(text)}
        </span>
    `;

    container.appendChild(
        element
    );

    turkAIScrollToBottom();
}


/* =========================================================
   CHAT PAYLOAD
   ========================================================= */

function turkAIBuildChatPayload(
    message
) {

    return {
        message,

        userId:
            TURKAI_STATE.user?.id ||
            TURKAI_STATE.user?.userId ||
            undefined,

        conversationId:
            TURKAI_STATE.conversationId,

        mode:
            TURKAI_STATE.currentMode,

        model:
            TURKAI_STATE.activeModel,

        language:
            "tr",

        autoResearch:
            TURKAI_STATE.settings
                .autoResearch,

        history:
            TURKAI_STATE.messages
                .slice(-20)
                .map(item => ({
                    role:
                        item.role,
                    content:
                        item.content
                }))
    };
}


/* =========================================================
   CHAT RESPONSE EXTRACTION
   ========================================================= */

function turkAIExtractResponse(
    data
) {

    if (!data) {
        return "";
    }

    const candidates = [
        data.answer,
        data.response,
        data.message,
        data.text,
        data.content,
        data.result?.answer,
        data.result?.response,
        data.result?.message,
        data.data?.answer,
        data.data?.response,
        data.data?.message,
        data.data?.text,
        data.choices?.[0]?.message?.content,
        data.choices?.[0]?.text
    ];

    for (
        const candidate
        of candidates
    ) {

        if (
            typeof candidate ===
                "string" &&
            candidate.trim()
        ) {

            return candidate.trim();
        }
    }

    return "";
}


/* =========================================================
   MAIN CHAT REQUEST
   ========================================================= */

async function turkAISendMessage(
    rawMessage = null,
    options = {}
) {

    const input =
        rawMessage !== null
            ? rawMessage
            : (
                TURKAI_DOM.messageInput ||
                TURKAI_DOM.promptInput ||
                document.querySelector(
                    "#messageInput"
                ) ||
                document.querySelector(
                    "#promptInput"
                )
            )?.value;

    const message =
        turkAIText(input);

    if (!message) {
        return;
    }

    if (
        TURKAI_STATE.isGenerating
    ) {
        return;
    }

    TURKAI_STATE.isGenerating =
        true;

    TURKAI_STATE.currentMode =
        options.mode ||
        TURKAI_STATE.currentMode ||
        "chat";

    turkAIAddMessage(
        "user",
        message,
        {
            mode:
                TURKAI_STATE.currentMode
        }
    );

    turkAIClearInput();

    turkAISetTyping(
        true,
        TURKAI_STATE.currentMode ===
            "research"
            ? "Araştırıyorum..."
            : "TürkAI düşünüyor..."
    );

    turkAIUpdateSendButton(
        true
    );

    try {

        const payload =
            turkAIBuildChatPayload(
                message
            );

        const endpoint =
            options.endpoint ||
            "/api/chat";

        const data =
            await turkAIApi(
                endpoint,
                {
                    method: "POST",
                    body: payload
                }
            );

        const answer =
            turkAIExtractResponse(
                data
            );

        if (!answer) {

            throw new Error(
                "TürkAI'den geçerli bir yanıt alınamadı."
            );
        }

        turkAISetTyping(
            false
        );

        turkAIAddMessage(
            "assistant",
            answer,
            {
                mode:
                    TURKAI_STATE.currentMode,

                metadata: {
                    provider:
                        data.provider ||
                        data.meta?.provider ||
                        null,

                    model:
                        data.model ||
                        data.meta?.model ||
                        null,

                    researched:
                        Boolean(
                            data.researched ||
                            data.meta?.researched
                        )
                }
            }
        );

        turkAIPlaySound(
            "message"
        );

        return answer;

    } catch (error) {

        turkAISetTyping(
            false
        );

        const errorMessage =
            turkAIGetFriendlyError(
                error
            );

        turkAIAddMessage(
            "assistant",
            errorMessage,
            {
                metadata: {
                    error: true
                }
            }
        );

        turkAIShowToast(
            errorMessage,
            "error"
        );

    } finally {

        TURKAI_STATE.isGenerating =
            false;

        turkAIUpdateSendButton(
            false
        );
    }
}


/* =========================================================
   FRIENDLY ERROR
   ========================================================= */

function turkAIGetFriendlyError(
    error
) {

    const status =
        error?.status;

    if (status === 429) {

        return "Şu anda istek sınırına ulaşıldı. Birkaç saniye sonra tekrar deneyebilirsin.";
    }

    if (status === 401) {

        return "Oturum bilgisi geçersiz veya süresi dolmuş olabilir.";
    }

    if (status === 403) {

        return "Bu özellik mevcut planında kullanılamıyor.";
    }

    if (status === 413) {

        return "Gönderdiğin içerik izin verilen boyutu aşıyor.";
    }

    if (!navigator.onLine) {

        return "İnternet bağlantısı olmadığı için TürkAI'ye ulaşılamadı.";
    }

    if (
        error?.message?.includes(
            "timeout"
        ) ||
        error?.message?.includes(
            "zaman"
        )
    ) {

        return "Sunucudan yanıt alınması uzun sürdü. Tekrar deneyebilirsin.";
    }

    return (
        error?.message ||
        "Beklenmeyen bir hata oluştu."
    );
}


/* =========================================================
   INPUT
   ========================================================= */

function turkAIClearInput() {

    const input =
        TURKAI_DOM.messageInput ||
        TURKAI_DOM.promptInput ||
        document.querySelector(
            "#messageInput"
        ) ||
        document.querySelector(
            "#promptInput"
        );

    if (!input) {
        return;
    }

    input.value = "";

    input.style.height =
        "auto";

    input.dispatchEvent(
        new Event(
            "input",
            {
                bubbles: true
            }
        )
    );
}


function turkAIGetInput() {

    return (
        TURKAI_DOM.messageInput ||
        TURKAI_DOM.promptInput ||
        document.querySelector(
            "#messageInput"
        ) ||
        document.querySelector(
            "#promptInput"
        )
    );
}


/* =========================================================
   SEND BUTTON STATE
   ========================================================= */

function turkAIUpdateSendButton(
    busy
) {

    const button =
        TURKAI_DOM.sendButton ||
        TURKAI_DOM.submitButton ||
        document.querySelector(
            "#sendButton"
        ) ||
        document.querySelector(
            "#submitButton"
        );

    if (!button) {
        return;
    }

    button.disabled =
        Boolean(busy);

    button.classList.toggle(
        "loading",
        Boolean(busy)
    );

    button.setAttribute(
        "aria-busy",
        String(Boolean(busy))
    );
}


/* =========================================================
   NEW CHAT
   ========================================================= */

function turkAINewChat() {

    if (
        TURKAI_STATE.isGenerating
    ) {

        try {
            TURKAI_STATE
                .currentAbortController
                ?.abort();
        } catch (_) {}
    }

    TURKAI_STATE.messages = [];

    TURKAI_STATE.conversationId =
        crypto.randomUUID?.() ||
        `conversation-${Date.now()}`;

    turkAIStorageSet(
        TURKAI_APP_CONFIG
            .storage.conversation,
        TURKAI_STATE.conversationId
    );

    turkAIStorageSet(
        "turkai_messages",
        []
    );

    turkAIRenderMessages();

    turkAIShowToast(
        "Yeni sohbet başlatıldı.",
        "success"
    );
}


/* =========================================================
   CLEAR CHAT
   ========================================================= */

function turkAIClearChat() {

    TURKAI_STATE.messages = [];

    turkAIStorageRemove(
        "turkai_messages"
    );

    turkAIRenderMessages();

    turkAIShowToast(
        "Sohbet temizlendi.",
        "success"
    );
}


/* =========================================================
   COPY
   ========================================================= */

async function turkAICopyText(
    text
) {

    try {

        await navigator.clipboard.writeText(
            text
        );

        turkAIShowToast(
            "Kopyalandı.",
            "success"
        );

        return true;

    } catch (_) {

        const textarea =
            document.createElement(
                "textarea"
            );

        textarea.value =
            text;

        document.body.appendChild(
            textarea
        );

        textarea.select();

        try {
            document.execCommand(
                "copy"
            );
        } catch (_) {}

        textarea.remove();

        turkAIShowToast(
            "Metin kopyalandı.",
            "success"
        );

        return true;
    }
}


/* =========================================================
   COPY MESSAGE
   ========================================================= */

async function turkAICopyMessage(
    messageId
) {

    const message =
        TURKAI_STATE.messages
            .find(
                item =>
                    item.id ===
                    messageId
            );

    if (!message) {
        return;
    }

    await turkAICopyText(
        message.content
    );
}


/* =========================================================
   REGENERATE
   ========================================================= */

async function turkAIRegenerate(
    messageId
) {

    const index =
        TURKAI_STATE.messages
            .findIndex(
                item =>
                    item.id ===
                    messageId
            );

    if (index === -1) {
        return;
    }

    let userMessage = null;

    for (
        let i = index - 1;
        i >= 0;
        i--
    ) {

        if (
            TURKAI_STATE
                .messages[i]
                .role === "user"
        ) {

            userMessage =
                TURKAI_STATE
                    .messages[i]
                    .content;

            break;
        }
    }

    if (!userMessage) {
        return;
    }

    TURKAI_STATE.messages =
        TURKAI_STATE.messages
            .slice(0, index);

    turkAISaveConversation();

    turkAIRenderMessages();

    await turkAISendMessage(
        userMessage
    );
}


/* =========================================================
   PLAY SOUND
   ========================================================= */

function turkAIPlaySound(
    type = "message"
) {

    if (
        !TURKAI_STATE.settings.sound
    ) {
        return;
    }

    /*
      Tarayıcı izin vermeden ses üretmeye
      zorlamıyoruz. İleride gerçek ses
      sistemi Part 2/3'te bağlanabilir.
    */

    try {

        const AudioContext =
            window.AudioContext ||
            window.webkitAudioContext;

        if (!AudioContext) {
            return;
        }

        const context =
            new AudioContext();

        const oscillator =
            context.createOscillator();

        const gain =
            context.createGain();

        oscillator.frequency.value =
            type === "error"
                ? 180
                : 520;

        gain.gain.value =
            0.025;

        oscillator.connect(
            gain
        );

        gain.connect(
            context.destination
        );

        oscillator.start();

        gain.gain.exponentialRampToValueAtTime(
            0.0001,
            context.currentTime +
                0.08
        );

        oscillator.stop(
            context.currentTime +
                0.08
        );

    } catch (_) {}
}


/* =========================================================
   EVENT DELEGATION
   ========================================================= */

document.addEventListener(
    "click",
    async event => {

        const target =
            event.target.closest(
                "[data-action]"
            );

        if (!target) {
            return;
        }

        const action =
            target.dataset.action;

        const messageId =
            target.dataset.messageId;

        if (
            action === "copy"
        ) {

            await turkAICopyMessage(
                messageId
            );
        }

        if (
            action === "regenerate"
        ) {

            await turkAIRegenerate(
                messageId
            );
        }
    }
);


/* =========================================================
   CODE COPY DELEGATION
   ========================================================= */

document.addEventListener(
    "click",
    async event => {

        const button =
            event.target.closest(
                "[data-copy-code]"
            );

        if (!button) {
            return;
        }

        const block =
            button.closest(
                ".turkai-code-block"
            );

        const code =
            block?.querySelector(
                "pre code"
            )?.textContent;

        if (code) {

            await turkAICopyText(
                code
            );
        }
    }
);


/* =========================================================
   SEND EVENTS
   ========================================================= */

function turkAISetupInputEvents() {

    const input =
        turkAIGetInput();

    if (!input) {
        return;
    }

    input.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter" &&
                !event.shiftKey &&
                TURKAI_STATE.settings
                    .enterToSend
            ) {

                event.preventDefault();

                turkAISendMessage();
            }
        }
    );

    input.addEventListener(
        "input",
        () => {

            input.style.height =
                "auto";

            input.style.height =
                `${Math.min(
                    input.scrollHeight,
                    220
                )}px`;
        }
    );
}


/* =========================================================
   BUTTON EVENTS
   ========================================================= */

function turkAISetupButtonEvents() {

    const sendButton =
        TURKAI_DOM.sendButton ||
        TURKAI_DOM.submitButton;

    sendButton?.addEventListener(
        "click",
        () => {
            turkAISendMessage();
        }
    );

    TURKAI_DOM.newChatButton
        ?.addEventListener(
            "click",
            turkAINewChat
        );

    TURKAI_DOM.clearChatButton
        ?.addEventListener(
            "click",
            turkAIClearChat
        );

    TURKAI_DOM.researchButton
        ?.addEventListener(
            "click",
            () => {

                TURKAI_STATE.currentMode =
                    "research";

                const input =
                    turkAIGetInput();

                if (input) {
                    input.focus();
                }

                turkAIShowToast(
                    "Araştırma modu aktif.",
                    "info"
                );
            }
        );

    TURKAI_DOM.weatherButton
        ?.addEventListener(
            "click",
            () => {

                const input =
                    turkAIGetInput();

                if (!input) return;

                input.value =
                    "Bugün hava durumu nasıl?";

                input.focus();

                turkAISendMessage();
            }
        );

    TURKAI_DOM.memoryButton
        ?.addEventListener(
            "click",
            () => {

                turkAIShowToast(
                    "TürkAI hafıza sistemi aktif.",
                    "info"
                );
            }
        );
}


/* =========================================================
   APP INITIALIZATION
   ========================================================= */

async function turkAIInitializeApp() {

    console.log(
        "TürkAI başlatılıyor..."
    );

    turkAICacheDOM();

    turkAILoadSettings();

    turkAILoadAuth();

    turkAISetOnlineStatus(
        navigator.onLine
    );

    turkAILoadConversation();

    turkAISetupInputEvents();

    turkAISetupButtonEvents();

    if (
        TURKAI_STATE.authenticated
    ) {

        await turkAILoadCurrentUser();
    }

    turkAIUpdateUserUI(
        TURKAI_STATE.user
    );

    turkAIRenderMessages();

    console.log(
        "TürkAI Core hazır."
    );
}


/* =========================================================
   GLOBAL API
   ========================================================= */

window.TURKAI = {

    config:
        TURKAI_APP_CONFIG,

    state:
        TURKAI_STATE,

    dom:
        TURKAI_DOM,

    api:
        turkAIApi,

    send:
        turkAISendMessage,

    newChat:
        turkAINewChat,

    clearChat:
        turkAIClearChat,

    copy:
        turkAICopyText,

    regenerate:
        turkAIRegenerate,

    toast:
        turkAIShowToast,

    refreshToken:
        turkAIRefreshToken,

    logout:
        turkAIClearAuth
};


/* =========================================================
   START
   ========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        turkAIInitializeApp,
        {
            once: true
        }
    );

} else {

    turkAIInitializeApp();
}


/* =========================================================
   PART 1 / 3 END
   PART 2 BURADAN SONRA GELECEK
   ========================================================= */
/* =========================================================
   TÜRKAI — APP.JS
   PART 2 / 3
   FILES + RESEARCH + WEATHER + REALTIME + MEDIA + TASKS
   ========================================================= */


/* =========================================================
   FILE ENGINE
   ========================================================= */

const TURKAI_FILE_STATE = {
    selectedFile: null,
    uploading: false,
    uploadProgress: 0,
    maxSize: 10 * 1024 * 1024,
    planMaxSize: 10 * 1024 * 1024
};


/* =========================================================
   FILE LIMITS
   ========================================================= */

async function turkAIGetFileLimits() {

    try {

        const data =
            await turkAIApi(
                "/api/files/limits"
            );

        const limits =
            data?.limits ||
            data?.data ||
            data;

        if (limits) {

            const maxMB =
                Number(
                    limits.maxFileSizeMB ||
                    limits.maxFileSize ||
                    10
                );

            if (
                Number.isFinite(maxMB) &&
                maxMB > 0
            ) {

                TURKAI_FILE_STATE
                    .planMaxSize =
                    maxMB * 1024 * 1024;
            }
        }

        return limits;

    } catch (error) {

        /*
          Ultra için frontend tarafında
          1 GB limiti desteklenir.
        */

        if (
            TURKAI_STATE.plan ===
                "ultra" ||
            TURKAI_STATE.plan ===
                "developer"
        ) {

            TURKAI_FILE_STATE
                .planMaxSize =
                1024 *
                1024 *
                1024;

        } else {

            TURKAI_FILE_STATE
                .planMaxSize =
                10 *
                1024 *
                1024;
        }

        return null;
    }
}


/* =========================================================
   FILE SIZE FORMAT
   ========================================================= */

function turkAIFormatBytes(
    bytes
) {

    const value =
        Number(bytes);

    if (
        !Number.isFinite(value) ||
        value <= 0
    ) {
        return "0 B";
    }

    const units = [
        "B",
        "KB",
        "MB",
        "GB"
    ];

    let size = value;
    let index = 0;

    while (
        size >= 1024 &&
        index < units.length - 1
    ) {

        size /= 1024;
        index++;
    }

    return `${size.toFixed(
        size >= 10 ? 0 : 2
    )} ${units[index]}`;
}


/* =========================================================
   FILE VALIDATION
   ========================================================= */

function turkAIValidateFile(
    file
) {

    if (!file) {

        return {
            ok: false,
            error: "Dosya seçilmedi."
        };
    }

    const maxSize =
        TURKAI_FILE_STATE
            .planMaxSize;

    if (
        file.size >
        maxSize
    ) {

        return {
            ok: false,

            error:
                `Bu dosya ${turkAIFormatBytes(
                    file.size
                )}. Planındaki maksimum dosya boyutu ${turkAIFormatBytes(
                    maxSize
                )}.`
        };
    }

    const name =
        file.name || "";

    const extension =
        name.includes(".")
            ? name
                .split(".")
                .pop()
                .toLowerCase()
            : "";

    const allowed = [
        "txt",
        "md",
        "json",
        "csv",
        "log",
        "js",
        "ts",
        "jsx",
        "tsx",
        "html",
        "htm",
        "css",
        "scss",
        "sass",
        "py",
        "java",
        "c",
        "h",
        "cpp",
        "hpp",
        "cs",
        "php",
        "go",
        "rs",
        "swift",
        "kt",
        "kts",
        "sql",
        "xml",
        "yaml",
        "yml",
        "vue",
        "svelte"
    ];

    if (
        extension &&
        !allowed.includes(
            extension
        )
    ) {

        return {
            ok: false,

            error:
                `.${extension} dosya türü desteklenmiyor.`
        };
    }

    return {
        ok: true,
        extension,
        size: file.size
    };
}


/* =========================================================
   FILE PICKER
   ========================================================= */

function turkAIOpenFilePicker() {

    let input =
        TURKAI_DOM.fileInput ||
        document.querySelector(
            "#fileInput"
        );

    if (!input) {

        input =
            document.createElement(
                "input"
            );

        input.type = "file";

        input.id =
            "turkaiDynamicFileInput";

        input.hidden = true;

        document.body.appendChild(
            input
        );

        input.addEventListener(
            "change",
            () => {

                const file =
                    input.files?.[0];

                if (file) {
                    turkAIHandleFile(
                        file
                    );
                }
            }
        );
    }

    input.click();
}


/* =========================================================
   FILE PREVIEW
   ========================================================= */

function turkAIRenderFilePreview(
    file
) {

    const container =
        TURKAI_DOM.filePreview ||
        document.querySelector(
            "#filePreview"
        );

    if (!container) {
        return;
    }

    if (!file) {

        container.innerHTML = "";

        return;
    }

    container.innerHTML = `
        <div class="turkai-file-preview-card">

            <div class="turkai-file-icon">
                <span></span>
            </div>

            <div class="turkai-file-info">

                <strong>
                    ${turkAIEscapeHTML(
                        file.name
                    )}
                </strong>

                <small>
                    ${turkAIFormatBytes(
                        file.size
                    )}
                </small>

            </div>

            <button
                type="button"
                data-remove-selected-file
                aria-label="Dosyayı kaldır"
            >
                ×
            </button>

        </div>
    `;
}


/* =========================================================
   HANDLE FILE
   ========================================================= */

async function turkAIHandleFile(
    file
) {

    const validation =
        turkAIValidateFile(
            file
        );

    if (!validation.ok) {

        turkAIShowToast(
            validation.error,
            "error"
        );

        return;
    }

    TURKAI_FILE_STATE
        .selectedFile =
        file;

    turkAIRenderFilePreview(
        file
    );

    turkAIShowToast(
        `${file.name} hazır.`,
        "success"
    );

    /*
      Küçük dosyaları otomatik yükle.
    */

    await turkAIUploadFile(
        file
    );
}


/* =========================================================
   UPLOAD PROGRESS
   ========================================================= */

function turkAISetUploadProgress(
    progress
) {

    const value =
        Math.max(
            0,
            Math.min(
                100,
                Number(progress) || 0
            )
        );

    TURKAI_FILE_STATE
        .uploadProgress =
        value;

    const element =
        TURKAI_DOM.uploadProgress ||
        document.querySelector(
            "#uploadProgress"
        );

    if (!element) {
        return;
    }

    element.value =
        value;

    element.style.width =
        `${value}%`;

    element.setAttribute(
        "aria-valuenow",
        String(value)
    );
}


/* =========================================================
   UPLOAD FILE
   ========================================================= */

async function turkAIUploadFile(
    file
) {

    if (
        TURKAI_FILE_STATE.uploading
    ) {
        return;
    }

    const validation =
        turkAIValidateFile(
            file
        );

    if (!validation.ok) {

        turkAIShowToast(
            validation.error,
            "error"
        );

        return;
    }

    TURKAI_FILE_STATE
        .uploading =
        true;

    turkAISetUploadProgress(0);

    try {

        const formData =
            new FormData();

        formData.append(
            "file",
            file,
            file.name
        );

        formData.append(
            "userId",
            TURKAI_STATE.user?.id ||
            TURKAI_STATE.user?.userId ||
            ""
        );

        formData.append(
            "conversationId",
            TURKAI_STATE
                .conversationId
        );

        /*
          XMLHttpRequest kullanıyoruz;
          böylece gerçek upload progress
          gösterebiliriz.
        */

        const result =
            await new Promise(
                (resolve, reject) => {

                    const xhr =
                        new XMLHttpRequest();

                    xhr.open(
                        "POST",
                        `${TURKAI_APP_CONFIG.apiBase}/api/files/upload`
                    );

                    if (
                        TURKAI_STATE
                            .accessToken
                    ) {

                        xhr.setRequestHeader(
                            "Authorization",
                            `Bearer ${TURKAI_STATE.accessToken}`
                        );
                    }

                    xhr.upload.addEventListener(
                        "progress",
                        event => {

                            if (
                                event.lengthComputable
                            ) {

                                turkAISetUploadProgress(
                                    (
                                        event.loaded /
                                        event.total
                                    ) *
                                    100
                                );
                            }
                        }
                    );

                    xhr.addEventListener(
                        "load",
                        () => {

                            let data;

                            try {
                                data =
                                    JSON.parse(
                                        xhr.responseText
                                    );
                            } catch (_) {

                                data = {
                                    success:
                                        xhr.status >= 200 &&
                                        xhr.status < 300
                                };
                            }

                            if (
                                xhr.status >= 200 &&
                                xhr.status < 300
                            ) {

                                resolve(data);

                            } else {

                                const error =
                                    new Error(
                                        data?.error ||
                                        "Dosya yüklenemedi."
                                    );

                                error.status =
                                    xhr.status;

                                reject(error);
                            }
                        }
                    );

                    xhr.addEventListener(
                        "error",
                        () => {
                            reject(
                                new Error(
                                    "Dosya yükleme bağlantısı başarısız."
                                )
                            );
                        }
                    );

                    xhr.addEventListener(
                        "abort",
                        () => {
                            reject(
                                new Error(
                                    "Dosya yükleme iptal edildi."
                                )
                            );
                        }
                    );

                    xhr.send(
                        formData
                    );
                }
            );

        turkAISetUploadProgress(
            100
        );

        const uploaded =
            result?.file ||
            result?.data ||
            result;

        turkAIAddMessage(
            "assistant",
            `Dosya yüklendi: ${file.name}`,
            {
                metadata: {
                    type: "file",
                    fileId:
                        uploaded?.id ||
                        uploaded?.fileId ||
                        null,
                    fileName:
                        file.name,
                    fileSize:
                        file.size
                }
            }
        );

        turkAIShowToast(
            "Dosya başarıyla yüklendi.",
            "success"
        );

        return result;

    } catch (error) {

        turkAIShowToast(
            error.message ||
            "Dosya yüklenemedi.",
            "error"
        );

        throw error;

    } finally {

        TURKAI_FILE_STATE
            .uploading =
            false;

        setTimeout(
            () => {
                turkAISetUploadProgress(
                    0
                );
            },
            1200
        );
    }
}


/* =========================================================
   REMOVE SELECTED FILE
   ========================================================= */

function turkAIRemoveSelectedFile() {

    TURKAI_FILE_STATE
        .selectedFile =
        null;

    turkAIRenderFilePreview(
        null
    );

    const input =
        TURKAI_DOM.fileInput ||
        document.querySelector(
            "#fileInput"
        );

    if (input) {
        input.value = "";
    }
}


/* =========================================================
   FILE EVENT
   ========================================================= */

document.addEventListener(
    "change",
    event => {

        const input =
            event.target;

        if (
            input.matches?.(
                "#fileInput"
            )
        ) {

            const file =
                input.files?.[0];

            if (file) {
                turkAIHandleFile(
                    file
                );
            }
        }
    }
);


document.addEventListener(
    "click",
    event => {

        const removeButton =
            event.target.closest(
                "[data-remove-selected-file]"
            );

        if (
            removeButton
        ) {

            turkAIRemoveSelectedFile();
        }
    }
);


/* =========================================================
   UPLOAD BUTTON
   ========================================================= */

TURKAI_DOM.uploadButton
    ?.addEventListener(
        "click",
        turkAIOpenFilePicker
    );


/* =========================================================
   RESEARCH ENGINE
   ========================================================= */

const TURKAI_RESEARCH_STATE = {
    active: false,
    lastQuery: null,
    results: [],
    taskId: null
};


/* =========================================================
   START RESEARCH
   ========================================================= */

async function turkAIRunResearch(
    query
) {

    query =
        turkAIText(query);

    if (!query) {
        return null;
    }

    if (
        TURKAI_RESEARCH_STATE.active
    ) {
        return null;
    }

    TURKAI_RESEARCH_STATE.active =
        true;

    TURKAI_RESEARCH_STATE
        .lastQuery =
        query;

    TURKAI_STATE.currentMode =
        "research";

    turkAISetTyping(
        true,
        "İnternette araştırıyorum..."
    );

    try {

        const result =
            await turkAIApi(
                "/api/research",
                {
                    method: "POST",

                    body: {
                        query,

                        userId:
                            TURKAI_STATE
                                .user?.id ||
                            TURKAI_STATE
                                .user?.userId,

                        conversationId:
                            TURKAI_STATE
                                .conversationId,

                        language:
                            "tr"
                    }
                }
            );

        const answer =
            turkAIExtractResponse(
                result
            );

        const results =
            result?.results ||
            result?.sources ||
            result?.data?.results ||
            [];

        TURKAI_RESEARCH_STATE
            .results =
            Array.isArray(results)
                ? results
                : [];

        turkAISetTyping(
            false
        );

        if (answer) {

            turkAIAddMessage(
                "assistant",
                answer,
                {
                    mode:
                        "research",

                    metadata: {
                        researched:
                            true,

                        sources:
                            TURKAI_RESEARCH_STATE
                                .results
                    }
                }
            );
        }

        return result;

    } catch (error) {

        turkAISetTyping(
            false
        );

        turkAIShowToast(
            error.message ||
            "Araştırma yapılamadı.",
            "error"
        );

        return null;

    } finally {

        TURKAI_RESEARCH_STATE
            .active =
            false;

        TURKAI_STATE.currentMode =
            "chat";
    }
}


/* =========================================================
   RESEARCH BUTTON
   ========================================================= */

TURKAI_DOM.researchButton
    ?.addEventListener(
        "dblclick",
        async () => {

            const input =
                turkAIGetInput();

            if (!input) return;

            const query =
                turkAIText(
                    input.value
                );

            if (!query) return;

            turkAIClearInput();

            turkAIAddMessage(
                "user",
                query,
                {
                    mode:
                        "research"
                }
            );

            await turkAIRunResearch(
                query
            );
        }
    );


/* =========================================================
   WEATHER
   ========================================================= */

async function turkAIGetWeather(
    location = null
) {

    try {

        const params =
            new URLSearchParams();

        if (location) {

            params.set(
                "location",
                location
            );
        }

        const result =
            await turkAIApi(
                `/api/weather${
                    params.toString()
                        ? `?${params}`
                        : ""
                }`
            );

        return result;

    } catch (error) {

        turkAIShowToast(
            error.message ||
            "Hava durumu alınamadı.",
            "error"
        );

        return null;
    }
}


/* =========================================================
   WEATHER UI
   ========================================================= */

function turkAIRenderWeather(
    data
) {

    if (!data) {
        return;
    }

    const weather =
        data.weather ||
        data.data ||
        data;

    const location =
        weather.location ||
        weather.city ||
        "Konum";

    const temperature =
        weather.temperature ??
        weather.temp ??
        "--";

    const description =
        weather.description ||
        weather.condition ||
        "Bilinmiyor";

    const html = `
        <div class="turkai-weather-card">

            <div class="turkai-weather-location">
                ${turkAIEscapeHTML(
                    location
                )}
            </div>

            <div class="turkai-weather-temperature">
                ${turkAIEscapeHTML(
                    temperature
                )}°
            </div>

            <div class="turkai-weather-description">
                ${turkAIEscapeHTML(
                    description
                )}
            </div>

        </div>
    `;

    const container =
        TURKAI_DOM.messages ||
        document.querySelector(
            "#messages"
        );

    if (!container) {
        return;
    }

    const element =
        document.createElement(
            "div"
        );

    element.innerHTML =
        html;

    container.appendChild(
        element.firstElementChild
    );

    turkAIScrollToBottom();
}


/* =========================================================
   MODEL SYSTEM
   ========================================================= */

const TURKAI_MODELS = [
    {
        id: "auto",
        name: "Otomatik",
        description:
            "TürkAI uygun modeli seçer.",
        plans: [
            "free",
            "pro",
            "plus",
            "ultra",
            "developer"
        ]
    },

    {
        id: "fast",
        name: "Hızlı",
        description:
            "Günlük sorular için hızlı yanıt.",
        plans: [
            "free",
            "pro",
            "plus",
            "ultra",
            "developer"
        ]
    },

    {
        id: "deep",
        name: "Derin düşünme",
        description:
            "Daha karmaşık görevler için.",
        plans: [
            "pro",
            "plus",
            "ultra",
            "developer"
        ]
    },

    {
        id: "code",
        name: "Kod",
        description:
            "Kodlama ve teknik görevler.",
        plans: [
            "free",
            "pro",
            "plus",
            "ultra",
            "developer"
        ]
    },

    {
        id: "research",
        name: "Araştırma",
        description:
            "Web araştırması odaklı.",
        plans: [
            "pro",
            "plus",
            "ultra",
            "developer"
        ]
    }
];


/* =========================================================
   MODEL ACCESS
   ========================================================= */

function turkAIGetAvailableModels() {

    const plan =
        turkAIGetPlan();

    return TURKAI_MODELS.filter(
        model =>
            model.plans.includes(
                plan
            )
    );
}


/* =========================================================
   MODEL MENU
   ========================================================= */

function turkAIRenderModelMenu() {

    const menu =
        TURKAI_DOM.modelMenu ||
        document.querySelector(
            "#modelMenu"
        );

    if (!menu) {
        return;
    }

    const models =
        turkAIGetAvailableModels();

    menu.innerHTML =
        models
            .map(
                model => `
                    <button
                        type="button"
                        class="${
                            model.id ===
                            TURKAI_STATE.activeModel
                                ? "active"
                                : ""
                        }"
                        data-model-id="${
                            model.id
                        }"
                    >

                        <span
                            class="turkai-model-icon"
                        ></span>

                        <span>
                            <strong>
                                ${turkAIEscapeHTML(
                                    model.name
                                )}
                            </strong>

                            <small>
                                ${turkAIEscapeHTML(
                                    model.description
                                )}
                            </small>
                        </span>

                    </button>
                `
            )
            .join("");
}


function turkAISelectModel(
    modelId
) {

    const available =
        turkAIGetAvailableModels();

    const model =
        available.find(
            item =>
                item.id ===
                modelId
        );

    if (!model) {

        turkAIShowToast(
            "Bu model planında kullanılamıyor.",
            "warning"
        );

        return;
    }

    TURKAI_STATE.activeModel =
        model.id;

    turkAIStorageSet(
        "turkai_model",
        model.id
    );

    turkAIRenderModelMenu();

    turkAIShowToast(
        `${model.name} seçildi.`,
        "success"
    );
}


TURKAI_DOM.modelButton
    ?.addEventListener(
        "click",
        () => {

            TURKAI_STATE.ui
                .modelMenuOpen =
                !TURKAI_STATE.ui
                    .modelMenuOpen;

            TURKAI_DOM.modelMenu
                ?.classList.toggle(
                    "open",
                    TURKAI_STATE.ui
                        .modelMenuOpen
                );

            turkAIRenderModelMenu();
        }
    );


document.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                "[data-model-id]"
            );

        if (!button) {
            return;
        }

        turkAISelectModel(
            button.dataset.modelId
        );
    }
);


/* =========================================================
   LOAD MODEL
   ========================================================= */

function turkAILoadModel() {

    const saved =
        turkAIStorageGet(
            "turkai_model",
            "auto"
        );

    if (
        typeof saved === "string"
    ) {

        TURKAI_STATE.activeModel =
            saved;
    }
}


/* =========================================================
   NOTIFICATION SYSTEM
   ========================================================= */

const TURKAI_NOTIFICATION_STATE = {
    loading: false
};


async function turkAILoadNotifications() {

    if (
        TURKAI_NOTIFICATION_STATE.loading
    ) {
        return;
    }

    TURKAI_NOTIFICATION_STATE.loading =
        true;

    try {

        const result =
            await turkAIApi(
                "/api/realtime/notifications"
            );

        const notifications =
            result?.notifications ||
            result?.data ||
            result;

        TURKAI_STATE.notifications =
            Array.isArray(
                notifications
            )
                ? notifications
                : [];

        TURKAI_STATE.unreadNotifications =
            TURKAI_STATE.notifications
                .filter(
                    item =>
                        !item.read
                )
                .length;

        turkAIRenderNotifications();

    } catch (_) {

        /*
          Bildirim sistemi opsiyoneldir.
        */

    } finally {

        TURKAI_NOTIFICATION_STATE.loading =
            false;
    }
}


/* =========================================================
   NOTIFICATION RENDER
   ========================================================= */

function turkAIRenderNotifications() {

    const panel =
        TURKAI_DOM.notificationPanel ||
        document.querySelector(
            "#notificationPanel"
        );

    if (!panel) {
        return;
    }

    if (
        TURKAI_STATE.notifications
            .length === 0
    ) {

        panel.innerHTML = `
            <div class="turkai-empty-notifications">
                Bildirim yok.
            </div>
        `;

        return;
    }

    panel.innerHTML =
        TURKAI_STATE.notifications
            .map(
                notification => `
                    <div
                        class="
                            turkai-notification
                            ${
                                notification.read
                                    ? ""
                                    : "unread"
                            }
                        "
                        data-notification-id="${
                            notification.id ||
                            notification.notificationId ||
                            ""
                        }"
                    >

                        <div
                            class="turkai-notification-title"
                        >
                            ${turkAIEscapeHTML(
                                notification.title ||
                                "TürkAI"
                            )}
                        </div>

                        <div
                            class="turkai-notification-message"
                        >
                            ${turkAIEscapeHTML(
                                notification.message ||
                                notification.body ||
                                ""
                            )}
                        </div>

                    </div>
                `
            )
            .join("");
}


/* =========================================================
   MARK NOTIFICATION READ
   ========================================================= */

async function turkAIMarkNotificationRead(
    notificationId
) {

    if (!notificationId) {
        return;
    }

    try {

        await turkAIApi(
            `/api/realtime/notifications/${encodeURIComponent(
                notificationId
            )}/read`,
            {
                method: "POST"
            }
        );

        const item =
            TURKAI_STATE.notifications
                .find(
                    notification =>
                        (
                            notification.id ||
                            notification.notificationId
                        ) ===
                        notificationId
                );

        if (item) {
            item.read = true;
        }

        TURKAI_STATE.unreadNotifications =
            TURKAI_STATE.notifications
                .filter(
                    item =>
                        !item.read
                )
                .length;

        turkAIRenderNotifications();

    } catch (_) {}
}


/* =========================================================
   NOTIFICATION BUTTON
   ========================================================= */

TURKAI_DOM.notificationButton
    ?.addEventListener(
        "click",
        async () => {

            TURKAI_STATE.ui
                .notificationOpen =
                !TURKAI_STATE.ui
                    .notificationOpen;

            TURKAI_DOM.notificationPanel
                ?.classList.toggle(
                    "open",
                    TURKAI_STATE.ui
                        .notificationOpen
                );

            if (
                TURKAI_STATE.ui
                    .notificationOpen
            ) {

                await turkAILoadNotifications();
            }
        }
    );


/* =========================================================
   SOCKET.IO REALTIME
   ========================================================= */

function turkAIConnectRealtime() {

    if (
        !TURKAI_APP_CONFIG.features
            .realtime
    ) {
        return;
    }

    if (
        typeof window.io !==
        "function"
    ) {
        return;
    }

    if (
        TURKAI_STATE.socket &&
        TURKAI_STATE.socket.connected
    ) {
        return;
    }

    try {

        const socket =
            window.io(
                TURKAI_APP_CONFIG.apiBase,
                {
                    transports: [
                        "websocket",
                        "polling"
                    ],

                    auth: {
                        token:
                            TURKAI_STATE
                                .accessToken ||
                            undefined,

                        userId:
                            TURKAI_STATE
                                .user?.id ||
                            TURKAI_STATE
                                .user?.userId ||
                            undefined
                    }
                }
            );

        TURKAI_STATE.socket =
            socket;

        socket.on(
            "connect",
            () => {

                TURKAI_STATE
                    .socketConnected =
                    true;

                socket.emit(
                    "subscribe",
                    {
                        userId:
                            TURKAI_STATE
                                .user?.id ||
                            TURKAI_STATE
                                .user?.userId,

                        conversationId:
                            TURKAI_STATE
                                .conversationId
                    }
                );

                console.log(
                    "TürkAI realtime bağlantısı aktif."
                );
            }
        );

        socket.on(
            "disconnect",
            () => {

                TURKAI_STATE
                    .socketConnected =
                    false;
            }
        );

        socket.on(
            "connect_error",
            error => {

                TURKAI_STATE
                    .socketConnected =
                    false;

                console.warn(
                    "Realtime bağlantısı:",
                    error?.message
                );
            }
        );

        socket.on(
            "notification",
            notification => {

                if (!notification) {
                    return;
                }

                TURKAI_STATE
                    .notifications
                    .unshift(
                        notification
                    );

                TURKAI_STATE
                    .unreadNotifications++;

                turkAIRenderNotifications();

                turkAIShowToast(
                    notification.title ||
                    notification.message ||
                    "Yeni bildirim",
                    "info"
                );
            }
        );

        socket.on(
            "task:progress",
            data => {

                turkAIHandleTaskProgress(
                    data
                );
            }
        );

        socket.on(
            "task:started",
            data => {

                turkAIHandleTaskProgress({
                    ...data,
                    status:
                        "running"
                });
            }
        );

        socket.on(
            "task:completed",
            data => {

                turkAIHandleTaskProgress({
                    ...data,
                    status:
                        "completed",
                    progress:
                        100
                });
            }
        );

        socket.on(
            "task:failed",
            data => {

                turkAIHandleTaskProgress({
                    ...data,
                    status:
                        "failed"
                });
            }
        );

        socket.on(
            "assistant:message",
            data => {

                const answer =
                    turkAIExtractResponse(
                        data
                    );

                if (!answer) {
                    return;
                }

                turkAIAddMessage(
                    "assistant",
                    answer,
                    {
                        metadata: {
                            realtime: true
                        }
                    }
                );
            }
        );

    } catch (error) {

        console.warn(
            "Realtime başlatılamadı:",
            error
        );
    }
}


/* =========================================================
   TASK PROGRESS
   ========================================================= */

const TURKAI_TASK_STATE = {
    active: new Map()
};


function turkAIHandleTaskProgress(
    data
) {

    if (!data) {
        return;
    }

    const taskId =
        data.taskId ||
        data.id;

    if (!taskId) {
        return;
    }

    const task = {
        ...(
            TURKAI_TASK_STATE
                .active
                .get(taskId) ||
            {}
        ),

        ...data,

        taskId
    };

    TURKAI_TASK_STATE
        .active
        .set(
            taskId,
            task
        );

    turkAIRenderTaskProgress(
        task
    );
}


/* =========================================================
   TASK PROGRESS UI
   ========================================================= */

function turkAIRenderTaskProgress(
    task
) {

    let element =
        document.querySelector(
            `[data-task-id="${CSS.escape(
                task.taskId
            )}"]`
        );

    if (!element) {

        element =
            document.createElement(
                "div"
            );

        element.className =
            "turkai-task-progress";

        element.dataset.taskId =
            task.taskId;

        const container =
            TURKAI_DOM.messages ||
            document.querySelector(
                "#messages"
            );

        container?.appendChild(
            element
        );
    }

    const progress =
        Math.max(
            0,
            Math.min(
                100,
                Number(
                    task.progress
                ) || 0
            )
        );

    const status =
        task.status ||
        "queued";

    element.innerHTML = `
        <div class="turkai-task-header">

            <span>
                ${turkAIEscapeHTML(
                    task.type ||
                    "Görev"
                )}
            </span>

            <span>
                ${progress}%
            </span>

        </div>

        <div class="turkai-task-bar">
            <div
                style="width:${progress}%"
            ></div>
        </div>

        <div class="turkai-task-status">
            ${turkAIEscapeHTML(
                status
            )}
        </div>
    `;

    if (
        status === "completed" ||
        status === "failed" ||
        status === "cancelled"
    ) {

        setTimeout(
            () => {
                element.remove();
            },
            5000
        );
    }

    turkAIScrollToBottom();
}


/* =========================================================
   CREATE BACKGROUND TASK
   ========================================================= */

async function turkAICreateTask(
    type,
    payload = {},
    options = {}
) {

    try {

        const result =
            await turkAIApi(
                "/api/tasks",
                {
                    method: "POST",

                    body: {
                        type,

                        payload,

                        priority:
                            options.priority ||
                            "normal",

                        userId:
                            TURKAI_STATE
                                .user?.id ||
                            TURKAI_STATE
                                .user?.userId,

                        conversationId:
                            TURKAI_STATE
                                .conversationId
                    }
                }
            );

        const task =
            result?.task ||
            result?.data ||
            result;

        if (
            task?.id ||
            task?.taskId
        ) {

            const taskId =
                task.id ||
                task.taskId;

            TURKAI_TASK_STATE
                .active
                .set(
                    taskId,
                    task
                );

            TURKAI_STATE
                .currentTaskId =
                taskId;
        }

        return task;

    } catch (error) {

        turkAIShowToast(
            error.message ||
            "Görev oluşturulamadı.",
            "error"
        );

        return null;
    }
}


/* =========================================================
   CANCEL TASK
   ========================================================= */

async function turkAICancelTask(
    taskId
) {

    if (!taskId) {
        return;
    }

    try {

        await turkAIApi(
            `/api/tasks/${encodeURIComponent(
                taskId
            )}/cancel`,
            {
                method: "POST"
            }
        );

        const task =
            TURKAI_TASK_STATE
                .active
                .get(taskId);

        if (task) {

            task.status =
                "cancelled";

            turkAIRenderTaskProgress(
                task
            );
        }

        turkAIShowToast(
            "Görev iptal edildi.",
            "info"
        );

    } catch (error) {

        turkAIShowToast(
            error.message ||
            "Görev iptal edilemedi.",
            "error"
        );
    }
}


/* =========================================================
   IMAGE GENERATION
   ========================================================= */

const TURKAI_MEDIA_STATE = {
    imageJob: null,
    videoJob: null
};


async function turkAIGenerateImage(
    prompt,
    options = {}
) {

    prompt =
        turkAIText(prompt);

    if (!prompt) {

        turkAIShowToast(
            "Bir görsel açıklaması yaz.",
            "warning"
        );

        return null;
    }

    if (
        TURKAI_STATE.isGeneratingImage
    ) {
        return null;
    }

    TURKAI_STATE.isGeneratingImage =
        true;

    try {

        const result =
            await turkAIApi(
                "/api/media/image",
                {
                    method: "POST",

                    body: {
                        prompt,

                        size:
                            options.size ||
                            "square",

                        style:
                            options.style ||
                            "realistic",

                        userId:
                            TURKAI_STATE
                                .user?.id ||
                            TURKAI_STATE
                                .user?.userId,

                        conversationId:
                            TURKAI_STATE
                                .conversationId
                    }
                }
            );

        const job =
            result?.job ||
            result?.data ||
            result;

        TURKAI_MEDIA_STATE
            .imageJob =
            job;

        const taskId =
            job?.id ||
            job?.jobId ||
            job?.taskId;

        if (taskId) {

            turkAIHandleTaskProgress({
                taskId,

                type:
                    "media_image",

                status:
                    job.status ||
                    "queued",

                progress:
                    job.progress || 0
            });
        }

        turkAIShowToast(
            "Görsel oluşturma görevi başlatıldı.",
            "success"
        );

        return job;

    } catch (error) {

        turkAIShowToast(
            error.message ||
            "Görsel oluşturulamadı.",
            "error"
        );

        return null;

    } finally {

        TURKAI_STATE.isGeneratingImage =
            false;
    }
}


/* =========================================================
   VIDEO GENERATION
   ========================================================= */

async function turkAIGenerateVideo(
    prompt,
    options = {}
) {

    prompt =
        turkAIText(prompt);

    if (!prompt) {

        turkAIShowToast(
            "Bir video açıklaması yaz.",
            "warning"
        );

        return null;
    }

    if (
        TURKAI_STATE.isGeneratingVideo
    ) {
        return null;
    }

    TURKAI_STATE.isGeneratingVideo =
        true;

    try {

        const result =
            await turkAIApi(
                "/api/media/video",
                {
                    method: "POST",

                    body: {
                        prompt,

                        duration:
                            Number(
                                options.duration ||
                                5
                            ),

                        resolution:
                            options.resolution ||
                            "720p",

                        userId:
                            TURKAI_STATE
                                .user?.id ||
                            TURKAI_STATE
                                .user?.userId,

                        conversationId:
                            TURKAI_STATE
                                .conversationId
                    }
                }
            );

        const job =
            result?.job ||
            result?.data ||
            result;

        TURKAI_MEDIA_STATE
            .videoJob =
            job;

        const taskId =
            job?.id ||
            job?.jobId ||
            job?.taskId;

        if (taskId) {

            turkAIHandleTaskProgress({
                taskId,

                type:
                    "media_video",

                status:
                    job.status ||
                    "queued",

                progress:
                    job.progress || 0
            });
        }

        turkAIShowToast(
            "Video oluşturma görevi başlatıldı.",
            "success"
        );

        return job;

    } catch (error) {

        turkAIShowToast(
            error.message ||
            "Video oluşturulamadı.",
            "error"
        );

        return null;

    } finally {

        TURKAI_STATE.isGeneratingVideo =
            false;
    }
}


/* =========================================================
   MEDIA BUTTONS
   ========================================================= */

TURKAI_DOM.imageButton
    ?.addEventListener(
        "click",
        () => {

            const modal =
                TURKAI_DOM.imageModal ||
                document.querySelector(
                    "#imageCreateModal"
                );

            modal?.classList.add(
                "open"
            );
        }
    );


TURKAI_DOM.videoButton
    ?.addEventListener(
        "click",
        () => {

            const modal =
                TURKAI_DOM.videoModal ||
                document.querySelector(
                    "#videoCreateModal"
                );

            modal?.classList.add(
                "open"
            );
        }
    );


/* =========================================================
   CLOSE MEDIA MODALS
   ========================================================= */

TURKAI_DOM.closeImageModal
    ?.addEventListener(
        "click",
        () => {

            TURKAI_DOM.imageModal
                ?.classList.remove(
                    "open"
                );
        }
    );


TURKAI_DOM.closeVideoModal
    ?.addEventListener(
        "click",
        () => {

            TURKAI_DOM.videoModal
                ?.classList.remove(
                    "open"
                );
        }
    );


/* =========================================================
   AUTO INITIALIZATION PART 2
   ========================================================= */

turkAILoadModel();

turkAIGetFileLimits();

turkAIRenderModelMenu();

if (
    TURKAI_STATE.authenticated
) {

    turkAILoadNotifications();

    turkAIConnectRealtime();
}


/* =========================================================
   PART 2 / 3 END
   PART 3 BURADAN SONRA GELECEK
   ========================================================= */
/* =========================================================
   TÜRKAI — APP.JS
   PART 3 / 3
   AUTH + SETTINGS + VOICE + UI + PLANS + FINAL ENGINE
   ========================================================= */


/* =========================================================
   ACCOUNT / AUTH STATE
   ========================================================= */

const TURKAI_AUTH_STATE = {
    loading: false,
    googleLoading: false,
    initialized: false
};


/* =========================================================
   CURRENT USER
   ========================================================= */

function turkAIGetCurrentUser() {

    return (
        TURKAI_STATE.user ||
        null
    );
}


function turkAIGetUserId() {

    const user =
        turkAIGetCurrentUser();

    return (
        user?.id ||
        user?.userId ||
        user?.googleId ||
        null
    );
}


function turkAIGetUserName() {

    const user =
        turkAIGetCurrentUser();

    return (
        user?.name ||
        user?.displayName ||
        user?.givenName ||
        "Kullanıcı"
    );
}


/* =========================================================
   AUTH ME
   ========================================================= */

async function turkAILoadCurrentUser() {

    if (
        TURKAI_AUTH_STATE.loading
    ) {
        return null;
    }

    TURKAI_AUTH_STATE.loading =
        true;

    try {

        const result =
            await turkAIApi(
                "/api/auth/me"
            );

        const user =
            result?.user ||
            result?.data?.user ||
            result?.account ||
            result?.data ||
            null;

        if (user) {

            TURKAI_STATE.user =
                user;

            TURKAI_STATE.authenticated =
                true;

            if (
                user.plan
            ) {

                TURKAI_STATE.plan =
                    String(
                        user.plan
                    ).toLowerCase();
            }

            turkAIUpdateUserUI();

            return user;
        }

        return null;

    } catch (error) {

        if (
            error?.status === 401 ||
            error?.status === 403
        ) {

            TURKAI_STATE.authenticated =
                false;

            TURKAI_STATE.user =
                null;
        }

        return null;

    } finally {

        TURKAI_AUTH_STATE.loading =
            false;
    }
}


/* =========================================================
   USER UI
   ========================================================= */

function turkAIUpdateUserUI() {

    const name =
        turkAIGetUserName();

    const plan =
        turkAIGetPlan();

    const elements = [
        document.querySelector(
            "#userName"
        ),

        document.querySelector(
            "#profileName"
        ),

        document.querySelector(
            "[data-user-name]"
        )
    ];

    elements.forEach(
        element => {

            if (!element) {
                return;
            }

            element.textContent =
                name;
        }
    );

    const planElements = [
        document.querySelector(
            "#userPlan"
        ),

        document.querySelector(
            "[data-user-plan]"
        )
    ];

    planElements.forEach(
        element => {

            if (!element) {
                return;
            }

            element.textContent =
                plan.toUpperCase();
        }
    );

    document
        .querySelectorAll(
            "[data-user-greeting]"
        )
        .forEach(
            element => {

                element.textContent =
                    `Merhaba, ${name}`;
            }
        );
}


/* =========================================================
   GOOGLE IDENTITY
   ========================================================= */

function turkAIInitializeGoogle() {

    if (
        typeof window.google ===
        "undefined"
    ) {
        return;
    }

    const clientId =
        TURKAI_APP_CONFIG
            .googleClientId;

    if (!clientId) {
        return;
    }

    const container =
        document.querySelector(
            "#googleLogin"
        );

    if (!container) {
        return;
    }

    try {

        window.google.accounts.id
            .initialize({

                client_id:
                    clientId,

                callback:
                    turkAIHandleGoogleCredential,

                auto_select:
                    false,

                cancel_on_tap_outside:
                    true
            });

        window.google.accounts.id
            .renderButton(
                container,
                {
                    theme:
                        "outline",

                    size:
                        "large",

                    shape:
                        "pill",

                    width:
                        320
                }
            );

    } catch (error) {

        console.warn(
            "Google giriş başlatılamadı:",
            error
        );
    }
}


/* =========================================================
   GOOGLE CREDENTIAL
   ========================================================= */

async function turkAIHandleGoogleCredential(
    response
) {

    if (
        !response?.credential
    ) {
        return;
    }

    if (
        TURKAI_AUTH_STATE
            .googleLoading
    ) {
        return;
    }

    TURKAI_AUTH_STATE
        .googleLoading =
        true;

    try {

        const result =
            await turkAIApi(
                "/api/auth/google/link",
                {
                    method: "POST",

                    body: {
                        credential:
                            response.credential
                    }
                }
            );

        const user =
            result?.user ||
            result?.account ||
            result?.data?.user ||
            null;

        if (user) {

            TURKAI_STATE.user =
                user;

            TURKAI_STATE.authenticated =
                true;

            if (
                user.plan
            ) {

                TURKAI_STATE.plan =
                    String(
                        user.plan
                    ).toLowerCase();
            }

            turkAIStorageSet(
                "turkai_google_login",
                "true"
            );

            turkAIUpdateUserUI();

            turkAIShowToast(
                "Google hesabın bağlandı.",
                "success"
            );

            turkAIConnectRealtime();

            turkAILoadNotifications();
        }

    } catch (error) {

        turkAIShowToast(
            error.message ||
            "Google ile giriş başarısız.",
            "error"
        );

    } finally {

        TURKAI_AUTH_STATE
            .googleLoading =
            false;
    }
}


/* =========================================================
   LOGOUT
   ========================================================= */

async function turkAILogout() {

    try {

        await turkAIApi(
            "/api/auth/logout",
            {
                method: "POST"
            }
        );

    } catch (_) {}

    try {

        TURKAI_STATE.socket
            ?.disconnect();

    } catch (_) {}

    TURKAI_STATE.socket =
        null;

    TURKAI_STATE
        .socketConnected =
        false;

    TURKAI_STATE.user =
        null;

    TURKAI_STATE.authenticated =
        false;

    TURKAI_STATE.plan =
        "free";

    TURKAI_STATE.accessToken =
        null;

    turkAIStorageRemove(
        "turkai_access_token"
    );

    turkAIStorageRemove(
        "turkai_refresh_token"
    );

    turkAIStorageRemove(
        "turkai_google_login"
    );

    turkAIUpdateUserUI();

    turkAIShowToast(
        "Oturum kapatıldı.",
        "success"
    );
}


/* =========================================================
   LOGOUT BUTTON
   ========================================================= */

document.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                "[data-action='logout'], #logoutButton"
            );

        if (!button) {
            return;
        }

        turkAILogout();
    }
);


/* =========================================================
   SETTINGS STATE
   ========================================================= */

const TURKAI_SETTINGS = {

    theme:
        turkAIStorageGet(
            "turkai_theme",
            "dark"
        ),

    sound:
        turkAIStorageGet(
            "turkai_sound",
            true
        ) !== false,

    enterToSend:
        turkAIStorageGet(
            "turkai_enter_send",
            true
        ) !== false,

    autoResearch:
        turkAIStorageGet(
            "turkai_auto_research",
            true
        ) !== false,

    memory:
        turkAIStorageGet(
            "turkai_memory",
            true
        ) !== false,

    compact:
        turkAIStorageGet(
            "turkai_compact",
            false
        ) === true
};


/* =========================================================
   APPLY SETTINGS
   ========================================================= */

function turkAIApplySettings() {

    document.documentElement
        .dataset.theme =
        TURKAI_SETTINGS.theme;

    document.documentElement
        .classList.toggle(
            "turkai-no-sound",
            !TURKAI_SETTINGS.sound
        );

    document.documentElement
        .classList.toggle(
            "turkai-compact",
            TURKAI_SETTINGS.compact
        );

    const settings = [
        [
            "soundToggle",
            TURKAI_SETTINGS.sound
        ],

        [
            "enterToSendToggle",
            TURKAI_SETTINGS.enterToSend
        ],

        [
            "autoResearchToggle",
            TURKAI_SETTINGS.autoResearch
        ],

        [
            "memoryToggle",
            TURKAI_SETTINGS.memory
        ],

        [
            "compactToggle",
            TURKAI_SETTINGS.compact
        ]
    ];

    settings.forEach(
        ([id, value]) => {

            const element =
                document.querySelector(
                    `#${id}`
                );

            if (!element) {
                return;
            }

            element.checked =
                Boolean(value);
        }
    );
}


/* =========================================================
   SAVE SETTING
   ========================================================= */

function turkAISetSetting(
    key,
    value
) {

    if (
        !Object.prototype.hasOwnProperty
            .call(
                TURKAI_SETTINGS,
                key
            )
    ) {
        return;
    }

    TURKAI_SETTINGS[key] =
        value;

    turkAIStorageSet(
        `turkai_${key}`,
        value
    );

    turkAIApplySettings();
}


/* =========================================================
   SETTINGS EVENTS
   ========================================================= */

const TURKAI_SETTING_MAP = {
    soundToggle:
        "sound",

    enterToSendToggle:
        "enterToSend",

    autoResearchToggle:
        "autoResearch",

    memoryToggle:
        "memory",

    compactToggle:
        "compact"
};


Object.entries(
    TURKAI_SETTING_MAP
).forEach(
    ([id, key]) => {

        document
            .querySelector(
                `#${id}`
            )
            ?.addEventListener(
                "change",
                event => {

                    turkAISetSetting(
                        key,
                        event.target.checked
                    );
                }
            );
    }
);


/* =========================================================
   THEME
   ========================================================= */

function turkAISetTheme(
    theme
) {

    const allowed = [
        "dark",
        "light",
        "system"
    ];

    if (
        !allowed.includes(
            theme
        )
    ) {
        theme = "dark";
    }

    TURKAI_SETTINGS.theme =
        theme;

    turkAIStorageSet(
        "turkai_theme",
        theme
    );

    if (
        theme === "system"
    ) {

        const dark =
            window.matchMedia(
                "(prefers-color-scheme: dark)"
            ).matches;

        document.documentElement
            .dataset.theme =
            dark
                ? "dark"
                : "light";

    } else {

        document.documentElement
            .dataset.theme =
            theme;
    }
}


/* =========================================================
   SETTINGS BUTTON
   ========================================================= */

document.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                "#settingsButton, [data-action='settings']"
            );

        if (!button) {
            return;
        }

        const panel =
            document.querySelector(
                "#settingsPanel"
            );

        panel?.classList.toggle(
            "open"
        );
    }
);


/* =========================================================
   SIDEBAR
   ========================================================= */

function turkAIToggleSidebar(
    force
) {

    const sidebar =
        TURKAI_DOM.sidebar ||
        document.querySelector(
            "#sidebar"
        );

    if (!sidebar) {
        return;
    }

    const shouldOpen =
        typeof force ===
        "boolean"
            ? force
            : !sidebar.classList
                .contains("open");

    sidebar.classList.toggle(
        "open",
        shouldOpen
    );

    document.body
        .classList.toggle(
            "turkai-sidebar-open",
            shouldOpen
        );

    TURKAI_STATE.ui
        .sidebarOpen =
        shouldOpen;
}


document.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                "#sidebarToggle, [data-action='sidebar']"
            );

        if (!button) {
            return;
        }

        turkAIToggleSidebar();
    }
);


/* =========================================================
   MOBILE OVERLAY
   ========================================================= */

document.addEventListener(
    "click",
    event => {

        const overlay =
            event.target.closest(
                "#sidebarOverlay"
            );

        if (!overlay) {
            return;
        }

        turkAIToggleSidebar(
            false
        );
    }
);


/* =========================================================
   VOICE INPUT
   ========================================================= */

const TURKAI_VOICE_STATE = {
    active: false,
    recognition: null,
    supported: false
};


function turkAIInitializeVoice() {

    const Recognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

    if (!Recognition) {

        TURKAI_VOICE_STATE
            .supported =
            false;

        return;
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

            TURKAI_VOICE_STATE
                .active =
                true;

            TURKAI_DOM.voiceButton
                ?.classList.add(
                    "active"
                );

            turkAIShowToast(
                "Dinliyorum...",
                "info"
            );
        };

    recognition.onresult =
        event => {

            let text = "";

            for (
                let i =
                    event.resultIndex;
                i <
                    event.results.length;
                i++
            ) {

                text +=
                    event.results[i][0]
                        ?.transcript ||
                    "";
            }

            text =
                turkAIText(text);

            const input =
                turkAIGetInput();

            if (
                input &&
                text
            ) {

                input.value =
                    text;

                turkAIResizeInput?.();
            }
        };

    recognition.onerror =
        event => {

            console.warn(
                "Voice error:",
                event.error
            );

            turkAIShowToast(
                "Sesli giriş kullanılamadı.",
                "error"
            );
        };

    recognition.onend =
        () => {

            TURKAI_VOICE_STATE
                .active =
                false;

            TURKAI_DOM.voiceButton
                ?.classList.remove(
                    "active"
                );
        };

    TURKAI_VOICE_STATE
        .recognition =
        recognition;

    TURKAI_VOICE_STATE
        .supported =
        true;
}


function turkAIToggleVoice() {

    if (
        !TURKAI_VOICE_STATE
            .supported
    ) {

        turkAIShowToast(
            "Tarayıcın sesli girişi desteklemiyor.",
            "warning"
        );

        return;
    }

    try {

        if (
            TURKAI_VOICE_STATE.active
        ) {

            TURKAI_VOICE_STATE
                .recognition
                .stop();

        } else {

            TURKAI_VOICE_STATE
                .recognition
                .start();
        }

    } catch (error) {

        console.warn(
            "Voice:",
            error
        );
    }
}


TURKAI_DOM.voiceButton
    ?.addEventListener(
        "click",
        turkAIToggleVoice
    );


/* =========================================================
   KEYBOARD SHORTCUTS
   ========================================================= */

document.addEventListener(
    "keydown",
    event => {

        /*
          Ctrl + K
          Arama / yeni sohbet
        */

        if (
            event.ctrlKey &&
            event.key.toLowerCase() ===
                "k"
        ) {

            event.preventDefault();

            const input =
                turkAIGetInput();

            input?.focus();

            return;
        }


        /*
          Escape
          Modalları kapat
        */

        if (
            event.key ===
            "Escape"
        ) {

            document
                .querySelectorAll(
                    ".open"
                )
                .forEach(
                    element => {

                        if (
                            element.matches(
                                ".modal, .panel, .drawer"
                            )
                        ) {

                            element.classList
                                .remove(
                                    "open"
                                );
                        }
                    }
                );

            return;
        }


        /*
          Enter ile gönder
        */

        if (
            event.key ===
            "Enter" &&
            !event.shiftKey &&
            !event.ctrlKey &&
            !event.altKey
        ) {

            if (
                !TURKAI_SETTINGS
                    .enterToSend
            ) {
                return;
            }

            const target =
                event.target;

            if (
                target?.tagName ===
                    "TEXTAREA" ||
                target?.tagName ===
                    "INPUT"
            ) {

                /*
                  Shift+Enter yeni satır.
                */

                if (
                    target.tagName ===
                    "TEXTAREA"
                ) {

                    event.preventDefault();

                    turkAISendMessage();
                }
            }
        }
    }
);


/* =========================================================
   DRAG & DROP FILES
   ========================================================= */

document.addEventListener(
    "dragover",
    event => {

        event.preventDefault();

        document.body.classList
            .add(
                "turkai-dragging"
            );
    }
);


document.addEventListener(
    "dragleave",
    event => {

        if (
            event.target ===
            document.body
        ) {

            document.body.classList
                .remove(
                    "turkai-dragging"
                );
        }
    }
);


document.addEventListener(
    "drop",
    event => {

        event.preventDefault();

        document.body.classList
            .remove(
                "turkai-dragging"
            );

        const files =
            Array.from(
                event.dataTransfer
                    ?.files ||
                []
            );

        if (
            files.length === 0
        ) {
            return;
        }

        turkAIHandleFile(
            files[0]
        );
    }
);


/* =========================================================
   PLAN SYSTEM
   ========================================================= */

const TURKAI_PLANS = {

    free: {
        name:
            "Free",

        price:
            0,

        color:
            "default",

        features: [
            "AI sohbet",
            "Hafıza",
            "Temel araştırma",
            "Kodlama",
            "Hava durumu"
        ]
    },

    pro: {
        name:
            "Pro",

        price:
            250,

        color:
            "purple",

        features: [
            "Daha yüksek kullanım",
            "Gelişmiş araştırma",
            "Görsel oluşturma",
            "Gelişmiş kodlama",
            "Öncelikli AI"
        ]
    },

    plus: {
        name:
            "Plus",

        price:
            500,

        color:
            "gold",

        features: [
            "Yüksek kullanım",
            "Gelişmiş araştırma",
            "Görsel oluşturma",
            "Video oluşturma",
            "Gelişmiş modeller"
        ]
    },

    ultra: {
        name:
            "Ultra",

        price:
            1000,

        color:
            "ultra",

        features: [
            "100.000 satıra kadar kod",
            "1 GB dosya desteği",
            "Gelişmiş AI",
            "Yüksek araştırma limiti",
            "Gelişmiş medya"
        ]
    }
};


/* =========================================================
   PLAN RENDER
   ========================================================= */

function turkAIRenderPlans() {

    const container =
        document.querySelector(
            "#plansContainer"
        );

    if (!container) {
        return;
    }

    const currentPlan =
        turkAIGetPlan();

    container.innerHTML =
        Object.entries(
            TURKAI_PLANS
        )
        .map(
            ([id, plan]) => {

                const current =
                    id === currentPlan;

                return `
                    <div
                        class="
                            turkai-plan-card
                            ${plan.color}
                            ${
                                current
                                    ? "current"
                                    : ""
                            }
                        "
                    >

                        <div
                            class="turkai-plan-title"
                        >
                            ${turkAIEscapeHTML(
                                plan.name
                            )}
                        </div>

                        <div
                            class="turkai-plan-price"
                        >
                            ${
                                plan.price === 0
                                    ? "Ücretsiz"
                                    : `₺${plan.price}/ay`
                            }
                        </div>

                        <ul>
                            ${plan.features
                                .map(
                                    feature =>
                                        `<li>${turkAIEscapeHTML(
                                            feature
                                        )}</li>`
                                )
                                .join("")}
                        </ul>

                        <button
                            type="button"
                            data-plan="${
                                id
                            }"
                            ${
                                current
                                    ? "disabled"
                                    : ""
                            }
                        >
                            ${
                                current
                                    ? "Mevcut plan"
                                    : "İncele"
                            }
                        </button>

                    </div>
                `;
            }
        )
        .join("");
}


/* =========================================================
   PLAN CLICK
   ========================================================= */

document.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                "[data-plan]"
            );

        if (!button) {
            return;
        }

        const plan =
            button.dataset.plan;

        if (!plan) {
            return;
        }

        turkAIShowToast(
            `${TURKAI_PLANS[plan]?.name || plan} planı seçildi.`,
            "info"
        );

        /*
          Gerçek ödeme backend'deki
          Iyzico entegrasyonuna bağlanabilir.
        */
    }
);


/* =========================================================
   USAGE PANEL
   ========================================================= */

async function turkAILoadUsage() {

    try {

        const result =
            await turkAIApi(
                "/api/usage"
            );

        const usage =
            result?.usage ||
            result?.data ||
            result;

        TURKAI_STATE.usage =
            usage;

        turkAIRenderUsage(
            usage
        );

        return usage;

    } catch (_) {

        return null;
    }
}


function turkAIRenderUsage(
    usage
) {

    if (!usage) {
        return;
    }

    const container =
        document.querySelector(
            "#usagePanel"
        );

    if (!container) {
        return;
    }

    const messages =
        usage.messages ||
        usage.dailyMessages ||
        {};

    const used =
        Number(
            messages.used ||
            0
        );

    const limit =
        Number(
            messages.limit ||
            usage.messageLimit ||
            0
        );

    const percent =
        limit > 0
            ? Math.min(
                100,
                (
                    used /
                    limit
                ) *
                100
            )
            : 0;

    container.innerHTML = `
        <div class="turkai-usage-title">
            Günlük kullanım
        </div>

        <div class="turkai-usage-count">
            ${used} / ${
                limit || "∞"
            }
        </div>

        <div class="turkai-usage-bar">
            <div
                style="width:${percent}%"
            ></div>
        </div>
    `;
}


/* =========================================================
   COPY MESSAGE
   ========================================================= */

document.addEventListener(
    "click",
    async event => {

        const button =
            event.target.closest(
                "[data-copy-message]"
            );

        if (!button) {
            return;
        }

        const message =
            button.closest(
                "[data-message]"
            );

        const text =
            message?.innerText ||
            message?.textContent ||
            "";

        if (!text) {
            return;
        }

        try {

            await navigator.clipboard
                .writeText(
                    text.trim()
                );

            turkAIShowToast(
                "Mesaj kopyalandı.",
                "success"
            );

        } catch (_) {

            turkAIShowToast(
                "Kopyalama başarısız.",
                "error"
            );
        }
    }
);


/* =========================================================
   RETRY MESSAGE
   ========================================================= */

document.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                "[data-retry-message]"
            );

        if (!button) {
            return;
        }

        const message =
            button.closest(
                "[data-message]"
            );

        const text =
            message?.dataset?.text ||
            message?.innerText ||
            "";

        if (!text) {
            return;
        }

        const input =
            turkAIGetInput();

        if (!input) {
            return;
        }

        input.value =
            text.trim();

        turkAIResizeInput?.();

        turkAISendMessage();
    }
);


/* =========================================================
   NEW CHAT
   ========================================================= */

function turkAINewChat() {

    TURKAI_STATE
        .conversationId =
        turkAIGenerateId(
            "conversation"
        );

    TURKAI_STATE.messages =
        [];

    const container =
        TURKAI_DOM.messages ||
        document.querySelector(
            "#messages"
        );

    if (container) {
        container.innerHTML = "";
    }

    turkAIStorageSet(
        "turkai_conversation_id",
        TURKAI_STATE
            .conversationId
    );

    turkAIShowWelcome();

    turkAIShowToast(
        "Yeni sohbet hazır.",
        "success"
    );
}


document.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                "#newChatButton, [data-action='new-chat']"
            );

        if (!button) {
            return;
        }

        turkAINewChat();
    }
);


/* =========================================================
   SCROLL TOP / BOTTOM
   ========================================================= */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key ===
            "Home" &&
            event.ctrlKey
        ) {

            const container =
                TURKAI_DOM.messages;

            if (container) {

                container.scrollTo({
                    top: 0,
                    behavior:
                        "smooth"
                });
            }
        }

        if (
            event.key ===
            "End" &&
            event.ctrlKey
        ) {

            turkAIScrollToBottom();
        }
    }
);


/* =========================================================
   ONLINE STATUS
   ========================================================= */

function turkAIUpdateOnlineStatus() {

    const online =
        navigator.onLine;

    document.body
        .classList.toggle(
            "turkai-offline",
            !online
        );

    document
        .querySelectorAll(
            "[data-online-status]"
        )
        .forEach(
            element => {

                element.textContent =
                    online
                        ? "Çevrimiçi"
                        : "Çevrimdışı";
            }
        );
}


window.addEventListener(
    "online",
    () => {

        turkAIUpdateOnlineStatus();

        turkAIShowToast(
            "İnternet bağlantısı geri geldi.",
            "success"
        );

        turkAIConnectRealtime();
    }
);


window.addEventListener(
    "offline",
    () => {

        turkAIUpdateOnlineStatus();

        turkAIShowToast(
            "İnternet bağlantısı kesildi.",
            "warning"
        );
    }
);


/* =========================================================
   PAGE VISIBILITY
   ========================================================= */

document.addEventListener(
    "visibilitychange",
    () => {

        if (
            document.visibilityState ===
            "visible"
        ) {

            turkAIUpdateOnlineStatus();

            if (
                TURKAI_STATE
                    .authenticated &&
                !TURKAI_STATE
                    .socketConnected
            ) {

                turkAIConnectRealtime();
            }
        }
    }
);


/* =========================================================
   BEFORE UNLOAD
   ========================================================= */

window.addEventListener(
    "beforeunload",
    () => {

        try {

            turkAIStorageSet(
                "turkai_last_active",
                Date.now()
            );

            turkAIStorageSet(
                "turkai_conversation_id",
                TURKAI_STATE
                    .conversationId
            );

        } catch (_) {}
    }
);


/* =========================================================
   FINAL APP INITIALIZATION
   ========================================================= */

async function turkAIInitializeApp() {

    if (
        TURKAI_AUTH_STATE
            .initialized
    ) {
        return;
    }

    TURKAI_AUTH_STATE
        .initialized =
        true;

    console.log(
        "TürkAI başlatılıyor..."
    );

    try {

        turkAIApplySettings();

    } catch (error) {

        console.warn(
            "Settings:",
            error
        );
    }

    try {

        turkAIUpdateOnlineStatus();

    } catch (_) {}


    try {

        turkAIInitializeVoice();

    } catch (error) {

        console.warn(
            "Voice:",
            error
        );
    }


    try {

        turkAIInitializeGoogle();

    } catch (error) {

        console.warn(
            "Google:",
            error
        );
    }


    try {

        await turkAILoadCurrentUser();

    } catch (_) {}


    try {

        turkAIUpdateUserUI();

    } catch (_) {}


    try {

        turkAIRenderPlans();

    } catch (_) {}


    try {

        await turkAILoadUsage();

    } catch (_) {}


    try {

        turkAIRenderModelMenu();

    } catch (_) {}


    try {

        if (
            TURKAI_STATE
                .authenticated
        ) {

            await turkAILoadNotifications();

            turkAIConnectRealtime();
        }

    } catch (_) {}


    /*
      Welcome ekranını yalnızca sohbet
      boşsa göster.
    */

    try {

        if (
            !TURKAI_STATE.messages ||
            TURKAI_STATE.messages
                .length === 0
        ) {

            turkAIShowWelcome();
        }

    } catch (_) {}


    /*
      Input'a otomatik odaklan.
    */

    setTimeout(
        () => {

            try {

                if (
                    window.innerWidth >
                    700
                ) {

                    turkAIGetInput()
                        ?.focus();
                }

            } catch (_) {}
        },
        250
    );


    console.log(
        "TürkAI hazır."
    );
}


/* =========================================================
   DOM READY
   ========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        turkAIInitializeApp,
        {
            once: true
        }
    );

} else {

    turkAIInitializeApp();
}


/* =========================================================
   GLOBAL API
   ========================================================= */

window.TurkAI = {

    version:
        "10.0.0",

    state:
        TURKAI_STATE,

    settings:
        TURKAI_SETTINGS,

    send:
        turkAISendMessage,

    newChat:
        turkAINewChat,

    research:
        turkAIRunResearch,

    weather:
        turkAIGetWeather,

    upload:
        turkAIUploadFile,

    image:
        turkAIGenerateImage,

    video:
        turkAIGenerateVideo,

    createTask:
        turkAICreateTask,

    cancelTask:
        turkAICancelTask,

    logout:
        turkAILogout,

    voice:
        turkAIToggleVoice,

    sidebar:
        turkAIToggleSidebar,

    setTheme:
        turkAISetTheme,

    setSetting:
        turkAISetSetting,

    usage:
        turkAILoadUsage
};


/* =========================================================
   DEBUG INFORMATION
   ========================================================= */

window.TurkAIDebug = {

    state:
        () =>
            TURKAI_STATE,

    auth:
        () =>
            TURKAI_AUTH_STATE,

    file:
        () =>
            TURKAI_FILE_STATE,

    research:
        () =>
            TURKAI_RESEARCH_STATE,

    media:
        () =>
            TURKAI_MEDIA_STATE,

    task:
        () =>
            TURKAI_TASK_STATE,

    voice:
        () =>
            TURKAI_VOICE_STATE,

    settings:
        () =>
            TURKAI_SETTINGS
};


/* =========================================================
   FINAL READY EVENT
   ========================================================= */

window.dispatchEvent(
    new CustomEvent(
        "turkai:ready",
        {
            detail: {
                version:
                    "10.0.0",

                plan:
                    turkAIGetPlan(),

                authenticated:
                    TURKAI_STATE
                        .authenticated
            }
        }
    )
);


/* =========================================================
   PART 3 / 3 END
   APP.JS TAMAMLANDI
   ========================================================= */
