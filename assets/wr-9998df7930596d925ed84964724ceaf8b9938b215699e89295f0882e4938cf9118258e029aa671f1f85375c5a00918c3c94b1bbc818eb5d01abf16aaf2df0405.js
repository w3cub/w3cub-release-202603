/**
 * Widget Runtime System v2.0.0
 * 企业级远程注入引擎（支持 head / 依赖 / 阶段 / 去重）
 */

(async function WidgetRuntime() {
  'use strict';

  const CONFIG_URL = window.WR_CONFIG_URL || '/conf/widget-config.json';
  const CACHE_KEY  = '__wr_cfg_v2';
  const LOADED_KEY = '__wr_loaded_v2';

  window[LOADED_KEY] = window[LOADED_KEY] || {};

  // ─── 加载配置 ─────────────────────────
  async function loadConfig() {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      const url = CONFIG_URL + '?v=' + (cached?.version || '0');

      const res = await fetch(url, { cache: 'no-cache' });
      if (res.status === 304) return cached;

      const data = await res.json();
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      return data;
    } catch (e) {
      console.warn('[WR] fallback cache');
      return JSON.parse(localStorage.getItem(CACHE_KEY) || '{"widgets":[]}');
    }
  }

  // ─── 规则匹配 ─────────────────────────
  function matchRule(rule = {}) {
    const path = location.pathname;

    if (rule.path) {
      const hit = rule.path.some(p =>
        p === '*' ||
        p === path ||
        (p.endsWith('*') && path.startsWith(p.slice(0, -1)))
      );
      if (!hit) return false;
    }

    if (rule.device) {
      const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);
      const d = isMobile ? 'mobile' : 'desktop';
      if (!rule.device.includes(d)) return false;
    }

    if (rule.timeRange) {
      const h = new Date().getHours();
      if (h < rule.timeRange[0] || h >= rule.timeRange[1]) return false;
    }

    if (rule.experiment) {
      const key = 'wr_exp_' + rule.experiment.key;
      const val = localStorage.getItem(key);
      const bucket = val !== null ? +val : Math.random();
      localStorage.setItem(key, bucket);
      if (bucket > (rule.experiment.ratio || 0.5)) return false;
    }

    return true;
  }

  // ─── 安全校验 ─────────────────────────
  const ALLOW = window.WR_ALLOW_ORIGINS || [];

  function isSafe(src) {
    if (!src) return false;
    if (!src.startsWith('http')) return true;
    if (!ALLOW.length) return true;

    try {
      const host = new URL(src).hostname;
      return ALLOW.some(o => host === o || host.endsWith('.' + o));
    } catch {
      return false;
    }
  }

  // ─── 容器选择 ─────────────────────────
  function getContainer(w) {
    if (w.inject?.container === 'head') return document.head;
    return document.body;
  }

  // ─── 去重检查 ─────────────────────────
  function isDuplicate(w) {
    if (window[LOADED_KEY][w.id]) return true;

    if (w.src && document.querySelector(`script[src="${w.src}"]`)) return true;
    if (w.href && document.querySelector(`link[href="${w.href}"]`)) return true;

    return false;
  }

  // ─── 依赖检查 ─────────────────────────
  function depsReady(w) {
    if (!w.dependsOn) return true;
    return w.dependsOn.every(id => window[LOADED_KEY][id]);
  }

  // ─── 核心注入 ─────────────────────────
  function inject(w) {
    if (isDuplicate(w)) return;
    if (!depsReady(w)) return;

    const container = getContainer(w);

    try {
      switch (w.type) {

        case 'html': {
          const el = document.querySelector(w.inject?.selector || 'body');
          if (el) el.insertAdjacentHTML(w.inject?.position || 'beforeend', w.content || '');
          break;
        }

        case 'script': {
          if (!isSafe(w.src)) return;

          const s = document.createElement('script');
          s.src = w.src;
          if (w.attrs) Object.entries(w.attrs).forEach(([k,v]) => s.setAttribute(k,v));
          container.appendChild(s);
          break;
        }

        case 'link': {
          const l = document.createElement('link');
          l.rel = 'stylesheet';
          l.href = w.href;
          container.appendChild(l);
          break;
        }

        case 'style': {
          const st = document.createElement('style');
          st.innerHTML = w.content || '';
          document.head.appendChild(st);
          break;
        }

        case 'inline-script': {
          new Function(w.content || '')();
          break;
        }

        default:
          console.warn('[WR] unknown type', w.type);
      }

      window[LOADED_KEY][w.id] = true;
      document.dispatchEvent(new CustomEvent('wr:injected', { detail: w }));

      console.log('[WR] ✓', w.id);

    } catch (e) {
      console.error('[WR] error', w.id, e);
    }
  }

  // ─── 调度器（支持 stage）────────────────
  function runWidget(w) {
    const delay = w.trigger?.delay || 0;

    const exec = () => setTimeout(() => inject(w), delay);

    switch (w.stage) {
      case 'head':
        inject(w);
        break;

      case 'domready':
        document.addEventListener('DOMContentLoaded', exec);
        break;

      case 'load':
        if (document.readyState === 'complete') {
          exec();
        } else {
          window.addEventListener('load', exec);
        }
        break;

      case 'idle':
        'requestIdleCallback' in window
          ? requestIdleCallback(exec)
          : setTimeout(exec, 1000);
        break;

      default:
        exec();
    }
  }

  function schedule(widgets = []) {
    widgets
      .filter(w => w.enabled !== false)
      .filter(w => matchRule(w.match))
      .sort((a,b)=> (b.priority||0)-(a.priority||0))
      .forEach(runWidget);
  }

  // ─── SPA 监听 ─────────────────────────
  let last = location.pathname;

  function routeChange() {
    if (location.pathname === last) return;
    last = location.pathname;
    window[LOADED_KEY] = {};
    schedule(window.__WR_CONFIG.widgets);
  }

  history.pushState = new Proxy(history.pushState, {
    apply(target, thisArg, args) {
      target.apply(thisArg, args);
      routeChange();
    }
  });

  window.addEventListener('popstate', routeChange);

  // ─── API ─────────────────────────
  window.WidgetRuntime = {
    refresh() {
      window[LOADED_KEY] = {};
      schedule(window.__WR_CONFIG.widgets);
    },
    add(w) {
      window.__WR_CONFIG.widgets.push(w);
      runWidget(w);
    },
    get loaded() {
      return Object.keys(window[LOADED_KEY]);
    }
  };

  // ─── 启动 ─────────────────────────
  const config = await loadConfig();
  window.__WR_CONFIG = config;

  console.log('[WR] v2.0 loaded:', config.widgets.length);
  schedule(config.widgets);

})();
