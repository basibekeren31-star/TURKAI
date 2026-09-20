(() => {
  "use strict";

  /* =========================================================
     TÜRKAI FRONTEND — STABLE BUILD 42.0
     Tek dosya / tek scope / merkezi event sistemi
     ========================================================= */

  if (window.__TURKAI_STABLE_42__) {
    console.warn("[TürkAI] app.js zaten yüklü.");
    return;
  }

  window.__TURKAI_STABLE_42__ = true;

  const APP = {
    version: "42.0.0",

    api: {
      chatSmart: "/api/chat/smart",
      chat: "/api/chat",

      health: "/api/health",
      system: "/api/system/status",

      authMe: "/api/auth/me",
      authLogin: "/api/auth/login",
      authLogout: "/api/auth/logout",
      authRegister: "/api/auth/register",

      account: "/api/account",
      plans: "/api/plans",

      research: "/api/research",
      weather: "/api/weather",

      memorySearch: "/api/memory/search",
      memorySave: "/api/memory/save",

      files: "/api/files",
      filesUpload: "/api/files/upload",

      notifications: "/api/notifications",

      image: "/api/media/image",
      video: "/api/media/video"
    },

    storage: {
      settings: "turkai_settings_42",
      draft: "turkai_draft_42",
      chats: "turkai_chats_42",
      account: "turkai_account_42",
      model: "turkai_model_42"
    },

    timeout: 45000
  };

  const state = {
    ready: false,

    connected: navigator.onLine,
    sending: false,
    recording: false,
    speaking: false,

    sidebarOpen: false,

    currentPanel: "chat",
    currentModal: null,

    conversationId: null,

    messages: [],

    attachments: [],
    files: [],

    notifications: [],
    unreadNotifications: 0,

    plans: [],

    account: null,

    memoryResults: [],
    researchResults: null,
    weatherResult: null,
    systemResult: null,

    recognition: null,
    abortController: null,

    settings: {
      enterToSend: true,
      draftSave: true,
      autoSpeak: false,
      freshInfo: true
    },

    model: "auto"
  };

  /* =========================================================
     DOM
     ========================================================= */

  const $ = (id) => document.getElementById(id);

  const dom = {};

  const IDS = [
    "sidebar",
    "mobileSidebarClose",
    "newChatButton",
    "mainNavigation",
    "quickResearchButton",
    "quickMemoryButton",
    "quickFilesButton",
    "settingsButton",
    "systemButton",
    "accountButton",
    "accountName",
    "accountPlan",
    "accountStatusDot",

    "sidebarToggle",
    "connectionDot",
    "connectionText",
    "workspaceTitle",
    "searchButton",
    "notificationButton",
    "notificationBadge",
    "topSettingsButton",
    "topAccountButton",

    "chatView",
    "welcomeState",
    "welcomeTitle",
    "messages",
    "typingIndicator",
    "composerArea",
    "composerBox",
    "messageInput",
    "sendButton",
    "stopButton",
    "voiceButton",
    "attachmentButton",
    "researchToolButton",
    "weatherToolButton",
    "memoryToolButton",
    "imageToolButton",
    "videoToolButton",
    "attachmentPreview",
    "modelSelect",
    "composerTokenInfo",

    "workspacePanel",

    "researchPanel",
    "researchInput",
    "researchRunButton",
    "researchClearButton",
    "researchStatus",
    "researchResults",

    "weatherPanel",
    "weatherInput",
    "weatherRunButton",
    "weatherResults",

    "memoryPanel",
    "memoryInput",
    "memorySearchButton",
    "memorySaveCurrentButton",
    "memoryOverviewButton",
    "memoryStats",
    "memoryResults",

    "fileCenterPanel",
    "fileDropZone",
    "fileSelectButton",
    "refreshFilesButton",
    "fileCount",
    "fileList",

    "mediaPanel",
    "openImageModalButton",
    "openVideoModalButton",

    "plansPanel",
    "plansList",

    "notificationPanel",
    "notificationList",
    "notificationSummary",
    "markNotificationsReadButton",

    "systemPanel",
    "systemOverallStatus",
    "refreshSystemButton",
    "systemStats",

    "mobileNav",
    "mobileSettingsButton",

    "globalFilePicker",
    "dropOverlay",
    "globalOverlay",
    "toastStack",
    "liveRegion",

    "commandCenter",
    "commandInput",
    "commandList",

    "chatSearchPanel",
    "chatSearchInput",
    "chatSearchResults",

    "settingsModal",
    "enterSendToggle",
    "draftSaveToggle",
    "autoSpeakToggle",
    "freshInfoToggle",
    "resetSettingsButton",
    "saveSettingsButton",

    "accountModal",
    "accountModalName",
    "accountModalEmail",
    "accountModalVerified",
    "accountModalPlan",
    "accountModalUsage",
    "accountModalStatus",
    "loginButton",
    "logoutButton",
    "accountPlansButton",

    "authModal",
    "authForm",
    "authIdentifier",
    "authPassword",
    "authMessage",
    "guestLoginButton",

    "imageCreateModal",
    "imagePromptInput",
    "imageSizeSelect",
    "imageQualitySelect",
    "generateImageButton",
    "imageResult",

    "videoModal",
    "videoPromptInput",
    "videoDurationSelect",
    "generateVideoButton",
    "videoResult",

    "commandHelpModal",

    "confirmModal",
    "confirmModalTitle",
    "confirmModalText",
    "confirmCancelButton",
    "confirmActionButton",

    "adminUnlockModal",
    "adminUnlockForm",
    "adminUnlockInput",
    "adminUnlockMessage",

    "adminPanel",
    "adminSystemButton",
    "adminUsersButton",
    "adminMemoryButton",
    "adminLogsButton",
    "adminOutput",

    "systemDetailModal",
    "systemDetailContent",

    "globalLoading",
    "globalLoadingTitle",
    "globalLoadingText",

    "voiceStatus",
    "voiceStatusTitle",
    "voiceStatusText",
    "voiceCancelButton",

    "uploadStatusBar",
    "uploadStatusTitle",
    "uploadStatusText",
    "uploadProgressBar",

    "purchaseButton",
    "proCodeInput"
  ];

  function cacheDOM() {
    IDS.forEach((id) => {
      dom[id] = $(id);
    });
  }

  /* =========================================================
     TEMEL
     ========================================================= */

  function text(value, fallback = "") {
    if (value === null || value === undefined) {
      return fallback;
    }

    return String(value);
  }

  function escapeHTML(value) {
    return text(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function uid(prefix = "id") {
    return (
      prefix +
      "_" +
      Date.now() +
      "_" +
      Math.random().toString(36).slice(2, 9)
    );
  }

  function formatTime(date = new Date()) {
    try {
      return new Intl.DateTimeFormat("tr-TR", {
        hour: "2-digit",
        minute: "2-digit"
      }).format(new Date(date));
    } catch {
      return new Date(date).toLocaleTimeString("tr-TR");
    }
  }

  function formatDate(date = new Date()) {
    try {
      return new Intl.DateTimeFormat("tr-TR", {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(new Date(date));
    } catch {
      return new Date(date).toLocaleString("tr-TR");
    }
  }

  function formatBytes(size) {
    const n = Number(size) || 0;

    if (n < 1024) {
      return `${n} B`;
    }

    if (n < 1024 * 1024) {
      return `${(n / 1024).toFixed(1)} KB`;
    }

    if (n < 1024 * 1024 * 1024) {
      return `${(n / (1024 * 1024)).toFixed(1)} MB`;
    }

    return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  function storageGet(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);

      if (raw === null) {
        return fallback;
      }

      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function storageSet(key, value) {
    try {
      localStorage.setItem(
        key,
        JSON.stringify(value)
      );

      return true;
    } catch {
      return false;
    }
  }

  function storageRemove(key) {
    try {
      localStorage.removeItem(key);
    } catch {}
  }

  /* =========================================================
     TOAST
     ========================================================= */

  function toast(
    message,
    type = "info",
    duration = 3500
  ) {
    const stack = dom.toastStack;

    if (!stack) {
      console.log("[TürkAI]", message);
      return;
    }

    const item = document.createElement("div");

    item.className =
      "toast toast-" + type;

    let icon = "i-info";

    if (type === "success") {
      icon = "i-check";
    }

    if (type === "error") {
      icon = "i-alert";
    }

    if (type === "warning") {
      icon = "i-alert";
    }

    item.innerHTML = `
      <div class="toast-icon">
        <svg viewBox="0 0 24 24">
          <use href="#${icon}"></use>
        </svg>
      </div>

      <div class="toast-text">
        ${escapeHTML(message)}
      </div>

      <button
        type="button"
        class="toast-close"
        aria-label="Kapat"
      >
        <svg viewBox="0 0 24 24">
          <use href="#i-close"></use>
        </svg>
      </button>
    `;

    const closeButton =
      item.querySelector(".toast-close");

    closeButton?.addEventListener(
      "click",
      () => item.remove()
    );

    stack.appendChild(item);

    window.setTimeout(() => {
      item.remove();
    }, duration);
  }

  function announce(message) {
    if (!dom.liveRegion) return;

    dom.liveRegion.textContent =
      text(message);
  }

  /* =========================================================
     MODAL
     ========================================================= */

  function openModal(id) {
    const modal = $(id);

    if (!modal) {
      console.warn(
        "[TürkAI] Modal bulunamadı:",
        id
      );
      return false;
    }

    document
      .querySelectorAll(".modal-shell")
      .forEach((node) => {
        node.classList.add("hidden");
      });

    modal.classList.remove("hidden");

    state.currentModal = id;

    document.body.classList.add(
      "modal-open"
    );

    const input =
      modal.querySelector(
        "input, textarea, select, button"
      );

    window.setTimeout(() => {
      input?.focus();
    }, 50);

    return true;
  }

  function closeModal(id) {
    const modal = $(id);

    if (!modal) return;

    modal.classList.add("hidden");

    if (
      state.currentModal === id
    ) {
      state.currentModal = null;
    }

    if (
      !document.querySelector(
        ".modal-shell:not(.hidden)"
      )
    ) {
      document.body.classList.remove(
        "modal-open"
      );
    }
  }

  function closeAllModals() {
    document
      .querySelectorAll(".modal-shell")
      .forEach((node) => {
        node.classList.add("hidden");
      });

    state.currentModal = null;

    document.body.classList.remove(
      "modal-open"
    );
  }

  /* =========================================================
     PANEL
     ========================================================= */

  const PANEL_IDS = [
    "chat",
    "research",
    "weather",
    "memory",
    "files",
    "media",
    "plans",
    "notifications",
    "system"
  ];

  const PANEL_TITLES = {
    chat: "Yeni sohbet",
    research: "Araştırma",
    weather: "Hava durumu",
    memory: "Hafıza",
    files: "Dosyalar",
    media: "Medya",
    plans: "Planlar",
    notifications: "Bildirimler",
    system: "Sistem"
  };

  function openPanel(name) {
    const panel =
      PANEL_IDS.includes(name)
        ? name
        : "chat";

    PANEL_IDS.forEach((id) => {
      if (id === "chat") {
        dom.chatView?.classList.toggle(
          "hidden",
          panel !== "chat"
        );
        return;
      }

      const node = $(
        id === "research"
          ? "researchPanel"
          : id === "weather"
          ? "weatherPanel"
          : id === "memory"
          ? "memoryPanel"
          : id === "files"
          ? "fileCenterPanel"
          : id === "media"
          ? "mediaPanel"
          : id === "plans"
          ? "plansPanel"
          : id === "notifications"
          ? "notificationPanel"
          : "systemPanel"
      );

      if (!node) return;

      node.classList.toggle(
        "hidden",
        panel !== id
      );

      node.classList.toggle(
        "active",
        panel === id
      );
    });

    state.currentPanel = panel;

    if (dom.workspaceTitle) {
      dom.workspaceTitle.textContent =
        PANEL_TITLES[panel];
    }

    document
      .querySelectorAll(
        "[data-panel], [data-mobile-panel]"
      )
      .forEach((button) => {
        const target =
          button.dataset.panel ||
          button.dataset.mobilePanel;

        button.classList.toggle(
          "active",
          target === panel
        );
      });

    closeSidebarMobile();

    if (panel === "research") {
      loadResearchPanel();
    }

    if (panel === "memory") {
      loadMemoryOverview();
    }

    if (panel === "files") {
      loadFiles();
    }

    if (panel === "plans") {
      loadPlans();
    }

    if (panel === "notifications") {
      loadNotifications();
    }

    if (panel === "system") {
      loadSystem();
    }
  }

  function openSidebar() {
    if (!dom.sidebar) return;

    state.sidebarOpen = true;

    dom.sidebar.classList.add("open");

    document.body.classList.add(
      "sidebar-open"
    );
  }

  function closeSidebarMobile() {
    if (!dom.sidebar) return;

    state.sidebarOpen = false;

    dom.sidebar.classList.remove(
      "open"
    );

    document.body.classList.remove(
      "sidebar-open"
    );
  }

  function toggleSidebar() {
    if (state.sidebarOpen) {
      closeSidebarMobile();
    } else {
      openSidebar();
    }
  }

  /* =========================================================
     API
     ========================================================= */

  async function api(
    url,
    options = {},
    timeout = APP.timeout
  ) {
    const controller =
      options.signal
        ? null
        : new AbortController();

    const signal =
      options.signal ||
      controller?.signal;

    let timer = null;

    if (controller) {
      timer = window.setTimeout(
        () => {
          controller.abort();
        },
        timeout
      );
    }

    const headers = new Headers(
      options.headers || {}
    );

    headers.set(
      "Accept",
      "application/json, text/plain, */*"
    );

    headers.set(
      "X-TurkAI-Version",
      APP.version
    );

    headers.set(
      "X-TurkAI-Request-ID",
      uid("request")
    );

    let body = options.body;

    if (
      body &&
      typeof body === "object" &&
      !(body instanceof FormData) &&
      !(body instanceof Blob) &&
      !(body instanceof URLSearchParams)
    ) {
      body = JSON.stringify(body);

      headers.set(
        "Content-Type",
        "application/json; charset=UTF-8"
      );
    }

    try {
      const response = await fetch(
        url,
        {
          method:
            options.method ||
            "GET",

          headers,
          body,

          credentials:
            "same-origin",

          cache: "no-store",

          redirect: "follow",

          signal
        }
      );

      const contentType =
        response.headers.get(
          "content-type"
        ) || "";

      let data;

      if (
        contentType.includes(
          "application/json"
        )
      ) {
        try {
          data = await response.json();
        } catch {
          data = {};
        }
      } else {
        try {
          data = await response.text();
        } catch {
          data = "";
        }
      }

      if (!response.ok) {
        const message =
          typeof data === "object"
            ? data?.error ||
              data?.message ||
              `HTTP ${response.status}`
            : text(
                data,
                `HTTP ${response.status}`
              );

        const error = new Error(
          message
        );

        error.status =
          response.status;

        error.data = data;

        throw error;
      }

      return data;
    } finally {
      if (timer) {
        window.clearTimeout(timer);
      }
    }
  }

  function answerFrom(data) {
    if (!data) return "";

    if (typeof data === "string") {
      return data.trim();
    }

    const direct = [
      data.answer,
      data.response,
      data.message,
      data.text,
      data.content,
      data.reply,
      data.output,

      data.data?.answer,
      data.data?.response,
      data.data?.message,
      data.data?.text,
      data.data?.content,

      data.result?.answer,
      data.result?.response,
      data.result?.message,
      data.result?.text,
      data.result?.content
    ];

    for (const item of direct) {
      if (
        typeof item === "string" &&
        item.trim()
      ) {
        return item.trim();
      }
    }

    if (
      Array.isArray(
        data.choices
      )
    ) {
      for (
        const choice of data.choices
      ) {
        const value =
          choice?.message?.content ||
          choice?.text;

        if (
          typeof value === "string" &&
          value.trim()
        ) {
          return value.trim();
        }
      }
    }

    return "";
  }

  function isBadLocalFallback(answer) {
    const value = text(answer)
      .toLocaleLowerCase("tr-TR")
      .replace(/\s+/g, " ")
      .trim();

    if (!value) {
      return true;
    }

    const bad = [
      "bu soruyu yerel motorla doğrudan cevaplayamadım",
      "uygun ai sağlayıcısı veya araştırma motoru kullanılabilir",
      "daha kapsamlı bir yanıt için uygun ai sağlayıcısı",
      "yerel motorla doğrudan cevaplayamadım"
    ];

    return bad.some((item) =>
      value.includes(item)
    );
  }

  /* =========================================================
     RICH TEXT
     ========================================================= */

  function renderRichText(value) {
    let source =
      text(value)
        .replace(/\u0000/g, "")
        .trim();

    if (!source) return "";

    /* Önce kodları ayır */
    const codes = [];

    source = source.replace(
      /```([a-zA-Z0-9_#+.\-]*)[ \t]*\n?([\s\S]*?)```/g,
      (
        _all,
        language,
        code
      ) => {
        const index =
          codes.length;

        codes.push({
          language:
            language ||
            "code",

          code:
            text(code)
              .replace(
                /\r\n/g,
                "\n"
              )
              .trim()
        });

        return `___TURKAI_CODE_${index}___`;
      }
    );

    /*
      AI cevabının yanlışlıkla HTML/SVG üretmesi
      halinde sohbet içine ham öğe olarak koyma.
    */
    source = source.replace(
      /<svg\b[^>]*>[\s\S]*?<\/svg>/gi,
      ""
    );

    source = source.replace(
      /<\/?svg\b[^>]*>/gi,
      ""
    );

    source = source.replace(
      /<script\b[^>]*>[\s\S]*?<\/script>/gi,
      ""
    );

    source = source.replace(
      /<style\b[^>]*>[\s\S]*?<\/style>/gi,
      ""
    );

    source = source.replace(
      /\bsvgsvg\b/gi,
      ""
    );

    source = source.replace(
      /(^|\s)svg(?=\s|$)/gi,
      "$1"
    );

    let html =
      escapeHTML(source);

    html = html.replace(
      /\*\*(.+?)\*\*/g,
      "<strong>$1</strong>"
    );

    html = html.replace(
      /__([^_]+?)__/g,
      "<strong>$1</strong>"
    );

    html = html.replace(
      /`([^`\n]+)`/g,
      "<code>$1</code>"
    );

    html = html.replace(
      /^### (.+)$/gm,
      "<h4>$1</h4>"
    );

    html = html.replace(
      /^## (.+)$/gm,
      "<h3>$1</h3>"
    );

    html = html.replace(
      /^# (.+)$/gm,
      "<h2>$1</h2>"
    );

    html = html.replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    );

    html = html.replace(
      /^\s*[-*]\s+(.+)$/gm,
      '<div class="rich-list-item">• $1</div>'
    );

    html = html.replace(
      /^\s*(\d+)\.\s+(.+)$/gm,
      '<div class="rich-list-item">$1. $2</div>'
    );

    html = html.replace(
      /\n/g,
      "<br>"
    );

    codes.forEach(
      (block, index) => {
        const encoded =
          encodeURIComponent(
            block.code
          );

        const safeCode =
          escapeHTML(
            block.code
          );

        const blockHtml = `
          <div class="code-block">
            <div class="code-block-header">
              <span class="code-language">
                ${escapeHTML(
                  block.language
                )}
              </span>

              <button
                type="button"
                class="code-copy-button"
                data-code="${encoded}"
                title="Kodu kopyala"
              >
                <svg viewBox="0 0 24 24">
                  <use href="#i-copy"></use>
                </svg>

                <span>Kopyala</span>
              </button>
            </div>

            <pre><code>${safeCode}</code></pre>
          </div>
        `;

        html =
          html.replace(
            `___TURKAI_CODE_${index}___`,
            blockHtml
          );
      }
    );

    return html;
  }

  /* =========================================================
     CHAT
     ========================================================= */

  function renderMessages() {
    if (!dom.messages) return;

    dom.messages.innerHTML =
      "";

    for (
      const message of state.messages
    ) {
      renderMessage(
        message
      );
    }

    const hasMessages =
      state.messages.length > 0;

    dom.welcomeState?.classList.toggle(
      "hidden",
      hasMessages
    );

    scrollChat(false);
  }

  function renderMessage(message) {
    if (!dom.messages) return;

    const row =
      document.createElement(
        "div"
      );

    row.className =
      `message-row message-${message.role}`;

    row.dataset.messageId =
      message.id;

    const user =
      message.role === "user";

    const content =
      renderRichText(
        message.content
      );

    row.innerHTML = `
      <div class="message-avatar">
        <svg viewBox="0 0 24 24">
          <use href="#${
            user
              ? "i-user"
              : "i-logo"
          }"></use>
        </svg>
      </div>

      <div class="message-main">
        <div class="message-meta">
          <strong>
            ${
              user
                ? "Sen"
                : "TürkAI"
            }
          </strong>

          <span>
            ${formatTime(
              message.createdAt
            )}
          </span>
        </div>

        <div class="message-content">
          <div class="message-bubble">
            ${content}
          </div>

          <div class="message-actions">
            ${
              !user
                ? `
                  <button
                    type="button"
                    class="message-action"
                    data-message-action="speak"
                    data-message-id="${message.id}"
                    title="Sesli oku"
                  >
                    <svg viewBox="0 0 24 24">
                      <use href="#i-volume"></use>
                    </svg>
                  </button>
                `
                : ""
            }

            <button
              type="button"
              class="message-action"
              data-message-action="copy"
              data-message-id="${message.id}"
              title="Kopyala"
            >
              <svg viewBox="0 0 24 24">
                <use href="#i-copy"></use>
              </svg>
            </button>

            ${
              !user
                ? `
                  <button
                    type="button"
                    class="message-action"
                    data-message-action="memory"
                    data-message-id="${message.id}"
                    title="Hafızaya kaydet"
                  >
                    <svg viewBox="0 0 24 24">
                      <use href="#i-memory"></use>
                    </svg>
                  </button>
                `
                : ""
            }
          </div>
        </div>
      </div>
    `;

    dom.messages.appendChild(
      row
    );
  }

  function appendMessage(
    role,
    content,
    extra = {}
  ) {
    const message = {
      id: uid("message"),
      role,
      content: text(content),
      createdAt:
        new Date().toISOString(),
      ...extra
    };

    state.messages.push(
      message
    );

    return message;
  }

  function scrollChat(smooth = true) {
    if (!dom.messages) return;

    requestAnimationFrame(() => {
      dom.messages.scrollTo({
        top:
          dom.messages
            .scrollHeight,
        behavior:
          smooth
            ? "smooth"
            : "auto"
      });
    });
  }

  function setTyping(value) {
    dom.typingIndicator?.classList.toggle(
      "hidden",
      !value
    );
  }

  function setSendingUI(value) {
    if (dom.sendButton) {
      dom.sendButton.disabled =
        value;

      dom.sendButton.innerHTML =
        value
          ? `
            <svg viewBox="0 0 24 24">
              <use href="#i-stop"></use>
            </svg>
          `
          : `
            <svg viewBox="0 0 24 24">
              <use href="#i-send"></use>
            </svg>
          `;
    }

    dom.stopButton?.classList.toggle(
      "hidden",
      !value
    );
  }

  function buildChatPayload(
    question
  ) {
    return {
      message: question,
      text: question,

      model: state.model,

      mode: "chat",

      conversationId:
        state.conversationId,

      conversation_id:
        state.conversationId,

      messages:
        state.messages
          .slice(-20)
          .map((message) => ({
            role:
              message.role,
            content:
              message.content
          })),

      attachments:
        state.attachments.map(
          (file) => ({
            id: file.id,
            name: file.name,
            type: file.type,
            size: file.size,
            url:
              file.url ||
              file.downloadUrl ||
              null
          })
        ),

      options: {
        memory: true,

        freshInfo:
          !!state.settings.freshInfo,

        autoResearch:
          !!state.settings.freshInfo
      }
    };
  }

  async function chatRequest(
    question
  ) {
    const payload =
      buildChatPayload(
        question
      );

    try {
      return await api(
        APP.api.chatSmart,
        {
          method: "POST",
          body: payload,
          signal:
            state.abortController
              ?.signal
        }
      );
    } catch (error) {
      if (
        error?.name ===
        "AbortError"
      ) {
        throw error;
      }

      if (
        error?.status !== 404 &&
        error?.status !== 405
      ) {
        /*
          Smart route hata verse de standart
          route'u yine deniyoruz.
        */
      }

      return await api(
        APP.api.chat,
        {
          method: "POST",
          body: payload,
          signal:
            state.abortController
              ?.signal
        }
      );
    }
  }

  async function tryResearchForChat(
    question,
    firstAnswer
  ) {
    if (!isBadLocalFallback(firstAnswer)) {
      return firstAnswer;
    }

    if (
      !state.settings.freshInfo
    ) {
      return firstAnswer;
    }

    try {
      const research =
        await api(
          APP.api.research,
          {
            method: "POST",
            body: {
              query: question,
              question,
              text: question,
              language: "tr",
              mode: "answer"
            },
            signal:
              state.abortController
                ?.signal
          }
        );

      const researchText =
        extractResearchText(
          research
        );

      if (!researchText) {
        return firstAnswer;
      }

      const prompt = `
Kullanıcının sorusunu aşağıdaki araştırma verisine göre Türkçe cevapla.

SORU:
${question}

ARAŞTIRMA:
${researchText}

Kurallar:
- Doğrudan cevap ver.
- Araştırma verisinde olmayan bilgileri uydurma.
- Gereksiz açıklama yapma.
- Türkçe yaz.
`;

      const second =
        await api(
          APP.api.chat,
          {
            method: "POST",
            body:
              buildChatPayload(
                prompt
              ),
            signal:
              state.abortController
                ?.signal
          }
        );

      const finalAnswer =
        answerFrom(second);

      if (
        finalAnswer &&
        !isBadLocalFallback(
          finalAnswer
        )
      ) {
        return finalAnswer;
      }
    } catch (error) {
      if (
        error?.name ===
        "AbortError"
      ) {
        throw error;
      }
    }

    return firstAnswer;
  }

  async function sendMessage() {
    if (state.sending) {
      return;
    }

    if (!dom.messageInput) {
      return;
    }

    const question =
      dom.messageInput.value.trim();

    if (!question) {
      return;
    }

    /*
      Slash komutları
    */
    if (
      await handleSlashCommand(
        question
      )
    ) {
      dom.messageInput.value =
        "";

      resizeComposer();
      clearDraft();

      return;
    }

    state.sending = true;

    state.abortController =
      new AbortController();

    const original =
      question;

    setSendingUI(true);
    setTyping(true);

    appendMessage(
      "user",
      question
    );

    renderMessages();

    try {
      const response =
        await chatRequest(
          question
        );

      let answer =
        answerFrom(response);

      answer =
        await tryResearchForChat(
          question,
          answer
        );

      if (!answer) {
        throw new Error(
          "Sunucudan boş cevap geldi."
        );
      }

      if (
        isBadLocalFallback(
          answer
        )
      ) {
        throw new Error(
          "TürkAI bu soruya şu anda gerçek bir yanıt üretemedi."
        );
      }

      const conversationId =
        response?.conversationId ||
        response?.conversation_id ||
        response?.chatId ||
        response?.data
          ?.conversationId ||
        response?.result
          ?.conversationId;

      if (
        conversationId
      ) {
        state.conversationId =
          conversationId;
      }

      appendMessage(
        "assistant",
        answer,
        {
          model:
            response?.model ||
            response?.data
              ?.model ||
            state.model
        }
      );

      renderMessages();

      /*
        Başarılı cevap geldikten sonra temizle.
      */
      dom.messageInput.value =
        "";

      resizeComposer();
      clearDraft();

      saveChats();

      if (
        state.settings.autoSpeak
      ) {
        speakText(answer);
      }
    } catch (error) {
      if (
        error?.name ===
        "AbortError"
      ) {
        dom.messageInput.value =
          original;

        resizeComposer();
        saveDraft();

        toast(
          "Yanıt durduruldu.",
          "warning"
        );

        return;
      }

      /*
        Kullanıcının mesajı hata durumunda
        kesinlikle kaybolmaz.
      */
      dom.messageInput.value =
        original;

      resizeComposer();
      saveDraft();

      toast(
        error?.message ||
          "Mesaj gönderilemedi.",
        "error",
        6000
      );

      console.error(
        "[TürkAI] Chat:",
        error
      );
    } finally {
      state.sending = false;

      state.abortController =
        null;

      setSendingUI(false);
      setTyping(false);
      updateComposerInfo();
    }
  }

  function stopGeneration() {
    try {
      state.abortController?.abort();
    } catch {}

    state.sending = false;

    setSendingUI(false);
    setTyping(false);

    toast(
      "Yanıt üretimi durduruldu.",
      "warning"
    );
  }

  /* =========================================================
     SLASH KOMUTLARI
     ========================================================= */

  async function handleSlashCommand(
    value
  ) {
    const input =
      text(value).trim();

    if (
      !input.startsWith("/")
    ) {
      return false;
    }

    const pieces =
      input.split(/\s+/);

    const command =
      pieces[0]
        .toLocaleLowerCase(
          "tr-TR"
        );

    const argument =
      pieces
        .slice(1)
        .join(" ")
        .trim();

    switch (command) {
      case "/yeni":
      case "/new":
        newChat();
        return true;

      case "/araştır":
      case "/arastir":
      case "/research":
        openPanel("research");

        if (
          argument &&
          dom.researchInput
        ) {
          dom.researchInput.value =
            argument;
        }

        return true;

      case "/hava":
      case "/weather":
        openPanel("weather");

        if (
          argument &&
          dom.weatherInput
        ) {
          dom.weatherInput.value =
            argument;
        }

        return true;

      case "/hafıza":
      case "/hafiza":
      case "/memory":
        openPanel("memory");

        if (
          argument &&
          dom.memoryInput
        ) {
          dom.memoryInput.value =
            argument;
        }

        return true;

      case "/dosya":
      case "/files":
        openPanel("files");
        return true;

      case "/ayar":
      case "/ayarlar":
      case "/settings":
        openModal("settingsModal");
        return true;

      case "/hesap":
      case "/account":
        openModal("accountModal");
        return true;

      case "/sistem":
      case "/system":
        openPanel("system");
        return true;

      case "/plan":
      case "/plans":
        openPanel("plans");
        return true;

      case "/yardım":
      case "/yardim":
      case "/help":
        openModal(
          "commandHelpModal"
        );
        return true;

      case "/temizle":
      case "/clear":
        state.messages = [];
        renderMessages();
        return true;

      default:
        return false;
    }
  }

  /* =========================================================
     DRAFT / INPUT
     ========================================================= */

  function resizeComposer() {
    if (!dom.messageInput) {
      return;
    }

    dom.messageInput.style.height =
      "auto";

    dom.messageInput.style.height =
      Math.min(
        dom.messageInput
          .scrollHeight,
        220
      ) + "px";
  }

  function updateComposerInfo() {
    if (
      !dom.composerTokenInfo
    ) {
      return;
    }

    const count =
      dom.messageInput
        ?.value
        ?.length || 0;

    dom.composerTokenInfo.textContent =
      `${count.toLocaleString(
        "tr-TR"
      )} karakter`;
  }

  function saveDraft() {
    if (
      !state.settings.draftSave
    ) {
      return;
    }

    const value =
      dom.messageInput
        ?.value || "";

    storageSet(
      APP.storage.draft,
      value
    );
  }

  function clearDraft() {
    storageRemove(
      APP.storage.draft
    );
  }

  function loadDraft() {
    if (!dom.messageInput) return;

    const draft =
      storageGet(
        APP.storage.draft,
        ""
      );

    if (
      typeof draft ===
        "string" &&
      draft
    ) {
      dom.messageInput.value =
        draft;

      resizeComposer();
      updateComposerInfo();
    }
  }

  /* =========================================================
     YENİ SOHBET
     ========================================================= */

  function newChat() {
    state.conversationId =
      null;

    state.messages = [];

    state.attachments = [];

    if (dom.messageInput) {
      dom.messageInput.value =
        "";
    }

    clearDraft();

    renderMessages();
    renderAttachments();

    resizeComposer();
    updateComposerInfo();

    openPanel("chat");

    toast(
      "Yeni sohbet hazır.",
      "success"
    );

    dom.messageInput?.focus();
  }

  function saveChats() {
    storageSet(
      APP.storage.chats,
      {
        conversationId:
          state.conversationId,

        messages:
          state.messages.slice(
            -100
          ),

        updatedAt:
          new Date().toISOString()
      }
    );
  }

  /* =========================================================
     SES
     ========================================================= */

  function speakText(value) {
    if (
      !("speechSynthesis" in window)
    ) {
      toast(
        "Bu tarayıcı sesli okumayı desteklemiyor.",
        "warning"
      );
      return;
    }

    const phrase =
      text(value).trim();

    if (!phrase) return;

    try {
      window.speechSynthesis.cancel();

      const utterance =
        new SpeechSynthesisUtterance(
          phrase
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
    } catch (error) {
      console.error(
        "[TürkAI] TTS:",
        error
      );
    }
  }

  function stopSpeaking() {
    try {
      window.speechSynthesis?.cancel();
    } catch {}

    state.speaking =
      false;
  }

  function startVoice() {
    const Recognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!Recognition) {
      toast(
        "Tarayıcınız sesli girişi desteklemiyor.",
        "warning"
      );
      return;
    }

    if (state.recording) {
      stopVoice();
      return;
    }

    try {
      const recognition =
        new Recognition();

      recognition.lang =
        "tr-TR";

      recognition.continuous =
        false;

      recognition.interimResults =
        true;

      recognition.onstart =
        () => {
          state.recording =
            true;

          dom.voiceButton?.classList.add(
            "active"
          );

          dom.voiceStatus?.classList.remove(
            "hidden"
          );

          if (
            dom.voiceStatusTitle
          ) {
            dom.voiceStatusTitle.textContent =
              "Dinliyorum";
          }

          if (
            dom.voiceStatusText
          ) {
            dom.voiceStatusText.textContent =
              "Konuşabilirsiniz...";
          }
        };

      recognition.onresult =
        (event) => {
          let transcript =
            "";

          for (
            let i =
              event.resultIndex;
            i <
              event.results.length;
            i++
          ) {
            transcript +=
              event.results[
                i
              ][0]
                .transcript;
          }

          if (
            transcript.trim() &&
            dom.messageInput
          ) {
            dom.messageInput.value =
              transcript.trim();

            resizeComposer();
            updateComposerInfo();
          }
        };

      recognition.onerror =
        (event) => {
          state.recording =
            false;

          dom.voiceButton?.classList.remove(
            "active"
          );

          dom.voiceStatus?.classList.add(
            "hidden"
          );

          if (
            event.error ===
            "not-allowed"
          ) {
            toast(
              "Mikrofon izni verilmedi.",
              "error"
            );
          }
        };

      recognition.onend =
        () => {
          state.recording =
            false;

          dom.voiceButton?.classList.remove(
            "active"
          );

          dom.voiceStatus?.classList.add(
            "hidden"
          );
        };

      state.recognition =
        recognition;

      recognition.start();
    } catch (error) {
      console.error(
        "[TürkAI] Voice:",
        error
      );

      stopVoice();
    }
  }

  function stopVoice() {
    try {
      state.recognition?.stop();
    } catch {}

    state.recording =
      false;

    dom.voiceButton?.classList.remove(
      "active"
    );

    dom.voiceStatus?.classList.add(
      "hidden"
    );
  }

  /* =========================================================
     ARAŞTIRMA
     ========================================================= */

  function extractResearchText(
    data
  ) {
    if (!data) return "";

    if (
      typeof data === "string"
    ) {
      return data.trim();
    }

    const parts = [];

    const first =
      answerFrom(data);

    if (first) {
      parts.push(first);
    }

    const extras = [
      data.summary,
      data.description,
      data.text,
      data.content,
      data.data?.summary,
      data.result?.summary
    ];

    extras.forEach((item) => {
      if (
        typeof item ===
          "string" &&
        item.trim() &&
        !parts.includes(
          item.trim()
        )
      ) {
        parts.push(
          item.trim()
        );
      }
    });

    const sources =
      data.sources ||
      data.results ||
      data.data?.sources ||
      data.data?.results ||
      [];

    if (Array.isArray(sources)) {
      sources
        .slice(0, 20)
        .forEach((item) => {
          const line = [
            item?.title ||
              item?.name,

            item?.snippet ||
              item?.description ||
              item?.summary,

            item?.url ||
              item?.link
          ]
            .filter(Boolean)
            .join(" — ");

          if (line) {
            parts.push(line);
          }
        });
    }

    return parts.join(
      "\n\n"
    );
  }

  async function loadResearchPanel() {
    if (
      dom.researchStatus
    ) {
      dom.researchStatus.textContent =
        "Hazır.";
    }
  }

  async function runResearch() {
    const query =
      dom.researchInput
        ?.value.trim();

    if (!query) {
      toast(
        "Araştırma konusu yaz.",
        "warning"
      );
      return;
    }

    if (
      dom.researchRunButton
    ) {
      dom.researchRunButton.disabled =
        true;
    }

    if (
      dom.researchStatus
    ) {
      dom.researchStatus.textContent =
        "Araştırılıyor...";
    }

    if (
      dom.researchResults
    ) {
      dom.researchResults.innerHTML = `
        <div class="empty-state">
          Araştırma yapılıyor...
        </div>
      `;
    }

    try {
      const data =
        await api(
          APP.api.research,
          {
            method: "POST",
            body: {
              query,
              question: query,
              text: query,
              language: "tr",
              mode: "research"
            }
          }
        );

      state.researchResults =
        data;

      renderResearch(
        data
      );

      if (
        dom.researchStatus
      ) {
        dom.researchStatus.textContent =
          "Araştırma tamamlandı.";
      }

      toast(
        "Araştırma tamamlandı.",
        "success"
      );
    } catch (error) {
      if (
        dom.researchStatus
      ) {
        dom.researchStatus.textContent =
          "Araştırma başarısız.";
      }

      if (
        dom.researchResults
      ) {
        dom.researchResults.innerHTML = `
          <div class="empty-state">
            <strong>Araştırma yapılamadı.</strong>
            <div>
              ${escapeHTML(
                error?.message ||
                  "Bilinmeyen hata."
              )}
            </div>
          </div>
        `;
      }

      toast(
        error?.message ||
          "Araştırma yapılamadı.",
        "error"
      );
    } finally {
      if (
        dom.researchRunButton
      ) {
        dom.researchRunButton.disabled =
          false;
      }
    }
  }

  function renderResearch(
    data
  ) {
    if (
      !dom.researchResults
    ) {
      return;
    }

    const answer =
      answerFrom(data);

    const sources =
      data?.sources ||
      data?.results ||
      data?.data?.sources ||
      data?.data?.results ||
      [];

    let html = "";

    if (answer) {
      html += `
        <article class="result-card">
          <div class="result-card-title">
            Sonuç
          </div>

          <div class="result-card-text">
            ${renderRichText(
              answer
            )}
          </div>
        </article>
      `;
    }

    if (
      Array.isArray(sources) &&
      sources.length
    ) {
      html += `
        <div class="result-list">
          ${sources
            .slice(0, 30)
            .map((item) => {
              const title =
                item?.title ||
                item?.name ||
                "Kaynak";

              const description =
                item?.snippet ||
                item?.description ||
                item?.summary ||
                "";

              const url =
                item?.url ||
                item?.link ||
                "";

              return `
                <article class="result-card">
                  <div class="result-card-title">
                    ${escapeHTML(
                      title
                    )}
                  </div>

                  ${
                    description
                      ? `
                        <div class="result-card-text">
                          ${escapeHTML(
                            description
                          )}
                        </div>
                      `
                      : ""
                  }

                  ${
                    url
                      ? `
                        <a
                          href="${escapeHTML(
                            url
                          )}"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="result-link"
                        >
                          Kaynağı aç
                        </a>
                      `
                      : ""
                  }
                </article>
              `;
            })
            .join("")}
        </div>
      `;
    }

    if (!html) {
      html = `
        <div class="empty-state">
          Araştırma sonucu bulunamadı.
        </div>
      `;
    }

    dom.researchResults.innerHTML =
      html;
  }

  /* =========================================================
     HAVA DURUMU
     ========================================================= */

  async function runWeather() {
    const city =
      dom.weatherInput
        ?.value.trim();

    if (!city) {
      toast(
        "Şehir yaz.",
        "warning"
      );
      return;
    }

    dom.weatherRunButton &&
      (dom.weatherRunButton.disabled =
        true);

    if (
      dom.weatherResults
    ) {
      dom.weatherResults.innerHTML = `
        <div class="empty-state">
          Hava durumu alınıyor...
        </div>
      `;
    }

    try {
      const data =
        await api(
          APP.api.weather,
          {
            method: "POST",
            body: {
              city,
              location: city,
              query: city,
              language: "tr"
            }
          }
        );

      state.weatherResult =
        data;

      renderWeather(data);

      toast(
        "Hava durumu güncellendi.",
        "success"
      );
    } catch (error) {
      if (
        dom.weatherResults
      ) {
        dom.weatherResults.innerHTML = `
          <div class="empty-state">
            <strong>Hava durumu alınamadı.</strong>
            <div>
              ${escapeHTML(
                error?.message ||
                  ""
              )}
            </div>
          </div>
        `;
      }

      toast(
        error?.message ||
          "Hava durumu alınamadı.",
        "error"
      );
    } finally {
      dom.weatherRunButton &&
        (dom.weatherRunButton.disabled =
          false);
    }
  }

  function renderWeather(
    data
  ) {
    if (
      !dom.weatherResults
    ) {
      return;
    }

    const current =
      data?.current ||
      data?.data?.current ||
      data?.result?.current ||
      data;

    const city =
      data?.city ||
      data?.location?.name ||
      current?.city ||
      dom.weatherInput
        ?.value ||
      "Konum";

    const temp =
      current?.temperature ??
      current?.temp ??
      data?.temperature ??
      data?.temp ??
      "--";

    const condition =
      current?.condition ||
      current?.description ||
      data?.condition ||
      data?.description ||
      "Bilgi yok";

    const humidity =
      current?.humidity ??
      data?.humidity ??
      "--";

    const wind =
      current?.windSpeed ??
      current?.wind ??
      data?.windSpeed ??
      data?.wind ??
      "--";

    dom.weatherResults.innerHTML = `
      <article class="result-card weather-card">
        <div class="result-card-title">
          ${escapeHTML(city)}
        </div>

        <div class="weather-main-value">
          ${escapeHTML(temp)}°
        </div>

        <div class="result-card-text">
          ${escapeHTML(
            condition
          )}
        </div>

        <div class="weather-details">
          <div>
            <span>Nem</span>
            <strong>
              ${escapeHTML(
                humidity
              )}%
            </strong>
          </div>

          <div>
            <span>Rüzgar</span>
            <strong>
              ${escapeHTML(
                wind
              )}
            </strong>
          </div>
        </div>
      </article>
    `;
  }

  /* =========================================================
     HAFIZA
     ========================================================= */

  async function loadMemoryOverview() {
    try {
      const data =
        await api(
          APP.api.memorySearch,
          {
            method: "POST",
            body: {
              query: "*",
              q: "*",
              overview: true
            }
          }
        );

      const list =
        Array.isArray(data)
          ? data
          : data?.results ||
            data?.items ||
            data?.data ||
            data?.memories ||
            [];

      state.memoryResults =
        Array.isArray(list)
          ? list
          : [];

      if (
        dom.memoryStats
      ) {
        const count =
          data?.total ??
          data?.count ??
          data?.stats?.count ??
          state.memoryResults.length;

        dom.memoryStats.innerHTML = `
          <div class="memory-stat-card">
            <span>Toplam kayıt</span>
            <strong>
              ${escapeHTML(
                count
              )}
            </strong>
          </div>
        `;
      }

      renderMemory(
        state.memoryResults
      );
    } catch {
      if (
        dom.memoryStats
      ) {
        dom.memoryStats.innerHTML = `
          <div class="empty-state">
            Hafıza özeti alınamadı.
          </div>
        `;
      }
    }
  }

  async function searchMemory() {
    const query =
      dom.memoryInput
        ?.value.trim();

    if (!query) {
      loadMemoryOverview();
      return;
    }

    if (
      dom.memorySearchButton
    ) {
      dom.memorySearchButton.disabled =
        true;
    }

    try {
      const data =
        await api(
          APP.api.memorySearch,
          {
            method: "POST",
            body: {
              query,
              q: query,
              text: query
            }
          }
        );

      const list =
        Array.isArray(data)
          ? data
          : data?.results ||
            data?.items ||
            data?.data ||
            data?.memories ||
            [];

      state.memoryResults =
        Array.isArray(list)
          ? list
          : [];

      renderMemory(
        state.memoryResults
      );
    } catch (error) {
      toast(
        error?.message ||
          "Hafıza aranamadı.",
        "error"
      );
    } finally {
      if (
        dom.memorySearchButton
      ) {
        dom.memorySearchButton.disabled =
          false;
      }
    }
  }

  function renderMemory(
    list
  ) {
    if (
      !dom.memoryResults
    ) {
      return;
    }

    if (
      !Array.isArray(list) ||
      !list.length
    ) {
      dom.memoryResults.innerHTML = `
        <div class="empty-state">
          Hafızada kayıt bulunamadı.
        </div>
      `;

      return;
    }

    dom.memoryResults.innerHTML =
      list
        .slice(0, 100)
        .map((item) => {
          const title =
            item?.title ||
            item?.question ||
            item?.key ||
            "Hafıza kaydı";

          const content =
            item?.answer ||
            item?.content ||
            item?.value ||
            item?.text ||
            "";

          const category =
            item?.category ||
            item?.type ||
            "memory";

          return `
            <article class="result-card">
              <div class="result-card-title">
                ${escapeHTML(
                  title
                )}
              </div>

              <div class="result-card-text">
                ${renderRichText(
                  content
                )}
              </div>

              <div class="result-card-meta">
                ${escapeHTML(
                  category
                )}
              </div>
            </article>
          `;
        })
        .join("");
  }

  async function saveMemory(
    value,
    type = "chat"
  ) {
    const content =
      text(value).trim();

    if (!content) {
      return false;
    }

    try {
      await api(
        APP.api.memorySave,
        {
          method: "POST",
          body: {
            content,
            text: content,
            answer: content,
            type
          }
        }
      );

      toast(
        "Hafızaya kaydedildi.",
        "success"
      );

      return true;
    } catch (error) {
      toast(
        error?.message ||
          "Hafızaya kaydedilemedi.",
        "error"
      );

      return false;
    }
  }

  async function saveConversationToMemory() {
    if (!state.messages.length) {
      toast(
        "Kaydedilecek sohbet yok.",
        "warning"
      );

      return;
    }

    const conversation =
      state.messages
        .map((item) => {
          const who =
            item.role ===
            "user"
              ? "Kullanıcı"
              : "TürkAI";

          return (
            who +
            ": " +
            item.content
          );
        })
        .join("\n\n");

    await saveMemory(
      conversation,
      "conversation"
    );
  }

  /* =========================================================
     DOSYALAR
     ========================================================= */

  function renderAttachments() {
    if (
      !dom.attachmentPreview
    ) {
      return;
    }

    if (
      !state.attachments.length
    ) {
      dom.attachmentPreview.innerHTML =
        "";

      dom.attachmentPreview.classList.add(
        "hidden"
      );

      return;
    }

    dom.attachmentPreview.classList.remove(
      "hidden"
    );

    dom.attachmentPreview.innerHTML =
      state.attachments
        .map(
          (file, index) => `
            <div class="attachment-chip">
              <div class="attachment-chip-icon">
                <svg viewBox="0 0 24 24">
                  <use href="#i-file"></use>
                </svg>
              </div>

              <div class="attachment-chip-info">
                <strong>
                  ${escapeHTML(
                    file.name
                  )}
                </strong>

                <span>
                  ${formatBytes(
                    file.size
                  )}
                </span>
              </div>

              <button
                type="button"
                data-remove-attachment="${index}"
                title="Kaldır"
              >
                <svg viewBox="0 0 24 24">
                  <use href="#i-close"></use>
                </svg>
              </button>
            </div>
          `
        )
        .join("");
  }

  function showUpload(
    title,
    message,
    progress
  ) {
    if (
      !dom.uploadStatusBar
    ) {
      return;
    }

    dom.uploadStatusBar.classList.remove(
      "hidden"
    );

    if (
      dom.uploadStatusTitle
    ) {
      dom.uploadStatusTitle.textContent =
        title;
    }

    if (
      dom.uploadStatusText
    ) {
      dom.uploadStatusText.textContent =
        message;
    }

    if (
      dom.uploadProgressBar
    ) {
      dom.uploadProgressBar.style.width =
        `${Math.max(
          0,
          Math.min(
            100,
            progress
          )
        )}%`;
    }
  }

  function hideUpload() {
    dom.uploadStatusBar?.classList.add(
      "hidden"
    );
  }

  async function uploadFiles(
    fileList
  ) {
    const files =
      Array.from(
        fileList || []
      );

    if (!files.length) {
      return;
    }

    const oneGB =
      1024 *
      1024 *
      1024;

    const valid =
      files.filter(
        (file) =>
          Number(
            file.size || 0
          ) <= oneGB
      );

    if (!valid.length) {
      toast(
        "Dosya boyutu uygun değil.",
        "error"
      );
      return;
    }

    valid.forEach((file) => {
      state.attachments.push({
        id: uid("file"),
        name: file.name,
        type: file.type,
        size: file.size,
        file,
        localOnly: true
      });
    });

    renderAttachments();

    const form =
      new FormData();

    valid.forEach((file) => {
      form.append(
        "files",
        file,
        file.name
      );
    });

    if (
      state.conversationId
    ) {
      form.append(
        "conversationId",
        state.conversationId
      );
    }

    showUpload(
      "Dosyalar hazırlanıyor",
      `${valid.length} dosya seçildi`,
      10
    );

    try {
      showUpload(
        "Yükleniyor",
        "Sunucuya aktarılıyor...",
        45
      );

      const data =
        await api(
          APP.api.filesUpload,
          {
            method: "POST",
            body: form
          }
        );

      const uploaded =
        Array.isArray(data)
          ? data
          : data?.files ||
            data?.results ||
            data?.items ||
            data?.data ||
            [];

      if (
        Array.isArray(
          uploaded
        )
      ) {
        uploaded.forEach(
          (serverFile, index) => {
            const local =
              state.attachments[
                state.attachments
                  .length -
                valid.length +
                index
              ];

            if (
              local &&
              serverFile
            ) {
              Object.assign(
                local,
                serverFile,
                {
                  localOnly:
                    false
                }
              );
            }
          }
        );
      }

      showUpload(
        "Tamamlandı",
        "Dosyalar hazır.",
        100
      );

      toast(
        `${valid.length} dosya hazır.`,
        "success"
      );
    } catch (error) {
      /*
        Backend upload endpointi yoksa seçilen
        dosyalar yine attachment olarak korunuyor.
      */
      showUpload(
        "Dosyalar eklendi",
        "Sohbete bağlandı.",
        100
      );

      toast(
        "Dosyalar sohbete eklendi.",
        "warning"
      );

      console.warn(
        "[TürkAI] Upload:",
        error
      );
    } finally {
      if (
        dom.globalFilePicker
      ) {
        dom.globalFilePicker.value =
          "";
      }

      window.setTimeout(
        hideUpload,
        700
      );
    }
  }

  async function loadFiles() {
    if (!dom.fileList) {
      return;
    }

    try {
      const data =
        await api(
          APP.api.files
        );

      state.files =
        Array.isArray(data)
          ? data
          : data?.files ||
            data?.results ||
            data?.items ||
            data?.data ||
            [];

      if (
        !Array.isArray(
          state.files
        )
      ) {
        state.files = [];
      }

      renderFiles();
    } catch {
      state.files = [];
      renderFiles();
    }
  }

  function renderFiles() {
    if (
      !dom.fileList
    ) {
      return;
    }

    if (
      dom.fileCount
    ) {
      dom.fileCount.textContent =
        state.files.length
          .toLocaleString(
            "tr-TR"
          );
    }

    if (
      !state.files.length
    ) {
      dom.fileList.innerHTML = `
        <div class="empty-state">
          Henüz dosya yok.
        </div>
      `;

      return;
    }

    dom.fileList.innerHTML =
      state.files
        .map((file) => {
          const name =
            file?.name ||
            file?.filename ||
            "Dosya";

          const type =
            file?.type ||
            file?.mimeType ||
            "Dosya";

          const size =
            file?.size ||
            file?.bytes ||
            0;

          const url =
            file?.url ||
            file?.downloadUrl ||
            "";

          return `
            <article class="file-card">
              <div class="file-card-icon">
                <svg viewBox="0 0 24 24">
                  <use href="#i-file-text"></use>
                </svg>
              </div>

              <div class="file-card-main">
                <strong>
                  ${escapeHTML(
                    name
                  )}
                </strong>

                <span>
                  ${escapeHTML(
                    type
                  )}
                  ·
                  ${formatBytes(
                    size
                  )}
                </span>
              </div>

              ${
                url
                  ? `
                    <a
                      class="file-card-action"
                      href="${escapeHTML(
                        url
                      )}"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <svg viewBox="0 0 24 24">
                        <use href="#i-download"></use>
                      </svg>
                    </a>
                  `
                  : ""
              }
            </article>
          `;
        })
        .join("");
  }

  /* =========================================================
     PLANLAR
     ========================================================= */

  const DEFAULT_PLANS = [
    {
      id: "free",
      name: "Free",
      price: 0,
      description:
        "TürkAI'nin temel deneyimi.",
      features: [
        "Temel sohbet",
        "Hafıza",
        "Araştırma"
      ]
    },

    {
      id: "pro",
      name: "Pro",
      price: 250,
      featured: true,
      description:
        "Daha yüksek kullanım ve gelişmiş özellikler.",
      features: [
        "Daha yüksek kullanım",
        "Gelişmiş modeller",
        "Görsel üretim"
      ]
    },

    {
      id: "plus",
      name: "Plus",
      price: 500,
      description:
        "Gelişmiş üretim araçları.",
      features: [
        "Daha yüksek limit",
        "Görsel üretim",
        "Video üretimi"
      ]
    },

    {
      id: "ultra",
      name: "Ultra",
      price: 1000,
      soon: true,
      description:
        "TürkAI'nin en kapsamlı paketi.",
      features: [
        "Ultra kullanım",
        "Genişletilmiş modeller",
        "Gelişmiş medya"
      ]
    }
  ];

  async function loadPlans() {
    try {
      const data =
        await api(
          APP.api.plans
        );

      const remote =
        Array.isArray(data)
          ? data
          : data?.plans ||
            data?.items ||
            data?.data ||
            [];

      state.plans =
        Array.isArray(
          remote
        ) &&
        remote.length
          ? remote
          : DEFAULT_PLANS;
    } catch {
      state.plans =
        DEFAULT_PLANS;
    }

    renderPlans();
  }

  function renderPlans() {
    if (
      !dom.plansList
    ) {
      return;
    }

    dom.plansList.innerHTML =
      state.plans
        .map((plan) => {
          const price =
            Number(
              plan.price
            ) || 0;

          return `
            <article
              class="plan-card ${
                plan.featured
                  ? "featured"
                  : ""
              }"
            >
              <div class="plan-card-header">
                <div>
                  <div class="plan-card-name">
                    ${escapeHTML(
                      plan.name ||
                        plan.id
                    )}
                  </div>

                  <div class="plan-card-price">
                    ${price.toLocaleString(
                      "tr-TR"
                    )} TL${
                      price
                        ? "/ay"
                        : ""
                    }
                  </div>
                </div>

                ${
                  plan.soon
                    ? `
                      <span class="plan-badge">
                        Yakında
                      </span>
                    `
                    : plan.featured
                    ? `
                      <span class="plan-badge">
                        Öne çıkan
                      </span>
                    `
                    : ""
                }
              </div>

              <div class="plan-card-description">
                ${escapeHTML(
                  plan.description ||
                    ""
                )}
              </div>

              <div class="plan-card-features">
                ${(
                  plan.features ||
                  []
                )
                  .map(
                    (feature) => `
                      <div>
                        <svg viewBox="0 0 24 24">
                          <use href="#i-check"></use>
                        </svg>

                        <span>
                          ${escapeHTML(
                            feature
                          )}
                        </span>
                      </div>
                    `
                  )
                  .join("")}
              </div>

              <button
                type="button"
                class="primary-button"
                data-plan-id="${escapeHTML(
                  plan.id
                )}"
                ${
                  plan.soon
                    ? "disabled"
                    : ""
                }
              >
                ${
                  plan.soon
                    ? "Yakında"
                    : plan.id ===
                      "free"
                    ? "Aktif"
                    : "İncele"
                }
              </button>
            </article>
          `;
        })
        .join("");
  }

  /* =========================================================
     BİLDİRİMLER
     ========================================================= */

  async function loadNotifications() {
    try {
      const data =
        await api(
          APP.api.notifications
        );

      state.notifications =
        Array.isArray(data)
          ? data
          : data?.notifications ||
            data?.items ||
            data?.results ||
            data?.data ||
            [];

      if (
        !Array.isArray(
          state.notifications
        )
      ) {
        state.notifications =
          [];
      }
    } catch {
      state.notifications =
        [];
    }

    state.unreadNotifications =
      state.notifications.filter(
        (item) =>
          !item?.read &&
          !item?.isRead
      ).length;

    renderNotifications();
  }

  function renderNotifications() {
    if (
      dom.notificationBadge
    ) {
      dom.notificationBadge.textContent =
        state.unreadNotifications >
        99
          ? "99+"
          : String(
              state.unreadNotifications
            );

      dom.notificationBadge.classList.toggle(
        "hidden",
        state.unreadNotifications ===
          0
      );
    }

    if (
      !dom.notificationList
    ) {
      return;
    }

    if (
      !state.notifications.length
    ) {
      dom.notificationList.innerHTML = `
        <div class="empty-state">
          Yeni bildirim yok.
        </div>
      `;

      if (
        dom.notificationSummary
      ) {
        dom.notificationSummary.textContent =
          "0 okunmamış";
      }

      return;
    }

    dom.notificationList.innerHTML =
      state.notifications
        .slice(0, 50)
        .map((item) => {
          const title =
            item?.title ||
            "Bildirim";

          const message =
            item?.message ||
            item?.text ||
            "";

          const date =
            item?.createdAt ||
            item?.created_at ||
            item?.date ||
            new Date();

          const unread =
            !item?.read &&
            !item?.isRead;

          return `
            <article
              class="notification-card ${
                unread
                  ? "unread"
                  : ""
              }"
            >
              <div class="notification-card-icon">
                <svg viewBox="0 0 24 24">
                  <use href="#i-bell"></use>
                </svg>
              </div>

              <div class="notification-card-main">
                <strong>
                  ${escapeHTML(
                    title
                  )}
                </strong>

                <span>
                  ${escapeHTML(
                    message
                  )}
                </span>

                <small>
                  ${escapeHTML(
                    formatDate(
                      date
                    )
                  )}
                </small>
              </div>
            </article>
          `;
        })
        .join("");

    if (
      dom.notificationSummary
    ) {
      dom.notificationSummary.textContent =
        `${state.unreadNotifications} okunmamış`;
    }
  }

  function markNotificationsRead() {
    state.notifications =
      state.notifications.map(
        (item) => ({
          ...item,
          read: true,
          isRead: true
        })
      );

    state.unreadNotifications =
      0;

    renderNotifications();

    toast(
      "Bildirimler okundu.",
      "success"
    );
  }

  /* =========================================================
     SİSTEM
     ========================================================= */

  async function loadSystem() {
    try {
      const data =
        await api(
          APP.api.system
        );

      state.systemResult =
        data;

      renderSystem(data);
    } catch (error) {
      if (
        dom.systemOverallStatus
      ) {
        dom.systemOverallStatus.textContent =
          "Ulaşılamıyor";
      }

      if (
        dom.systemStats
      ) {
        dom.systemStats.innerHTML = `
          <div class="empty-state">
            Sistem bilgisi alınamadı.
            <div>
              ${escapeHTML(
                error?.message ||
                  ""
              )}
            </div>
          </div>
        `;
      }
    }
  }

  function renderSystem(
    data
  ) {
    if (
      !dom.systemStats
    ) {
      return;
    }

    const status =
      data?.status ??
      (
        data?.integration
          ?.degraded === false
          ? "ready"
          : "unknown"
      );

    const ready =
      [
        "ready",
        "ok",
        "healthy"
      ].includes(
        text(status)
          .toLocaleLowerCase(
            "tr-TR"
          )
      );

    if (
      dom.systemOverallStatus
    ) {
      dom.systemOverallStatus.textContent =
        ready
          ? "Hazır"
          : text(
              status
            );
    }

    const server =
      data?.server ||
      {};

    const modules =
      data?.modules ||
      {};

    dom.systemStats.innerHTML = `
      <div class="system-card">
        <div class="system-card-title">
          Sunucu
        </div>

        <div class="system-card-row">
          <span>Durum</span>
          <strong>
            ${escapeHTML(
              status
            )}
          </strong>
        </div>

        <div class="system-card-row">
          <span>Ad</span>
          <strong>
            ${escapeHTML(
              server.name ||
                "TürkAI Master Server"
            )}
          </strong>
        </div>

        <div class="system-card-row">
          <span>Sürüm</span>
          <strong>
            ${escapeHTML(
              server.version ||
                data?.version ||
                APP.version
            )}
          </strong>
        </div>

        <div class="system-card-row">
          <span>Port</span>
          <strong>
            ${escapeHTML(
              server.port ||
                "3000"
            )}
          </strong>
        </div>
      </div>

      <div class="system-card">
        <div class="system-card-title">
          Modüller
        </div>

        ${
          Object.keys(
            modules
          ).length
            ? Object.entries(
                modules
              )
                .map(
                  ([name, info]) => `
                    <div class="system-card-row">
                      <span>
                        ${escapeHTML(
                          name
                        )}
                      </span>

                      <strong>
                        ${
                          info?.available ===
                          false
                            ? "Pasif"
                            : "Aktif"
                        }
                      </strong>
                    </div>
                  `
                )
                .join("")
            : `
              <div class="empty-state">
                Modül bilgisi yok.
              </div>
            `
        }
      </div>
    `;
  }

  /* =========================================================
     HESAP
     ========================================================= */

  function normalizeAccount(
    data
  ) {
    const raw =
      data?.account ||
      data?.user ||
      data?.data ||
      data ||
      {};

    return {
      id:
        raw.id ||
        raw.userId ||
        null,

      name:
        raw.name ||
        raw.displayName ||
        raw.username ||
        "Misafir",

      email:
        raw.email ||
        "",

      verified:
        Boolean(
          raw.verified ||
            raw.emailVerified
        ),

      plan:
        raw.plan ||
        raw.planName ||
        "Free",

      usage:
        raw.usage ??
        raw.used ??
        0,

      limit:
        raw.limit ??
        raw.maxUsage ??
        50,

      status:
        raw.status ||
        "guest"
    };
  }

  async function loadAccount() {
    try {
      const data =
        await api(
          APP.api.authMe
        );

      state.account =
        normalizeAccount(
          data
        );

      storageSet(
        APP.storage.account,
        state.account
      );
    } catch {
      state.account =
        normalizeAccount(
          storageGet(
            APP.storage.account,
            {
              name: "Misafir",
              plan: "Free",
              status: "guest",
              usage: 0,
              limit: 50
            }
          )
        );
    }

    renderAccount();
  }

  function renderAccount() {
    const account =
      state.account ||
      normalizeAccount({});

    if (
      dom.accountName
    ) {
      dom.accountName.textContent =
        account.name;
    }

    if (
      dom.accountPlan
    ) {
      dom.accountPlan.textContent =
        account.plan;
    }

    if (
      dom.accountStatusDot
    ) {
      dom.accountStatusDot.classList.toggle(
        "online",
        account.status ===
          "active" ||
          account.status ===
            "guest"
      );
    }

    if (
      dom.accountModalName
    ) {
      dom.accountModalName.textContent =
        account.name;
    }

    if (
      dom.accountModalEmail
    ) {
      dom.accountModalEmail.textContent =
        account.email ||
        "Misafir oturumu";
    }

    if (
      dom.accountModalVerified
    ) {
      dom.accountModalVerified.textContent =
        account.verified
          ? "Doğrulanmış"
          : "Doğrulanmamış";
    }

    if (
      dom.accountModalPlan
    ) {
      dom.accountModalPlan.textContent =
        account.plan;
    }

    if (
      dom.accountModalUsage
    ) {
      dom.accountModalUsage.textContent =
        `${account.usage} / ${account.limit}`;
    }

    if (
      dom.accountModalStatus
    ) {
      dom.accountModalStatus.textContent =
        account.status;
    }
  }

  async function login() {
    const identifier =
      dom.authIdentifier
        ?.value.trim();

    const password =
      dom.authPassword
        ?.value || "";

    if (!identifier || !password) {
      if (
        dom.authMessage
      ) {
        dom.authMessage.textContent =
          "Giriş bilgilerini doldur.";
      }

      return;
    }

    if (
      dom.authMessage
    ) {
      dom.authMessage.textContent =
        "Giriş yapılıyor...";
    }

    try {
      const data =
        await api(
          APP.api.authLogin,
          {
            method: "POST",
            body: {
              identifier,
              username:
                identifier,
              email:
                identifier,
              password
            }
          }
        );

      state.account =
        normalizeAccount(
          data
        );

      storageSet(
        APP.storage.account,
        state.account
      );

      renderAccount();

      closeModal(
        "authModal"
      );

      openModal(
        "accountModal"
      );

      toast(
        "Giriş başarılı.",
        "success"
      );
    } catch (error) {
      if (
        dom.authMessage
      ) {
        dom.authMessage.textContent =
          error?.message ||
          "Giriş başarısız.";
      }

      toast(
        error?.message ||
          "Giriş başarısız.",
        "error"
      );
    }
  }

  async function logout() {
    try {
      await api(
        APP.api.authLogout,
        {
          method: "POST",
          body: {}
        }
      );
    } catch {}

    storageRemove(
      APP.storage.account
    );

    state.account =
      normalizeAccount({
        name: "Misafir",
        plan: "Free",
        status: "guest",
        usage: 0,
        limit: 50
      });

    renderAccount();

    closeModal(
      "accountModal"
    );

    toast(
      "Oturum kapatıldı.",
      "success"
    );
  }

  function guestLogin() {
    state.account =
      normalizeAccount({
        name: "Misafir",
        plan: "Free",
        status: "guest",
        usage: 0,
        limit: 50
      });

    storageSet(
      APP.storage.account,
      state.account
    );

    renderAccount();

    closeModal(
      "authModal"
    );

    toast(
      "Misafir olarak devam ediliyor.",
      "success"
    );
  }

  /* =========================================================
     KOMUT MERKEZİ
     ========================================================= */

  const COMMANDS = [
    [
      "Yeni sohbet",
      "Yeni konuşma başlat",
      "i-plus",
      () => newChat()
    ],

    [
      "Araştırma",
      "Web araştırma paneli",
      "i-search",
      () =>
        openPanel(
          "research"
        )
    ],

    [
      "Hava durumu",
      "Hava durumu aracını aç",
      "i-cloud",
      () =>
        openPanel(
          "weather"
        )
    ],

    [
      "Hafıza",
      "TürkAI hafızası",
      "i-memory",
      () =>
        openPanel(
          "memory"
        )
    ],

    [
      "Dosyalar",
      "Dosya merkezini aç",
      "i-folder",
      () =>
        openPanel(
          "files"
        )
    ],

    [
      "Medya",
      "Görsel ve video",
      "i-image",
      () =>
        openPanel(
          "media"
        )
    ],

    [
      "Planlar",
      "TürkAI planları",
      "i-crown",
      () =>
        openPanel(
          "plans"
        )
    ],

    [
      "Bildirimler",
      "Bildirim merkezi",
      "i-bell",
      () =>
        openPanel(
          "notifications"
        )
    ],

    [
      "Sistem",
      "Sunucu durumu",
      "i-command",
      () =>
        openPanel(
          "system"
        )
    ],

    [
      "Ayarlar",
      "Uygulama ayarları",
      "i-settings",
      () =>
        openModal(
          "settingsModal"
        )
    ],

    [
      "Hesap",
      "Hesap bilgileri",
      "i-user",
      () =>
        openModal(
          "accountModal"
        )
    ]
  ];

  let commandIndex = 0;

  function renderCommands(
    query = ""
  ) {
    if (
      !dom.commandList
    ) {
      return;
    }

    const normalized =
      text(query)
        .toLocaleLowerCase(
          "tr-TR"
        )
        .trim();

    const list =
      COMMANDS.filter(
        ([title, description]) =>
          !normalized ||
          `${title} ${description}`
            .toLocaleLowerCase(
              "tr-TR"
            )
            .includes(
              normalized
            )
      );

    dom.commandList.innerHTML =
      list
        .map(
          (
            [
              title,
              description,
              icon
            ],
            index
          ) => `
            <button
              type="button"
              class="command-item ${
                index ===
                commandIndex
                  ? "active"
                  : ""
              }"
              data-command-index="${index}"
            >
              <div class="command-item-icon">
                <svg viewBox="0 0 24 24">
                  <use href="#${icon}"></use>
                </svg>
              </div>

              <div class="command-item-content">
                <strong>
                  ${escapeHTML(
                    title
                  )}
                </strong>

                <span>
                  ${escapeHTML(
                    description
                  )}
                </span>
              </div>

              <svg
                class="command-item-arrow"
                viewBox="0 0 24 24"
              >
                <use href="#i-chevron-right"></use>
              </svg>
            </button>
          `
        )
        .join("");
  }

  function openCommandCenter() {
    commandIndex = 0;

    openModal(
      "commandCenter"
    );

    if (
      dom.commandInput
    ) {
      dom.commandInput.value =
        "";
    }

    renderCommands();
  }

  /* =========================================================
     ARAMA
     ========================================================= */

  function searchCurrentChat(
    query
  ) {
    if (
      !dom.chatSearchResults
    ) {
      return;
    }

    const q =
      text(query)
        .toLocaleLowerCase(
          "tr-TR"
        )
        .trim();

    if (!q) {
      dom.chatSearchResults.innerHTML = `
        <div class="empty-state">
          Sohbette aramak için yaz.
        </div>
      `;

      return;
    }

    const found =
      state.messages.filter(
        (message) =>
          text(
            message.content
          )
            .toLocaleLowerCase(
              "tr-TR"
            )
            .includes(q)
      );

    if (!found.length) {
      dom.chatSearchResults.innerHTML = `
        <div class="empty-state">
          Sonuç bulunamadı.
        </div>
      `;

      return;
    }

    dom.chatSearchResults.innerHTML =
      found
        .map(
          (message) => `
            <button
              type="button"
              class="result-card"
              data-search-message-id="${message.id}"
            >
              <div class="result-card-title">
                ${
                  message.role ===
                  "user"
                    ? "Sen"
                    : "TürkAI"
                }
              </div>

              <div class="result-card-text">
                ${escapeHTML(
                  message.content
                    .slice(
                      0,
                      400
                    )
                )}
              </div>
            </button>
          `
        )
        .join("");
  }

  /* =========================================================
     MEDYA
     ========================================================= */

  async function generateImage() {
    const prompt =
      dom.imagePromptInput
        ?.value.trim();

    if (!prompt) {
      toast(
        "Görsel açıklaması yaz.",
        "warning"
      );
      return;
    }

    dom.generateImageButton &&
      (dom.generateImageButton.disabled =
        true);

    if (
      dom.imageResult
    ) {
      dom.imageResult.innerHTML = `
        <div class="empty-state">
          Görsel hazırlanıyor...
        </div>
      `;
    }

    try {
      const data =
        await api(
          APP.api.image,
          {
            method: "POST",
            body: {
              prompt,

              size:
                dom.imageSizeSelect
                  ?.value ||
                "1024x1024",

              quality:
                dom.imageQualitySelect
                  ?.value ||
                "standard"
            }
          },
          90000
        );

      const url =
        data?.url ||
        data?.imageUrl ||
        data?.image_url ||
        data?.data?.url ||
        data?.data?.imageUrl ||
        data?.result?.url ||
        "";

      if (!url) {
        throw new Error(
          "Sunucu görsel URL'si döndürmedi."
        );
      }

      if (
        dom.imageResult
      ) {
        dom.imageResult.innerHTML = `
          <div class="generated-media-card">
            <img
              src="${escapeHTML(
                url
              )}"
              alt="TürkAI görsel sonucu"
              loading="lazy"
            />

            <div class="generated-media-actions">
              <a
                href="${escapeHTML(
                  url
                )}"
                target="_blank"
                rel="noopener noreferrer"
                class="secondary-button"
              >
                <svg viewBox="0 0 24 24">
                  <use href="#i-download"></use>
                </svg>
                Görseli aç
              </a>
            </div>
          </div>
        `;
      }

      toast(
        "Görsel hazır.",
        "success"
      );
    } catch (error) {
      if (
        dom.imageResult
      ) {
        dom.imageResult.innerHTML = `
          <div class="empty-state">
            <strong>Görsel oluşturulamadı.</strong>
            <div>
              ${escapeHTML(
                error?.message ||
                  ""
              )}
            </div>
          </div>
        `;
      }

      toast(
        error?.message ||
          "Görsel oluşturulamadı.",
        "error"
      );
    } finally {
      dom.generateImageButton &&
        (dom.generateImageButton.disabled =
          false);
    }
  }

  async function generateVideo() {
    const prompt =
      dom.videoPromptInput
        ?.value.trim();

    if (!prompt) {
      toast(
        "Video açıklaması yaz.",
        "warning"
      );
      return;
    }

    dom.generateVideoButton &&
      (dom.generateVideoButton.disabled =
        true);

    if (
      dom.videoResult
    ) {
      dom.videoResult.innerHTML = `
        <div class="empty-state">
          Video hazırlanıyor...
        </div>
      `;
    }

    try {
      const data =
        await api(
          APP.api.video,
          {
            method: "POST",
            body: {
              prompt,
              duration:
                dom.videoDurationSelect
                  ?.value ||
                "5"
            }
          },
          120000
        );

      const url =
        data?.url ||
        data?.videoUrl ||
        data?.video_url ||
        data?.data?.url ||
        data?.data?.videoUrl ||
        data?.result?.url ||
        "";

      if (!url) {
        throw new Error(
          "Sunucu video URL'si döndürmedi."
        );
      }

      if (
        dom.videoResult
      ) {
        dom.videoResult.innerHTML = `
          <div class="generated-media-card">
            <video
              src="${escapeHTML(
                url
              )}"
              controls
              playsinline
            ></video>

            <div class="generated-media-actions">
              <a
                href="${escapeHTML(
                  url
                )}"
                target="_blank"
                rel="noopener noreferrer"
                class="secondary-button"
              >
                <svg viewBox="0 0 24 24">
                  <use href="#i-download"></use>
                </svg>
                Videoyu aç
              </a>
            </div>
          </div>
        `;
      }

      toast(
        "Video hazır.",
        "success"
      );
    } catch (error) {
      if (
        dom.videoResult
      ) {
        dom.videoResult.innerHTML = `
          <div class="empty-state">
            <strong>Video oluşturulamadı.</strong>
            <div>
              ${escapeHTML(
                error?.message ||
                  ""
              )}
            </div>
          </div>
        `;
      }

      toast(
        error?.message ||
          "Video oluşturulamadı.",
        "error"
      );
    } finally {
      dom.generateVideoButton &&
        (dom.generateVideoButton.disabled =
          false);
    }
  }

  /* =========================================================
     AYARLAR
     ========================================================= */

  function loadSettings() {
    const saved =
      storageGet(
        APP.storage.settings,
        {}
      );

    state.settings = {
      enterToSend: true,
      draftSave: true,
      autoSpeak: false,
      freshInfo: true,
      ...(saved || {})
    };

    state.model =
      storageGet(
        APP.storage.model,
        "auto"
      );

    if (
      dom.modelSelect
    ) {
      dom.modelSelect.value =
        state.model;
    }

    syncSettingsUI();
  }

  function syncSettingsUI() {
    if (
      dom.enterSendToggle
    ) {
      dom.enterSendToggle.checked =
        !!state.settings.enterToSend;
    }

    if (
      dom.draftSaveToggle
    ) {
      dom.draftSaveToggle.checked =
        !!state.settings.draftSave;
    }

    if (
      dom.autoSpeakToggle
    ) {
      dom.autoSpeakToggle.checked =
        !!state.settings.autoSpeak;
    }

    if (
      dom.freshInfoToggle
    ) {
      dom.freshInfoToggle.checked =
        !!state.settings.freshInfo;
    }
  }

  function saveSettings() {
    state.settings = {
      enterToSend:
        !!dom.enterSendToggle
          ?.checked,

      draftSave:
        !!dom.draftSaveToggle
          ?.checked,

      autoSpeak:
        !!dom.autoSpeakToggle
          ?.checked,

      freshInfo:
        !!dom.freshInfoToggle
          ?.checked
    };

    storageSet(
      APP.storage.settings,
      state.settings
    );

    closeModal(
      "settingsModal"
    );

    toast(
      "Ayarlar kaydedildi.",
      "success"
    );
  }

  function resetSettings() {
    state.settings = {
      enterToSend: true,
      draftSave: true,
      autoSpeak: false,
      freshInfo: true
    };

    syncSettingsUI();

    storageSet(
      APP.storage.settings,
      state.settings
    );

    toast(
      "Ayarlar sıfırlandı.",
      "success"
    );
  }

  /* =========================================================
     CONNECTION
     ========================================================= */

  function updateConnection() {
    state.connected =
      navigator.onLine;

    if (
      dom.connectionText
    ) {
      dom.connectionText.textContent =
        state.connected
          ? "Bağlı"
          : "Çevrimdışı";
    }

    dom.connectionDot?.classList.toggle(
      "offline",
      !state.connected
    );
  }

  /* =========================================================
     EVENT SYSTEM
     ========================================================= */

  function bindEvents() {
    /*
      Merkezi click sistemi.
      Bir butonun kendi listener'ı hata verse bile
      diğer butonların çalışmasını engellemez.
    */
    document.addEventListener(
      "click",
      (event) => {
        const target =
          event.target.closest(
            "button, a, [data-panel], [data-mobile-panel], [data-action]"
          );

        if (!target) return;

        const panel =
          target.dataset.panel ||
          target.dataset.mobilePanel;

        if (panel) {
          event.preventDefault();

          openPanel(
            panel
          );

          return;
        }

        const action =
          target.dataset.action;

        if (
          action ===
          "new-chat"
        ) {
          event.preventDefault();
          newChat();
          return;
        }

        if (
          action ===
          "settings"
        ) {
          event.preventDefault();

          openModal(
            "settingsModal"
          );

          return;
        }

        if (
          action ===
          "account"
        ) {
          event.preventDefault();

          openModal(
            "accountModal"
          );

          return;
        }

        if (
          action ===
          "close-modal"
        ) {
          event.preventDefault();

          const id =
            target.dataset.modal;

          if (id) {
            closeModal(id);
          }

          return;
        }

        const messageAction =
          target.dataset
            .messageAction;

        if (
          messageAction
        ) {
          event.preventDefault();

          handleMessageAction(
            messageAction,
            target.dataset
              .messageId
          );

          return;
        }

        const removeAttachment =
          target.dataset
            .removeAttachment;

        if (
          removeAttachment !==
          undefined
        ) {
          event.preventDefault();

          state.attachments.splice(
            Number(
              removeAttachment
            ),
            1
          );

          renderAttachments();

          return;
        }

        const command =
          target.dataset
            .commandIndex;

        if (
          command !==
          undefined
        ) {
          event.preventDefault();

          const query =
            dom.commandInput
              ?.value || "";

          const filtered =
            COMMANDS.filter(
              ([
                title,
                description
              ]) =>
                !query ||
                `${title} ${description}`
                  .toLocaleLowerCase(
                    "tr-TR"
                  )
                  .includes(
                    query
                      .toLocaleLowerCase(
                        "tr-TR"
                      )
                  )
            );

          const selected =
            filtered[
              Number(command)
            ];

          if (selected) {
            closeModal(
              "commandCenter"
            );

            selected[3]();
          }

          return;
        }

        const searchMessageId =
          target.dataset
            .searchMessageId;

        if (
          searchMessageId
        ) {
          const message =
            state.messages.find(
              (item) =>
                item.id ===
                searchMessageId
            );

          closeModal(
            "chatSearchPanel"
          );

          if (message) {
            document
              .querySelector(
                `[data-message-id="${CSS.escape(
                  message.id
                )}"]`
              )
              ?.scrollIntoView({
                behavior:
                  "smooth",
                block:
                  "center"
              });
          }

          return;
        }

        const planId =
          target.dataset
            .planId;

        if (planId) {
          event.preventDefault();

          if (
            planId ===
            "free"
          ) {
            toast(
              "Free plan aktif.",
              "info"
            );
          } else {
            toast(
              `${planId} planı seçildi.`,
              "info"
            );
          }

          return;
        }

        if (
          target.classList.contains(
            "code-copy-button"
          )
        ) {
          const raw =
            target.dataset.code ||
            "";

          let code =
            raw;

          try {
            code =
              decodeURIComponent(
                raw
              );
          } catch {}

          navigator.clipboard
            ?.writeText(code)
            .then(() => {
              toast(
                "Kod kopyalandı.",
                "success"
              );
            })
            .catch(() => {
              toast(
                "Kod kopyalanamadı.",
                "error"
              );
            });

          return;
        }
      }
    );

    dom.sendButton?.addEventListener(
      "click",
      () => {
        if (state.sending) {
          stopGeneration();
        } else {
          sendMessage();
        }
      }
    );

    dom.stopButton?.addEventListener(
      "click",
      stopGeneration
    );

    dom.voiceButton?.addEventListener(
      "click",
      startVoice
    );

    dom.voiceCancelButton?.addEventListener(
      "click",
      stopVoice
    );

    dom.sidebarToggle?.addEventListener(
      "click",
      toggleSidebar
    );

    dom.mobileSidebarClose?.addEventListener(
      "click",
      closeSidebarMobile
    );

    dom.newChatButton?.addEventListener(
      "click",
      newChat
    );

    dom.quickResearchButton?.addEventListener(
      "click",
      () =>
        openPanel(
          "research"
        )
    );

    dom.quickMemoryButton?.addEventListener(
      "click",
      () =>
        openPanel(
          "memory"
        )
    );

    dom.quickFilesButton?.addEventListener(
      "click",
      () =>
        openPanel(
          "files"
        )
    );

    dom.settingsButton?.addEventListener(
      "click",
      () =>
        openModal(
          "settingsModal"
        )
    );

    dom.topSettingsButton?.addEventListener(
      "click",
      () =>
        openModal(
          "settingsModal"
        )
    );

    dom.accountButton?.addEventListener(
      "click",
      () =>
        openModal(
          "accountModal"
        )
    );

    dom.topAccountButton?.addEventListener(
      "click",
      () =>
        openModal(
          "accountModal"
        )
    );

    dom.searchButton?.addEventListener(
      "click",
      () =>
        openModal(
          "chatSearchPanel"
        )
    );

    dom.notificationButton?.addEventListener(
      "click",
      () =>
        openPanel(
          "notifications"
        )
    );

    dom.researchToolButton?.addEventListener(
      "click",
      () =>
        openPanel(
          "research"
        )
    );

    dom.weatherToolButton?.addEventListener(
      "click",
      () =>
        openPanel(
          "weather"
        )
    );

    dom.memoryToolButton?.addEventListener(
      "click",
      () =>
        openPanel(
          "memory"
        )
    );

    dom.imageToolButton?.addEventListener(
      "click",
      () =>
        openModal(
          "imageCreateModal"
        )
    );

    dom.videoToolButton?.addEventListener(
      "click",
      () =>
        openModal(
          "videoModal"
        )
    );

    dom.openImageModalButton?.addEventListener(
      "click",
      () =>
        openModal(
          "imageCreateModal"
        )
    );

    dom.openVideoModalButton?.addEventListener(
      "click",
      () =>
        openModal(
          "videoModal"
        )
    );

    dom.attachmentButton?.addEventListener(
      "click",
      () =>
        dom.globalFilePicker?.click()
    );

    dom.fileSelectButton?.addEventListener(
      "click",
      () =>
        dom.globalFilePicker?.click()
    );

    dom.globalFilePicker?.addEventListener(
      "change",
      (event) => {
        uploadFiles(
          event.target.files
        );
      }
    );

    dom.messageInput?.addEventListener(
      "input",
      () => {
        resizeComposer();
        updateComposerInfo();
        saveDraft();
      }
    );

    dom.messageInput?.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key !==
          "Enter"
        ) {
          return;
        }

        if (
          event.shiftKey
        ) {
          return;
        }

        if (
          event.isComposing
        ) {
          return;
        }

        if (
          !state.settings
            .enterToSend
        ) {
          return;
        }

        event.preventDefault();

        if (state.sending) {
          stopGeneration();
        } else {
          sendMessage();
        }
      }
    );

    dom.researchRunButton?.addEventListener(
      "click",
      runResearch
    );

    dom.researchClearButton?.addEventListener(
      "click",
      () => {
        if (
          dom.researchInput
        ) {
          dom.researchInput.value =
            "";
        }

        if (
          dom.researchResults
        ) {
          dom.researchResults.innerHTML = `
            <div class="empty-state">
              Araştırma sonucu burada görünecek.
            </div>
          `;
        }

        if (
          dom.researchStatus
        ) {
          dom.researchStatus.textContent =
            "Hazır.";
        }
      }
    );

    dom.researchInput?.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key ===
          "Enter"
        ) {
          event.preventDefault();
          runResearch();
        }
      }
    );

    dom.weatherRunButton?.addEventListener(
      "click",
      runWeather
    );

    dom.weatherInput?.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key ===
          "Enter"
        ) {
          event.preventDefault();
          runWeather();
        }
      }
    );

    dom.memorySearchButton?.addEventListener(
      "click",
      searchMemory
    );

    dom.memoryOverviewButton?.addEventListener(
      "click",
      loadMemoryOverview
    );

    dom.memorySaveCurrentButton?.addEventListener(
      "click",
      saveConversationToMemory
    );

    dom.memoryInput?.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key ===
          "Enter"
        ) {
          event.preventDefault();
          searchMemory();
        }
      }
    );

    dom.refreshFilesButton?.addEventListener(
      "click",
      loadFiles
    );

    dom.generateImageButton?.addEventListener(
      "click",
      generateImage
    );

    dom.generateVideoButton?.addEventListener(
      "click",
      generateVideo
    );

    dom.refreshSystemButton?.addEventListener(
      "click",
      loadSystem
    );

    dom.markNotificationsReadButton?.addEventListener(
      "click",
      markNotificationsRead
    );

    dom.saveSettingsButton?.addEventListener(
      "click",
      saveSettings
    );

    dom.resetSettingsButton?.addEventListener(
      "click",
      resetSettings
    );

    dom.loginButton?.addEventListener(
      "click",
      () => {
        closeModal(
          "accountModal"
        );

        openModal(
          "authModal"
        );
      }
    );

    dom.logoutButton?.addEventListener(
      "click",
      logout
    );

    dom.guestLoginButton?.addEventListener(
      "click",
      guestLogin
    );

    dom.authForm?.addEventListener(
      "submit",
      (event) => {
        event.preventDefault();
        login();
      }
    );

    dom.accountPlansButton?.addEventListener(
      "click",
      () => {
        closeModal(
          "accountModal"
        );

        openPanel(
          "plans"
        );
      }
    );

    dom.commandInput?.addEventListener(
      "input",
      () => {
        commandIndex = 0;

        renderCommands(
          dom.commandInput.value
        );
      }
    );

    dom.commandInput?.addEventListener(
      "keydown",
      (event) => {
        const count =
          dom.commandList
            ?.querySelectorAll(
              ".command-item"
            )
            .length || 0;

        if (!count) {
          return;
        }

        if (
          event.key ===
          "ArrowDown"
        ) {
          event.preventDefault();

          commandIndex =
            Math.min(
              commandIndex + 1,
              count - 1
            );

          renderCommands(
            dom.commandInput
              .value
          );
        }

        if (
          event.key ===
          "ArrowUp"
        ) {
          event.preventDefault();

          commandIndex =
            Math.max(
              commandIndex - 1,
              0
            );

          renderCommands(
            dom.commandInput
              .value
          );
        }

        if (
          event.key ===
          "Enter"
        ) {
          event.preventDefault();

          dom.commandList
            ?.querySelector(
              `[data-command-index="${commandIndex}"]`
            )
            ?.click();
        }
      }
    );

    dom.chatSearchInput?.addEventListener(
      "input",
      () =>
        searchCurrentChat(
          dom.chatSearchInput.value
        )
    );

    dom.modelSelect?.addEventListener(
      "change",
      () => {
        state.model =
          dom.modelSelect.value ||
          "auto";

        storageSet(
          APP.storage.model,
          state.model
        );
      }
    );

    window.addEventListener(
      "online",
      () => {
        updateConnection();

        toast(
          "İnternet bağlantısı geri geldi.",
          "success"
        );
      }
    );

    window.addEventListener(
      "offline",
      () => {
        updateConnection();

        toast(
          "İnternet bağlantısı kesildi.",
          "warning"
        );
      }
    );

    document.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key ===
          "Escape"
        ) {
          if (state.recording) {
            stopVoice();
          } else {
            closeAllModals();
          }

          return;
        }

        const modifier =
          event.ctrlKey ||
          event.metaKey;

        if (!modifier) {
          return;
        }

        const key =
          event.key.toLowerCase();

        if (
          key === "k"
        ) {
          event.preventDefault();
          openCommandCenter();
        }

        if (
          key === "f"
        ) {
          event.preventDefault();

          openModal(
            "chatSearchPanel"
          );
        }

        if (
          key === "n"
        ) {
          event.preventDefault();

          newChat();
        }

        if (
          key === "b"
        ) {
          event.preventDefault();

          toggleSidebar();
        }
      }
    );

    document.addEventListener(
      "click",
      (event) => {
        const close =
          event.target.closest(
            "[data-close-modal]"
          );

        if (!close) {
          return;
        }

        const id =
          close.dataset
            .closeModal;

        if (id) {
          closeModal(id);
        }
      }
    );

    /*
      Drag & drop
    */
    if (
      dom.fileDropZone
    ) {
      dom.fileDropZone.addEventListener(
        "dragover",
        (event) => {
          event.preventDefault();

          dom.dropOverlay?.classList.remove(
            "hidden"
          );
        }
      );

      dom.fileDropZone.addEventListener(
        "dragleave",
        () => {
          dom.dropOverlay?.classList.add(
            "hidden"
          );
        }
      );

      dom.fileDropZone.addEventListener(
        "drop",
        (event) => {
          event.preventDefault();

          dom.dropOverlay?.classList.add(
            "hidden"
          );

          uploadFiles(
            event.dataTransfer
              ?.files
          );
        }
      );
    }

    window.addEventListener(
      "beforeunload",
      () => {
        saveDraft();
        saveChats();
      }
    );
  }

  /* =========================================================
     MESAJ ACTION
     ========================================================= */

  async function handleMessageAction(
    action,
    messageId
  ) {
    const message =
      state.messages.find(
        (item) =>
          item.id ===
          messageId
      );

    if (!message) return;

    if (
      action === "copy"
    ) {
      try {
        await navigator.clipboard.writeText(
          message.content
        );

        toast(
          "Mesaj kopyalandı.",
          "success"
        );
      } catch {
        toast(
          "Mesaj kopyalanamadı.",
          "error"
        );
      }
    }

    if (
      action === "speak"
    ) {
      speakText(
        message.content
      );
    }

    if (
      action === "memory"
    ) {
      await saveMemory(
        message.content,
        "chat"
      );
    }
  }

  /* =========================================================
     INIT
     ========================================================= */

  async function init() {
    cacheDOM();

    /*
      Ayarlar önce yükleniyor.
    */
    loadSettings();

    /*
      Event'ler hemen bağlanıyor.
      Ağ istekleri sonra başlıyor.
    */
    bindEvents();

    loadDraft();

    resizeComposer();
    updateComposerInfo();
    updateConnection();

    renderMessages();
    renderAttachments();

    openPanel("chat");

    /*
      Sayfa açılışındaki endpointlerden biri
      hata verse diğerleri çalışmaya devam eder.
    */
    await Promise.allSettled([
      loadAccount(),
      loadPlans(),
      loadFiles(),
      loadNotifications(),
      loadSystem()
    ]);

    state.ready =
      true;

    console.log(
      "%cTürkAI Frontend 42.0 hazır.",
      "font-weight:700"
    );

    console.log(
      "Send:",
      !!dom.sendButton
    );

    console.log(
      "Input:",
      !!dom.messageInput
    );

    console.log(
      "Chat:",
      !!dom.chatView
    );
  }

  /* =========================================================
     GLOBAL API
     ========================================================= */

  window.TURKAI = {
    version:
      APP.version,

    state,

    config:
      APP,

    api,

    sendMessage,
    stopGeneration,

    newChat,

    openPanel,
    openModal,
    closeModal,
    closeAllModals,

    runResearch,
    runWeather,

    searchMemory,
    saveMemory,

    loadFiles,
    uploadFiles,

    loadPlans,

    loadNotifications,

    loadSystem,

    loadAccount,

    speakText,
    stopSpeaking,

    startVoice,
    stopVoice,

    generateImage,
    generateVideo,

    renderMessages
  };

  /*
    Tek bootstrap.
  */
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
