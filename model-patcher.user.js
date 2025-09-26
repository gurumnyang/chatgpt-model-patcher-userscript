// ==UserScript==
// @name         ChatGPT model patcher
// @version      0.1.0
// @description  좌하단 드롭다운으로 모델을 고르고, /backend-api/conversation 요청의 body.model만 바꿉니다.
// @match        https://chatgpt.com/*
// @match        https://www.chatgpt.com/*
// @run-at       document-start
// @grant        none
// @updateURL   https://raw.githubusercontent.com/gurumnyang/chatgpt-model-patcher-userscript/main/model-patcher.user.js
// @downloadURL https://raw.githubusercontent.com/gurumnyang/chatgpt-model-patcher-userscript/main/model-patcher.user.js
// ==/UserScript==



//ChatGPT로 생성된 코드
//인간 개발자의 검토를 거쳤습니다.
(function () {
  'use strict';

  const KEY = 'cgpt_forced_model';
  const MODELS = ['gpt-5', 'gpt-5-t-mini','gpt-5-thinking', 'gpt-4.1', 'gpt-4o', 'o3','o4-mini'];
  let forced = localStorage.getItem(KEY) || MODELS[0];

  if (!window.__cgpt_model_hook__) {
    const prevFetch = window.fetch;
    window.fetch = async function (input, init) {
      try {
        const url = input instanceof Request ? input.url : String(input);
        const u = new URL(url, location.href);

        if (
          u.origin === location.origin &&
          (u.pathname === '/backend-api/conversation' || u.pathname === '/backend-api/f/conversation') &&
          u.search === ''
        ) {
          if (input instanceof Request) {
            const txt = await input.clone().text();
            const patched = patch(txt, forced);
            if (patched) return prevFetch(new Request(input, { body: patched }));
            return prevFetch(input);
          } else {
            const opts = init || {};
            if (opts.body) {
              const txt = await new Response(opts.body).text();
              const patched = patch(txt, forced);
              if (patched) return prevFetch(url, { ...opts, body: patched });
            }
            return prevFetch(input, init);
          }
        }
        return prevFetch(input, init);
      } catch {
        return prevFetch(input, init);
      }
    };
    window.__cgpt_model_hook__ = true;
  }

  function patch(text, model) {
    if (!text) return null;
    try {
      const j = JSON.parse(text);
      if (j && typeof j === 'object') {
        j.model = model;
        return JSON.stringify(j);
      }
    } catch {}
    return null;
  }

  // --- 초간단 UI(좌하단 드롭다운 + 현재값 표시) ---
  function ui() {
    if (document.getElementById('cgpt-model-dd')) return;

    const box = document.createElement('div');
    box.id = 'cgpt-model-dd';
    Object.assign(box.style, {
      position: 'fixed', left: '12px', bottom: '12px', zIndex: 2147483647,
      background: 'rgba(0,0,0,.72)', color: '#fff', padding: '8px', borderRadius: '10px',
      font: '12px/1.2 system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial'
    });

    const sel = document.createElement('select');
    Object.assign(sel.style, {
      background: 'rgba(255,255,255,.1)', color: '#fff', border: '1px solid rgba(255,255,255,.3)',
      borderRadius: '8px', padding: '4px 8px', marginRight: '6px'
    });
    MODELS.forEach(m => {
      const o = document.createElement('option');
      o.value = m; o.textContent = m;
      Object.assign(o.style,{
          color: "#222",
      });
      sel.appendChild(o);

    });
    if (!MODELS.includes(forced)) {
      const o = document.createElement('option');
      o.value = forced; o.textContent = forced; sel.appendChild(o);
    }
    sel.value = forced;
    sel.onchange = () => {
      forced = sel.value;
      try { localStorage.setItem(KEY, forced); } catch {}
      badge.textContent = forced;
    };

    const badge = document.createElement('span');
    badge.textContent = forced;
    Object.assign(badge.style, {
      border: '1px solid rgba(255,255,255,.3)', borderRadius: '999px',
      padding: '2px 8px', background: 'rgba(255,255,255,.08)', fontWeight: 600
    });

    box.appendChild(sel);
    box.appendChild(badge);
    document.documentElement.appendChild(box);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ui, { once: true });
  } else {
    ui();
  }
  // SPA 보정(간단 유지)
  setInterval(() => { if (!document.getElementById('cgpt-model-dd')) ui(); }, 3000);
})();
