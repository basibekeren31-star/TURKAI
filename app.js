"use strict";

/* =========================================================
   TÜRKAI 40.0
   PREMIUM FRONTEND ENGINE
   PART 1 / 2
   ========================================================= */

(() => {

  /* =======================================================
     ÇİFT YÜKLENME KORUMASI
     ======================================================= */

  if (window.__TURKAI_40_FRONTEND__) {
    console.warn("[TürkAI] app.js zaten yüklendi.");
    return;
  }

  window.__TURKAI_40_FRONTEND__ = true;


  /* =======================================================
     CONFIG
     ======================================================= */

  const CONFIG = Object.freeze({

    version: "40.0.0",

    api: {
      chat: "/api/chat",
      smartChat: "/api/chat/smart",

      health: "/api/health",
      systemStatus: "/api/system/status",

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
      fileUpload: "/api/files/upload",

      notifications: "/api/notifications",

      image: "/api/media/image",
      video: "/api/media/video",

      voiceTTS: "/api/voice/tts",
      voiceSTT: "/api/voice/stt",

      adminUnlock: "/api/security/admin/unlock"
    },

    storage: {
      draft: "turkai40_draft",
      settings: "turkai40_settings",
      guest: "turkai40_guest",
      chats: "turkai40_chats",
      model: "turkai40_model"
    },

    request: {
      timeout: 60000
    },

    chat: {
      maxMessages: 100,
      maxContextMessages: 20,
      maxInputLength: 20000
    }

  });


  /* =======================================================
     STATE
     ======================================================= */

  const state = {

    initialized: false,

    connected: false,

    sending: false,

    recording: false,

    speaking: false,

    researching: false,

    loading: false,

    sidebarOpen: true,

    panelOpen: false,

    activePanel: "chat",

    activeModal: null,

    conversationId: null,

    messages: [],

    attachments: [],

    searchResults: [],

    notifications: [],

    files: [],

    plans: [],

    account: null,

    system: null,

    memoryResults: [],

    adminUnlocked: false,

    recognition: null,

    abortController: null,

    settings: {
      enterSend: true,
      draftSave: true,
      autoSpeak: false,
      freshInfo: true
    },

    selectedModel: "auto",

    commandIndex: 0

  };


  /* =======================================================
     DOM CACHE
     ======================================================= */

  const el = {};

  function cacheDOM() {

    const ids = [

      "appShell",
      "sidebar",
      "mainWorkspace",
      "topbar",
      "workspace",

      "sidebarToggle",
      "mobileSidebarClose",

      "newChatButton",

      "connectionDot",
      "connectionText",

      "workspaceTitle",

      "searchButton",
      "notificationButton",
      "notificationBadge",
      "sidebarNotificationBadge",

      "topSettingsButton",
      "topAccountButton",

      "accountButton",

      "accountName",
      "accountPlan",
      "accountStatusDot",

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
      "globalFilePicker",

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

      "globalOverlay",
      "dropOverlay",

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

      "toastStack",
      "liveRegion"

    ];

    for (const id of ids) {
      el[id] = document.getElementById(id);
    }

    return el;
  }


  /* =======================================================
     HELPERS
     ======================================================= */

  function qs(selector, root = document) {
    return root.querySelector(selector);
  }


  function qsa(selector, root = document) {
    return [...root.querySelectorAll(selector)];
  }


  function exists(element) {
    return !!element;
  }


  function text(value) {
    return String(
      value === undefined ||
      value === null
        ? ""
        : value
    );
  }


  function escapeHTML(value) {

    return text(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }


  function formatTime(date = new Date()) {

    try {

      return new Intl.DateTimeFormat(
        "tr-TR",
        {
          hour: "2-digit",
          minute: "2-digit"
        }
      ).format(date);

    } catch {

      return "";
    }
  }


  function generateId(prefix = "tk") {

    return (
      prefix +
      "_" +
      Date.now().toString(36) +
      "_" +
      Math.random()
        .toString(36)
        .slice(2, 9)
    );
  }


  function clamp(value, min, max) {

    return Math.min(
      Math.max(value, min),
      max
    );
  }


  function sleep(ms) {

    return new Promise(resolve => {
      setTimeout(resolve, ms);
    });

  }


  /* =======================================================
     LOCAL STORAGE
     ======================================================= */

  function storageGet(key, fallback = null) {

    try {

      const raw =
        localStorage.getItem(key);

      if (raw === null) {
        return fallback;
      }

      return JSON.parse(raw);

    } catch {

      try {
        return localStorage.getItem(key) ?? fallback;
      } catch {
        return fallback;
      }

    }

  }


  function storageSet(key, value) {

    try {

      localStorage.setItem(
        key,
        JSON.stringify(value)
      );

      return true;

    } catch (error) {

      console.warn(
        "[TürkAI] Storage yazılamadı:",
        error
      );

      return false;
    }

  }


  function storageDelete(key) {

    try {

      localStorage.removeItem(key);

    } catch {}
  }


  /* =======================================================
     SETTINGS
     ======================================================= */

  function loadSettings() {

    const saved =
      storageGet(
        CONFIG.storage.settings,
        {}
      );

    state.settings = {

      ...state.settings,

      ...(saved &&
      typeof saved === "object"
        ? saved
        : {})

    };

    if (el.enterSendToggle) {
      el.enterSendToggle.checked =
        state.settings.enterSend !== false;
    }

    if (el.draftSaveToggle) {
      el.draftSaveToggle.checked =
        state.settings.draftSave !== false;
    }

    if (el.autoSpeakToggle) {
      el.autoSpeakToggle.checked =
        state.settings.autoSpeak === true;
    }

    if (el.freshInfoToggle) {
      el.freshInfoToggle.checked =
        state.settings.freshInfo !== false;
    }

  }


  function saveSettings() {

    storageSet(
      CONFIG.storage.settings,
      state.settings
    );

  }


  function bindSettings() {

    if (el.enterSendToggle) {

      el.enterSendToggle.addEventListener(
        "change",
        () => {

          state.settings.enterSend =
            el.enterSendToggle.checked;

          saveSettings();

        }
      );

    }


    if (el.draftSaveToggle) {

      el.draftSaveToggle.addEventListener(
        "change",
        () => {

          state.settings.draftSave =
            el.draftSaveToggle.checked;

          saveSettings();

        }
      );

    }


    if (el.autoSpeakToggle) {

      el.autoSpeakToggle.addEventListener(
        "change",
        () => {

          state.settings.autoSpeak =
            el.autoSpeakToggle.checked;

          saveSettings();

        }
      );

    }


    if (el.freshInfoToggle) {

      el.freshInfoToggle.addEventListener(
        "change",
        () => {

          state.settings.freshInfo =
            el.freshInfoToggle.checked;

          saveSettings();

        }
      );

    }


    if (el.saveSettingsButton) {

      el.saveSettingsButton.addEventListener(
        "click",
        () => {

          state.settings.enterSend =
            el.enterSendToggle?.checked !== false;

          state.settings.draftSave =
            el.draftSaveToggle?.checked !== false;

          state.settings.autoSpeak =
            el.autoSpeakToggle?.checked === true;

          state.settings.freshInfo =
            el.freshInfoToggle?.checked !== false;

          saveSettings();

          closeModal(
            "settingsModal"
          );

          toast(
            "Ayarlar kaydedildi",
            "Tercihler başarıyla güncellendi.",
            "success"
          );

        }
      );

    }


    if (el.resetSettingsButton) {

      el.resetSettingsButton.addEventListener(
        "click",
        () => {

          state.settings = {
            enterSend: true,
            draftSave: true,
            autoSpeak: false,
            freshInfo: true
          };

          loadSettings();
          saveSettings();

          toast(
            "Ayarlar sıfırlandı",
            "Varsayılan ayarlar geri getirildi.",
            "success"
          );

        }
      );

    }

  }


  /* =======================================================
     TOAST
     ======================================================= */

  function toast(
    title,
    message = "",
    type = "info"
  ) {

    if (!el.toastStack) {
      return;
    }

    const item =
      document.createElement("div");

    item.className =
      `toast ${type}`;

    const iconMap = {

      success: "i-check",
      error: "i-alert",
      warning: "i-alert",
      info: "i-info"

    };

    const icon =
      iconMap[type] ||
      iconMap.info;

    item.innerHTML = `

      <div class="toast-icon">
        <svg aria-hidden="true">
          <use href="#${icon}"></use>
        </svg>
      </div>

      <div class="toast-copy">

        <strong>
          ${escapeHTML(title)}
        </strong>

        ${
          message
            ? `<span>${escapeHTML(message)}</span>`
            : ""
        }

      </div>

      <button
        class="toast-close"
        type="button"
        aria-label="Bildirimi kapat"
      >
        <svg aria-hidden="true">
          <use href="#i-close"></use>
        </svg>
      </button>

    `;

    const close =
      item.querySelector(
        ".toast-close"
      );

    if (close) {

      close.addEventListener(
        "click",
        () => {
          item.remove();
        }
      );

    }

    el.toastStack.appendChild(item);

    setTimeout(
      () => {
        if (item.isConnected) {
          item.remove();
        }
      },
      5000
    );

  }


  /* =======================================================
     MODALS
     ======================================================= */

  function openModal(id) {

    const modal =
      document.getElementById(id);

    if (!modal) {
      return false;
    }

    qsa(".modal-shell").forEach(
      item => {
        if (
          item.id !== id &&
          !item.classList.contains("hidden")
        ) {
          item.classList.add("hidden");
        }
      }
    );

    modal.classList.remove("hidden");

    state.activeModal = id;

    document.body.classList.add(
      "modal-open"
    );

    return true;

  }


  function closeModal(id) {

    const modal =
      document.getElementById(id);

    if (!modal) {
      return;
    }

    modal.classList.add("hidden");

    if (state.activeModal === id) {
      state.activeModal = null;
    }

    if (
      !qsa(".modal-shell").some(
        item =>
          !item.classList.contains("hidden")
      )
    ) {

      document.body.classList.remove(
        "modal-open"
      );

    }

  }


  function closeAllModals() {

    qsa(".modal-shell").forEach(
      modal => {
        modal.classList.add("hidden");
      }
    );

    state.activeModal = null;

    document.body.classList.remove(
      "modal-open"
    );

  }


  function bindModalSystem() {

    qsa("[data-close-modal]")
      .forEach(button => {

        button.addEventListener(
          "click",
          event => {

            event.preventDefault();

            const modal =
              button.closest(
                ".modal-shell"
              );

            if (modal) {
              closeModal(modal.id);
            }

          }
        );

      });


    qsa("[data-close-command]")
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {
            closeModal(
              "commandCenter"
            );
          }
        );

      });


    qsa("[data-close-chat-search]")
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {
            closeModal(
              "chatSearchPanel"
            );
          }
        );

      });


    document.addEventListener(
      "keydown",
      event => {

        if (
          event.key === "Escape"
        ) {

          if (state.activeModal) {
            closeModal(
              state.activeModal
            );
          } else {
            closeAllPanels();
          }

        }

      }
    );

  }


  /* =======================================================
     PANEL SYSTEM
     ======================================================= */

  const panelMap = {

    chat: null,

    research: "researchPanel",

    weather: "weatherPanel",

    memory: "memoryPanel",

    files: "fileCenterPanel",

    media: "mediaPanel",

    plans: "plansPanel",

    notifications: "notificationPanel",

    system: "systemPanel"

  };


  const panelTitles = {

    chat: "Sohbet",

    research: "Araştırma",

    weather: "Hava durumu",

    memory: "Hafıza",

    files: "Dosyalar",

    media: "Medya",

    plans: "Paketler",

    notifications: "Bildirimler",

    system: "Sistem"

  };


  function openPanel(name) {

    if (
      !Object.prototype.hasOwnProperty.call(
        panelMap,
        name
      )
    ) {
      return;
    }

    if (name === "chat") {

      closeAllPanels();

      state.activePanel = "chat";

      updateNavigation();

      if (el.workspaceTitle) {
        el.workspaceTitle.textContent =
          panelTitles.chat;
      }

      return;

    }

    const panelId =
      panelMap[name];

    if (!panelId) {
      return;
    }

    qsa(".panel-view").forEach(
      panel => {
        panel.classList.remove(
          "active"
        );
      }
    );

    const panel =
      document.getElementById(panelId);

    if (!panel) {
      return;
    }

    panel.classList.add("active");

    if (el.workspacePanel) {

      el.workspacePanel.classList.add(
        "open"
      );

      el.workspacePanel.setAttribute(
        "aria-hidden",
        "false"
      );

    }

    state.panelOpen = true;
    state.activePanel = name;

    if (el.workspaceTitle) {
      el.workspaceTitle.textContent =
        panelTitles[name] || name;
    }

    updateNavigation();

    if (name === "research") {
      loadResearchPanel();
    }

    if (name === "weather") {
      focusInput(el.weatherInput);
    }

    if (name === "memory") {
      loadMemoryOverview();
    }

    if (name === "files") {
      loadFiles();
    }

    if (name === "plans") {
      loadPlans();
    }

    if (name === "notifications") {
      loadNotifications();
    }

    if (name === "system") {
      loadSystemStatus();
    }

  }


  function closeAllPanels() {

    if (el.workspacePanel) {

      el.workspacePanel.classList.remove(
        "open"
      );

      el.workspacePanel.setAttribute(
        "aria-hidden",
        "true"
      );

    }

    qsa(".panel-view").forEach(
      panel => {
        panel.classList.remove(
          "active"
        );
      }
    );

    state.panelOpen = false;
    state.activePanel = "chat";

    if (el.workspaceTitle) {
      el.workspaceTitle.textContent =
        "Sohbet";
    }

    updateNavigation();

  }


  function updateNavigation() {

    qsa(
      ".nav-item[data-panel]"
    ).forEach(button => {

      button.classList.toggle(
        "active",
        button.dataset.panel ===
          state.activePanel
      );

    });


    qsa(
      ".mobile-nav-item[data-mobile-panel]"
    ).forEach(button => {

      button.classList.toggle(
        "active",
        button.dataset.mobilePanel ===
          state.activePanel
      );

    });

  }


  function bindNavigation() {

    qsa(
      ".nav-item[data-panel]"
    ).forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const name =
            button.dataset.panel;

          openPanel(name);

          if (
            window.innerWidth <= 800
          ) {
            closeSidebar();
          }

        }
      );

    });


    qsa(
      ".mobile-nav-item[data-mobile-panel]"
    ).forEach(button => {

      button.addEventListener(
        "click",
        () => {

          openPanel(
            button.dataset.mobilePanel
          );

        }
      );

    });


    qsa(
      "[data-close-panel]"
    ).forEach(button => {

      button.addEventListener(
        "click",
        closeAllPanels
      );

    });

  }


  /* =======================================================
     SIDEBAR
     ======================================================= */

  function openSidebar() {

    if (!el.sidebar) {
      return;
    }

    el.sidebar.classList.remove(
      "mobile-closed"
    );

    el.appShell?.classList.remove(
      "sidebar-collapsed"
    );

    state.sidebarOpen = true;

  }


  function closeSidebar() {

    if (!el.sidebar) {
      return;
    }

    if (
      window.innerWidth <= 800
    ) {

      el.sidebar.classList.add(
        "mobile-closed"
      );

    } else {

      el.appShell?.classList.add(
        "sidebar-collapsed"
      );

    }

    state.sidebarOpen = false;

  }


  function toggleSidebar() {

    if (state.sidebarOpen) {
      closeSidebar();
    } else {
      openSidebar();
    }

  }


  function bindSidebar() {

    if (el.sidebarToggle) {

      el.sidebarToggle.addEventListener(
        "click",
        toggleSidebar
      );

    }


    if (el.mobileSidebarClose) {

      el.mobileSidebarClose.addEventListener(
        "click",
        closeSidebar
      );

    }

  }


  /* =======================================================
     INPUT
     ======================================================= */

  function autoResizeInput() {

    if (!el.messageInput) {
      return;
    }

    el.messageInput.style.height =
      "auto";

    const maxHeight = 190;

    el.messageInput.style.height =
      clamp(
        el.messageInput.scrollHeight,
        50,
        maxHeight
      ) + "px";

  }


  function focusInput(input) {

    if (!input) {
      return;
    }

    setTimeout(
      () => {
        try {
          input.focus();
        } catch {}
      },
      80
    );

  }


  /* =======================================================
     DRAFT
     ======================================================= */

  function saveDraft() {

    if (!state.settings.draftSave) {
      return;
    }

    if (!el.messageInput) {
      return;
    }

    storageSet(
      CONFIG.storage.draft,
      el.messageInput.value
    );

  }


  function loadDraft() {

    if (!el.messageInput) {
      return;
    }

    if (!state.settings.draftSave) {
      return;
    }

    const draft =
      storageGet(
        CONFIG.storage.draft,
        ""
      );

    if (
      typeof draft === "string" &&
      draft.length
    ) {

      el.messageInput.value =
        draft;

      autoResizeInput();

    }

  }


  /* =======================================================
     API REQUEST
     ======================================================= */

  async function apiRequest(
    url,
    options = {}
  ) {

    const controller =
      new AbortController();

    const timeout =
      setTimeout(
        () => controller.abort(),
        options.timeout ||
          CONFIG.request.timeout
      );


    const headers = {

      Accept:
        "application/json, text/plain, */*",

      "X-TurkAI-Version":
        CONFIG.version,

      "X-TurkAI-Request-ID":
        generateId("req"),

      ...(options.headers || {})

    };


    let body =
      options.body;


    if (
      body !== undefined &&
      body !== null &&
      !(body instanceof FormData) &&
      !(body instanceof Blob) &&
      !(body instanceof URLSearchParams)
    ) {

      if (
        typeof body !== "string"
      ) {

        body =
          JSON.stringify(body);

      }


      if (
        !headers["Content-Type"]
      ) {

        headers["Content-Type"] =
          "application/json; charset=UTF-8";

      }

    }


    let response;


    try {

      response =
        await fetch(
          url,
          {

            method:
              options.method ||
              "GET",

            headers,

            body,

            credentials:
              "same-origin",

            cache:
              "no-store",

            redirect:
              "follow",

            signal:
              options.signal ||
              controller.signal

          }
        );

    } catch (error) {

      if (
        error?.name ===
        "AbortError"
      ) {

        throw new Error(
          "İstek zaman aşımına uğradı veya durduruldu."
        );

      }

      throw new Error(
        "TürkAI sunucusuna bağlanılamadı."
      );

    } finally {

      clearTimeout(timeout);

    }


    const contentType =
      response.headers.get(
        "content-type"
      ) || "";


    let data = null;


    try {

      if (
        contentType.includes(
          "application/json"
        )
      ) {

        data =
          await response.json();

      } else {

        const raw =
          await response.text();

        try {

          data =
            JSON.parse(raw);

        } catch {

          data =
            raw;

        }

      }

    } catch {

      data = null;

    }


    if (!response.ok) {

      let message =
        `İstek başarısız (${response.status})`;


      if (
        data &&
        typeof data === "object"
      ) {

        message =
          data.message ||
          data.error ||
          data.details ||
          message;

      } else if (
        typeof data === "string" &&
        data.trim()
      ) {

        message =
          data.trim();

      }


      const error =
        new Error(message);

      error.status =
        response.status;

      error.data =
        data;

      throw error;

    }


    return data;

  }


  /* =======================================================
     CHAT RESPONSE PARSER
     ======================================================= */

  function extractAnswer(data) {

    if (!data) {
      return "";
    }

    if (
      typeof data === "string"
    ) {
      return data;
    }

    return String(
      data.answer ??
      data.response ??
      data.message ??
      data.text ??
      data.content ??
      data.data?.answer ??
      data.data?.response ??
      data.data?.message ??
      data.data?.text ??
      data.result?.answer ??
      data.result?.response ??
      data.result?.message ??
      ""
    );

  }


  /* =======================================================
     MARKDOWN-LITE
     ======================================================= */

  function renderRichText(value) {

    let source =
      escapeHTML(value);

    const codeBlocks = [];

    source =
      source.replace(
        /```([\w-]+)?\n?([\s\S]*?)```/g,
        (_, language, code) => {

          const token =
            `___TURKAI_CODE_${codeBlocks.length}___`;

          codeBlocks.push({
            language:
              language || "code",

            code
          });

          return token;

        }
      );


    source =
      source.replace(
        /\*\*(.+?)\*\*/g,
        "<strong>$1</strong>"
      );


    source =
      source.replace(
        /`([^`]+)`/g,
        "<code class=\"inline-code\">$1</code>"
      );


    source =
      source.replace(
        /\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
      );


    source =
      source.replace(
        /\n/g,
        "<br>"
      );


    codeBlocks.forEach(
      (block, index) => {

        const token =
          `___TURKAI_CODE_${index}___`;

        const html = `

          <div class="code-block">

            <div class="code-header">

              <span>
                ${escapeHTML(block.language)}
              </span>

              <button
                class="code-copy"
                type="button"
                data-code-copy
                data-code="${encodeURIComponent(block.code)}"
              >
                <svg aria-hidden="true">
                  <use href="#i-copy"></use>
                </svg>
                Kopyala
              </button>

            </div>

            <pre><code>${block.code}</code></pre>

          </div>

        `;

        source =
          source.replace(
            token,
            html
          );

      }
    );


    return source;

  }


  /* =======================================================
     MESSAGE RENDER
     ======================================================= */

  function renderMessages() {

    if (!el.messages) {
      return;
    }


    if (
      !state.messages.length
    ) {

      el.messages.innerHTML =
        "";

      el.welcomeState?.classList.remove(
        "hidden"
      );

      return;

    }


    el.welcomeState?.classList.add(
      "hidden"
    );


    el.messages.innerHTML =
      state.messages
        .map(
          renderMessage
        )
        .join("");


    bindMessageActions();

    scrollMessagesToBottom();

  }


  function renderMessage(message) {

    const role =
      message.role === "user"
        ? "user"
        : "assistant";


    const avatar =
      role === "user"
        ? "i-user"
        : "i-logo";


    const name =
      role === "user"
        ? "Sen"
        : "TürkAI";


    const content =
      renderRichText(
        message.content ??
        message.text ??
        ""
      );


    return `

      <article
        class="message-row ${role}"
        data-message-id="${escapeHTML(
          message.id || generateId("msg")
        )}"
      >

        <div class="message-avatar">

          <svg aria-hidden="true">
            <use href="#${avatar}"></use>
          </svg>

        </div>


        <div class="message-content">

          <div class="message-bubble">
            ${content}
          </div>


          <div class="message-meta">

            <span>
              ${name}
            </span>

            <span>·</span>

            <span>
              ${escapeHTML(
                message.time ||
                formatTime(
                  message.createdAt
                    ? new Date(message.createdAt)
                    : new Date()
                )
              )}
            </span>

          </div>


          ${
            role === "assistant"
              ? `
                <div class="message-actions">

                  <button
                    class="message-action"
                    type="button"
                    data-action="copy"
                    title="Kopyala"
                  >
                    <svg aria-hidden="true">
                      <use href="#i-copy"></use>
                    </svg>
                  </button>

                  <button
                    class="message-action"
                    type="button"
                    data-action="speak"
                    title="Seslendir"
                  >
                    <svg aria-hidden="true">
                      <use href="#i-volume"></use>
                    </svg>
                  </button>

                </div>
              `
              : ""
          }

        </div>

      </article>

    `;

  }


  function bindMessageActions() {

    qsa(
      "[data-code-copy]"
    ).forEach(button => {

      button.addEventListener(
        "click",
        async () => {

          let code = "";

          try {

            code =
              decodeURIComponent(
                button.dataset.code || ""
              );

          } catch {

            code =
              button.dataset.code || "";

          }


          try {

            await navigator.clipboard.writeText(
              code
            );

            toast(
              "Kod kopyalandı",
              "",
              "success"
            );

          } catch {

            toast(
              "Kopyalanamadı",
              "Tarayıcı panoya erişime izin vermedi.",
              "error"
            );

          }

        }
      );

    });


    qsa(
      ".message-action[data-action]"
    ).forEach(button => {

      button.addEventListener(
        "click",
        async () => {

          const row =
            button.closest(
              ".message-row"
            );

          if (!row) {
            return;
          }

          const id =
            row.dataset.messageId;

          const message =
            state.messages.find(
              item =>
                item.id === id
            );

          if (!message) {
            return;
          }

          const action =
            button.dataset.action;


          if (action === "copy") {

            try {

              await navigator.clipboard.writeText(
                text(message.content)
              );

              toast(
                "Mesaj kopyalandı",
                "",
                "success"
              );

            } catch {

              toast(
                "Kopyalanamadı",
                "Panoya erişilemedi.",
                "error"
              );

            }

          }


          if (action === "speak") {

            speakText(
              text(message.content)
            );

          }

        }
      );

    });

  }


  function appendMessage(message) {

    state.messages.push({

      id:
        message.id ||
        generateId("msg"),

      role:
        message.role === "user"
          ? "user"
          : "assistant",

      content:
        text(
          message.content ??
          message.text ??
          ""
        ),

      createdAt:
        message.createdAt ||
        new Date().toISOString(),

      time:
        message.time ||
        formatTime()

    });


    if (
      state.messages.length >
      CONFIG.chat.maxMessages
    ) {

      state.messages =
        state.messages.slice(
          -CONFIG.chat.maxMessages
        );

    }


    renderMessages();

  }


  function scrollMessagesToBottom() {

    if (!el.messages) {
      return;
    }

    requestAnimationFrame(
      () => {

        el.messages.scrollTop =
          el.messages.scrollHeight;

      }
    );

  }


  /* =======================================================
     SEND MESSAGE
     ======================================================= */

  async function sendMessage() {

    if (state.sending) {
      return;
    }


    if (!el.messageInput) {
      return;
    }


    const originalText =
      el.messageInput.value;


    const message =
      originalText.trim();


    if (!message) {

      focusInput(
        el.messageInput
      );

      return;

    }


    if (
      message.length >
      CONFIG.chat.maxInputLength
    ) {

      toast(
        "Mesaj çok uzun",
        `En fazla ${CONFIG.chat.maxInputLength.toLocaleString("tr-TR")} karakter kullanabilirsin.`,
        "warning"
      );

      return;

    }


    /* -----------------------------------------------
       SLASH KOMUTU
       ----------------------------------------------- */

    const slashHandled =
      await handleSlashCommand(
        message
      );

    if (slashHandled) {

      el.messageInput.value = "";

      autoResizeInput();

      saveDraft();

      return;

    }


    /* -----------------------------------------------
       STATE
       ----------------------------------------------- */

    state.sending = true;
    state.loading = true;


    if (el.sendButton) {

      el.sendButton.disabled =
        true;

      el.sendButton.innerHTML = `

        <svg aria-hidden="true">
          <use href="#i-stop"></use>
        </svg>

      `;

    }


    el.stopButton?.classList.remove(
      "hidden"
    );


    el.typingIndicator?.classList.remove(
      "hidden"
    );


    el.welcomeState?.classList.add(
      "hidden"
    );


    const userMessage = {

      id:
        generateId("user"),

      role:
        "user",

      content:
        message,

      createdAt:
        new Date().toISOString(),

      time:
        formatTime()

    };


    state.messages.push(
      userMessage
    );


    renderMessages();


    /* -----------------------------------------------
       İSTEK HAZIRLA
       ----------------------------------------------- */

    const contextMessages =
      state.messages
        .slice(
          -CONFIG.chat.maxContextMessages
        )
        .map(
          item => ({

            role:
              item.role,

            content:
              text(
                item.content
              )

          })
        );


    const payload = {

      message,

      text:
        message,

      model:
        state.selectedModel,

      mode:
        state.selectedModel,

      conversationId:
        state.conversationId,

      conversation_id:
        state.conversationId,

      messages:
        contextMessages,

      attachments:
        state.attachments.map(
          item => ({
            id:
              item.id,
            name:
              item.name,
            url:
              item.url
          })
        ),

      options: {

        freshInfo:
          state.settings.freshInfo,

        autoMode:
          state.selectedModel ===
          "auto"

      }

    };


    try {

      let result;


      /* -------------------------------------------
         ÖNCE SMART CHAT
         ------------------------------------------- */

      try {

        result =
          await apiRequest(
            CONFIG.api.smartChat,
            {
              method:
                "POST",

              body:
                payload,

              signal:
                state.abortController
                  ?.signal

            }
          );

      } catch (smartError) {

        console.warn(
          "[TürkAI] /api/chat/smart başarısız:",
          smartError
        );


        /* -----------------------------------------
           NORMAL CHAT FALLBACK
           ----------------------------------------- */

        if (
          smartError?.status === 404 ||
          smartError?.status === 405
        ) {

          result =
            await apiRequest(
              CONFIG.api.chat,
              {

                method:
                  "POST",

                body:
                  payload,

                signal:
                  state.abortController
                    ?.signal

              }
            );

          } else {

            throw smartError;

          }

        }


      /* -------------------------------------------
         CEVAP
         ------------------------------------------- */

      const answer =
        extractAnswer(
          result
        );


      if (!answer) {

        throw new Error(
          "Sunucu boş TürkAI cevabı döndürdü."
        );

      }


      const assistantMessage = {

        id:
          generateId("assistant"),

        role:
          "assistant",

        content:
          answer,

        createdAt:
          new Date().toISOString(),

        time:
          formatTime(),

        model:
          result?.model ||
          result?.provider ||
          "TürkAI"

      };


      state.messages.push(
        assistantMessage
      );


      if (
        result?.conversationId
      ) {

        state.conversationId =
          result.conversationId;

      }


      if (
        result?.conversation_id
      ) {

        state.conversationId =
          result.conversation_id;

      }


      renderMessages();


      /* -------------------------------------------
         KRİTİK:
         SADECE BAŞARILI CEVAPTAN SONRA TEMİZLE
         ------------------------------------------- */

      el.messageInput.value =
        "";

      autoResizeInput();

      storageDelete(
        CONFIG.storage.draft
      );


      updateUsageInfo(
        result
      );


      if (
        state.settings.autoSpeak
      ) {

        speakText(
          answer
        );

      }


    } catch (error) {

      console.error(
        "[TürkAI] MESAJ GÖNDERME HATASI:",
        error
      );


      /* -------------------------------------------
         HATA OLURSA INPUT KORUNUR
         ------------------------------------------- */

      el.messageInput.value =
        originalText;

      autoResizeInput();

      saveDraft();


      toast(
        "Mesaj gönderilemedi",
        error?.message ||
          "Sunucudan beklenmeyen bir hata geldi.",
        "error"
      );


    } finally {

      state.sending = false;
      state.loading = false;


      el.typingIndicator?.classList.add(
        "hidden"
      );


      el.stopButton?.classList.add(
        "hidden"
      );


      if (el.sendButton) {

        el.sendButton.disabled =
          false;

        el.sendButton.innerHTML = `

          <svg aria-hidden="true">
            <use href="#i-send"></use>
          </svg>

        `;

      }


      state.abortController =
        null;


      focusInput(
        el.messageInput
      );

    }

  }


  /* =======================================================
     STOP
     ======================================================= */

  function stopGeneration() {

    if (
      state.abortController
    ) {

      try {
        state.abortController.abort();
      } catch {}

    }

    state.abortController =
      null;

    state.sending = false;
    state.loading = false;


    el.typingIndicator?.classList.add(
      "hidden"
    );

    el.stopButton?.classList.add(
      "hidden"
    );


    if (el.sendButton) {

      el.sendButton.disabled =
        false;

      el.sendButton.innerHTML = `

        <svg aria-hidden="true">
          <use href="#i-send"></use>
        </svg>

      `;

    }


    toast(
      "Yanıt durduruldu",
      "",
      "warning"
    );

  }


  /* =======================================================
     USAGE INFO
     ======================================================= */

  function updateUsageInfo(data) {

    if (!el.composerTokenInfo) {
      return;
    }


    const usage =
      data?.usage ??
      data?.data?.usage ??
      null;


    if (!usage) {

      el.composerTokenInfo.textContent =
        "Hazır";

      return;

    }


    if (
      typeof usage === "object"
    ) {

      const used =
        usage.used ??
        usage.messages ??
        null;

      const limit =
        usage.limit ??
        null;


      if (
        used !== null &&
        limit !== null
      ) {

        el.composerTokenInfo.textContent =
          `${used} / ${limit}`;

        return;

      }

    }


    el.composerTokenInfo.textContent =
      "Hazır";

  }


  /* =======================================================
     SEND EVENTS
     ======================================================= */

  function bindChat() {

    if (!el.sendButton) {
      console.error(
        "[TürkAI] sendButton bulunamadı."
      );
    }


    if (!el.messageInput) {
      console.error(
        "[TürkAI] messageInput bulunamadı."
      );
    }


    /* ---------------------------------------------
       GÖNDER BUTTON
       --------------------------------------------- */

    if (
      el.sendButton &&
      el.sendButton.dataset.bound !== "1"
    ) {

      el.sendButton.dataset.bound =
        "1";


      el.sendButton.addEventListener(
        "click",
        event => {

          event.preventDefault();
          event.stopPropagation();

          if (state.sending) {

            stopGeneration();

            return;

          }

          state.abortController =
            new AbortController();

          sendMessage();

        }
      );

    }


    /* ---------------------------------------------
       STOP BUTTON
       --------------------------------------------- */

    if (el.stopButton) {

      el.stopButton.addEventListener(
        "click",
        event => {

          event.preventDefault();

          stopGeneration();

        }
      );

    }


    /* ---------------------------------------------
       ENTER
       --------------------------------------------- */

    if (
      el.messageInput &&
      el.messageInput.dataset.bound !== "1"
    ) {

      el.messageInput.dataset.bound =
        "1";


      el.messageInput.addEventListener(
        "keydown",
        event => {

          if (
            event.key !== "Enter"
          ) {
            return;
          }


          if (
            event.shiftKey
          ) {
            return;
          }


          if (
            !state.settings.enterSend
          ) {
            return;
          }


          event.preventDefault();
          event.stopPropagation();


          if (state.sending) {
            return;
          }


          state.abortController =
            new AbortController();


          sendMessage();

        }
      );


      el.messageInput.addEventListener(
        "input",
        () => {

          autoResizeInput();
          saveDraft();

        }
      );

    }


    /* ---------------------------------------------
       QUICK CARDS
       --------------------------------------------- */

    qsa(
      ".quick-card[data-prompt]"
    ).forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const prompt =
            button.dataset.prompt ||
            "";

          if (!prompt) {
            return;
          }

          el.messageInput.value =
            prompt;

          autoResizeInput();

          focusInput(
            el.messageInput
          );

        }
      );

    });


    /* ---------------------------------------------
       NEW CHAT
       --------------------------------------------- */

    if (el.newChatButton) {

      el.newChatButton.addEventListener(
        "click",
        createNewChat
      );

    }

  }


  /* =======================================================
     NEW CHAT
     ======================================================= */

  function createNewChat() {

    state.messages = [];

    state.attachments = [];

    state.conversationId =
      null;

    storageDelete(
      CONFIG.storage.draft
    );


    if (el.messageInput) {

      el.messageInput.value =
        "";

      autoResizeInput();

    }


    closeAllPanels();

    renderMessages();

    focusInput(
      el.messageInput
    );


    toast(
      "Yeni sohbet hazır",
      "Temiz bir çalışma alanı açıldı.",
      "success"
    );

  }


  /* =======================================================
     SLASH COMMANDS
     ======================================================= */

  async function handleSlashCommand(
    value
  ) {

    const input =
      value.trim();


    if (
      !input.startsWith("/")
    ) {

      return false;

    }


    const parts =
      input
        .slice(1)
        .trim()
        .split(/\s+/);


    const command =
      (
        parts.shift() ||
        ""
      ).toLowerCase();


    const argument =
      parts.join(" ").trim();


    switch (command) {

      case "new":

        createNewChat();

        return true;


      case "research":

        openPanel(
          "research"
        );

        if (
          argument &&
          el.researchInput
        ) {

          el.researchInput.value =
            argument;

          runResearch(
            argument
          );

        }

        return true;


      case "weather":

        openPanel(
          "weather"
        );

        if (
          argument &&
          el.weatherInput
        ) {

          el.weatherInput.value =
            argument;

          runWeather(
            argument
          );

        }

        return true;


      case "memory":

        openPanel(
          "memory"
        );

        if (
          argument &&
          el.memoryInput
        ) {

          el.memoryInput.value =
            argument;

          searchMemory(
            argument
          );

        }

        return true;


      case "files":

        openPanel(
          "files"
        );

        return true;


      case "image":

        openModal(
          "imageCreateModal"
        );

        if (
          argument &&
          el.imagePromptInput
        ) {

          el.imagePromptInput.value =
            argument;

        }

        focusInput(
          el.imagePromptInput
        );

        return true;


      case "video":

        openModal(
          "videoModal"
        );

        if (
          argument &&
          el.videoPromptInput
        ) {

          el.videoPromptInput.value =
            argument;

        }

        focusInput(
          el.videoPromptInput
        );

        return true;


      case "plans":

        openPanel(
          "plans"
        );

        return true;


      case "settings":

        openModal(
          "settingsModal"
        );

        return true;


      case "system":

        openPanel(
          "system"
        );

        return true;


      case "help":

        openModal(
          "commandHelpModal"
        );

        return true;


      default:

        return false;

    }

  }


  /* =======================================================
     SPEECH SYNTHESIS
     ======================================================= */

  function speakText(value) {

    const content =
      text(value).trim();


    if (!content) {
      return;
    }


    if (
      !("speechSynthesis" in window)
    ) {

      toast(
        "Ses desteklenmiyor",
        "Tarayıcın seslendirmeyi desteklemiyor.",
        "warning"
      );

      return;

    }


    try {

      window.speechSynthesis.cancel();


      const utterance =
        new SpeechSynthesisUtterance(
          content
        );


      utterance.lang =
        "tr-TR";

      utterance.rate =
        0.94;

      utterance.pitch =
        1;

      utterance.volume =
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
        "[TürkAI] TTS hatası:",
        error
      );

    }

  }


  /* =======================================================
     VOICE INPUT
     ======================================================= */

  function initSpeechRecognition() {

    const Recognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;


    if (!Recognition) {

      console.warn(
        "[TürkAI] SpeechRecognition desteklenmiyor."
      );

      return null;

    }


    const recognition =
      new Recognition();


    recognition.lang =
      "tr-TR";

    recognition.continuous =
      false;

    recognition.interimResults =
      false;

    recognition.maxAlternatives =
      1;


    recognition.onstart =
      () => {

        state.recording =
          true;

        el.voiceButton?.classList.add(
          "recording"
        );

        showVoiceStatus(
          "Dinliyorum",
          "Konuşmaya başlayabilirsin."
        );

      };


    recognition.onresult =
      event => {

        const result =
          event.results?.[0]?.[0];

        const transcript =
          result?.transcript ||
          "";


        if (
          el.messageInput &&
          transcript
        ) {

          el.messageInput.value =
            transcript;

          autoResizeInput();

          focusInput(
            el.messageInput
          );

        }

      };


    recognition.onerror =
      event => {

        console.warn(
          "[TürkAI] Ses tanıma:",
          event.error
        );

        toast(
          "Ses tanıma hatası",
          event.error || "Bilinmeyen ses hatası.",
          "error"
        );

      };


    recognition.onend =
      () => {

        state.recording =
          false;

        el.voiceButton?.classList.remove(
          "recording"
        );

        hideVoiceStatus();

      };


    return recognition;

  }


  function toggleVoiceInput() {

    if (
      state.recording
    ) {

      try {
        state.recognition?.stop();
      } catch {}

      return;

    }


    if (
      !state.recognition
    ) {

      state.recognition =
        initSpeechRecognition();

    }


    if (
      !state.recognition
    ) {

      toast(
        "Sesli giriş kullanılamıyor",
        "Bu tarayıcı Speech Recognition desteklemiyor.",
        "warning"
      );

      return;

    }


    try {

      if (
        "speechSynthesis" in window
      ) {

        window.speechSynthesis.cancel();

      }

      state.recognition.start();

    } catch (error) {

      console.error(
        "[TürkAI] Mikrofon başlatılamadı:",
        error
      );

    }

  }


  function showVoiceStatus(
    title,
    message
  ) {

    if (!el.voiceStatus) {
      return;
    }

    el.voiceStatus.classList.remove(
      "hidden"
    );

    if (el.voiceStatusTitle) {
      el.voiceStatusTitle.textContent =
        title;
    }

    if (el.voiceStatusText) {
      el.voiceStatusText.textContent =
        message;
    }

  }


  function hideVoiceStatus() {

    el.voiceStatus?.classList.add(
      "hidden"
    );

  }


  /* =======================================================
     BOOTSTRAP PART 1
     ======================================================= */

  function bootstrapPart1() {

    cacheDOM();

    loadSettings();

    bindModalSystem();

    bindNavigation();

    bindSidebar();

    bindSettings();

    bindChat();


    if (el.voiceButton) {

      el.voiceButton.addEventListener(
        "click",
        toggleVoiceInput
      );

    }


    if (el.voiceCancelButton) {

      el.voiceCancelButton.addEventListener(
        "click",
        () => {

          try {
            state.recognition?.stop();
          } catch {}

          hideVoiceStatus();

        }
      );

    }


    if (el.topSettingsButton) {

      el.topSettingsButton.addEventListener(
        "click",
        () => {
          openModal(
            "settingsModal"
          );
        }
      );

    }


    if (el.settingsButton) {

      el.settingsButton.addEventListener(
        "click",
        () => {
          openModal(
            "settingsModal"
          );
        }
      );

    }


    if (el.mobileSettingsButton) {

      el.mobileSettingsButton.addEventListener(
        "click",
        () => {

          openModal(
            "settingsModal"
          );

        }
      );

    }


    if (el.accountButton) {

      el.accountButton.addEventListener(
        "click",
        () => {

          openModal(
            "accountModal"
          );

          loadAccount();

        }
      );

    }


    if (el.topAccountButton) {

      el.topAccountButton.addEventListener(
        "click",
        () => {

          openModal(
            "accountModal"
          );

          loadAccount();

        }
      );

    }


    if (el.searchButton) {

      el.searchButton.addEventListener(
        "click",
        () => {

          openModal(
            "chatSearchPanel"
          );

          focusInput(
            el.chatSearchInput
          );

        }
      );

    }


    if (el.notificationButton) {

      el.notificationButton.addEventListener(
        "click",
        () => {

          openPanel(
            "notifications"
          );

        }
      );

    }


    if (el.researchToolButton) {

      el.researchToolButton.addEventListener(
        "click",
        () => {

          openPanel(
            "research"
          );

        }
      );

    }


    if (el.weatherToolButton) {

      el.weatherToolButton.addEventListener(
        "click",
        () => {

          openPanel(
            "weather"
          );

        }
      );

    }


    if (el.memoryToolButton) {

      el.memoryToolButton.addEventListener(
        "click",
        () => {

          openPanel(
            "memory"
          );

        }
      );

    }


    if (el.imageToolButton) {

      el.imageToolButton.addEventListener(
        "click",
        () => {

          openModal(
            "imageCreateModal"
          );

          focusInput(
            el.imagePromptInput
          );

        }
      );

    }


    if (el.videoToolButton) {

      el.videoToolButton.addEventListener(
        "click",
        () => {

          openModal(
            "videoModal"
          );

          focusInput(
            el.videoPromptInput
          );

        }
      );

    }


    updateNavigation();

    loadDraft();

    autoResizeInput();

    renderMessages();


    state.initialized =
      true;


    console.log(
      "%cTürkAI Frontend 40.0 PART 1 hazır",
      "font-weight:800"
    );

  }


  /* =======================================================
     PART 1 GLOBAL EXPORT
     ======================================================= */

  window.TURKAI = {

    version:
      CONFIG.version,

    state,

    config:
      CONFIG,

    sendMessage,

    stopGeneration,

    createNewChat,

    openPanel,

    closeAllPanels,

    openModal,

    closeModal,

    closeAllModals,

    speakText,

    toast,

    apiRequest

  };


  /* =======================================================
     START
     ======================================================= */

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      bootstrapPart1,
      {
        once: true
      }
    );

  } else {

    bootstrapPart1();

  }

})();
/* =========================================================
   TÜRKAI 40.0
   PREMIUM FRONTEND ENGINE
   PART 2 / 2
   ========================================================= */

(() => {

  "use strict";


  /* =======================================================
     CORE
     ======================================================= */

  const CORE =
    window.TURKAI || {};

  const state =
    CORE.state || {};

  const CONFIG =
    CORE.config || {};


  const apiRequest =
    CORE.apiRequest;

  const openPanel =
    CORE.openPanel;

  const closeAllPanels =
    CORE.closeAllPanels;

  const openModal =
    CORE.openModal;

  const closeModal =
    CORE.closeModal;

  const toast =
    CORE.toast;

  const sendMessage =
    CORE.sendMessage;

  const createNewChat =
    CORE.createNewChat;


  /* =======================================================
     DOM
     ======================================================= */

  const $ = id =>
    document.getElementById(id);


  const qsa = selector =>
    [...document.querySelectorAll(selector)];


  /* =======================================================
     ELEMENTS
     ======================================================= */

  const el = {

    /* Research */
    researchInput:
      $("researchInput"),

    researchRunButton:
      $("researchRunButton"),

    researchClearButton:
      $("researchClearButton"),

    researchStatus:
      $("researchStatus"),

    researchResults:
      $("researchResults"),


    /* Weather */
    weatherInput:
      $("weatherInput"),

    weatherRunButton:
      $("weatherRunButton"),

    weatherResults:
      $("weatherResults"),


    /* Memory */
    memoryInput:
      $("memoryInput"),

    memorySearchButton:
      $("memorySearchButton"),

    memorySaveCurrentButton:
      $("memorySaveCurrentButton"),

    memoryOverviewButton:
      $("memoryOverviewButton"),

    memoryStats:
      $("memoryStats"),

    memoryResults:
      $("memoryResults"),


    /* Files */
    attachmentButton:
      $("attachmentButton"),

    fileSelectButton:
      $("fileSelectButton"),

    refreshFilesButton:
      $("refreshFilesButton"),

    globalFilePicker:
      $("globalFilePicker"),

    fileDropZone:
      $("fileDropZone"),

    fileList:
      $("fileList"),

    fileCount:
      $("fileCount"),

    attachmentPreview:
      $("attachmentPreview"),


    /* Media */
    openImageModalButton:
      $("openImageModalButton"),

    openVideoModalButton:
      $("openVideoModalButton"),

    imagePromptInput:
      $("imagePromptInput"),

    imageSizeSelect:
      $("imageSizeSelect"),

    imageQualitySelect:
      $("imageQualitySelect"),

    generateImageButton:
      $("generateImageButton"),

    imageResult:
      $("imageResult"),


    videoPromptInput:
      $("videoPromptInput"),

    videoDurationSelect:
      $("videoDurationSelect"),

    generateVideoButton:
      $("generateVideoButton"),

    videoResult:
      $("videoResult"),


    /* Plans */
    plansList:
      $("plansList"),


    /* Notifications */
    notificationList:
      $("notificationList"),

    notificationSummary:
      $("notificationSummary"),

    markNotificationsReadButton:
      $("markNotificationsReadButton"),

    notificationBadge:
      $("notificationBadge"),

    sidebarNotificationBadge:
      $("sidebarNotificationBadge"),


    /* System */
    systemStats:
      $("systemStats"),

    systemOverallStatus:
      $("systemOverallStatus"),

    refreshSystemButton:
      $("refreshSystemButton"),

    systemDetailContent:
      $("systemDetailContent"),


    /* Account */
    accountButton:
      $("accountButton"),

    topAccountButton:
      $("topAccountButton"),

    accountName:
      $("accountName"),

    accountPlan:
      $("accountPlan"),

    accountStatusDot:
      $("accountStatusDot"),

    accountModalName:
      $("accountModalName"),

    accountModalEmail:
      $("accountModalEmail"),

    accountModalVerified:
      $("accountModalVerified"),

    accountModalPlan:
      $("accountModalPlan"),

    accountModalUsage:
      $("accountModalUsage"),

    accountModalStatus:
      $("accountModalStatus"),

    loginButton:
      $("loginButton"),

    logoutButton:
      $("logoutButton"),

    accountPlansButton:
      $("accountPlansButton"),


    /* Auth */
    authForm:
      $("authForm"),

    authIdentifier:
      $("authIdentifier"),

    authPassword:
      $("authPassword"),

    authMessage:
      $("authMessage"),

    guestLoginButton:
      $("guestLoginButton"),


    /* Commands */
    commandCenter:
      $("commandCenter"),

    commandInput:
      $("commandInput"),

    commandList:
      $("commandList"),


    /* Search */
    chatSearchPanel:
      $("chatSearchPanel"),

    chatSearchInput:
      $("chatSearchInput"),

    chatSearchResults:
      $("chatSearchResults"),


    /* Settings */
    settingsButton:
      $("settingsButton"),

    topSettingsButton:
      $("topSettingsButton"),

    mobileSettingsButton:
      $("mobileSettingsButton"),


    /* System */
    systemButton:
      $("systemButton"),

    systemNavButton:
      $("systemNavButton")


  };


  /* =======================================================
     GENERIC HELPERS
     ======================================================= */

  function escapeHTML(value) {

    return String(
      value ??
      ""
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


  function formatBytes(bytes) {

    const size =
      Number(bytes) || 0;

    if (size < 1024) {
      return `${size} B`;
    }

    if (size < 1024 * 1024) {
      return `${(
        size / 1024
      ).toFixed(1)} KB`;
    }

    if (size < 1024 * 1024 * 1024) {
      return `${(
        size /
        (1024 * 1024)
      ).toFixed(1)} MB`;
    }

    return `${(
      size /
      (1024 * 1024 * 1024)
    ).toFixed(2)} GB`;

  }


  function setButtonLoading(
    button,
    loading,
    textValue
  ) {

    if (!button) {
      return;
    }

    if (loading) {

      button.dataset.originalText =
        button.textContent;

      button.disabled = true;

      if (textValue) {
        button.textContent =
          textValue;
      }

    } else {

      button.disabled =
        false;

      if (
        button.dataset.originalText
      ) {

        button.textContent =
          button.dataset.originalText;

      }

    }

  }


  function setHTML(
    target,
    html
  ) {

    if (!target) {
      return;
    }

    target.innerHTML =
      html;

  }


  /* =======================================================
     RESEARCH
     ======================================================= */

  async function runResearch(
    query
  ) {

    const value =
      String(
        query ??
        el.researchInput?.value ??
        ""
      ).trim();


    if (!value) {

      toast?.(
        "Araştırma konusu gerekli",
        "Araştırmak istediğin konuyu yaz.",
        "warning"
      );

      return;

    }


    if (
      state.researching
    ) {

      return;

    }


    state.researching =
      true;


    setButtonLoading(
      el.researchRunButton,
      true,
      "Aranıyor..."
    );


    if (el.researchStatus) {

      el.researchStatus.textContent =
        "Web araştırması çalışıyor";

    }


    setHTML(
      el.researchResults,
      `

        <div class="empty-state compact">

          <div class="loading-spinner"></div>

          <h3>
            Araştırılıyor
          </h3>

          <p>
            Güncel web kaynakları kontrol ediliyor.
          </p>

        </div>

      `
    );


    try {

      const result =
        await apiRequest(
          "/api/research",
          {

            method:
              "POST",

            body: {
              query:
                value,

              question:
                value,

              text:
                value

            }

          }
        );


      renderResearch(
        result
      );


      if (el.researchStatus) {

        el.researchStatus.textContent =
          "Araştırma tamamlandı";

      }


    } catch (error) {

      console.error(
        "[TürkAI] Araştırma:",
        error
      );


      setHTML(
        el.researchResults,
        `

          <div class="empty-state compact">

            <div class="empty-state-icon">

              <svg aria-hidden="true">
                <use href="#i-alert"></use>
              </svg>

            </div>

            <h3>
              Araştırma başarısız
            </h3>

            <p>
              ${escapeHTML(
                error?.message ||
                "Web araştırması çalıştırılamadı."
              )}
            </p>

          </div>

        `
      );


      if (el.researchStatus) {

        el.researchStatus.textContent =
          "Hata";

      }


      toast?.(
        "Araştırma başarısız",
        error?.message ||
          "Sunucudan cevap alınamadı.",
        "error"
      );


    } finally {

      state.researching =
        false;

      setButtonLoading(
        el.researchRunButton,
        false
      );

    }

  }


  function renderResearch(
    data
  ) {

    const root =
      el.researchResults;


    if (!root) {
      return;
    }


    let items = [];


    if (
      Array.isArray(data)
    ) {

      items =
        data;

    } else {

      items =
        data?.results ||
        data?.sources ||
        data?.items ||
        data?.data?.results ||
        data?.data?.sources ||
        [];

    }


    const summary =
      data?.summary ||
      data?.answer ||
      data?.response ||
      data?.data?.summary ||
      "";


    if (
      !items.length &&
      !summary
    ) {

      setHTML(
        root,
        `

          <div class="empty-state compact">

            <div class="empty-state-icon">
              <svg aria-hidden="true">
                <use href="#i-info"></use>
              </svg>
            </div>

            <h3>
              Sonuç bulunamadı
            </h3>

            <p>
              Bu sorgu için kaynak döndürülmedi.
            </p>

          </div>

        `
      );

      return;

    }


    let html =
      "";


    if (summary) {

      html += `

        <article class="result-card">

          <div class="result-card-title">

            <strong>
              TürkAI özeti
            </strong>

          </div>

          <p>
            ${escapeHTML(summary)}
          </p>

        </article>

      `;

    }


    items
      .slice(0, 20)
      .forEach(
        item => {

          const title =
            item?.title ||
            item?.name ||
            item?.heading ||
            "Kaynak";


          const description =
            item?.snippet ||
            item?.description ||
            item?.summary ||
            item?.content ||
            "";


          const url =
            item?.url ||
            item?.link ||
            item?.href ||
            "";


          html += `

            <article class="result-card">

              <div class="result-card-title">

                <strong>
                  ${escapeHTML(title)}
                </strong>

              </div>

              ${
                description
                  ? `
                    <p>
                      ${escapeHTML(description)}
                    </p>
                  `
                  : ""
              }

              ${
                url
                  ? `
                    <a
                      href="${escapeHTML(url)}"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Kaynağı aç
                    </a>
                  `
                  : ""
              }

            </article>

          `;

        }
      );


    root.innerHTML =
      html;

  }


  function loadResearchPanel() {

    if (
      el.researchInput &&
      !el.researchInput.value
    ) {

      el.researchInput.value =
        "";

    }

  }


  if (el.researchRunButton) {

    el.researchRunButton.addEventListener(
      "click",
      () => {

        runResearch();

      }
    );

  }


  if (el.researchInput) {

    el.researchInput.addEventListener(
      "keydown",
      event => {

        if (
          event.key === "Enter"
        ) {

          event.preventDefault();

          runResearch();

        }

      }
    );

  }


  if (el.researchClearButton) {

    el.researchClearButton.addEventListener(
      "click",
      () => {

        if (el.researchInput) {
          el.researchInput.value = "";
        }

        setHTML(
          el.researchResults,
          `

            <div class="empty-state compact">

              <div class="empty-state-icon">
                <svg aria-hidden="true">
                  <use href="#i-globe"></use>
                </svg>
              </div>

              <h3>
                Araştırma temizlendi
              </h3>

              <p>
                Yeni bir sorguyla başlayabilirsin.
              </p>

            </div>

          `
        );

      }
    );

  }


  /* =======================================================
     WEATHER
     ======================================================= */

  async function runWeather(
    city
  ) {

    const value =
      String(
        city ??
        el.weatherInput?.value ??
        ""
      ).trim();


    if (!value) {

      toast?.(
        "Şehir gerekli",
        "Hava durumu için bir şehir yaz.",
        "warning"
      );

      return;

    }


    setButtonLoading(
      el.weatherRunButton,
      true,
      "Getiriliyor..."
    );


    setHTML(
      el.weatherResults,
      `

        <div class="empty-state compact">

          <div class="loading-spinner"></div>

          <h3>
            Hava verisi alınıyor
          </h3>

          <p>
            ${escapeHTML(value)} için bilgi getiriliyor.
          </p>

        </div>

      `
    );


    try {

      const result =
        await apiRequest(
          "/api/weather",
          {

            method:
              "POST",

            body: {

              city:
                value,

              location:
                value,

              query:
                value

            }

          }
        );


      renderWeather(
        result
      );


    } catch (error) {

      console.error(
        "[TürkAI] Weather:",
        error
      );


      toast?.(
        "Hava durumu alınamadı",
        error?.message ||
          "Sunucu cevap vermedi.",
        "error"
      );


      setHTML(
        el.weatherResults,
        `

          <div class="empty-state compact">

            <div class="empty-state-icon">

              <svg aria-hidden="true">
                <use href="#i-alert"></use>
              </svg>

            </div>

            <h3>
              Veri alınamadı
            </h3>

            <p>
              ${escapeHTML(
                error?.message ||
                "Hava durumu servisi kullanılamıyor."
              )}
            </p>

          </div>

        `
      );


    } finally {

      setButtonLoading(
        el.weatherRunButton,
        false
      );

    }

  }


  function renderWeather(
    data
  ) {

    const root =
      el.weatherResults;


    if (!root) {
      return;
    }


    const weather =
      data?.weather ||
      data?.data?.weather ||
      data?.data ||
      data;


    const city =
      weather?.city ||
      weather?.location ||
      weather?.name ||
      el.weatherInput?.value ||
      "Şehir";


    const temperature =
      weather?.temperature ??
      weather?.temp ??
      weather?.current?.temperature ??
      weather?.current?.temp ??
      "—";


    const feels =
      weather?.feelsLike ??
      weather?.feels_like ??
      weather?.current?.feelsLike ??
      "—";


    const condition =
      weather?.condition ||
      weather?.description ||
      weather?.weather ||
      weather?.current?.condition ||
      "Bilgi yok";


    const humidity =
      weather?.humidity ??
      weather?.current?.humidity ??
      "—";


    const wind =
      weather?.wind ??
      weather?.windSpeed ??
      weather?.current?.wind ??
      "—";


    root.innerHTML = `

      <article class="result-card weather-result-card">

        <div class="result-card-title">

          <strong>
            ${escapeHTML(city)}
          </strong>

          <span class="panel-status">
            Güncel
          </span>

        </div>

        <div class="weather-main">

          <div class="weather-temperature">
            ${escapeHTML(
              String(temperature)
            )}°
          </div>

          <div class="weather-condition">
            ${escapeHTML(
              condition
            )}
          </div>

        </div>

        <div class="weather-grid">

          <div class="system-card">
            <div class="system-label">
              <strong>
                Hissedilen
              </strong>
            </div>

            <div class="system-value">
              ${escapeHTML(
                String(feels)
              )}°
            </div>
          </div>

          <div class="system-card">
            <div class="system-label">
              <strong>
                Nem
              </strong>
            </div>

            <div class="system-value">
              ${escapeHTML(
                String(humidity)
              )}%
            </div>
          </div>

          <div class="system-card">
            <div class="system-label">
              <strong>
                Rüzgâr
              </strong>
            </div>

            <div class="system-value">
              ${escapeHTML(
                String(wind)
              )}
            </div>
          </div>

        </div>

      </article>

    `;

  }


  if (el.weatherRunButton) {

    el.weatherRunButton.addEventListener(
      "click",
      () => runWeather()
    );

  }


  if (el.weatherInput) {

    el.weatherInput.addEventListener(
      "keydown",
      event => {

        if (
          event.key === "Enter"
        ) {

          event.preventDefault();

          runWeather();

        }

      }
    );

  }


  /* =======================================================
     MEMORY
     ======================================================= */

  async function searchMemory(
    query
  ) {

    const value =
      String(
        query ??
        el.memoryInput?.value ??
        ""
      ).trim();


    if (!value) {

      await loadMemoryOverview();

      return;

    }


    setButtonLoading(
      el.memorySearchButton,
      true,
      "Aranıyor..."
    );


    try {

      const result =
        await apiRequest(
          "/api/memory/search",
          {

            method:
              "POST",

            body: {

              query:
                value,

              text:
                value,

              userId:
                state.account?.id ||
                state.account?.userId ||
                "guest"

            }

          }
        );


      renderMemoryResults(
        result
      );


    } catch (error) {

      console.error(
        "[TürkAI] Memory:",
        error
      );


      toast?.(
        "Hafıza aranamadı",
        error?.message ||
          "Hafıza servisi cevap vermedi.",
        "error"
      );


    } finally {

      setButtonLoading(
        el.memorySearchButton,
        false
      );

    }

  }


  async function loadMemoryOverview() {

    try {

      const result =
        await apiRequest(
          "/api/memory/search",
          {

            method:
              "POST",

            body: {

              query:
                "*",

              text:
                "*"

            }

          }
        );


      renderMemoryResults(
        result
      );


    } catch {

      if (el.memoryResults) {

        el.memoryResults.innerHTML =
          `

            <div class="empty-state">

              <div class="empty-state-icon">

                <svg aria-hidden="true">
                  <use href="#i-brain"></use>
                </svg>

              </div>

              <h3>
                Hafıza hazır
              </h3>

              <p>
                Bir kelime veya soru yazarak hafızada arama yapabilirsin.
              </p>

            </div>

          `;

      }

    }

  }


  function renderMemoryResults(
    data
  ) {

    const root =
      el.memoryResults;


    if (!root) {
      return;
    }


    const items =
      Array.isArray(data)
        ? data
        : (
            data?.results ||
            data?.items ||
            data?.records ||
            data?.data?.results ||
            data?.data?.items ||
            []
          );


    const stats =
      data?.stats ||
      data?.data?.stats ||
      null;


    if (
      stats &&
      el.memoryStats
    ) {

      el.memoryStats.innerHTML = `

        <div class="memory-stat">

          <span>
            Kayıt
          </span>

          <strong>
            ${escapeHTML(
              String(
                stats.total ??
                stats.count ??
                items.length
              )
            )}
          </strong>

        </div>

        <div class="memory-stat">

          <span>
            Aktif
          </span>

          <strong>
            ${escapeHTML(
              String(
                stats.active ??
                items.length
              )
            )}
          </strong>

        </div>

        <div class="memory-stat">

          <span>
            Sonuç
          </span>

          <strong>
            ${items.length}
          </strong>

        </div>

      `;

    }


    if (!items.length) {

      root.innerHTML =
        `

          <div class="empty-state compact">

            <div class="empty-state-icon">

              <svg aria-hidden="true">
                <use href="#i-brain"></use>
              </svg>

            </div>

            <h3>
              Kayıt bulunamadı
            </h3>

            <p>
              Aradığın bilgi hafızada bulunmuyor.
            </p>

          </div>

        `;

      return;

    }


    root.innerHTML =
      items
        .slice(0, 50)
        .map(
          item => {

            const answer =
              item?.answer ||
              item?.content ||
              item?.text ||
              item?.value ||
              "";


            const category =
              item?.category ||
              item?.type ||
              "Genel";


            const score =
              item?.score ??
              item?.similarity ??
              "";


            return `

              <article class="result-card">

                <div class="result-card-title">

                  <strong>
                    ${escapeHTML(
                      String(category)
                    )}
                  </strong>

                  ${
                    score !== ""
                      ? `
                        <span class="panel-status">
                          ${escapeHTML(
                            String(
                              Number(score)
                                .toFixed(2)
                            )
                          )}
                        </span>
                      `
                      : ""
                  }

                </div>

                <p>
                  ${escapeHTML(
                    String(answer)
                  )}
                </p>

              </article>

            `;

          }
        )
        .join("");

  }


  if (el.memorySearchButton) {

    el.memorySearchButton.addEventListener(
      "click",
      () =>
        searchMemory()
    );

  }


  if (el.memoryInput) {

    el.memoryInput.addEventListener(
      "keydown",
      event => {

        if (
          event.key === "Enter"
        ) {

          event.preventDefault();

          searchMemory();

        }

      }
    );

  }


  if (el.memoryOverviewButton) {

    el.memoryOverviewButton.addEventListener(
      "click",
      loadMemoryOverview
    );

  }


  if (el.memorySaveCurrentButton) {

    el.memorySaveCurrentButton.addEventListener(
      "click",
      async () => {

        if (
          !state.messages?.length
        ) {

          toast?.(
            "Kaydedilecek konuşma yok",
            "Önce bir konuşma başlat.",
            "warning"
          );

          return;

        }


        const lastPair =
          state.messages
            .slice(-6)
            .map(
              item =>
                `${item.role}: ${item.content}`
            )
            .join("\n");


        try {

          await apiRequest(
            "/api/memory/save",
            {

              method:
                "POST",

              body: {

                content:
                  lastPair,

                answer:
                  lastPair,

                category:
                  "conversation",

                userId:
                  state.account?.id ||
                  state.account?.userId ||
                  "guest"

              }

            }
          );


          toast?.(
            "Hafızaya kaydedildi",
            "Mevcut konuşma hafızaya gönderildi.",
            "success"
          );


          await loadMemoryOverview();

        } catch (error) {

          toast?.(
            "Hafızaya kaydedilemedi",
            error?.message ||
              "Sunucu kayıt yapamadı.",
            "error"
          );

        }

      }
    );

  }


  /* =======================================================
     FILES
     ======================================================= */

  function openFilePicker() {

    if (
      el.globalFilePicker
    ) {

      el.globalFilePicker.value =
        "";

      el.globalFilePicker.click();

    }

  }


  async function uploadFiles(
    files
  ) {

    const list =
      [...(files || [])];

    if (!list.length) {
      return;
    }


    if (!el.fileList) {
      return;
    }


    const total =
      list.length;


    setUploadStatus(
      true,
      "Dosya yükleniyor",
      `0 / ${total}`,
      0
    );


    let completed = 0;


    for (
      const file of list
    ) {

      try {

        const form =
          new FormData();


        form.append(
          "file",
          file
        );


        form.append(
          "filename",
          file.name
        );


        form.append(
          "name",
          file.name
        );


        const result =
          await apiRequest(
            "/api/files/upload",
            {

              method:
                "POST",

              body:
                form

            }
          );


        state.files.push({

          id:
            result?.id ||
            result?.file?.id ||
            `local_${Date.now()}_${Math.random()}`,

          name:
            result?.name ||
            result?.file?.name ||
            file.name,

          size:
            result?.size ||
            result?.file?.size ||
            file.size,

          type:
            result?.type ||
            result?.file?.type ||
            file.type,

          url:
            result?.url ||
            result?.file?.url ||
            ""

        });


      } catch (error) {

        console.error(
          "[TürkAI] Upload:",
          error
        );


        toast?.(
          "Dosya yüklenemedi",
          `${file.name}: ${error?.message || "Hata"}`,
          "error"
        );

      }


      completed++;

      setUploadStatus(
        true,
        "Dosya yükleniyor",
        `${completed} / ${total}`,
        Math.round(
          completed /
          total *
          100
        )
      );

    }


    setTimeout(
      () =>
        setUploadStatus(
          false
        ),
      400
    );


    renderFiles();

    renderAttachments();

  }


  function renderAttachments() {

    if (
      !el.attachmentPreview
    ) {
      return;
    }


    if (
      !state.attachments?.length
    ) {

      el.attachmentPreview.classList.add(
        "hidden"
      );

      el.attachmentPreview.innerHTML =
        "";

      return;

    }


    el.attachmentPreview.classList.remove(
      "hidden"
    );


    el.attachmentPreview.innerHTML =
      state.attachments
        .map(
          (file, index) => `

            <div class="attachment-chip">

              <svg aria-hidden="true">
                <use href="#i-file"></use>
              </svg>

              <span class="attachment-chip-name">
                ${escapeHTML(
                  file.name
                )}
              </span>

              <button
                type="button"
                class="file-card-remove"
                data-remove-attachment="${index}"
                aria-label="Dosya ekini kaldır"
              >
                <svg aria-hidden="true">
                  <use href="#i-close"></use>
                </svg>
              </button>

            </div>

          `
        )
        .join("");


    qsa(
      "[data-remove-attachment]"
    ).forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const index =
            Number(
              button.dataset.removeAttachment
            );

          state.attachments.splice(
            index,
            1
          );

          renderAttachments();

        }
      );

    });

  }


  function renderFiles() {

    if (!el.fileList) {
      return;
    }


    if (
      !state.files?.length
    ) {

      el.fileList.innerHTML =
        `

          <div class="empty-state compact">

            <div class="empty-state-icon">

              <svg aria-hidden="true">
                <use href="#i-folder"></use>
              </svg>

            </div>

            <h3>
              Henüz dosya yok
            </h3>

            <p>
              Bir dosya yüklediğinde burada görünecek.
            </p>

          </div>

        `;

      if (el.fileCount) {
        el.fileCount.textContent =
          "0 dosya";
      }

      return;

    }


    if (el.fileCount) {

      el.fileCount.textContent =
        `${state.files.length} dosya`;

    }


    el.fileList.innerHTML =
      state.files
        .map(
          (file, index) => `

            <article class="file-card">

              <div class="file-card-icon">

                <svg aria-hidden="true">
                  <use href="#i-file"></use>
                </svg>

              </div>

              <div class="file-card-info">

                <strong>
                  ${escapeHTML(
                    file.name
                  )}
                </strong>

                <small>
                  ${formatBytes(
                    file.size
                  )}

                  ${
                    file.type
                      ? ` · ${escapeHTML(file.type)}`
                      : ""
                  }
                </small>

              </div>

              <button
                type="button"
                class="file-card-remove"
                data-remove-file="${index}"
                aria-label="Dosyayı kaldır"
              >
                <svg aria-hidden="true">
                  <use href="#i-trash"></use>
                </svg>
              </button>

            </article>

          `
        )
        .join("");


    qsa(
      "[data-remove-file]"
    ).forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const index =
            Number(
              button.dataset.removeFile
            );

          state.files.splice(
            index,
            1
          );

          renderFiles();

        }
      );

    });

  }


  async function loadFiles() {

    try {

      const result =
        await apiRequest(
          "/api/files",
          {
            method:
              "GET"
          }
        );


      const items =
        Array.isArray(result)
          ? result
          : (
              result?.files ||
              result?.items ||
              result?.data?.files ||
              []
            );


      state.files =
        items.map(
          file => ({

            id:
              file.id ||
              file._id ||
              "",

            name:
              file.name ||
              file.filename ||
              "Dosya",

            size:
              file.size ||
              0,

            type:
              file.type ||
              file.mimeType ||
              "",

            url:
              file.url ||
              ""

          })
        );


      renderFiles();


    } catch (error) {

      console.warn(
        "[TürkAI] Dosya listesi alınamadı:",
        error
      );

      renderFiles();

    }

  }


  function setUploadStatus(
    visible,
    title = "Dosya yükleniyor",
    message = "",
    progress = 0
  ) {

    const status =
      $("uploadStatusBar");

    const titleNode =
      $("uploadStatusTitle");

    const textNode =
      $("uploadStatusText");

    const progressNode =
      $("uploadProgressBar");


    if (!status) {
      return;
    }


    if (!visible) {

      status.classList.add(
        "hidden"
      );

      return;

    }


    status.classList.remove(
      "hidden"
    );


    if (titleNode) {
      titleNode.textContent =
        title;
    }


    if (textNode) {
      textNode.textContent =
        message;
    }


    if (progressNode) {

      progressNode.style.width =
        `${Math.max(
          0,
          Math.min(
            100,
            Number(progress) || 0
          )
        )}%`;

    }

  }


  if (el.attachmentButton) {

    el.attachmentButton.addEventListener(
      "click",
      openFilePicker
    );

  }


  if (el.fileSelectButton) {

    el.fileSelectButton.addEventListener(
      "click",
      openFilePicker
    );

  }


  if (el.globalFilePicker) {

    el.globalFilePicker.addEventListener(
      "change",
      event => {

        uploadFiles(
          event.target.files
        );

      }
    );

  }


  if (el.refreshFilesButton) {

    el.refreshFilesButton.addEventListener(
      "click",
      loadFiles
    );

  }


  /* =======================================================
     DRAG & DROP
     ======================================================= */

  let dragDepth = 0;


  function setupDragDrop() {

    const dropZone =
      el.fileDropZone;


    if (!dropZone) {
      return;
    }


    document.addEventListener(
      "dragenter",
      event => {

        if (
          !event.dataTransfer?.types?.includes(
            "Files"
          )
        ) {

          return;

        }

        dragDepth++;

        $("dropOverlay")
          ?.classList
          .remove("hidden");

      }
    );


    document.addEventListener(
      "dragleave",
      () => {

        dragDepth--;

        if (
          dragDepth <= 0
        ) {

          dragDepth = 0;

          $("dropOverlay")
            ?.classList
            .add("hidden");

        }

      }
    );


    document.addEventListener(
      "dragover",
      event => {

        if (
          event.dataTransfer?.types?.includes(
            "Files"
          )
        ) {

          event.preventDefault();

        }

      }
    );


    document.addEventListener(
      "drop",
      event => {

        if (
          event.dataTransfer?.files?.length
        ) {

          event.preventDefault();

          dragDepth = 0;

          $("dropOverlay")
            ?.classList
            .add("hidden");


          uploadFiles(
            event.dataTransfer.files
          );

        }

      }
    );


    [
      "dragenter",
      "dragover"
    ].forEach(
      name => {

        dropZone.addEventListener(
          name,
          event => {

            event.preventDefault();

            dropZone.classList.add(
              "dragover"
            );

          }
        );

      }
    );


    [
      "dragleave",
      "drop"
    ].forEach(
      name => {

        dropZone.addEventListener(
          name,
          event => {

            event.preventDefault();

            dropZone.classList.remove(
              "dragover"
            );

          }
        );

      }
    );


    dropZone.addEventListener(
      "drop",
      event => {

        uploadFiles(
          event.dataTransfer?.files
        );

      }
    );

  }


  /* =======================================================
     MEDIA
     ======================================================= */

  if (
    el.openImageModalButton
  ) {

    el.openImageModalButton.addEventListener(
      "click",
      () => {

        openModal?.(
          "imageCreateModal"
        );

      }
    );

  }


  if (
    el.openVideoModalButton
  ) {

    el.openVideoModalButton.addEventListener(
      "click",
      () => {

        openModal?.(
          "videoModal"
        );

      }
    );

  }


  if (
    $("imageToolButton")
  ) {

    $("imageToolButton")
      .addEventListener(
        "click",
        () => {

          openModal?.(
            "imageCreateModal"
          );

        }
      );

  }


  if (
    $("videoToolButton")
  ) {

    $("videoToolButton")
      .addEventListener(
        "click",
        () => {

          openModal?.(
            "videoModal"
          );

        }
      );

  }


  async function generateImage() {

    const prompt =
      String(
        el.imagePromptInput?.value ||
        ""
      ).trim();


    if (!prompt) {

      toast?.(
        "Prompt gerekli",
        "Görselin nasıl olacağını yaz.",
        "warning"
      );

      el.imagePromptInput?.focus();

      return;

    }


    setButtonLoading(
      el.generateImageButton,
      true,
      "Üretiliyor..."
    );


    setHTML(
      el.imageResult,
      `

        <div class="empty-state compact">

          <div class="loading-spinner"></div>

          <h3>
            Görsel hazırlanıyor
          </h3>

          <p>
            Üretim servisine istek gönderiliyor.
          </p>

        </div>

      `
    );


    try {

      const result =
        await apiRequest(
          "/api/media/image",
          {

            method:
              "POST",

            body: {

              prompt,

              size:
                el.imageSizeSelect?.value ||
                "1024x1024",

              quality:
                el.imageQualitySelect?.value ||
                "standard"

            }

          }
        );


      renderImageResult(
        result
      );


    } catch (error) {

      console.error(
        "[TürkAI] Image:",
        error
      );


      toast?.(
        "Görsel üretilemedi",
        error?.message ||
          "Medya servisi cevap vermedi.",
        "error"
      );


      setHTML(
        el.imageResult,
        `

          <div class="empty-state compact">

            <div class="empty-state-icon">

              <svg aria-hidden="true">
                <use href="#i-alert"></use>
              </svg>

            </div>

            <h3>
              Üretim başarısız
            </h3>

            <p>
              ${escapeHTML(
                error?.message ||
                "Görsel oluşturulamadı."
              )}
            </p>

          </div>

        `
      );


    } finally {

      setButtonLoading(
        el.generateImageButton,
        false
      );

    }

  }


  function renderImageResult(
    data
  ) {

    const url =
      data?.url ||
      data?.imageUrl ||
      data?.image_url ||
      data?.data?.url ||
      data?.data?.imageUrl ||
      "";


    const revisedPrompt =
      data?.revisedPrompt ||
      data?.prompt ||
      "";


    if (!url) {

      setHTML(
        el.imageResult,
        `

          <div class="result-card">

            <strong>
              Üretim tamamlandı
            </strong>

            ${
              revisedPrompt
                ? `
                  <p>
                    ${escapeHTML(revisedPrompt)}
                  </p>
                `
                : ""
            }

          </div>

        `
      );

      return;

    }


    el.imageResult.innerHTML = `

      <div class="result-card">

        <div class="result-card-title">

          <strong>
            Görsel hazır
          </strong>

        </div>

        <img
          src="${escapeHTML(url)}"
          alt="TürkAI tarafından oluşturulan görsel"
          loading="lazy"
        >

        <a
          href="${escapeHTML(url)}"
          target="_blank"
          rel="noopener noreferrer"
        >
          Görseli aç
        </a>

      </div>

    `;

  }


  if (
    el.generateImageButton
  ) {

    el.generateImageButton.addEventListener(
      "click",
      generateImage
    );

  }


  async function generateVideo() {

    const prompt =
      String(
        el.videoPromptInput?.value ||
        ""
      ).trim();


    if (!prompt) {

      toast?.(
        "Prompt gerekli",
        "Videoda görmek istediğin sahneyi yaz.",
        "warning"
      );

      el.videoPromptInput?.focus();

      return;

    }


    setButtonLoading(
      el.generateVideoButton,
      true,
      "Hazırlanıyor..."
    );


    setHTML(
      el.videoResult,
      `

        <div class="empty-state compact">

          <div class="loading-spinner"></div>

          <h3>
            Video hazırlanıyor
          </h3>

          <p>
            Video üretim servisine istek gönderiliyor.
          </p>

        </div>

      `
    );


    try {

      const result =
        await apiRequest(
          "/api/media/video",
          {

            method:
              "POST",

            body: {

              prompt,

              duration:
                Number(
                  el.videoDurationSelect?.value ||
                  5
                )

            }

          }
        );


      renderVideoResult(
        result
      );


    } catch (error) {

      console.error(
        "[TürkAI] Video:",
        error
      );


      toast?.(
        "Video üretilemedi",
        error?.message ||
          "Video servisi cevap vermedi.",
        "error"
      );


      setHTML(
        el.videoResult,
        `

          <div class="empty-state compact">

            <div class="empty-state-icon">

              <svg aria-hidden="true">
                <use href="#i-alert"></use>
              </svg>

            </div>

            <h3>
              Üretim başarısız
            </h3>

            <p>
              ${escapeHTML(
                error?.message ||
                "Video oluşturulamadı."
              )}
            </p>

          </div>

        `
      );


    } finally {

      setButtonLoading(
        el.generateVideoButton,
        false
      );

    }

  }


  function renderVideoResult(
    data
  ) {

    const url =
      data?.url ||
      data?.videoUrl ||
      data?.video_url ||
      data?.data?.url ||
      data?.data?.videoUrl ||
      "";


    if (!url) {

      setHTML(
        el.videoResult,
        `

          <div class="result-card">

            <strong>
              Video üretim isteği alındı
            </strong>

            <p>
              Sunucu henüz bir video URL'si döndürmedi.
            </p>

          </div>

        `
      );

      return;

    }


    el.videoResult.innerHTML = `

      <div class="result-card">

        <div class="result-card-title">

          <strong>
            Video hazır
          </strong>

        </div>

        <video
          controls
          playsinline
          preload="metadata"
        >
          <source src="${escapeHTML(url)}">
        </video>

        <a
          href="${escapeHTML(url)}"
          target="_blank"
          rel="noopener noreferrer"
        >
          Videoyu aç
        </a>

      </div>

    `;

  }


  if (
    el.generateVideoButton
  ) {

    el.generateVideoButton.addEventListener(
      "click",
      generateVideo
    );

  }


  /* =======================================================
     PLANS
     ======================================================= */

  const DEFAULT_PLANS = [

    {
      id:
        "free",

      name:
        "Free",

      price:
        "0 TL",

      description:
        "Temel TürkAI deneyimi.",

      features: [
        "50 mesaj",
        "Temel sohbet",
        "Temel hafıza",
        "Web araştırması"
      ]

    },


    {
      id:
        "pro",

      name:
        "Pro",

      price:
        "250 TL",

      description:
        "Daha yüksek kullanım ve gelişmiş özellikler.",

      featured:
        true,

      tag:
        "POPÜLER",

      features: [
        "250 mesaj",
        "Gelişmiş AI",
        "Gelişmiş hafıza",
        "Görsel üretimi",
        "Öncelikli kullanım"
      ]

    },


    {
      id:
        "plus",

      name:
        "Plus",

      price:
        "500 TL",

      description:
        "Daha yüksek limitler ve medya özellikleri.",

      features: [
        "500 mesaj",
        "Gelişmiş AI",
        "Daha yüksek hafıza",
        "Görsel üretimi",
        "Video üretimi"
      ]

    },


    {
      id:
        "ultra",

      name:
        "Ultra",

      price:
        "1000 TL",

      description:
        "Yakında daha geniş kullanım ve üst düzey özellikler.",

      tag:
        "YAKINDA",

      features: [
        "1000 mesaj",
        "Üst düzey kullanım",
        "Gelişmiş medya",
        "Genişletilmiş limitler",
        "Ultra özellikleri"
      ],

      disabled:
        true

    }

  ];


  async function loadPlans() {

    try {

      const result =
        await apiRequest(
          "/api/plans",
          {
            method:
              "GET"
          }
        );


      const plans =
        Array.isArray(result)
          ? result
          : (
              result?.plans ||
              result?.data?.plans ||
              []
            );


      state.plans =
        plans.length
          ? plans
          : DEFAULT_PLANS;


    } catch {

      state.plans =
        DEFAULT_PLANS;

    }


    renderPlans();

  }


  function renderPlans() {

    if (!el.plansList) {
      return;
    }


    el.plansList.innerHTML =
      state.plans
        .map(
          plan => `

            <article
              class="plan-card ${
                plan.featured
                  ? "featured"
                  : ""
              }"
            >

              ${
                plan.tag
                  ? `
                    <span class="plan-tag">
                      ${escapeHTML(
                        plan.tag
                      )}
                    </span>
                  `
                  : ""
              }

              <div class="plan-name">
                ${escapeHTML(
                  plan.name
                )}
              </div>

              <div class="plan-price">

                ${escapeHTML(
                  String(
                    plan.price ??
                    "—"
                  )
                )}

                ${
                  plan.price &&
                  !String(
                    plan.price
                  ).includes("TL")
                    ? `<small>/ ay</small>`
                    : ""
                }

              </div>

              <p class="plan-description">
                ${escapeHTML(
                  plan.description ||
                  ""
                )}
              </p>

              <div class="plan-features">

                ${
                  (
                    plan.features ||
                    []
                  )
                    .map(
                      feature => `

                        <div class="plan-feature">

                          <svg aria-hidden="true">
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
                    .join("")
                }

              </div>

              <button
                type="button"
                class="${
                  plan.featured
                    ? "primary-button"
                    : "secondary-button"
                }"
                data-select-plan="${
                  escapeHTML(
                    plan.id ||
                    plan.name
                  )
                }"
                ${
                  plan.disabled
                    ? "disabled"
                    : ""
                }
              >
                ${
                  plan.disabled
                    ? "Yakında"
                    : (
                        plan.id === "free"
                          ? "Mevcut"
                          : "Paketi seç"
                      )
                }
              </button>

            </article>

          `
        )
        .join("");


    qsa(
      "[data-select-plan]"
    ).forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const plan =
            button.dataset.selectPlan;

          if (!plan) {
            return;
          }


          toast?.(
            "Paket seçildi",
            `${plan} paketi için ödeme akışı sunucu yapılandırmasına bağlıdır.`,
            "info"
          );

        }
      );

    });

  }


  /* =======================================================
     NOTIFICATIONS
     ======================================================= */

  async function loadNotifications() {

    try {

      const result =
        await apiRequest(
          "/api/notifications",
          {
            method:
              "GET"
          }
        );


      const items =
        Array.isArray(result)
          ? result
          : (
              result?.notifications ||
              result?.items ||
              result?.data ||
              []
            );


      state.notifications =
        items;


    } catch {

      state.notifications =
        [];

    }


    renderNotifications();

  }


  function renderNotifications() {

    const items =
      state.notifications ||
      [];


    const unread =
      items.filter(
        item =>
          item?.read === false ||
          item?.unread === true
      ).length;


    if (el.notificationBadge) {

      el.notificationBadge.textContent =
        String(unread);

      el.notificationBadge.classList.toggle(
        "hidden",
        unread === 0
      );

    }


    if (
      el.sidebarNotificationBadge
    ) {

      el.sidebarNotificationBadge.textContent =
        String(unread);

      el.sidebarNotificationBadge.classList.toggle(
        "hidden",
        unread === 0
      );

    }


    if (el.notificationSummary) {

      el.notificationSummary.textContent =
        items.length
          ? `${items.length} bildirim`
          : "Yeni bildirim yok";

    }


    if (!el.notificationList) {
      return;
    }


    if (!items.length) {

      el.notificationList.innerHTML =
        `

          <div class="empty-state compact">

            <div class="empty-state-icon">

              <svg aria-hidden="true">
                <use href="#i-bell"></use>
              </svg>

            </div>

            <h3>
              Bildirim yok
            </h3>

            <p>
              Yeni bildirimler burada görünecek.
            </p>

          </div>

        `;

      return;

    }


    el.notificationList.innerHTML =
      items
        .slice(0, 50)
        .map(
          item => `

            <article
              class="notification-card ${
                (
                  item?.read === false ||
                  item?.unread === true
                )
                  ? "unread"
                  : ""
              }"
            >

              <strong>
                ${escapeHTML(
                  item?.title ||
                  item?.name ||
                  "TürkAI bildirimi"
                )}
              </strong>

              <p>
                ${escapeHTML(
                  item?.message ||
                  item?.body ||
                  item?.text ||
                  ""
                )}
              </p>

              <small>
                ${escapeHTML(
                  item?.createdAt ||
                  item?.created_at ||
                  ""
                )}
              </small>

            </article>

          `
        )
        .join("");

  }


  if (
    el.markNotificationsReadButton
  ) {

    el.markNotificationsReadButton.addEventListener(
      "click",
      () => {

        state.notifications =
          state.notifications.map(
            item => ({
              ...item,
              read:
                true,
              unread:
                false
            })
          );

        renderNotifications();

        toast?.(
          "Bildirimler okundu",
          "",
          "success"
        );

      }
    );

  }


  /* =======================================================
     SYSTEM STATUS
     ======================================================= */

  async function loadSystemStatus() {

    if (el.systemOverallStatus) {

      el.systemOverallStatus.textContent =
        "Kontrol ediliyor";

    }


    try {

      const result =
        await apiRequest(
          "/api/system/status",
          {
            method:
              "GET"
          }
        );


      state.system =
        result;


      renderSystem(
        result
      );


    } catch (error) {

      console.error(
        "[TürkAI] System:",
        error
      );


      renderSystemError(
        error
      );

    }

  }


  function renderSystem(
    data
  ) {

    const server =
      data?.server ||
      data?.data?.server ||
      {};


    const modules =
      data?.modules ||
      data?.integration ||
      data?.data?.modules ||
      {};


    const status =
      data?.status ||
      data?.integration?.degraded === false
        ? "ready"
        : (
            data?.status ||
            "unknown"
          );


    if (el.systemOverallStatus) {

      el.systemOverallStatus.textContent =
        String(
          status
        ).toUpperCase();

    }


    if (!el.systemStats) {
      return;
    }


    const rows = [

      [
        "Durum",
        data?.status ||
          "unknown"
      ],

      [
        "Sunucu",
        server?.name ||
          data?.server?.name ||
          "TürkAI"
      ],

      [
        "Sürüm",
        server?.version ||
          data?.version ||
          "40.0.0"
      ],

      [
        "Host",
        server?.host ||
          "0.0.0.0"
      ],

      [
        "Port",
        server?.port ||
          "3000"
      ],

      [
        "Entegrasyon",
        data?.integration?.degraded === false
          ? "Aktif"
          : "Kontrol gerekli"
      ],

      [
        "Modüller",
        typeof modules === "object"
          ? Object.keys(
              modules
            ).length
          : "—"
      ],

      [
        "Tarayıcı",
        navigator.userAgent
      ]

    ];


    el.systemStats.innerHTML =
      rows
        .map(
          ([label, value]) => `

            <div class="system-card">

              <div class="system-label">

                <strong>
                  ${escapeHTML(
                    label
                  )}
                </strong>

              </div>

              <div class="system-value">

                ${escapeHTML(
                  String(value)
                )}

              </div>

            </div>

          `
        )
        .join("");

  }


  function renderSystemError(
    error
  ) {

    if (el.systemOverallStatus) {

      el.systemOverallStatus.textContent =
        "BAĞLANTI HATASI";

    }


    if (el.systemStats) {

      el.systemStats.innerHTML =
        `

          <div class="empty-state compact">

            <div class="empty-state-icon">

              <svg aria-hidden="true">
                <use href="#i-alert"></use>
              </svg>

            </div>

            <h3>
              Sistem bilgisi alınamadı
            </h3>

            <p>
              ${escapeHTML(
                error?.message ||
                "Sunucuya erişilemedi."
              )}
            </p>

          </div>

        `;

    }

  }


  if (
    el.refreshSystemButton
  ) {

    el.refreshSystemButton.addEventListener(
      "click",
      loadSystemStatus
    );

  }


  /* =======================================================
     ACCOUNT
     ======================================================= */

  async function loadAccount() {

    try {

      let result;


      try {

        result =
          await apiRequest(
            "/api/account",
            {
              method:
                "GET"
            }
          );

      } catch {

        result =
          await apiRequest(
            "/api/auth/me",
            {
              method:
                "GET"
            }
          );

      }


      state.account =
        result?.user ||
        result?.account ||
        result?.data?.user ||
        result?.data?.account ||
        result;


      renderAccount();


    } catch {

      state.account =
        null;

      renderAccount();

    }

  }


  function renderAccount() {

    const account =
      state.account;


    if (!account) {

      setText(
        el.accountName,
        "Misafir"
      );

      setText(
        el.accountPlan,
        "Free"
      );

      setText(
        el.accountModalName,
        "Misafir"
      );

      setText(
        el.accountModalEmail,
        "Oturum açık değil"
      );

      setText(
        el.accountModalPlan,
        "Free"
      );

      setText(
        el.accountModalStatus,
        "Misafir"
      );

      el.accountModalVerified?.classList.add(
        "hidden"
      );

      return;

    }


    const name =
      account.name ||
      account.displayName ||
      account.username ||
      account.email ||
      "Kullanıcı";


    const email =
      account.email ||
      "Hesap";


    const plan =
      account.plan ||
      account.planName ||
      account.subscription?.plan ||
      "Free";


    const usage =
      account.usage?.used ??
      account.usage ??
      account.messagesUsed ??
      "—";


    setText(
      el.accountName,
      name
    );

    setText(
      el.accountPlan,
      plan
    );

    setText(
      el.accountModalName,
      name
    );

    setText(
      el.accountModalEmail,
      email
    );

    setText(
      el.accountModalPlan,
      plan
    );

    setText(
      el.accountModalUsage,
      String(usage)
    );

    setText(
      el.accountModalStatus,
      "Aktif"
    );


    if (
      account.verified ||
      account.emailVerified
    ) {

      el.accountModalVerified?.classList.remove(
        "hidden"
      );

    } else {

      el.accountModalVerified?.classList.add(
        "hidden"
      );

    }

  }


  function setText(
    node,
    value
  ) {

    if (node) {

      node.textContent =
        String(
          value ??
          ""
        );

    }

  }


  if (el.loginButton) {

    el.loginButton.addEventListener(
      "click",
      () => {

        closeModal?.(
          "accountModal"
        );

        openModal?.(
          "authModal"
        );

      }
    );

  }


  if (el.logoutButton) {

    el.logoutButton.addEventListener(
      "click",
      async () => {

        try {

          await apiRequest(
            "/api/auth/logout",
            {
              method:
                "POST"
            }
          );

        } catch {}

        state.account =
          null;

        renderAccount();

        closeModal?.(
          "accountModal"
        );

        toast?.(
          "Çıkış yapıldı",
          "",
          "success"
        );

      }
    );

  }


  if (el.accountPlansButton) {

    el.accountPlansButton.addEventListener(
      "click",
      () => {

        closeModal?.(
          "accountModal"
        );

        openPanel?.(
          "plans"
        );

      }
    );

  }


  /* =======================================================
     AUTH
     ======================================================= */

  async function login() {

    const identifier =
      String(
        el.authIdentifier?.value ||
        ""
      ).trim();


    const password =
      String(
        el.authPassword?.value ||
        ""
      );


    if (
      !identifier ||
      !password
    ) {

      setText(
        el.authMessage,
        "E-posta/kullanıcı adı ve şifre gerekli."
      );

      el.authMessage?.classList.add(
        "error"
      );

      return;

    }


    const submit =
      el.authForm?.querySelector(
        'button[type="submit"]'
      );


    setButtonLoading(
      submit,
      true,
      "Giriş yapılıyor..."
    );


    try {

      const result =
        await apiRequest(
          "/api/auth/login",
          {

            method:
              "POST",

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
        result?.user ||
        result?.account ||
        result?.data?.user ||
        result;


      renderAccount();


      el.authPassword.value =
        "";


      el.authMessage?.classList.remove(
        "error"
      );

      setText(
        el.authMessage,
        "Giriş başarılı."
      );


      closeModal?.(
        "authModal"
      );


      toast?.(
        "Hoş geldin",
        state.account?.name ||
          state.account?.displayName ||
          "Hesabına giriş yapıldı.",
        "success"
      );


    } catch (error) {

      console.error(
        "[TürkAI] Login:",
        error
      );


      el.authMessage?.classList.add(
        "error"
      );

      setText(
        el.authMessage,
        error?.message ||
          "Giriş yapılamadı."
      );


      toast?.(
        "Giriş başarısız",
        error?.message ||
          "Kimlik bilgileri doğrulanamadı.",
        "error"
      );


    } finally {

      setButtonLoading(
        submit,
        false
      );

    }

  }


  if (el.authForm) {

    el.authForm.addEventListener(
      "submit",
      event => {

        event.preventDefault();

        login();

      }
    );

  }


  if (el.guestLoginButton) {

    el.guestLoginButton.addEventListener(
      "click",
      () => {

        state.account = {

          id:
            "guest",

          name:
            "Misafir",

          plan:
            "Free",

          guest:
            true

        };


        renderAccount();


        closeModal?.(
          "authModal"
        );


        toast?.(
          "Misafir modu aktif",
          "Hesap oluşturmadan devam edebilirsin.",
          "success"
        );

      }
    );

  }


  /* =======================================================
     CHAT SEARCH
     ======================================================= */

  function searchChat(
    query
  ) {

    const value =
      String(
        query ??
        el.chatSearchInput?.value ??
        ""
      ).trim().toLocaleLowerCase(
        "tr-TR"
      );


    if (
      !el.chatSearchResults
    ) {
      return;
    }


    if (!value) {

      el.chatSearchResults.innerHTML =
        `

          <div class="empty-state compact">

            <div class="empty-state-icon">

              <svg aria-hidden="true">
                <use href="#i-search"></use>
              </svg>

            </div>

            <h3>
              Aramaya hazır
            </h3>

            <p>
              Mesajlarında aramak için bir kelime yaz.
            </p>

          </div>

        `;

      return;

    }


    const matches =
      (state.messages || [])
        .filter(
          message =>
            String(
              message.content ||
              ""
            )
              .toLocaleLowerCase(
                "tr-TR"
              )
              .includes(value)
        );


    if (!matches.length) {

      el.chatSearchResults.innerHTML =
        `

          <div class="empty-state compact">

            <div class="empty-state-icon">

              <svg aria-hidden="true">
                <use href="#i-search"></use>
              </svg>

            </div>

            <h3>
              Sonuç yok
            </h3>

            <p>
              Bu ifade mevcut konuşmada bulunamadı.
            </p>

          </div>

        `;

      return;

    }


    el.chatSearchResults.innerHTML =
      matches
        .map(
          message => `

            <button
              type="button"
              class="search-result-item"
            >

              <span class="search-result-role">
                ${escapeHTML(
                  message.role === "user"
                    ? "Sen"
                    : "TürkAI"
                )}
              </span>

              <div class="search-result-text">
                ${escapeHTML(
                  message.content
                )}
              </div>

            </button>

          `
        )
        .join("");

  }


  if (el.chatSearchInput) {

    el.chatSearchInput.addEventListener(
      "input",
      () =>
        searchChat()
    );

  }


  /* =======================================================
     COMMAND CENTER
     ======================================================= */

  const commands = [

    {
      id:
        "new",

      title:
        "Yeni sohbet",

      keywords:
        "yeni sohbet new temiz"

    },

    {
      id:
        "research",

      title:
        "Web araştırması",

      keywords:
        "araştır web internet araştırma"

    },

    {
      id:
        "weather",

      title:
        "Hava durumu",

      keywords:
        "hava hava durumu şehir"

    },

    {
      id:
        "memory",

      title:
        "Hafıza",

      keywords:
        "hafıza memory kayıt"

    },

    {
      id:
        "files",

      title:
        "Dosyalar",

      keywords:
        "dosya file upload yükle"

    },

    {
      id:
        "image",

      title:
        "Görsel üret",

      keywords:
        "görsel resim image üret"

    },

    {
      id:
        "video",

      title:
        "Video üret",

      keywords:
        "video üret"

    },

    {
      id:
        "plans",

      title:
        "Paketler",

      keywords:
        "paket plan pro plus ultra"

    },

    {
      id:
        "notifications",

      title:
        "Bildirimler",

      keywords:
        "bildirim notification"

    },

    {
      id:
        "system",

      title:
        "Sistem durumu",

      keywords:
        "sistem system sunucu"

    },

    {
      id:
        "settings",

      title:
        "Ayarlar",

      keywords:
        "ayar settings tercih"

    },

    {
      id:
        "account",

      title:
        "Hesap",

      keywords:
        "hesap account kullanıcı"

    }

  ];


  function runCommand(
    id
  ) {

    switch (id) {

      case "new":

        createNewChat?.();

        closeModal?.(
          "commandCenter"
        );

        break;


      case "research":

        closeModal?.(
          "commandCenter"
        );

        openPanel?.(
          "research"
        );

        break;


      case "weather":

        closeModal?.(
          "commandCenter"
        );

        openPanel?.(
          "weather"
        );

        break;


      case "memory":

        closeModal?.(
          "commandCenter"
        );

        openPanel?.(
          "memory"
        );

        break;


      case "files":

        closeModal?.(
          "commandCenter"
        );

        openPanel?.(
          "files"
        );

        break;


      case "image":

        closeModal?.(
          "commandCenter"
        );

        openModal?.(
          "imageCreateModal"
        );

        break;


      case "video":

        closeModal?.(
          "commandCenter"
        );

        openModal?.(
          "videoModal"
        );

        break;


      case "plans":

        closeModal?.(
          "commandCenter"
        );

        openPanel?.(
          "plans"
        );

        break;


      case "notifications":

        closeModal?.(
          "commandCenter"
        );

        openPanel?.(
          "notifications"
        );

        break;


      case "system":

        closeModal?.(
          "commandCenter"
        );

        openPanel?.(
          "system"
        );

        break;


      case "settings":

        closeModal?.(
          "commandCenter"
        );

        openModal?.(
          "settingsModal"
        );

        break;


      case "account":

        closeModal?.(
          "commandCenter"
        );

        openModal?.(
          "accountModal"
        );

        loadAccount();

        break;

    }

  }


  function renderCommandList(
    query = ""
  ) {

    if (!el.commandList) {
      return;
    }


    const value =
      String(
        query
      )
        .trim()
        .toLocaleLowerCase(
          "tr-TR"
        );


    const filtered =
      commands.filter(
        command => {

          if (!value) {
            return true;
          }

          return (
            command.title
              .toLocaleLowerCase(
                "tr-TR"
              )
              .includes(value) ||
            command.keywords
              .includes(value)
          );

        }
      );


    el.commandList.innerHTML =
      filtered
        .map(
          command => `

            <button
              class="command-item"
              type="button"
              data-command="${escapeHTML(
                command.id
              )}"
            >

              <span class="command-item-icon">

                <svg aria-hidden="true">
                  <use href="#i-command"></use>
                </svg>

              </span>

              <span class="command-item-copy">

                <strong>
                  ${escapeHTML(
                    command.title
                  )}
                </strong>

                <small>
                  TürkAI aracını aç
                </small>

              </span>

            </button>

          `
        )
        .join("");


    qsa(
      "#commandList [data-command]"
    ).forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            runCommand(
              button.dataset.command
            );

          }
        );

      }
    );

  }


  if (el.commandInput) {

    el.commandInput.addEventListener(
      "input",
      () => {

        renderCommandList(
          el.commandInput.value
        );

      }
    );


    el.commandInput.addEventListener(
      "keydown",
      event => {

        if (
          event.key !== "Enter"
        ) {

          return;

        }


        const first =
          el.commandList?.querySelector(
            "[data-command]"
          );


        if (first) {

          event.preventDefault();

          runCommand(
            first.dataset.command
          );

        }

      }
    );

  }


  renderCommandList();


  /* =======================================================
     TOOL BUTTONS
     ======================================================= */

  const quickResearch =
    $("quickResearchButton");

  if (quickResearch) {

    quickResearch.addEventListener(
      "click",
      () =>
        openPanel?.(
          "research"
        )
    );

  }


  const quickMemory =
    $("quickMemoryButton");

  if (quickMemory) {

    quickMemory.addEventListener(
      "click",
      () =>
        openPanel?.(
          "memory"
        )
    );

  }


  const quickFiles =
    $("quickFilesButton");

  if (quickFiles) {

    quickFiles.addEventListener(
      "click",
      () =>
        openPanel?.(
          "files"
        )
    );

  }


  const plansNav =
    $("plansNavButton");

  if (plansNav) {

    plansNav.addEventListener(
      "click",
      () =>
        openPanel?.(
          "plans"
        )
    );

  }


  const notificationNav =
    $("notificationNavButton");

  if (notificationNav) {

    notificationNav.addEventListener(
      "click",
      () =>
        openPanel?.(
          "notifications"
        )
    );

  }


  if (el.systemButton) {

    el.systemButton.addEventListener(
      "click",
      () =>
        openPanel?.(
          "system"
        )
    );

  }


  if (el.systemNavButton) {

    el.systemNavButton.addEventListener(
      "click",
      () =>
        openPanel?.(
          "system"
        )
    );

  }


  /* =======================================================
     TOP LEVEL QUICK TOOL BUTTONS
     ======================================================= */

  if (
    $("researchToolButton")
  ) {

    $("researchToolButton")
      .addEventListener(
        "click",
        () =>
          openPanel?.(
            "research"
          )
      );

  }


  if (
    $("weatherToolButton")
  ) {

    $("weatherToolButton")
      .addEventListener(
        "click",
        () =>
          openPanel?.(
            "weather"
          )
      );

  }


  if (
    $("memoryToolButton")
  ) {

    $("memoryToolButton")
      .addEventListener(
        "click",
        () =>
          openPanel?.(
            "memory"
          )
      );

  }


  /* =======================================================
     OPEN PANELS ON INITIAL LOAD
     ======================================================= */

  setupDragDrop();

  loadAccount();

  loadFiles();

  loadPlans();

  loadNotifications();

  loadSystemStatus();


  /* =======================================================
     KEYBOARD SHORTCUTS
     ======================================================= */

  document.addEventListener(
    "keydown",
    event => {

      const modifier =
        event.ctrlKey ||
        event.metaKey;


      /* COMMAND CENTER */

      if (
        modifier &&
        event.key.toLowerCase() === "k"
      ) {

        event.preventDefault();

        openModal?.(
          "commandCenter"
        );

        if (el.commandInput) {

          setTimeout(
            () => {

              el.commandInput.focus();

              renderCommandList();

            },
            60
          );

        }

        return;

      }


      /* SEARCH */

      if (
        modifier &&
        event.key.toLowerCase() === "f"
      ) {

        event.preventDefault();

        openModal?.(
          "chatSearchPanel"
        );

        el.chatSearchInput?.focus();

        return;

      }


      /* NEW CHAT */

      if (
        modifier &&
        event.key.toLowerCase() === "n"
      ) {

        event.preventDefault();

        createNewChat?.();

        return;

      }


      /* SIDEBAR */

      if (
        modifier &&
        event.key.toLowerCase() === "b"
      ) {

        event.preventDefault();

        $("sidebarToggle")
          ?.click();

        return;

      }


      /* COMMAND HELP */

      if (
        event.key === "/" &&
        document.activeElement ===
          $("messageInput")
      ) {

        return;

      }

    }
  );


  /* =======================================================
     SLASH COMMAND BRIDGE
     ======================================================= */

  /*
   * Part 1 sendMessage zaten handleSlashCommand
   * arıyor. Burada fonksiyonu global olarak tanımlıyoruz.
   */

  window.handleSlashCommand =
    async function (
      value
    ) {

      const input =
        String(
          value ||
          ""
        ).trim();


      if (
        !input.startsWith("/")
      ) {

        return false;

      }


      const raw =
        input
          .slice(1)
          .trim();


      if (!raw) {

        openModal?.(
          "commandHelpModal"
        );

        return true;

      }


      const pieces =
        raw.split(/\s+/);


      const command =
        (
          pieces.shift() ||
          ""
        ).toLocaleLowerCase(
          "tr-TR"
        );


      const argument =
        pieces.join(" ").trim();


      if (
        command === "new"
      ) {

        createNewChat?.();

        return true;

      }


      if (
        command === "research"
      ) {

        openPanel?.(
          "research"
        );

        if (
          argument &&
          el.researchInput
        ) {

          el.researchInput.value =
            argument;

          await runResearch(
            argument
          );

        }

        return true;

      }


      if (
        command === "weather"
      ) {

        openPanel?.(
          "weather"
        );

        if (
          argument &&
          el.weatherInput
        ) {

          el.weatherInput.value =
            argument;

          await runWeather(
            argument
          );

        }

        return true;

      }


      if (
        command === "memory"
      ) {

        openPanel?.(
          "memory"
        );

        if (
          argument
        ) {

          if (el.memoryInput) {

            el.memoryInput.value =
              argument;

          }

          await searchMemory(
            argument
          );

        }

        return true;

      }


      if (
        command === "files"
      ) {

        openPanel?.(
          "files"
        );

        return true;

      }


      if (
        command === "image"
      ) {

        openModal?.(
          "imageCreateModal"
        );


        if (
          argument &&
          el.imagePromptInput
        ) {

          el.imagePromptInput.value =
            argument;

        }

        return true;

      }


      if (
        command === "video"
      ) {

        openModal?.(
          "videoModal"
        );


        if (
          argument &&
          el.videoPromptInput
        ) {

          el.videoPromptInput.value =
            argument;

        }

        return true;

      }


      if (
        command === "plans"
      ) {

        openPanel?.(
          "plans"
        );

        return true;

      }


      if (
        command === "notifications"
      ) {

        openPanel?.(
          "notifications"
        );

        return true;

      }


      if (
        command === "system"
      ) {

        openPanel?.(
          "system"
        );

        return true;

      }


      if (
        command === "settings"
      ) {

        openModal?.(
          "settingsModal"
        );

        return true;

      }


      if (
        command === "account"
      ) {

        openModal?.(
          "accountModal"
        );

        await loadAccount();

        return true;

      }


      if (
        command === "help"
      ) {

        openModal?.(
          "commandHelpModal"
        );

        return true;

      }


      return false;

    };


  /* =======================================================
     COMMAND HELP BUTTONS
     ======================================================= */

  qsa(
    "[data-command-prompt]"
  ).forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          const prompt =
            button.dataset.commandPrompt ||
            "";


          const input =
            $("messageInput");


          closeModal?.(
            "commandHelpModal"
          );


          if (
            input &&
            prompt
          ) {

            input.value =
              prompt;

            input.focus();

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
      );

    }
  );


  /* =======================================================
     ACCOUNT AUTO REFRESH
     ======================================================= */

  setInterval(
    () => {

      if (
        document.visibilityState ===
        "visible"
      ) {

        loadAccount();

      }

    },
    120000
  );


  /* =======================================================
     NOTIFICATION REFRESH
     ======================================================= */

  setInterval(
    () => {

      if (
        document.visibilityState ===
        "visible"
      ) {

        loadNotifications();

      }

    },
    90000
  );


  /* =======================================================
     SYSTEM REFRESH
     ======================================================= */

  setInterval(
    () => {

      if (
        document.visibilityState ===
        "visible"
      ) {

        loadSystemStatus();

      }

    },
    60000
  );


  /* =======================================================
     ONLINE / OFFLINE
     ======================================================= */

  function updateConnectionUI() {

    const dot =
      $("connectionDot");

    const textNode =
      $("connectionText");

    const accountDot =
      $("accountStatusDot");


    if (
      navigator.onLine
    ) {

      dot?.classList.remove(
        "offline"
      );

      dot?.classList.add(
        "online"
      );

      textNode &&
        (
          textNode.textContent =
            "Bağlı"
        );


      accountDot?.classList.remove(
        "offline"
      );

      accountDot?.classList.add(
        "online"
      );

    } else {

      dot?.classList.remove(
        "online"
      );

      dot?.classList.add(
        "offline"
      );

      textNode &&
        (
          textNode.textContent =
            "Çevrimdışı"
        );


      accountDot?.classList.remove(
        "online"
      );

      accountDot?.classList.add(
        "offline"
      );

    }

  }


  window.addEventListener(
    "online",
    () => {

      updateConnectionUI();

      toast?.(
        "Bağlantı yeniden kuruldu",
        "TürkAI tekrar çevrimiçi.",
        "success"
      );

    }
  );


  window.addEventListener(
    "offline",
    () => {

      updateConnectionUI();

      toast?.(
        "Bağlantı kesildi",
        "İnternet bağlantını kontrol et.",
        "warning"
      );

    }
  );


  updateConnectionUI();


  /* =======================================================
     MOBILE SIDEBAR
     ======================================================= */

  window.addEventListener(
    "resize",
    () => {

      if (
        window.innerWidth > 800
      ) {

        $("sidebar")
          ?.classList
          .remove(
            "mobile-closed"
          );

      }

    }
  );


  /* =======================================================
     BEFORE UNLOAD
     ======================================================= */

  window.addEventListener(
    "beforeunload",
    () => {

      const input =
        $("messageInput");


      const draft =
        input?.value ||
        "";


      if (
        draft &&
        state.settings?.draftSave !== false
      ) {

        try {

          localStorage.setItem(
            "turkai40_draft",
            JSON.stringify(
              draft
            )
          );

        } catch {}

      }

    }
  );


  /* =======================================================
     PUBLIC BRIDGE
     ======================================================= */

  window.TURKAI = {

    ...window.TURKAI,

    runResearch,

    runWeather,

    searchMemory,

    loadMemoryOverview,

    loadFiles,

    uploadFiles,

    loadPlans,

    loadNotifications,

    loadSystemStatus,

    loadAccount,

    login,

    generateImage,

    generateVideo,

    searchChat,

    runCommand,

    renderPlans,

    renderFiles,

    renderNotifications,

    renderSystem,

    version:
      CONFIG.version ||
      "40.0.0",

    frontend:
      "PART_2_ACTIVE"

  };


  /* =======================================================
     FINAL
     ======================================================= */

  console.log(
    "%cTürkAI Frontend 40.0 — PART 2/2 AKTİF",
    "font-weight:800"
  );

  console.log(
    "Chat:",
    typeof sendMessage ===
      "function"
      ? "ACTIVE"
      : "MISSING"
  );

  console.log(
    "API:",
    typeof apiRequest ===
      "function"
      ? "ACTIVE"
      : "MISSING"
  );

  console.log(
    "Research:",
    typeof runResearch ===
      "function"
      ? "ACTIVE"
      : "MISSING"
  );

  console.log(
    "Weather:",
    typeof runWeather ===
      "function"
      ? "ACTIVE"
      : "MISSING"
  );

  console.log(
    "Memory:",
    typeof searchMemory ===
      "function"
      ? "ACTIVE"
      : "MISSING"
  );

  console.log(
    "Files:",
    typeof uploadFiles ===
      "function"
      ? "ACTIVE"
      : "MISSING"
  );

  console.log(
    "Media:",
    typeof generateImage ===
      "function"
      ? "ACTIVE"
      : "MISSING"
  );

  console.log(
    "Plans:",
    typeof loadPlans ===
      "function"
      ? "ACTIVE"
      : "MISSING"
  );

  console.log(
    "System:",
    typeof loadSystemStatus ===
      "function"
      ? "ACTIVE"
      : "MISSING"
  );

  console.log(
    "======================================"
  );

})();
