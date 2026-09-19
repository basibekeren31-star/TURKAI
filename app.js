/* =========================================================
   TÜRKAI — APP.JS
   Ultra Chat Engine
   Tek dosya / mevcut index.html ile uyumlu
   ========================================================= */

(() => {
    "use strict";

    /* =====================================================
       GLOBAL ENGINE
       ===================================================== */

    if (window.__TURKAI_APP_INITIALIZED__) {
        console.warn("TürkAI app.js zaten başlatılmış.");
        return;
    }

    window.__TURKAI_APP_INITIALIZED__ = true;

    const TURKAI = {
        version: "10.0",
        appName: "TürkAI",

        state: {
            currentChatId: null,
            chats: [],
            messages: [],
            attachments: [],
            isSending: false,
            isResearching: false,
            currentModel: "auto",
            currentPlan: "free",
            memoryEnabled: true,
            researchEnabled: false,
            weatherEnabled: false,
            darkMode: true,
            socket: null,
            user: null
        },

        config: {
            storageKey: "turkai_state_v10",
            chatsKey: "turkai_chats_v10",

            chatEndpoints: [
                "/api/chat",
                "/api/message",
                "/api/ask"
            ],

            researchEndpoint: "/api/research",
            weatherEndpoint: "/api/weather",
            uploadEndpoint: "/api/upload",

            timeout: 90000,

            plans: {
                free: {
                    name: "Free",
                    dailyLimit: 50
                },
                pro: {
                    name: "Pro",
                    dailyLimit: 100
                },
                plus: {
                    name: "Plus",
                    dailyLimit: 200
                },
                ultra: {
                    name: "Ultra",
                    dailyLimit: 1000
                },
                developer: {
                    name: "Developer",
                    dailyLimit: 400
                }
            }
        }
    };

    /* =====================================================
       SHORTCUTS
       ===================================================== */

    const $ = (id) => document.getElementById(id);

    const qs = (selector, parent = document) =>
        parent.querySelector(selector);

    const qsa = (selector, parent = document) =>
        [...parent.querySelectorAll(selector)];

    /* =====================================================
       DOM
       ===================================================== */

    let DOM = {};

    function cacheDOM() {
        DOM = {
            body: document.body,

            messageScrollArea: $("messageScrollArea"),
            messageList: $("messageList"),
            dynamicMessages: $("dynamicMessages"),
            emptyChatState: $("emptyChatState"),
            typingIndicator: $("typingIndicator"),

            messageInput: $("messageInput"),
            sendMessageButton: $("sendMessageButton"),
            composer: $("composer"),

            newChatButton: $("newChatButton"),
            clearChatButton: $("clearChatButton"),
            deleteChatButton: $("deleteChatButton"),

            fileInput: $("fileInput"),
            uploadButton: $("uploadButton"),
            attachmentList: $("attachmentList"),

            voiceButton: $("voiceButton"),
            researchButton: $("researchButton"),
            weatherButton: $("weatherButton"),
            memoryButton: $("memoryButton"),

            modelSelect: $("modelSelect"),
            modelSelector: $("modelSelector"),

            chatList: $("chatList"),
            conversationsList: $("conversationsList"),

            userName: $("userName"),
            userAvatar: $("userAvatar"),
            profileButton: $("profileButton"),

            settingsButton: $("settingsButton"),
            planButton: $("planButton"),
            purchaseButton: $("purchaseButton"),

            imageButton: $("imageButton"),
            videoButton: $("videoButton"),

            imageCreateModal: $("imageCreateModal"),
            generateImageButton: $("generateImageButton"),

            closeModalButtons: qsa(
                "[data-close-modal], .close-modal, .modal-close"
            )
        };
    }

    /* =====================================================
       MESSAGE CONTAINER
       ===================================================== */

    function ensureMessageContainer() {
        let host = DOM.dynamicMessages;
        const list = DOM.messageList;

        if (!host && list) {
            host = document.createElement("div");
            host.id = "dynamicMessages";
            host.className = "dynamic-messages";

            list.appendChild(host);

            DOM.dynamicMessages = host;
        }

        if (host && list && !list.contains(host)) {
            list.appendChild(host);
        }

        if (!host && list) {
            host = list;
        }

        return host;
    }

    /* =====================================================
       STORAGE
       ===================================================== */

    function safeJSONParse(value, fallback = null) {
        try {
            return JSON.parse(value);
        } catch {
            return fallback;
        }
    }

    function saveState() {
        try {
            const data = {
                currentChatId: TURKAI.state.currentChatId,
                chats: TURKAI.state.chats,
                currentModel: TURKAI.state.currentModel,
                currentPlan: TURKAI.state.currentPlan,
                memoryEnabled: TURKAI.state.memoryEnabled,
                researchEnabled: TURKAI.state.researchEnabled,
                weatherEnabled: TURKAI.state.weatherEnabled
            };

            localStorage.setItem(
                TURKAI.config.storageKey,
                JSON.stringify(data)
            );
        } catch (error) {
            console.warn("TürkAI state kaydedilemedi:", error);
        }
    }

    function loadState() {
        try {
            const saved = safeJSONParse(
                localStorage.getItem(TURKAI.config.storageKey)
            );

            if (!saved) return;

            if (Array.isArray(saved.chats)) {
                TURKAI.state.chats = saved.chats;
            }

            TURKAI.state.currentChatId =
                saved.currentChatId || null;

            TURKAI.state.currentModel =
                saved.currentModel || "auto";

            TURKAI.state.currentPlan =
                saved.currentPlan || "free";

            TURKAI.state.memoryEnabled =
                saved.memoryEnabled !== false;

            TURKAI.state.researchEnabled =
                saved.researchEnabled === true;

            TURKAI.state.weatherEnabled =
                saved.weatherEnabled === true;
        } catch (error) {
            console.warn("TürkAI state okunamadı:", error);
        }
    }

    function saveChats() {
        try {
            localStorage.setItem(
                TURKAI.config.chatsKey,
                JSON.stringify(TURKAI.state.chats)
            );
        } catch (error) {
            console.warn("Sohbetler kaydedilemedi:", error);
        }
    }

    function loadChats() {
        try {
            const saved = safeJSONParse(
                localStorage.getItem(TURKAI.config.chatsKey)
            );

            if (Array.isArray(saved)) {
                TURKAI.state.chats = saved;
            }
        } catch (error) {
            console.warn(error);
        }
    }

    /* =====================================================
       ID / DATE
       ===================================================== */

    function createId(prefix = "id") {
        return (
            prefix +
            "_" +
            Date.now().toString(36) +
            "_" +
            Math.random().toString(36).slice(2, 9)
        );
    }

    function now() {
        return new Date().toISOString();
    }

    function formatTime(date) {
        try {
            return new Intl.DateTimeFormat("tr-TR", {
                hour: "2-digit",
                minute: "2-digit"
            }).format(new Date(date));
        } catch {
            return "";
        }
    }

    function formatDate(date) {
        try {
            return new Intl.DateTimeFormat("tr-TR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            }).format(new Date(date));
        } catch {
            return "";
        }
    }

    /* =====================================================
       HTML SECURITY
       ===================================================== */

    function escapeHTML(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function safeURL(url) {
        try {
            const parsed = new URL(url, window.location.origin);

            if (
                parsed.protocol === "http:" ||
                parsed.protocol === "https:"
            ) {
                return parsed.href;
            }

            return "#";
        } catch {
            return "#";
        }
    }

    /* =====================================================
       MARKDOWN-LIKE MESSAGE RENDER
       ===================================================== */

    function renderText(text) {
        if (!text) return "";

        let source = String(text);

        const codeBlocks = [];

        source = source.replace(
            /```([a-zA-Z0-9_+-]*)\n?([\s\S]*?)```/g,
            (_, language, code) => {
                const index = codeBlocks.length;

                codeBlocks.push({
                    language: language || "code",
                    code: code.replace(/\n$/, "")
                });

                return `___TURKAI_CODE_${index}___`;
            }
        );

        source = escapeHTML(source);

        source = source.replace(
            /`([^`]+)`/g,
            "<code>$1</code>"
        );

        source = source.replace(
            /\*\*(.*?)\*\*/g,
            "<strong>$1</strong>"
        );

        source = source.replace(
            /\*(.*?)\*/g,
            "<em>$1</em>"
        );

        source = source.replace(
            /^### (.*)$/gm,
            "<h4>$1</h4>"
        );

        source = source.replace(
            /^## (.*)$/gm,
            "<h3>$1</h3>"
        );

        source = source.replace(
            /^# (.*)$/gm,
            "<h2>$1</h2>"
        );

        source = source.replace(
            /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
            (_, title, url) => {
                const clean = safeURL(url);

                return `
                    <a
                        href="${escapeHTML(clean)}"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        ${title}
                    </a>
                `;
            }
        );

        source = source.replace(
            /\n/g,
            "<br>"
        );

        codeBlocks.forEach((block, index) => {
            const codeHTML = escapeHTML(block.code);

            const html = `
                <div class="turkai-code-block">
                    <div class="turkai-code-header">
                        <span>${escapeHTML(block.language)}</span>
                        <button
                            type="button"
                            class="turkai-copy-code"
                            data-code-index="${index}"
                        >
                            Kopyala
                        </button>
                    </div>
                    <pre><code>${codeHTML}</code></pre>
                </div>
            `;

            source = source.replace(
                `___TURKAI_CODE_${index}___`,
                html
            );
        });

        return source;
    }

    /* =====================================================
       TOAST
       ===================================================== */

    function toast(message, type = "info") {
        let container = $("turkaiToastContainer");

        if (!container) {
            container = document.createElement("div");
            container.id = "turkaiToastContainer";

            container.style.position = "fixed";
            container.style.right = "20px";
            container.style.bottom = "20px";
            container.style.zIndex = "999999";
            container.style.display = "flex";
            container.style.flexDirection = "column";
            container.style.gap = "10px";

            document.body.appendChild(container);
        }

        const item = document.createElement("div");

        item.className = `turkai-toast turkai-toast-${type}`;

        item.textContent = message;

        item.style.padding = "12px 16px";
        item.style.borderRadius = "14px";
        item.style.background = "rgba(20,22,30,.94)";
        item.style.color = "#fff";
        item.style.border = "1px solid rgba(255,255,255,.12)";
        item.style.boxShadow = "0 15px 40px rgba(0,0,0,.35)";
        item.style.backdropFilter = "blur(16px)";
        item.style.fontSize = "14px";
        item.style.maxWidth = "340px";

        container.appendChild(item);

        setTimeout(() => {
            item.style.opacity = "0";
            item.style.transform = "translateY(8px)";
            item.style.transition = ".25s";

            setTimeout(() => item.remove(), 300);
        }, 3000);
    }

    /* =====================================================
       EMPTY STATE
       ===================================================== */

    function updateEmptyState() {
        const host = ensureMessageContainer();

        const hasMessages =
            TURKAI.state.messages.length > 0;

        if (DOM.emptyChatState) {
            DOM.emptyChatState.style.display =
                hasMessages ? "none" : "";
        }

        if (host) {
            host.style.display =
                hasMessages ? "" : "none";
        }
    }

    /* =====================================================
       MESSAGE MODEL
       ===================================================== */

    function createMessage(role, content, extra = {}) {
        return {
            id: createId("msg"),
            role,
            content: String(content ?? ""),
            createdAt: now(),

            ...extra
        };
    }

    /* =====================================================
       RENDER MESSAGE
       ===================================================== */

    function renderMessage(message) {
        const host = ensureMessageContainer();

        if (!host) return;

        const wrapper = document.createElement("div");

        wrapper.className =
            `turkai-message turkai-message-${message.role}`;

        wrapper.dataset.messageId = message.id;

        const isUser =
            message.role === "user";

        const isAssistant =
            message.role === "assistant";

        const isSystem =
            message.role === "system";

        wrapper.innerHTML = `
            <div class="turkai-message-inner">

                <div class="turkai-message-avatar">
                    ${
                        isUser
                            ? `
                                <div class="turkai-user-avatar">
                                    ${escapeHTML(
                                        getUserInitial()
                                    )}
                                </div>
                            `
                            : isSystem
                                ? `
                                    <div class="turkai-system-avatar">
                                        !
                                    </div>
                                `
                                : `
                                    <div class="turkai-ai-avatar">
                                        <span>AI</span>
                                    </div>
                                `
                    }
                </div>

                <div class="turkai-message-content">

                    <div class="turkai-message-top">
                        <strong>
                            ${
                                isUser
                                    ? getUserDisplayName()
                                    : isAssistant
                                        ? "TürkAI"
                                        : "Sistem"
                            }
                        </strong>

                        <span class="turkai-message-time">
                            ${formatTime(message.createdAt)}
                        </span>
                    </div>

                    <div class="turkai-message-text">
                        ${renderText(message.content)}
                    </div>

                    ${
                        message.sources?.length
                            ? renderSources(
                                message.sources
                            )
                            : ""
                    }

                    ${
                        message.attachments?.length
                            ? renderMessageAttachments(
                                message.attachments
                            )
                            : ""
                    }

                    ${
                        isAssistant
                            ? `
                                <div class="turkai-message-actions">

                                    <button
                                        type="button"
                                        class="turkai-msg-action"
                                        data-action="copy-message"
                                        data-message-id="${message.id}"
                                    >
                                        Kopyala
                                    </button>

                                    <button
                                        type="button"
                                        class="turkai-msg-action"
                                        data-action="regenerate"
                                        data-message-id="${message.id}"
                                    >
                                        Yeniden üret
                                    </button>

                                </div>
                            `
                            : ""
                    }

                </div>
            </div>
        `;

        host.appendChild(wrapper);

        return wrapper;
    }

    function renderSources(sources) {
        if (!Array.isArray(sources)) return "";

        const valid = sources.filter(
            source =>
                source &&
                (source.url || source.link)
        );

        if (!valid.length) return "";

        return `
            <div class="turkai-sources">
                <div class="turkai-sources-title">
                    Kaynaklar
                </div>

                <div class="turkai-source-list">
                    ${valid
                        .slice(0, 10)
                        .map(source => {
                            const url = safeURL(
                                source.url || source.link
                            );

                            return `
                                <a
                                    href="${escapeHTML(url)}"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="turkai-source"
                                >
                                    <span>
                                        ${escapeHTML(
                                            source.title ||
                                            source.name ||
                                            url
                                        )}
                                    </span>
                                </a>
                            `;
                        })
                        .join("")}
                </div>
            </div>
        `;
    }

    function renderMessageAttachments(attachments) {
        return `
            <div class="turkai-message-attachments">
                ${attachments
                    .map(
                        file => `
                            <div class="turkai-file-chip">
                                <span>
                                    ${escapeHTML(
                                        file.name ||
                                        "Dosya"
                                    )}
                                </span>
                            </div>
                        `
                    )
                    .join("")}
            </div>
        `;
    }

    function renderAllMessages() {
        const host = ensureMessageContainer();

        if (!host) return;

        host.innerHTML = "";

        for (const message of TURKAI.state.messages) {
            renderMessage(message);
        }

        updateEmptyState();

        scrollToBottom(false);
    }

    /* =====================================================
       SCROLL
       ===================================================== */

    function scrollToBottom(smooth = true) {
        const area =
            DOM.messageScrollArea ||
            DOM.messageList;

        if (!area) return;

        requestAnimationFrame(() => {
            area.scrollTo({
                top: area.scrollHeight,
                behavior: smooth
                    ? "smooth"
                    : "auto"
            });
        });
    }

    /* =====================================================
       CHAT MANAGEMENT
       ===================================================== */

    function createChat(title = "Yeni sohbet") {
        const chat = {
            id: createId("chat"),
            title,
            createdAt: now(),
            updatedAt: now(),
            messages: []
        };

        TURKAI.state.chats.unshift(chat);

        TURKAI.state.currentChatId = chat.id;
        TURKAI.state.messages = [];

        saveChats();
        saveState();

        renderChatList();
        renderAllMessages();

        return chat;
    }

    function getCurrentChat() {
        return TURKAI.state.chats.find(
            chat =>
                chat.id ===
                TURKAI.state.currentChatId
        );
    }

    function ensureCurrentChat() {
        let chat = getCurrentChat();

        if (!chat) {
            chat = createChat("Yeni sohbet");
        }

        return chat;
    }

    function updateCurrentChat() {
        const chat = getCurrentChat();

        if (!chat) return;

        chat.messages =
            TURKAI.state.messages.map(
                message => ({ ...message })
            );

        chat.updatedAt = now();

        const firstUserMessage =
            TURKAI.state.messages.find(
                message =>
                    message.role === "user"
            );

        if (
            firstUserMessage &&
            (!chat.title ||
                chat.title === "Yeni sohbet")
        ) {
            chat.title =
                firstUserMessage.content
                    .trim()
                    .slice(0, 45) ||
                "Yeni sohbet";
        }

        saveChats();
        saveState();

        renderChatList();
    }

    function restoreCurrentChat() {
        const chat = getCurrentChat();

        if (!chat) {
            if (TURKAI.state.chats.length) {
                TURKAI.state.currentChatId =
                    TURKAI.state.chats[0].id;

                return restoreCurrentChat();
            }

            createChat("Yeni sohbet");
            return;
        }

        TURKAI.state.messages =
            Array.isArray(chat.messages)
                ? chat.messages.map(
                    message => ({ ...message })
                )
                : [];

        renderAllMessages();
    }

    function selectChat(chatId) {
        const chat =
            TURKAI.state.chats.find(
                item => item.id === chatId
            );

        if (!chat) return;

        TURKAI.state.currentChatId = chat.id;

        TURKAI.state.messages =
            Array.isArray(chat.messages)
                ? chat.messages.map(
                    message => ({ ...message })
                )
                : [];

        saveState();

        renderAllMessages();
        renderChatList();
    }

    function deleteCurrentChat() {
        const chat = getCurrentChat();

        if (!chat) return;

        const confirmed =
            window.confirm(
                `"${chat.title}" sohbeti silinsin mi?`
            );

        if (!confirmed) return;

        TURKAI.state.chats =
            TURKAI.state.chats.filter(
                item => item.id !== chat.id
            );

        if (TURKAI.state.chats.length) {
            TURKAI.state.currentChatId =
                TURKAI.state.chats[0].id;

            TURKAI.state.messages =
                TURKAI.state.chats[0].messages || [];
        } else {
            createChat("Yeni sohbet");
            return;
        }

        saveChats();
        saveState();

        renderChatList();
        renderAllMessages();

        toast("Sohbet silindi.", "success");
    }

    function clearCurrentChat() {
        if (!TURKAI.state.messages.length) {
            toast("Sohbet zaten boş.");
            return;
        }

        const confirmed =
            window.confirm(
                "Bu sohbet temizlensin mi?"
            );

        if (!confirmed) return;

        TURKAI.state.messages = [];

        updateCurrentChat();
        renderAllMessages();

        toast("Sohbet temizlendi.", "success");
    }

    /* =====================================================
       CHAT LIST
       ===================================================== */

    function renderChatList() {
        const container =
            DOM.chatList ||
            DOM.conversationsList;

        if (!container) return;

        container.innerHTML = "";

        const chats =
            [...TURKAI.state.chats]
                .sort(
                    (a, b) =>
                        new Date(b.updatedAt) -
                        new Date(a.updatedAt)
                );

        for (const chat of chats) {
            const button =
                document.createElement("button");

            button.type = "button";

            button.className =
                "turkai-chat-item";

            if (
                chat.id ===
                TURKAI.state.currentChatId
            ) {
                button.classList.add("active");
            }

            button.dataset.chatId = chat.id;

            button.innerHTML = `
                <span class="turkai-chat-item-icon">
                    Chat
                </span>

                <span class="turkai-chat-item-text">
                    ${escapeHTML(
                        chat.title ||
                        "Yeni sohbet"
                    )}
                </span>
            `;

            container.appendChild(button);
        }
    }

    /* =====================================================
       TYPING
       ===================================================== */

    function setTyping(visible) {
        if (DOM.typingIndicator) {
            DOM.typingIndicator.style.display =
                visible ? "" : "none";
        }
    }

    function addTypingFallback() {
        const host = ensureMessageContainer();

        if (!host) return null;

        const element =
            document.createElement("div");

        element.className =
            "turkai-typing-fallback";

        element.innerHTML = `
            <div class="turkai-message-inner">
                <div class="turkai-ai-avatar">
                    <span>AI</span>
                </div>

                <div class="turkai-typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;

        host.appendChild(element);

        scrollToBottom();

        return element;
    }

    /* =====================================================
       USER
       ===================================================== */

    function getUserDisplayName() {
        const candidates = [
            TURKAI.state.user?.name,
            localStorage.getItem("turkai_user_name"),
            localStorage.getItem("userName"),
            DOM.userName?.textContent
        ];

        for (const name of candidates) {
            if (
                name &&
                name.trim() &&
                name.trim() !== "Kullanıcı"
            ) {
                return name.trim();
            }
        }

        return "Sen";
    }

    function getUserInitial() {
        return (
            getUserDisplayName()
                .trim()
                .charAt(0)
                .toUpperCase() || "S"
        );
    }

    function detectStoredUser() {
        const userKeys = [
            "turkai_user",
            "user",
            "googleUser",
            "turkaiUser"
        ];

        for (const key of userKeys) {
            const value =
                localStorage.getItem(key);

            if (!value) continue;

            const parsed =
                safeJSONParse(value);

            if (
                parsed &&
                typeof parsed === "object"
            ) {
                TURKAI.state.user = {
                    ...parsed
                };

                return;
            }
        }

        const name =
            localStorage.getItem(
                "turkai_user_name"
            );

        if (name) {
            TURKAI.state.user = {
                name
            };
        }
    }

    function updateUserUI() {
        if (DOM.userName) {
            DOM.userName.textContent =
                getUserDisplayName();
        }

        if (DOM.userAvatar) {
            DOM.userAvatar.textContent =
                getUserInitial();
        }
    }

    /* =====================================================
       MODEL
       ===================================================== */

    function getSelectedModel() {
        if (
            DOM.modelSelect &&
            DOM.modelSelect.value
        ) {
            return DOM.modelSelect.value;
        }

        if (
            DOM.modelSelector &&
            DOM.modelSelector.value
        ) {
            return DOM.modelSelector.value;
        }

        return TURKAI.state.currentModel;
    }

    function setModel(model) {
        TURKAI.state.currentModel =
            model || "auto";

        if (DOM.modelSelect) {
            DOM.modelSelect.value =
                TURKAI.state.currentModel;
        }

        if (DOM.modelSelector) {
            DOM.modelSelector.value =
                TURKAI.state.currentModel;
        }

        saveState();
    }

    /* =====================================================
       ATTACHMENTS
       ===================================================== */

    function addAttachments(files) {
        if (!files?.length) return;

        for (const file of files) {
            if (
                TURKAI.state.attachments.some(
                    item =>
                        item.name === file.name &&
                        item.size === file.size
                )
            ) {
                continue;
            }

            if (file.size > 10 * 1024 * 1024) {
                toast(
                    `${file.name}: maksimum 10 MB.`,
                    "error"
                );
                continue;
            }

            TURKAI.state.attachments.push({
                id: createId("file"),
                name: file.name,
                size: file.size,
                type: file.type || "application/octet-stream",
                file
            });
        }

        renderAttachments();
    }

    function removeAttachment(id) {
        TURKAI.state.attachments =
            TURKAI.state.attachments.filter(
                file => file.id !== id
            );

        renderAttachments();
    }

    function clearAttachments() {
        TURKAI.state.attachments = [];

        if (DOM.fileInput) {
            DOM.fileInput.value = "";
        }

        renderAttachments();
    }

    function renderAttachments() {
        const container =
            DOM.attachmentList;

        if (!container) return;

        container.innerHTML = "";

        for (
            const attachment
            of TURKAI.state.attachments
        ) {
            const item =
                document.createElement("div");

            item.className =
                "turkai-attachment";

            item.innerHTML = `
                <span class="turkai-attachment-name">
                    ${escapeHTML(
                        attachment.name
                    )}
                </span>

                <button
                    type="button"
                    data-remove-attachment="${attachment.id}"
                >
                    ×
                </button>
            `;

            container.appendChild(item);
        }
    }

    /* =====================================================
       FILE UPLOAD
       ===================================================== */

    async function uploadAttachment(
        attachment
    ) {
        if (!attachment?.file) {
            return attachment;
        }

        const formData =
            new FormData();

        formData.append(
            "file",
            attachment.file,
            attachment.name
        );

        try {
            const response =
                await fetch(
                    TURKAI.config.uploadEndpoint,
                    {
                        method: "POST",
                        body: formData
                    }
                );

            if (!response.ok) {
                return attachment;
            }

            const data =
                await response.json();

            return {
                ...attachment,
                upload: data
            };
        } catch {
            return attachment;
        }
    }

    async function uploadAttachments() {
        if (
            !TURKAI.state.attachments.length
        ) {
            return [];
        }

        const results = [];

        for (
            const attachment
            of TURKAI.state.attachments
        ) {
            results.push(
                await uploadAttachment(
                    attachment
                )
            );
        }

        return results;
    }

    /* =====================================================
       API REQUEST
       ===================================================== */

    async function fetchWithTimeout(
        url,
        options = {},
        timeout = TURKAI.config.timeout
    ) {
        const controller =
            new AbortController();

        const timer =
            setTimeout(
                () => controller.abort(),
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
            clearTimeout(timer);
        }
    }

    async function parseResponse(response) {
        const contentType =
            response.headers.get(
                "content-type"
            ) || "";

        const raw =
            await response.text();

        if (!raw) {
            return {};
        }

        if (
            contentType.includes(
                "application/json"
            )
        ) {
            const json =
                safeJSONParse(raw);

            return json ?? {
                text: raw
            };
        }

        if (
            raw.trim().startsWith("{") ||
            raw.trim().startsWith("[")
        ) {
            const json =
                safeJSONParse(raw);

            if (json) return json;
        }

        return {
            text: raw
        };
    }

    function extractAnswer(data) {
        if (!data) return "";

        if (typeof data === "string") {
            return data.trim();
        }

        const candidates = [
            data.answer,
            data.response,
            data.message,
            data.content,
            data.text,

            data.data?.answer,
            data.data?.response,
            data.data?.message,
            data.data?.content,
            data.data?.text,

            data.result?.answer,
            data.result?.response,
            data.result?.message,
            data.result?.content,
            data.result?.text
        ];

        for (const candidate of candidates) {
            if (
                typeof candidate === "string" &&
                candidate.trim()
            ) {
                return candidate.trim();
            }
        }

        return "";
    }

    function extractSources(data) {
        if (!data) return [];

        const candidates = [
            data.sources,
            data.data?.sources,
            data.result?.sources,
            data.references,
            data.data?.references
        ];

        for (const candidate of candidates) {
            if (Array.isArray(candidate)) {
                return candidate;
            }
        }

        return [];
    }

    /* =====================================================
       CHAT PAYLOAD
       ===================================================== */

    function buildChatPayload(
        message,
        uploadedAttachments
    ) {
        const messages =
            TURKAI.state.messages
                .slice(-30)
                .map(item => ({
                    role: item.role,
                    content: item.content
                }));

        return {
            message,

            prompt: message,

            input: message,

            messages,

            model:
                getSelectedModel(),

            plan:
                TURKAI.state.currentPlan,

            memory:
                TURKAI.state.memoryEnabled,

            research:
                TURKAI.state.researchEnabled,

            weather:
                TURKAI.state.weatherEnabled,

            chatId:
                TURKAI.state.currentChatId,

            conversationId:
                TURKAI.state.currentChatId,

            attachments:
                uploadedAttachments.map(
                    attachment => ({
                        id: attachment.id,
                        name: attachment.name,
                        size: attachment.size,
                        type: attachment.type,
                        upload: attachment.upload || null
                    })
                )
        };
    }

    /* =====================================================
       CHAT API
       ===================================================== */

    async function sendToChatAPI(
        message,
        uploadedAttachments
    ) {
        const payload =
            buildChatPayload(
                message,
                uploadedAttachments
            );

        let lastError = null;

        for (
            const endpoint
            of TURKAI.config.chatEndpoints
        ) {
            try {
                const response =
                    await fetchWithTimeout(
                        endpoint,
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json",

                                Accept:
                                    "application/json, text/plain, */*"
                            },

                            body:
                                JSON.stringify(
                                    payload
                                )
                        }
                    );

                const data =
                    await parseResponse(
                        response
                    );

                if (!response.ok) {
                    const error =
                        new Error(
                            `HTTP ${response.status}`
                        );

                    error.status =
                        response.status;

                    error.data = data;

                    throw error;
                }

                const answer =
                    extractAnswer(data);

                if (answer) {
                    return {
                        answer,
                        sources:
                            extractSources(data),
                        raw: data,
                        endpoint
                    };
                }

                if (
                    data.success === false
                ) {
                    throw new Error(
                        data.error ||
                        data.message ||
                        "Sunucu hata döndürdü."
                    );
                }

                if (
                    data.text &&
                    data.text.trim()
                ) {
                    return {
                        answer:
                            data.text.trim(),
                        sources:
                            extractSources(data),
                        raw: data,
                        endpoint
                    };
                }

            } catch (error) {
                lastError = error;

                console.warn(
                    `TürkAI endpoint başarısız: ${endpoint}`,
                    error
                );
            }
        }

        throw (
            lastError ||
            new Error(
                "TürkAI sunucusuna ulaşılamadı."
            )
        );
    }

    /* =====================================================
       LOCAL FALLBACK
       ===================================================== */

    function getLocalAnswer(message) {
        const text =
            message
                .toLocaleLowerCase("tr-TR")
                .trim();

        if (
            text === "en hızlı kim" ||
            text.includes("en hızlı kim")
        ) {
            return "TürkAI ⚡🤖";
        }

        if (
            text.includes("merhaba") ||
            text === "selam" ||
            text.includes("selam türkai")
        ) {
            return (
                `Merhaba ${getUserDisplayName()}! ` +
                "Ben TürkAI. Nasıl yardımcı olabilirim?"
            );
        }

        if (
            text.includes("sen kimsin") ||
            text.includes("türkai nedir")
        ) {
            return (
                "Ben TürkAI. Türkçe odaklı, " +
                "araştırma, kodlama, dosya ve yapay zekâ " +
                "özellikleri için geliştirilen bir AI asistanıyım."
            );
        }

        if (
            text.includes("saat kaç")
        ) {
            return (
                "Şu an saat " +
                new Intl.DateTimeFormat(
                    "tr-TR",
                    {
                        hour: "2-digit",
                        minute: "2-digit"
                    }
                ).format(new Date()) +
                "."
            );
        }

        if (
            text.includes("bugün günlerden ne")
        ) {
            return (
                "Bugün " +
                new Intl.DateTimeFormat(
                    "tr-TR",
                    {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric"
                    }
                ).format(new Date()) +
                "."
            );
        }

        return null;
    }

    /* =====================================================
       SEND MESSAGE
       ===================================================== */

    async function sendMessage(
        forcedMessage = null
    ) {
        if (TURKAI.state.isSending) {
            return;
        }

        const message =
            String(
                forcedMessage ??
                DOM.messageInput?.value ??
                ""
            ).trim();

        if (!message) {
            return;
        }

        ensureCurrentChat();

        TURKAI.state.isSending = true;

        if (DOM.sendMessageButton) {
            DOM.sendMessageButton.disabled =
                true;
        }

        /* -----------------------------------------------
           USER MESSAGE
           ----------------------------------------------- */

        const userAttachments =
            TURKAI.state.attachments.map(
                attachment => ({
                    name: attachment.name,
                    size: attachment.size,
                    type: attachment.type
                })
            );

        const userMessage =
            createMessage(
                "user",
                message,
                {
                    attachments:
                        userAttachments
                }
            );

        /*
         * EN ÖNEMLİ KISIM:
         * Mesaj önce state'e ekleniyor.
         * API hata verse bile silinmiyor.
         */

        TURKAI.state.messages.push(
            userMessage
        );

        renderMessage(userMessage);
        updateEmptyState();

        scrollToBottom();

        updateCurrentChat();

        if (DOM.messageInput) {
            DOM.messageInput.value = "";
            autoResizeTextarea();
        }

        const attachments =
            [...TURKAI.state.attachments];

        setTyping(true);

        const fallbackTyping =
            addTypingFallback();

        try {
            let uploadedAttachments = [];

            if (attachments.length) {
                uploadedAttachments =
                    await uploadAttachments();
            }

            const localAnswer =
                getLocalAnswer(message);

            let result;

            if (localAnswer) {
                result = {
                    answer: localAnswer,
                    sources: []
                };
            } else {
                result =
                    await sendToChatAPI(
                        message,
                        uploadedAttachments
                    );
            }

            if (fallbackTyping) {
                fallbackTyping.remove();
            }

            const assistantMessage =
                createMessage(
                    "assistant",
                    result.answer,
                    {
                        sources:
                            result.sources || []
                    }
                );

            /*
             * AI mesajı ayrı ekleniyor.
             * Kullanıcının mesajına dokunulmuyor.
             */

            TURKAI.state.messages.push(
                assistantMessage
            );

            renderMessage(
                assistantMessage
            );

            updateCurrentChat();

            scrollToBottom();

            clearAttachments();

        } catch (error) {
            console.error(
                "TürkAI mesaj hatası:",
                error
            );

            if (fallbackTyping) {
                fallbackTyping.remove();
            }

            /*
             * Kullanıcı mesajı burada SİLİNMİYOR.
             */

            const errorMessage =
                createMessage(
                    "assistant",
                    "Şu anda TürkAI sunucusuna bağlanamadım. Mesajın kaybolmadı; sohbet içinde kayıtlı. Sunucuyu kontrol edip tekrar deneyebilirsin.",
                    {
                        error: true
                    }
                );

            TURKAI.state.messages.push(
                errorMessage
            );

            renderMessage(
                errorMessage
            );

            updateCurrentChat();

            scrollToBottom();

            toast(
                "Sunucu bağlantısı başarısız.",
                "error"
            );
        } finally {
            setTyping(false);

            TURKAI.state.isSending =
                false;

            if (DOM.sendMessageButton) {
                DOM.sendMessageButton.disabled =
                    false;
            }

            if (DOM.messageInput) {
                DOM.messageInput.focus();
            }
        }
    }

    /* =====================================================
       REGENERATE
       ===================================================== */

    async function regenerateMessage(
        messageId
    ) {
        const index =
            TURKAI.state.messages.findIndex(
                message =>
                    message.id === messageId
            );

        if (index === -1) return;

        const message =
            TURKAI.state.messages[index];

        if (message.role !== "assistant") {
            return;
        }

        let userMessage = null;

        for (
            let i = index - 1;
            i >= 0;
            i--
        ) {
            if (
                TURKAI.state.messages[i]
                    .role === "user"
            ) {
                userMessage =
                    TURKAI.state.messages[i];

                break;
            }
        }

        if (!userMessage) {
            return;
        }

        TURKAI.state.messages.splice(
            index,
            1
        );

        renderAllMessages();

        const oldInput =
            DOM.messageInput?.value;

        if (DOM.messageInput) {
            DOM.messageInput.value =
                userMessage.content;
        }

        await sendMessage(
            userMessage.content
        );

        if (
            DOM.messageInput &&
            oldInput
        ) {
            DOM.messageInput.value =
                oldInput;
        }
    }

    /* =====================================================
       COPY
       ===================================================== */

    async function copyText(text) {
        try {
            await navigator.clipboard.writeText(
                text
            );

            toast(
                "Panoya kopyalandı.",
                "success"
            );
        } catch {
            const textarea =
                document.createElement("textarea");

            textarea.value = text;

            document.body.appendChild(
                textarea
            );

            textarea.select();

            document.execCommand(
                "copy"
            );

            textarea.remove();

            toast(
                "Panoya kopyalandı.",
                "success"
            );
        }
    }

    /* =====================================================
       RESEARCH
       ===================================================== */

    async function research(query) {
        if (!query?.trim()) return null;

        try {
            const url =
                `${TURKAI.config.researchEndpoint}?q=` +
                encodeURIComponent(
                    query.trim()
                );

            const response =
                await fetchWithTimeout(
                    url,
                    {
                        method: "GET",
                        headers: {
                            Accept:
                                "application/json"
                        }
                    }
                );

            const data =
                await parseResponse(
                    response
                );

            if (!response.ok) {
                throw new Error(
                    `Research HTTP ${response.status}`
                );
            }

            return data;
        } catch (error) {
            console.warn(
                "Research başarısız:",
                error
            );

            return null;
        }
    }

    /* =====================================================
       WEATHER
       ===================================================== */

    async function getWeather(city = "") {
        try {
            const query =
                city ||
                "Konya";

            const url =
                `${TURKAI.config.weatherEndpoint}?city=` +
                encodeURIComponent(
                    query
                );

            const response =
                await fetchWithTimeout(
                    url,
                    {
                        method: "GET",
                        headers: {
                            Accept:
                                "application/json"
                        }
                    }
                );

            const data =
                await parseResponse(
                    response
                );

            if (!response.ok) {
                throw new Error(
                    `Weather HTTP ${response.status}`
                );
            }

            return data;
        } catch (error) {
            console.warn(
                "Hava durumu alınamadı:",
                error
            );

            toast(
                "Hava durumu alınamadı.",
                "error"
            );

            return null;
        }
    }

    /* =====================================================
       VOICE INPUT
       ===================================================== */

    let recognition = null;
    let isListening = false;

    function setupVoiceRecognition() {
        const SpeechRecognition =
            window.SpeechRecognition ||
            window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            return;
        }

        recognition =
            new SpeechRecognition();

        recognition.lang = "tr-TR";

        recognition.continuous = false;

        recognition.interimResults = true;

        recognition.onstart = () => {
            isListening = true;

            DOM.voiceButton?.classList.add(
                "active"
            );

            toast(
                "Dinliyorum..."
            );
        };

        recognition.onresult = event => {
            let transcript = "";

            for (
                let i =
                    event.resultIndex;
                i < event.results.length;
                i++
            ) {
                transcript +=
                    event.results[i][0]
                        .transcript;
            }

            if (DOM.messageInput) {
                DOM.messageInput.value =
                    transcript;

                autoResizeTextarea();
            }
        };

        recognition.onerror = () => {
            toast(
                "Ses algılanamadı.",
                "error"
            );
        };

        recognition.onend = () => {
            isListening = false;

            DOM.voiceButton?.classList.remove(
                "active"
            );
        };
    }

    function toggleVoice() {
        if (!recognition) {
            toast(
                "Tarayıcın sesli yazmayı desteklemiyor.",
                "error"
            );

            return;
        }

        try {
            if (isListening) {
                recognition.stop();
            } else {
                recognition.start();
            }
        } catch {
            // Tarayıcı zaten çalıştırıyorsa hata vermesini önler.
        }
    }

    /* =====================================================
       TEXTAREA
       ===================================================== */

    function autoResizeTextarea() {
        const input =
            DOM.messageInput;

        if (!input) return;

        input.style.height = "auto";

        const maxHeight = 180;

        input.style.height =
            Math.min(
                input.scrollHeight,
                maxHeight
            ) + "px";
    }

    /* =====================================================
       TOGGLE BUTTONS
       ===================================================== */

    function updateToggleUI() {
        if (DOM.researchButton) {
            DOM.researchButton.classList.toggle(
                "active",
                TURKAI.state.researchEnabled
            );
        }

        if (DOM.weatherButton) {
            DOM.weatherButton.classList.toggle(
                "active",
                TURKAI.state.weatherEnabled
            );
        }

        if (DOM.memoryButton) {
            DOM.memoryButton.classList.toggle(
                "active",
                TURKAI.state.memoryEnabled
            );
        }
    }

    /* =====================================================
       MODAL
       ===================================================== */

    function openModal(modal) {
        if (!modal) return;

        modal.classList.add("active");

        modal.style.display = "";
    }

    function closeModal(modal) {
        if (!modal) return;

        modal.classList.remove("active");

        if (
            !modal.classList.contains(
                "modal"
            )
        ) {
            modal.style.display = "none";
        }
    }

    function closeAllModals() {
        qsa(
            ".modal, [role='dialog']"
        ).forEach(closeModal);
    }

    /* =====================================================
       IMAGE GENERATION UI
       ===================================================== */

    async function generateImage() {
        const prompt =
            window.prompt(
                "Oluşturmak istediğin görseli yaz:"
            );

        if (!prompt?.trim()) {
            return;
        }

        toast(
            "Görsel isteği hazırlanıyor..."
        );

        /*
         * Backend'de /api/image varsa kullan.
         * Yoksa sohbet API'sine görsel komutu gönder.
         */

        try {
            const response =
                await fetchWithTimeout(
                    "/api/image",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({
                            prompt:
                                prompt.trim()
                        })
                    }
                );

            const data =
                await parseResponse(
                    response
                );

            if (response.ok) {
                const imageURL =
                    data.imageUrl ||
                    data.url ||
                    data.data?.url;

                if (imageURL) {
                    addGeneratedImageMessage(
                        imageURL,
                        prompt
                    );

                    return;
                }
            }
        } catch {
            // Sohbet fallback
        }

        if (DOM.messageInput) {
            DOM.messageInput.value =
                `Bir görsel oluştur: ${prompt}`;

            autoResizeTextarea();

            await sendMessage();
        }
    }

    function addGeneratedImageMessage(
        url,
        prompt
    ) {
        const message =
            createMessage(
                "assistant",
                `Görsel oluşturuldu: ${prompt}`,
                {
                    imageUrl: url
                }
            );

        TURKAI.state.messages.push(
            message
        );

        const element =
            renderMessage(message);

        const image =
            document.createElement("img");

        image.src = url;
        image.alt = prompt;

        image.style.maxWidth = "100%";
        image.style.borderRadius = "18px";
        image.style.marginTop = "12px";

        const text =
            element?.querySelector(
                ".turkai-message-text"
            );

        text?.appendChild(image);

        updateCurrentChat();
        scrollToBottom();
    }

    /* =====================================================
       SOCKET.IO
       ===================================================== */

    function connectSocket() {
        if (
            typeof window.io !==
            "function"
        ) {
            return;
        }

        try {
            TURKAI.state.socket =
                window.io();

            TURKAI.state.socket.on(
                "connect",
                () => {
                    console.log(
                        "TürkAI Socket.IO bağlantısı aktif."
                    );
                }
            );

            TURKAI.state.socket.on(
                "connect_error",
                error => {
                    console.warn(
                        "Socket bağlantısı:",
                        error?.message
                    );
                }
            );

            TURKAI.state.socket.on(
                "turkai:message",
                data => {
                    if (
                        !data ||
                        !data.content
                    ) {
                        return;
                    }

                    /*
                     * Eğer sunucu canlı mesaj gönderirse
                     * burada gösterilir.
                     */
                }
            );
        } catch (error) {
            console.warn(
                "Socket kurulamadı:",
                error
            );
        }
    }

    /* =====================================================
       EVENT DELEGATION
       ===================================================== */

    function setupDelegatedEvents() {
        document.addEventListener(
            "click",
            async event => {
                const target =
                    event.target.closest(
                        "button, a"
                    );

                if (!target) return;

                /* Chat selection */
                const chatId =
                    target.dataset.chatId;

                if (chatId) {
                    event.preventDefault();

                    selectChat(chatId);

                    return;
                }

                /* Remove attachment */
                const removeId =
                    target.dataset
                        .removeAttachment;

                if (removeId) {
                    event.preventDefault();

                    removeAttachment(
                        removeId
                    );

                    return;
                }

                /* Copy code */
                const codeIndex =
                    target.dataset
                        .codeIndex;

                if (
                    codeIndex !== undefined
                ) {
                    const block =
                        target.closest(
                            ".turkai-code-block"
                        );

                    const code =
                        block?.querySelector(
                            "pre code"
                        )?.textContent;

                    if (code) {
                        await copyText(code);
                    }

                    return;
                }

                /* Message action */
                const action =
                    target.dataset.action;

                const messageId =
                    target.dataset.messageId;

                if (
                    action ===
                    "copy-message"
                ) {
                    const message =
                        TURKAI.state.messages.find(
                            item =>
                                item.id ===
                                messageId
                        );

                    if (message) {
                        await copyText(
                            message.content
                        );
                    }

                    return;
                }

                if (
                    action ===
                    "regenerate"
                ) {
                    await regenerateMessage(
                        messageId
                    );
                }
            }
        );
    }

    /* =====================================================
       MAIN EVENTS
       ===================================================== */

    function setupEvents() {
        /* Send button */

        DOM.sendMessageButton?.addEventListener(
            "click",
            event => {
                event.preventDefault();
                sendMessage();
            }
        );

        /* Composer */

        if (
            DOM.composer &&
            DOM.composer.tagName ===
                "FORM"
        ) {
            DOM.composer.addEventListener(
                "submit",
                event => {
                    event.preventDefault();

                    sendMessage();
                }
            );
        }

        /* Input */

        DOM.messageInput?.addEventListener(
            "input",
            autoResizeTextarea
        );

        DOM.messageInput?.addEventListener(
            "keydown",
            event => {
                if (
                    event.key === "Enter" &&
                    !event.shiftKey
                ) {
                    event.preventDefault();

                    sendMessage();
                }
            }
        );

        /* New chat */

        DOM.newChatButton?.addEventListener(
            "click",
            event => {
                event.preventDefault();

                createChat(
                    "Yeni sohbet"
                );

                DOM.messageInput?.focus();
            }
        );

        /* Clear */

        DOM.clearChatButton?.addEventListener(
            "click",
            event => {
                event.preventDefault();

                clearCurrentChat();
            }
        );

        /* Delete */

        DOM.deleteChatButton?.addEventListener(
            "click",
            event => {
                event.preventDefault();

                deleteCurrentChat();
            }
        );

        /* File */

        DOM.uploadButton?.addEventListener(
            "click",
            event => {
                event.preventDefault();

                DOM.fileInput?.click();
            }
        );

        DOM.fileInput?.addEventListener(
            "change",
            event => {
                addAttachments(
                    event.target.files
                );
            }
        );

        /* Voice */

        DOM.voiceButton?.addEventListener(
            "click",
            event => {
                event.preventDefault();

                toggleVoice();
            }
        );

        /* Research */

        DOM.researchButton?.addEventListener(
            "click",
            event => {
                event.preventDefault();

                TURKAI.state.researchEnabled =
                    !TURKAI.state
                        .researchEnabled;

                updateToggleUI();
                saveState();

                toast(
                    TURKAI.state
                        .researchEnabled
                        ? "Araştırma açıldı."
                        : "Araştırma kapatıldı."
                );
            }
        );

        /* Weather */

        DOM.weatherButton?.addEventListener(
            "click",
            async event => {
                event.preventDefault();

                TURKAI.state.weatherEnabled =
                    !TURKAI.state
                        .weatherEnabled;

                updateToggleUI();
                saveState();

                if (
                    TURKAI.state
                        .weatherEnabled
                ) {
                    toast(
                        "Hava durumu modu açıldı."
                    );
                }
            }
        );

        /* Memory */

        DOM.memoryButton?.addEventListener(
            "click",
            event => {
                event.preventDefault();

                TURKAI.state.memoryEnabled =
                    !TURKAI.state
                        .memoryEnabled;

                updateToggleUI();
                saveState();

                toast(
                    TURKAI.state
                        .memoryEnabled
                        ? "Hafıza açıldı."
                        : "Hafıza kapatıldı."
                );
            }
        );

        /* Model */

        DOM.modelSelect?.addEventListener(
            "change",
            event => {
                setModel(
                    event.target.value
                );
            }
        );

        DOM.modelSelector?.addEventListener(
            "change",
            event => {
                setModel(
                    event.target.value
                );
            }
        );

        /* Purchase */

        DOM.purchaseButton?.addEventListener(
            "click",
            event => {
                event.preventDefault();

                openPurchase();
            }
        );

        /* Plan */

        DOM.planButton?.addEventListener(
            "click",
            event => {
                event.preventDefault();

                openPurchase();
            }
        );

        /* Image */

        DOM.imageButton?.addEventListener(
            "click",
            event => {
                event.preventDefault();

                if (
                    DOM.imageCreateModal
                ) {
                    openModal(
                        DOM.imageCreateModal
                    );
                } else {
                    generateImage();
                }
            }
        );

        DOM.generateImageButton?.addEventListener(
            "click",
            event => {
                event.preventDefault();

                generateImage();
            }
        );

        /* Video */

        DOM.videoButton?.addEventListener(
            "click",
            event => {
                event.preventDefault();

                toast(
                    "Video oluşturma özelliği Plus ve üzeri planlarda kullanılabilir."
                );
            }
        );

        /* Close modals */

        DOM.closeModalButtons.forEach(
            button => {
                button.addEventListener(
                    "click",
                    event => {
                        event.preventDefault();

                        closeAllModals();
                    }
                );
            }
        );

        document.addEventListener(
            "keydown",
            event => {
                if (
                    event.key === "Escape"
                ) {
                    closeAllModals();
                }
            }
        );

        /* Modal background */

        document.addEventListener(
            "click",
            event => {
                const modal =
                    event.target.closest(
                        ".modal"
                    );

                if (
                    modal &&
                    event.target === modal
                ) {
                    closeModal(modal);
                }
            }
        );

        setupDelegatedEvents();
    }

    /* =====================================================
       PURCHASE
       ===================================================== */

    function openPurchase() {
        const existing =
            $("purchaseModal");

        if (existing) {
            openModal(existing);
            return;
        }

        const modal =
            document.createElement("div");

        modal.id =
            "purchaseModal";

        modal.className =
            "modal active";

        modal.innerHTML = `
            <div class="modal-content turkai-plan-modal">

                <button
                    type="button"
                    class="close-modal"
                    data-close-modal
                >
                    ×
                </button>

                <div class="turkai-plan-title">
                    TürkAI Planları
                </div>

                <div class="turkai-plan-grid">

                    <button
                        type="button"
                        data-plan="free"
                        class="turkai-plan-card"
                    >
                        <strong>Free</strong>
                        <span>Ücretsiz</span>
                    </button>

                    <button
                        type="button"
                        data-plan="pro"
                        class="turkai-plan-card"
                    >
                        <strong>Pro</strong>
                        <span>250 TL / ay</span>
                    </button>

                    <button
                        type="button"
                        data-plan="plus"
                        class="turkai-plan-card"
                    >
                        <strong>Plus</strong>
                        <span>500 TL / ay</span>
                    </button>

                    <button
                        type="button"
                        data-plan="ultra"
                        class="turkai-plan-card"
                    >
                        <strong>Ultra</strong>
                        <span>1000 TL / ay</span>
                    </button>

                </div>

            </div>
        `;

        document.body.appendChild(modal);

        modal
            .querySelectorAll("[data-plan]")
            .forEach(button => {
                button.addEventListener(
                    "click",
                    () => {
                        const plan =
                            button.dataset.plan;

                        if (
                            plan === "free"
                        ) {
                            TURKAI.state.currentPlan =
                                "free";

                            saveState();

                            toast(
                                "Free plan aktif."
                            );

                            closeModal(modal);

                            return;
                        }

                        toast(
                            `${TURKAI.config.plans[
                                plan
                            ]?.name || plan} planı için ödeme sistemi hazırlanıyor.`
                        );
                    }
                );
            });

        modal
            .querySelector(
                "[data-close-modal]"
            )
            ?.addEventListener(
                "click",
                () => {
                    closeModal(modal);
                }
            );
    }

    /* =====================================================
       PAGE VISIBILITY
       ===================================================== */

    function setupVisibility() {
        document.addEventListener(
            "visibilitychange",
            () => {
                if (
                    document.visibilityState ===
                    "visible"
                ) {
                    restoreCurrentChat();
                    updateUserUI();
                } else {
                    updateCurrentChat();
                }
            }
        );

        window.addEventListener(
            "beforeunload",
            () => {
                updateCurrentChat();
                saveState();
            }
        );
    }

    /* =====================================================
       ONLINE / OFFLINE
       ===================================================== */

    function setupConnectionStatus() {
        window.addEventListener(
            "online",
            () => {
                toast(
                    "İnternet bağlantısı geri geldi.",
                    "success"
                );
            }
        );

        window.addEventListener(
            "offline",
            () => {
                toast(
                    "İnternet bağlantısı kesildi.",
                    "error"
                );
            }
        );
    }

    /* =====================================================
       GLOBAL API
       ===================================================== */

    window.TURKAI = {
        state: TURKAI.state,

        sendMessage,

        newChat: () =>
            createChat("Yeni sohbet"),

        clearChat:
            clearCurrentChat,

        deleteChat:
            deleteCurrentChat,

        selectChat,

        research,

        weather:
            getWeather,

        toast,

        setModel,

        copyText,

        getState: () => ({
            ...TURKAI.state
        })
    };

    /* =====================================================
       INIT
       ===================================================== */

    function init() {
        console.log(
            `%cTürkAI ${TURKAI.version} başlatılıyor...`,
            "font-size:16px;font-weight:bold;"
        );

        cacheDOM();

        loadState();

        loadChats();

        detectStoredUser();

        ensureMessageContainer();

        /*
         * Hiç sohbet yoksa yeni sohbet oluştur.
         */
        if (
            !TURKAI.state.chats.length
        ) {
            createChat(
                "Yeni sohbet"
            );
        } else {
            restoreCurrentChat();
        }

        updateUserUI();

        if (
            DOM.modelSelect ||
            DOM.modelSelector
        ) {
            setModel(
                TURKAI.state.currentModel
            );
        }

        renderChatList();

        renderAttachments();

        updateToggleUI();

        setupEvents();

        setupVoiceRecognition();

        connectSocket();

        setupVisibility();

        setupConnectionStatus();

        autoResizeTextarea();

        console.log(
            "%cTürkAI hazır.",
            "font-size:15px;font-weight:bold;"
        );
    }

    /* =====================================================
       START
       ===================================================== */

    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            init,
            {
                once: true
            }
        );
    } else {
        init();
    }

})();