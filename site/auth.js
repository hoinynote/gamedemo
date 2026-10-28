(function initializeRopeboundAuth(window) {
  "use strict";

  const PUBLIC_CONFIG_PATH = "/api/config";
  const DEFAULT_SCOPES = ["openid", "profile"];

  function isLocalPreviewHost(hostname = window.location.hostname) {
    return hostname === "localhost" || hostname === "127.0.0.1";
  }

  class AuthSession {
    constructor() {
      this.config = null;
      this.client = null;
      this.account = null;
      this.profile = null;
      this.status = "loading";
      this.error = "";
      this.localPreviewAvailable = false;
      this.localPreview = false;
      this.syncing = false;
      this.syncRetryTimer = null;
      this.syncRetryCount = 0;
    }

    async initialize() {
      const staticConfig = window.ROPEBOUND_AUTH_CONFIG || {};
      const hasStaticConfig = Boolean(staticConfig.tenantId && staticConfig.clientId && staticConfig.apiScope);
      try {
        const response = await fetch(PUBLIC_CONFIG_PATH, { cache: "no-store" });
        if (!response.ok) throw new Error(`Public auth configuration returned ${response.status}.`);
        const apiConfig = await response.json();
        this.config = apiConfig.configured ? apiConfig : null;
      } catch (error) {
        this.error = error.message || "인증 설정을 읽을 수 없습니다.";
      }
      if (!this.config && hasStaticConfig) this.config = { ...staticConfig, configured: true };
      if (!this.config) this.config = { tenantId: "", clientId: "", apiScope: "", configured: false };
      if (!this.config.configured) {
        this.status = "unconfigured";
        this.localPreviewAvailable = isLocalPreviewHost() && !this.config.configured;
        return this.snapshot();
      }
      if (!window.msal?.PublicClientApplication) {
        this.status = "unavailable";
        this.error = "회사 로그인 구성요소를 불러오지 못했습니다.";
        return this.snapshot();
      }
      try {
        this.client = new window.msal.PublicClientApplication({
          auth: {
            clientId: this.config.clientId,
            authority: `https://login.microsoftonline.com/${encodeURIComponent(this.config.tenantId)}`,
            redirectUri: `${window.location.origin}/`,
            postLogoutRedirectUri: `${window.location.origin}/`,
          },
          cache: { cacheLocation: "sessionStorage", storeAuthStateInCookie: false },
        });
        await this.client.initialize();
        const redirectResult = await this.client.handleRedirectPromise();
        this.account = redirectResult?.account || this.client.getActiveAccount() || this.client.getAllAccounts()[0] || null;
        if (this.account) {
          this.assertTenant(this.account);
          this.client.setActiveAccount(this.account);
          this.status = "authenticated";
        } else {
          this.status = "signed-out";
        }
      } catch {
        this.account = null;
        this.status = "unavailable";
        this.error = "회사 계정 로그인을 완료하지 못했습니다. 다시 시도해 주세요.";
      }
      return this.snapshot();
    }

    snapshot() {
      return {
        status: this.status,
        configured: Boolean(this.config?.configured),
        localPreviewAvailable: this.localPreviewAvailable,
        localPreview: this.localPreview,
        displayName: this.getDisplayName(),
        ownerId: this.getOwnerId(),
        error: this.error,
      };
    }

    getDisplayName() {
      if (this.localPreview) return "로컬 플레이어";
      return this.account?.name || this.account?.idTokenClaims?.name || "회사 사용자";
    }

    getOwnerId() {
      if (this.localPreview) return "local-preview";
      const claims = this.account?.idTokenClaims || {};
      return claims.tid && claims.oid ? `${claims.tid}:${claims.oid}` : this.account?.homeAccountId || "";
    }

    assertTenant(account) {
      const tenantId = account?.idTokenClaims?.tid;
      if (!tenantId || tenantId.toLowerCase() !== this.config.tenantId.toLowerCase()) {
        throw new Error("Only the configured company tenant is allowed.");
      }
    }

    async signIn() {
      if (!this.client || !this.config?.configured) throw new Error("회사 로그인 설정이 아직 완료되지 않았습니다.");
      await this.client.loginRedirect({ scopes: [...DEFAULT_SCOPES, this.config.apiScope] });
    }

    async signOut() {
      if (!this.client || !this.account) return;
      const account = this.account;
      this.account = null;
      this.profile = null;
      this.status = "signed-out";
      await this.client.logoutRedirect({ account, postLogoutRedirectUri: `${window.location.origin}/` });
    }

    async getAccessToken() {
      if (this.localPreview) return "";
      if (!this.client || !this.account || !this.config?.apiScope) throw new Error("회사 계정으로 로그인해 주세요.");
      this.assertTenant(this.account);
      try {
        const result = await this.client.acquireTokenSilent({ account: this.account, scopes: [this.config.apiScope] });
        return result.accessToken;
      } catch (error) {
        if (error instanceof window.msal.InteractionRequiredAuthError) {
          await this.client.acquireTokenRedirect({ account: this.account, scopes: [this.config.apiScope] });
        }
        throw error;
      }
    }

    async requestApi(path, options = {}) {
      if (!path.startsWith("/api/")) throw new Error("API requests must use a same-origin /api route.");
      if (this.localPreview) throw new Error("로컬 미리보기에서는 회사 기록을 동기화하지 않습니다.");
      const token = await this.getAccessToken();
      const headers = new Headers(options.headers || {});
      headers.set("Authorization", `Bearer ${token}`);
      if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
      const response = await fetch(path, { ...options, headers, cache: "no-store" });
      let body = null;
      try { body = await response.json(); } catch { /* generic response error */ }
      if (!response.ok) {
        const error = new Error(body?.message || `API 요청에 실패했습니다 (${response.status}).`);
        error.status = response.status;
        error.code = body?.error || "api_error";
        throw error;
      }
      return body;
    }

    pendingKey(ownerId) { return `tugmate:pending-sync:v1:${encodeURIComponent(ownerId)}`; }

    loadPendingEvents(ownerId) {
      try {
        const value = JSON.parse(window.localStorage.getItem(this.pendingKey(ownerId)) || "null");
        return value?.version === 1 && value.ownerId === ownerId && Array.isArray(value.events)
          ? value.events.filter((event) => typeof event.eventId === "string" && ["progress", "clear"].includes(event.type) && event.payload && typeof event.payload === "object")
          : [];
      } catch { return []; }
    }

    savePendingEvents(ownerId, events) {
      try {
        const key = this.pendingKey(ownerId);
        if (events.length) window.localStorage.setItem(key, JSON.stringify({ version: 1, ownerId, events }));
        else window.localStorage.removeItem(key);
        return true;
      } catch (error) {
        console.warn("Pending game sync could not be saved.", error);
        return false;
      }
    }

    enqueuePendingEvent(ownerId, type, payload) {
      if (!ownerId || !["progress", "clear"].includes(type)) return false;
      const events = this.loadPendingEvents(ownerId);
      const eventId = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      events.push({ eventId, type, createdAt: new Date().toISOString(), payload });
      return this.savePendingEvents(ownerId, events);
    }

    async syncPendingEvents(ownerId = this.getOwnerId()) {
      if (!ownerId || this.localPreview || this.status !== "authenticated" || this.syncing) return { synced: 0, pending: this.loadPendingEvents(ownerId).length };
      this.syncing = true;
      let synced = 0;
      let events = this.loadPendingEvents(ownerId);
      try {
        while (events.length) {
          const event = events[0];
          const result = await this.requestApi(event.type === "clear" ? "/api/clear" : "/api/progress", {
            method: "POST", body: JSON.stringify(event.payload),
          });
          if (result?.profile) this.profile = result.profile;
          events = events.filter((candidate) => candidate.eventId !== event.eventId);
          this.savePendingEvents(ownerId, events);
          synced += 1;
        }
        this.syncRetryCount = 0;
        if (this.syncRetryTimer) clearTimeout(this.syncRetryTimer);
        this.syncRetryTimer = null;
      } catch (error) {
        if (!error.status || error.status >= 500) this.scheduleSyncRetry(ownerId);
        throw error;
      } finally {
        this.syncing = false;
      }
      return { synced, pending: events.length };
    }

    scheduleSyncRetry(ownerId) {
      if (this.syncRetryTimer || this.localPreview) return;
      const delay = Math.min(60000, 2000 * (2 ** this.syncRetryCount));
      this.syncRetryCount += 1;
      this.syncRetryTimer = setTimeout(() => {
        this.syncRetryTimer = null;
        this.syncPendingEvents(ownerId).catch(() => {});
      }, delay);
    }

    clearOwnerData(ownerId) {
      if (this.syncRetryTimer) clearTimeout(this.syncRetryTimer);
      this.syncRetryTimer = null;
      try { window.localStorage.removeItem(this.pendingKey(ownerId)); } catch { /* storage may be unavailable */ }
    }

    deletionKey(ownerId) { return `tugmate:deletion-pending:v1:${encodeURIComponent(ownerId)}`; }

    hasDeletionTombstone(ownerId) {
      try { return window.localStorage.getItem(this.deletionKey(ownerId)) === "pending"; } catch { return false; }
    }

    markDeletionPending(ownerId = this.getOwnerId()) {
      if (!ownerId || this.localPreview || this.status !== "authenticated") throw new Error("회사 계정으로 로그인해 주세요.");
      try { window.localStorage.setItem(this.deletionKey(ownerId), "pending"); } catch (error) { throw new Error("삭제 대기 표시를 저장할 수 없어 안전하게 삭제를 진행하지 못했습니다."); }
      this.clearOwnerData(ownerId);
      return true;
    }

    async completePendingDeletion(ownerId = this.getOwnerId()) {
      if (!this.hasDeletionTombstone(ownerId)) return false;
      await this.requestApi("/api/me", { method: "DELETE" });
      try { window.localStorage.removeItem(this.deletionKey(ownerId)); } catch { /* server deletion already succeeded */ }
      this.profile = null;
      return true;
    }

    async deleteCurrentAccountData(ownerId = this.getOwnerId()) {
      this.markDeletionPending(ownerId);
      return this.completePendingDeletion(ownerId);
    }

    async enterLocalPreview() {
      if (!isLocalPreviewHost() || this.config?.configured) throw new Error("로컬 미리보기는 localhost에서만 사용할 수 있습니다.");
      this.localPreview = true;
      this.status = "local-preview";
      return this.snapshot();
    }
  }

  window.ropeboundAuth = new AuthSession();
})(window);
