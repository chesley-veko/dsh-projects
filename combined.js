(function () {
  'use strict';

  /* ---------- 图标（16px 线性，与 dsh-claude-style 同一种笔触） ---------- */
  const I = {
    plus: `<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M8 3.2v9.6M3.2 8h9.6"/></svg>`,
    more: `<svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor"><circle cx="3.4" cy="8" r="1.05"/><circle cx="8" cy="8" r="1.05"/><circle cx="12.6" cy="8" r="1.05"/></svg>`,
    search: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="7" cy="7" r="4.2"/><path d="M10.1 10.1l3.3 3.3"/></svg>`,
    folder: `<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><path d="M2 5.2c0-.77.63-1.4 1.4-1.4h2.3l1.2 1.5h5.7c.77 0 1.4.63 1.4 1.4v4.9c0 .77-.63 1.4-1.4 1.4H3.4c-.77 0-1.4-.63-1.4-1.4z"/></svg>`,
    plug: `<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6.2 2.4v2.8M9.8 2.4v2.8M4.7 5.2h6.6v2.3a3.3 3.3 0 0 1-6.6 0zM8 10.8v2.6"/></svg>`,
    lock: `<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><rect x="3.2" y="7.1" width="9.6" height="6.4" rx="1.4"/><path d="M5.6 7V5.4a2.4 2.4 0 0 1 4.8 0V7"/></svg>`,
    focus: `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><circle cx="8" cy="8" r="3.2"/><path d="M8 1.8v2.2M8 12v2.2M1.8 8h2.2M12 8h2.2"/></svg>`,
    clock: `<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><circle cx="8" cy="8" r="5.4"/><path d="M8 4.9v3.3l2.1 1.3"/></svg>`,
    gear: `<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><circle cx="8" cy="8" r="2.1"/><path d="M8 1.9v1.4M8 12.7v1.4M1.9 8h1.4M12.7 8h1.4M3.7 3.7l1 1M11.3 11.3l1 1M12.3 3.7l-1 1M4.7 11.3l-1 1"/></svg>`,
    pencil: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3.2 12.8l.6-2.7 6.5-6.5 2.1 2.1-6.5 6.5z"/><path d="M9.5 4.5l2.1 2.1"/></svg>`,
    pause: `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><rect x="4.6" y="3.4" width="2.3" height="9.2" rx="1"/><rect x="9.1" y="3.4" width="2.3" height="9.2" rx="1"/></svg>`,
    play: `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M5.6 3.6l6.8 4.4-6.8 4.4z"/></svg>`,
    archive: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="2.2" y="3" width="11.6" height="2.8" rx="1"/><path d="M3.5 5.8v6.3c0 .5.4.9.9.9h7.2c.5 0 .9-.4.9-.9V5.8M6.4 8.5h3.2"/></svg>`,
    trash: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2.8 4.3h10.4M6.1 4.3V2.9h3.8v1.4M4.2 4.3l.6 8.2h6.4l.6-8.2"/></svg>`,
    chevD: `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 3.8L5 6.3l2.5-2.5"/></svg>`,
    chevR: `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3.8 2.5L6.3 5l-2.5 2.5"/></svg>`,
    back: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9.6 3.4L5 8l4.6 4.6"/></svg>`,
    arrowUp: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 12.5V3.7M4.1 7.6L8 3.7l3.9 3.9"/></svg>`,
    arrowDown: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3.5v8.8M4.1 8.4L8 12.3l3.9-3.9"/></svg>`,
    check: `<svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.4 6.2l2.4 2.4 4.8-5"/></svg>`,
    bolt: `<svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor"><path d="M8.8 1.6L3.6 8.7h3.1L6.2 14.4 11.4 7.3H8.3z"/></svg>`,
    laptop: `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3.2" y="3.2" width="9.6" height="6.6" rx="1"/><path d="M2 12.2h12"/></svg>`,
    x: `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>`,
    copy: `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="5.6" y="5.6" width="7" height="7" rx="1.2"/><path d="M10.4 5.6V4.2c0-.8-.6-1.4-1.4-1.4H4.2c-.8 0-1.4.6-1.4 1.4v4.8c0 .8.6 1.4 1.4 1.4h1.4"/></svg>`,
    panel: `<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><rect x="2.2" y="2.8" width="11.6" height="10.4" rx="1.4"/><path d="M6.2 2.8v10.4"/></svg>`,
    filter: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2.6 4.2h10.8M4.6 8h6.8M6.4 11.8h3.2"/></svg>`,
    branch: `<svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="4.4" cy="3.6" r="1.6"/><circle cx="4.4" cy="12.4" r="1.6"/><circle cx="11.6" cy="5.8" r="1.6"/><path d="M4.4 5.2v5.6M6 6.2h3.4"/></svg>`,
    file: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><path d="M9 1.9H4.2c-.7 0-1.2.5-1.2 1.2v9.8c0 .7.5 1.2 1.2 1.2h7.6c.7 0 1.2-.5 1.2-1.2V5.9z"/><path d="M9 1.9v4h4"/></svg>`,
    fileText: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 1.9H4.2c-.7 0-1.2.5-1.2 1.2v9.8c0 .7.5 1.2 1.2 1.2h7.6c.7 0 1.2-.5 1.2-1.2V5.9z"/><path d="M9 1.9v4h4M5.4 8.4h5.2M5.4 10.8h5.2"/></svg>`,
    image: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="2.4" y="3" width="11.2" height="10" rx="1.4"/><circle cx="6" cy="6.4" r="1.1"/><path d="M3.4 11.4l3-3 2.2 2.2 2.2-2.2 2.2 2.2"/></svg>`,
    video: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><rect x="2.2" y="3.4" width="8.4" height="9.2" rx="1.4"/><path d="M10.6 7l3.2-2v6l-3.2-2z"/></svg>`,
    terminal: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3.4 4.2L6 8l-2.6 3.8M8 12h4.6"/></svg>`,
    spark: `<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linejoin="round"><path d="M8 1.8l1.4 4.1L13.6 7l-4.2 1.1L8 12.6 6.6 8.1 2.4 7l4.2-1.1z"/></svg>`,
    eye: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M1.8 8s2.2-4 6.2-4 6.2 4 6.2 4-2.2 4-6.2 4S1.8 8 1.8 8z"/><circle cx="8" cy="8" r="1.9"/></svg>`,
    users: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="6.2" cy="6" r="2.2"/><path d="M2.4 12.6c.4-2 1.9-3.2 3.8-3.2s3.4 1.2 3.8 3.2"/><path d="M10.6 4.2a2 2 0 0 1 0 3.8M11.6 9.6c1.1.4 1.9 1.4 2.2 2.8"/></svg>`,
    alert: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2.2L14 13H2z"/><path d="M8 6.2v3M8 11.2v.4"/></svg>`,
    stop: `<svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><rect x="4" y="4" width="8" height="8" rx="1.4"/></svg>`,
    refresh: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M13 8a5 5 0 1 1-1.6-3.7M13 2.6v2.8h-2.8"/></svg>`,
    checkCircle: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="5.7"/><path d="M5.5 8.1l1.7 1.7 3.3-3.5"/></svg>`,
    circle: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="8" cy="8" r="5.7"/></svg>`,
    circleDashed: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><circle cx="8" cy="8" r="5.7" stroke-dasharray="1.6 2.8"/></svg>`,
    spinner: `<svg class="spin-icon" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M8 2.4a5.6 5.6 0 1 1-4.5 2.3"/><circle cx="8" cy="8" r=".8" fill="currentColor" stroke="none"/></svg>`,
    xCircle: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><circle cx="8" cy="8" r="5.7"/><path d="M6.1 6.1l3.8 3.8M9.9 6.1l-3.8 3.8"/></svg>`,
    cancelCircle: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="5.7"/><path d="M6 6l4 4M10 6l-4 4"/></svg>`,
    thumbUp: `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"><path d="M3.1 7.1h2.2v6H3.1z"/><path d="M5.3 7.1l2.4-4.3c.15-.27.44-.43.75-.43h.3c.6 0 1 .58.85 1.16l-.75 2.57h2.2c.65 0 1.1.62.92 1.24l-1.1 3.9c-.12.42-.5.7-.93.7H5.3z"/></svg>`,
    thumbDown: `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"><path d="M12.9 8.9h-2.2v-6h2.2z"/><path d="M10.7 8.9L8.3 13.2c-.15.27-.44.43-.75.43h-.3c-.6 0-1-.58-.85-1.16l.75-2.57h-2.2c-.65 0-1.1-.62-.92-1.24l1.1-3.9c.12-.42.5-.7.93-.7h4.64z"/></svg>`,
    expand: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2.2H2.2V6M10 2.2h3.8V6M2.2 10v3.8H6M13.8 10v3.8H10"/></svg>`,
    pin: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"><path d="M9.6 2.2l4.2 4.2-1.8.8-2.3 2.3.2 2.4-1 .9-2-2L3 14l1.3-3.9-2-2 .9-1 2.4.2 2.3-2.3z"/></svg>`,
    external: `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9.4 2.8h3.8v3.8M13.2 2.8L7.6 8.4"/><path d="M11.6 9.4v3.2c0 .3-.3.6-.6.6H3.4c-.3 0-.6-.3-.6-.6V4.8c0-.3.3-.6.6-.6h3.2"/></svg>`,
    whale: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3.2 13.6c0-3.9 3.2-7.1 7.2-7.1 3.4 0 6.2 2.3 7 5.4.3 1.2 1.1 1.9 2.3 2.1.7.1 1.1.6 1.1 1.2 0 .7-.6 1.2-1.3 1.2h-1.9c-.9 0-1.6-.6-1.8-1.5-.2-1.1-1.2-1.9-2.3-1.9-1.4 0-2.5 1.1-2.5 2.5v.4c0 .3-.2.5-.5.5H6.9c-2 0-3.7-1.6-3.7-3.6z"/><circle cx="9.4" cy="10.2" r="1.15" fill="var(--canvas)"/></svg>`,
    claude: `<svg width="20" height="20" viewBox="0 0 148.09 148.18" fill="currentColor" aria-hidden="true"><g transform="translate(-75.96,-223.53)"><path d="m 105.01,322.07 29.14,-16.35 0.49,-1.42 -0.49,-0.79 h -1.42 l -4.87,-0.3 -16.65,-0.45 -14.44,-0.6 -13.99,-0.75 -3.52,-0.75 -3.3,-4.35 0.34,-2.17 2.96,-1.99 4.24,0.37 9.37,0.64 14.06,0.97 10.2,0.6 15.11,1.57 h 2.4 l 0.34,-0.97 -0.82,-0.6 -0.64,-0.6 -14.55,-9.86 -15.75,-10.42 -8.25,-6 -4.46,-3.04 -2.25,-2.85 -0.97,-6.22 4.05,-4.46 5.44,0.37 1.39,0.37 5.51,4.24 11.77,9.11 15.37,11.32 2.25,1.87 0.9,-0.64 0.11,-0.45 -1.01,-1.69 -8.36,-15.11 -8.92,-15.37 -3.97,-6.37 -1.05,-3.82 c -0.37,-1.57 -0.64,-2.89 -0.64,-4.5 l 4.61,-6.26 2.55,-0.82 6.15,0.82 2.59,2.25 3.82,8.74 6.19,13.76 9.6,18.71 2.81,5.55 1.5,5.14 0.56,1.57 h 0.97 v -0.9 l 0.79,-10.54 1.46,-12.94 1.42,-16.65 0.49,-4.69 2.32,-5.62 4.61,-3.04 3.6,1.72 2.96,4.24 -0.41,2.74 -1.76,11.44 -3.45,17.92 -2.25,12 h 1.31 l 1.5,-1.5 6.07,-8.06 10.2,-12.75 4.5,-5.06 5.25,-5.59 3.37,-2.66 h 6.37 l 4.69,6.97 -2.1,7.2 -6.56,8.32 -5.44,7.05 -7.8,10.5 -4.87,8.4 0.45,0.67 1.16,-0.11 17.62,-3.75 9.52,-1.72 11.36,-1.95 5.14,2.4 0.56,2.44 -2.02,4.99 -12.15,3 -14.25,2.85 -21.22,5.02 -0.26,0.19 0.3,0.37 9.56,0.9 4.09,0.22 h 10.01 l 18.64,1.39 4.87,3.22 2.92,3.94 -0.49,3 -7.5,3.82 -10.12,-2.4 -23.62,-5.62 -8.1,-2.02 h -1.12 v 0.67 l 6.75,6.6 12.37,11.17 15.49,14.4 0.79,3.56 -1.99,2.81 -2.1,-0.3 -13.61,-10.24 -5.25,-4.61 -11.89,-10.01 h -0.79 v 1.05 l 2.74,4.01 14.47,21.75 0.75,6.67 -1.05,2.17 -3.75,1.31 -4.12,-0.75 -8.47,-11.89 -8.74,-13.39 -7.05,-12 -0.86,0.49 -4.16,44.81 -1.95,2.29 -4.5,1.72 -3.75,-2.85 -1.99,-4.61 1.99,-9.11 2.4,-11.89 1.95,-9.45 1.76,-11.74 1.05,-3.9 -0.07,-0.26 -0.86,0.11 -8.85,12.15 -13.46,18.19 -10.65,11.4 -2.55,1.01 -4.42,-2.29 0.41,-4.09 2.47,-3.64 14.74,-18.75 8.89,-11.62 5.74,-6.71 -0.04,-0.97 h -0.34 l -39.15,25.42 -6.97,0.9 -3,-2.81 0.37,-4.61 1.42,-1.5 11.77,-8.1 -0.04,0.04 z"/></g></svg>`,

  };

  const DB = {
    projects: [
      {
        id: 'youshi-product',
        name: 'Youshi产品',
        icon: 'orbit',
        colorId: 'blue',
        goal: '合盘与单人盘体验统一',
        repos: ['youshi-web', 'youshi-api'],
        time: '11 天',
        unread: true,
        status: 'active',
        events: [{ t: '项目已创建', time: '11 天前', tone: 'work', kind: 'project' }],
        members: ['veko', 'a8f2', 'e4b1', 'deploy-check', 'c31d', '9f0a'],
        defaultModel: 'Gemini 4 Argon',
        primaryRepo: 'youshi-web',
        defaultBranch: 'main',
        branches: ['main', 'release/2026-11', 'develop', 'staging', 'feat/merge-switch', 'fix/tunnel-whitelist'],
        refsUpdated: '10 分钟前',
        refsAgeMin: 10,
        remoteBranches: ['main', 'release/2026-11', 'develop', 'staging', 'fix/tunnel-whitelist'],
        nextSeq: 8,
        tasks: [
          {
            id: 'YOU-4', title: 'Staging 灰度验证', summary: '预发环境验证 f31489d，确认老用户迁移不丢数据', status: 'waiting', repo: 'youshi-api',
            desc: '在 ap-southeast-1 预发环境验证 f31489d 的合盘逻辑，确认老用户迁移后不丢数据。',
            worker: 'worker-deploy-check', worktree: 'agent/you-4-staging-verify', assignee: 'deploy-check', model: 'Gemini 4 Argon',
            prs: [], files: [{ path: 'infra/tunnel/whitelist.yaml', add: '+6', del: '' }, { path: 'scripts/smoke-staging.mjs', add: '+18', del: '-2' }],
            timeline: [
              { t: '拉起预发环境，部署 f31489d 到 staging', time: '12 分钟前', tone: 'work' },
              { t: '冒烟通过：登录、合盘切换、消息回流', time: '6 分钟前', tone: 'ok' },
              { t: 'Cloudflare Tunnel 白名单未包含新容器 IP', time: '2 分钟前', tone: 'warn' }
            ],
            question: {
              from: 'YOU-4', worker: 'worker-deploy-check',
              text: '预发环境 ap-southeast-1 的 Cloudflare Tunnel 白名单还没加新容器 IP，要先只更 staging 还是等你配好一起切？',
              options: ['先只更 staging，不动生产', '暂停等待，我去配 Cloudflare']
            }
          },
          {
            id: 'YOU-6', title: '合盘埋点补全', summary: '补齐合盘切换、选盘、退出的三个埋点', status: 'review', repo: 'youshi-web',
            desc: '补上合盘切换、选盘、退出的三个埋点，方便后面看转化漏斗。',
            worker: 'worker-e4b1', worktree: 'agent/you-6-tracking', assignee: 'e4b1', model: 'Gemini 4 Argon',
            prs: [{ num: 261, state: 'open' }], files: [{ path: 'src/analytics/track.ts', add: '+48', del: '-12' }],
            timeline: [
              { t: '定位三个交互入口，接入统一埋点 SDK', time: '1 天前', tone: 'work' },
              { t: '自测通过，提交 PR #261', time: '5 小时前', tone: 'ok' }
            ]
          },
          {
            id: 'YOU-5', title: '线上滚动发布 f31489d', summary: '等 YOU-4 通过后滚动发布', status: 'queued', repo: 'youshi-api',
            desc: '等 YOU-4 的 staging 验证通过后再执行，滚动发布带健康检查与回滚预案。',
            worker: '', worktree: '', model: 'Gemini 4 Argon', prs: [], blockedBy: ['YOU-4'],
            timeline: [{ t: '已排队，依赖 YOU-4 通过', time: '10 分钟前', tone: '' }]
          },
          {
            id: 'YOU-7', title: '上线后 24h 观测', summary: '滚动发布后观察错误率、回滚指标与用户反馈', status: 'queued', repo: 'youshi-api',
            desc: '发布后盯 24 小时错误率、回滚指标与用户反馈，异常时触发回滚预案。',
            worker: '', worktree: '', assignee: '9f0a', model: 'Gemini 4 Argon', prs: [], blockedBy: ['YOU-5'],
            timeline: [{ t: '等待 YOU-5 完成', time: '刚刚', tone: 'warn' }]
          },
          {
            id: 'YOU-1', title: '合盘切回单人盘', summary: '已合进 main（f31489d），服务器仍是 d006108', status: 'done', repo: 'youshi-web',
            desc: '合盘里已经有消息时，左侧能点回单人盘；两对合盘来回切、胶囊上的 ×、「+」选盘都要切得走。',
            worker: 'worker-a8f2', worktree: 'agent/you-1-single-switch', assignee: 'a8f2', model: 'Gemini 4 Argon',
            prs: [{ num: 252, state: 'merged' }], files: [{ path: 'src/views/merge-state.ts', add: '+37', del: '-4' }, { path: 'tests/unit/chartSwitch.test.mjs', add: '+705', del: '' }],
            timeline: [
              { t: '定位合盘状态机与单人盘入口，复现三个切换路径', time: '3 天前', tone: 'work' },
              { t: '重写视图切换，胶囊 × 与「+」选盘接入同一状态源', time: '2 天前', tone: 'work' },
              { t: 'Chromium / WebKit 三档视口回归通过', time: '2 天前', tone: 'ok' },
              { t: 'PR #252 合并到 main，提交 f31489d', time: '11 天前', tone: 'ok' }
            ]
          },
          {
            id: 'YOU-2', title: '合盘分数', summary: '合盘分数接入新数据源，随 d006108 上线', status: 'done', repo: 'youshi-web',
            desc: '合盘分数计算接入新的关系数据源。',
            worker: 'worker-c31d', worktree: 'agent/you-2-score', assignee: 'c31d', model: 'Gemini 4 Argon',
            prs: [{ num: 228, state: 'merged' }], files: [{ path: 'src/score/aggregate.ts', add: '+64', del: '-21' }],
            timeline: [
              { t: '接入关系数据源，补分数回落逻辑', time: '14 天前', tone: 'work' },
              { t: 'PR #228 合并，随 d006108 上线', time: '13 天前', tone: 'ok' }
            ]
          },
          {
            id: 'YOU-3', title: 'Production deploy', summary: 'youshi.fun is on d006108; health 200', status: 'done', repo: 'youshi-api',
            desc: '生产发布记录。',
            worker: 'worker-9f0a', worktree: 'agent/you-3-deploy', assignee: '9f0a', model: 'Gemini 4 Argon',
            prs: [], badges: ['Trust Cloudflare client IP'], files: [{ path: 'deploy/manifest.yaml', add: '+14', del: '-3' }],
            timeline: [{ t: '滚动发布到生产，健康检查通过', time: '13 天前', tone: 'ok' }]
          }
        ],
        library: [
          { path: 'INDEX.md', scope: 'index', status: 'ratified', meta: '680' },
          { path: 'decisions/004-single-switch-state.md', scope: 'decision', status: 'ratified', meta: 'YOU-1' },
          { path: 'decisions/003-score-source.md', scope: 'decision', status: 'ratified', meta: 'YOU-2' },
          { path: 'runbooks/playwright-3-viewports.md', scope: 'runbook', status: 'proposed', meta: '草稿' },
          { path: 'runbooks/cf-tunnel-whitelist.md', scope: 'runbook', status: 'disputed', meta: 'YOU-4' },
          { path: 'specs/youshi-merge-ux.md', scope: 'spec', status: 'ratified', meta: '1.2k' },
          { path: 'artifacts/YOU-1-touch-regression.webm', scope: 'artifact', status: '', meta: '2:35' },
          { path: 'artifacts/YOU-1-dandelion-390x844.png', scope: 'artifact', status: '', meta: 'PNG' },
          { path: 'uploads/competitor-merge-flow.pdf', scope: 'user', status: '', meta: '4.1 MB' }
        ],
        messages: [
          { kind: 'user', text: '把 @YOU-1 合盘切回单人盘的逻辑合进 main，顺便跑完 Chromium 和 WebKit 三档高度（390×844、390×664、360×740）回归，线上机器先别动。', time: '11 天前' },
          { kind: 'relay', text: 'YOU-1 · 4 条' },
          {
            kind: 'agent',
            text: '第二轮用触摸里测过了，Chromium 和 WebKit 都跑了，三档高度是 <code class="inl">390×844</code>、<code class="inl">390×664</code>、<code class="inl">360×740</code>。合盘里已经有消息时，左侧能点回单人盘；两对合盘来回切、胶囊上的 ×、「+」选盘，也都切得走。',
            artifact: { name: 'Entering user details', sub: '2:35 · 48 Steps' }
          },
          { kind: 'agent', text: '<span class="ref" data-pr="252">#252</span> 已经合进 <code class="inl">main</code>，提交是 <code class="inl">f31489d</code>。服务器没动，线上还是 <code class="inl">d006108</code>。' },
          { kind: 'user', text: '先把 staging 更上去看看，别动生产。', time: '12 分钟前' },
          { kind: 'relay', text: 'YOU-4 · 3 条' },
          { kind: 'agent', text: 'staging 已经在部署 <code class="inl">f31489d</code> 了，冒烟过了登录和合盘切换。有个前置条件卡住了。' },
          { kind: 'user', text: '合盘埋点那个 PR 你看了吗？', time: '8 分钟前' },
          { kind: 'relay', text: 'YOU-6 · 2 条' },
          { kind: 'agent', text: '看了。<span class="ref" data-pr="261">#261</span> 只动了三个入口的埋点上报，没有改视图逻辑，可以直接合。要不要我顺手把埋点字段对齐到 <code class="inl">decisions/003-score-source.md</code> 里的命名？' },

          { kind: 'changes', files: 2, review: 'Review', rows: [
            { name: 'JS', path: 'tmp-pass2-probe.mjs', add: '+705' },
            { name: 'MD', path: 'notes.migrated.md', add: '+25' }
          ], changes: { add: 37, del: 4 } },
          { kind: 'user', text: '先不用，等这轮发布完了统一改。', time: '5 分钟前' }
        ]
      },
      {
        id: 'bzti',
        name: 'BZTI',
        icon: 'prism',
        colorId: 'red',
        goal: '招投标资料自动生成',
        repos: ['bzti-docs'],
        time: '27 天',
        unread: false,
        status: 'active',
        events: [{ t: '项目已创建', time: '27 天前', tone: 'work', kind: 'project' }],
        members: ['veko', 'bzti', '7d21', '2c88'],
        defaultModel: 'Claude Opus 4.6 (Thinking)',
        primaryRepo: 'bzti-docs',
        defaultBranch: 'main',
        branches: ['main', 'release/2026-10', 'feat/template-parser'],
        refsUpdated: '2 小时前',
        refsAgeMin: 120,
        remoteBranches: ['main', 'release/2026-10'],
        nextSeq: 3,
        tasks: [
          {
            id: 'BZT-2', title: '投标文件模板抽取', summary: '从 12 份历史标书抽出通用章节骨架', status: 'review', repo: 'bzti-docs',
            desc: '从 12 份历史标书里抽出通用的章节骨架与话术模板。',
            worker: 'worker-7d21', worktree: 'agent/bzt-2-template', assignee: '7d21', model: 'Gemini 4 Argon', blockedBy: ['BZT-1'],
            prs: [{ num: 41, state: 'open' }],
            timeline: [
              { t: '解析 12 份 PDF，聚类出 7 个通用章节', time: '2 天前', tone: 'work' },
              { t: '生成模板草稿并自查，提交 PR #41', time: '1 天前', tone: 'ok' }
            ]
          },
          {
            id: 'BZT-1', title: '历史标书入库', summary: '历史标书统一转 markdown 入库', status: 'done', repo: 'bzti-docs',
            desc: '把历史标书统一转成 markdown 并入库。',
            worker: 'worker-2c88', worktree: 'agent/bzt-1-ingest', assignee: '2c88', model: 'Gemini 4 Argon',
            prs: [],
            timeline: [{ t: '128 份文档入库完成', time: '25 天前', tone: 'ok' }]
          }
        ],
        library: [
          { path: 'INDEX.md', scope: 'index', status: 'ratified', meta: '410' },
          { path: 'decisions/001-pdf-parser.md', scope: 'decision', status: 'ratified', meta: 'BZT-1' },
          { path: 'runbooks/ocr-fallback.md', scope: 'runbook', status: 'ratified', meta: 'BZT-1' }
        ],
        messages: [
          { kind: 'agent', text: 'BZT-2 的模板整理完了，抽出 7 个通用章节，PR <span class="ref" data-pr="41">#41</span> 等你评审。' }
        ]
      },
      {
        id: 'native',
        name: 'native',
        icon: 'cube',
        colorId: 'magenta',
        goal: '把 Web 端功能对齐到原生壳',
        repos: ['native-shell'],
        time: '17 天',
        unread: false,
        status: 'active',
        events: [{ t: '项目已创建', time: '17 天前', tone: 'work', kind: 'project' }],
        members: ['veko'],
        defaultModel: 'GPT-6.1 Sol',
        primaryRepo: 'native-shell',
        defaultBranch: 'main',
        branches: ['main', 'next'],
        refsUpdated: '昨天',
        refsAgeMin: 1440,
        remoteBranches: ['main', 'next'],
        nextSeq: 1,
        tasks: [],
        library: [{ path: 'INDEX.md', scope: 'index', status: 'proposed', meta: '草稿' }],
        messages: [
          { kind: 'agent', text: '项目建好了。直接说要做的事，我拆成任务派下去。' }
        ]
      }
    ],
    workspaces: [
      { id: 'ws-openhanako', name: 'openhanako', path: '~/work/openhanako', sessions: [{ name: '2026-10-27 晚间复盘', time: '7 天' }, { name: '10-27 访谈现状底稿', time: '8 天' }] },
      { id: 'ws-youshi', name: 'youshi', path: '~/work/apps/youshi', sessions: [{ name: '合盘切换回归记录', time: '9 天' }] },
      { id: 'ws-interview', name: 'interview', path: '~/work/interview', sessions: [{ name: '访谈脚本 v2', time: '12 天' }] }
    ],

    homeSessions: [
      { id: 's-job', name: '2026 and 2027 job search', time: '28 天', tone: 'green' },
      { id: 's-chinese', name: 'Chinese course availability', time: '10 天', tone: 'blue' },
      { id: 's-gemini', name: 'Gemini desktop login issue', time: '25 天', tone: 'amber' },
      { id: 's-notion', name: 'Notion issue check', time: '1 个月', tone: 'purple' }
    ]

  };


  const ST = {
    waiting: { label: 'Waiting on you', color: 'var(--warn)' },
    review:  { label: 'For Review',     color: 'var(--info)' },
    working: { label: 'In Progress',    color: 'var(--accent)' },
    queued:   { label: 'Queued',         color: 'var(--ink-4)' },
    done:     { label: 'Done',           color: 'var(--ok)' },
    canceled: { label: 'Canceled',       color: 'var(--ink-4)' }
  };
  const GROUP_ORDER = ['waiting', 'review', 'working', 'queued', 'done', 'canceled'];

  const PROJECT_MARKS = {
    smiley: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round"><circle cx="8" cy="8" r="5.7"/><circle cx="6.1" cy="6.7" r=".55" fill="currentColor" stroke="none"/><circle cx="9.9" cy="6.7" r=".55" fill="currentColor" stroke="none"/><path d="M5.6 9.6c.6 1 1.4 1.5 2.4 1.5s1.8-.5 2.4-1.5"/></svg>`,
    smileyPlus: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><circle cx="7.2" cy="7.8" r="5.1"/><circle cx="5.4" cy="6.6" r=".5" fill="currentColor" stroke="none"/><circle cx="9" cy="6.6" r=".5" fill="currentColor" stroke="none"/><path d="M4.9 9.4c.5.9 1.2 1.3 2.1 1.3.8 0 1.4-.3 1.9-1"/><path d="M13.2 11.4v3.1M11.7 13h3.1"/></svg>`,
    spark: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linejoin="round"><path d="M8 1.9l1.5 4.6 4.6 1.5-4.6 1.5L8 14.1l-1.5-4.6L1.9 8l4.6-1.5z"/></svg>`,
    orbit: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><circle cx="8" cy="8" r="2.1"/><ellipse cx="8" cy="8" rx="6.1" ry="2.6" transform="rotate(-24 8 8)"/><circle cx="13.2" cy="5.1" r=".8" fill="currentColor" stroke="none"/></svg>`,
    prism: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"><path d="M8 2.1l5.9 10.8H2.1z"/><path d="M8 2.1v10.8M4.8 8.1h6.4"/></svg>`,
    cube: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"><path d="M8 1.9l5.5 3.2v5.8L8 14.1l-5.5-3.2V5.1z"/><path d="M2.6 5.2L8 8.3l5.4-3.1M8 8.3V14"/></svg>`,
    wave: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round"><path d="M1.7 6.3c1.3-1.8 2.6-1.8 3.9 0s2.6 1.8 3.9 0 2.6-1.8 3.9 0"/><path d="M1.7 10.1c1.3-1.8 2.6-1.8 3.9 0s2.6 1.8 3.9 0 2.6-1.8 3.9 0"/></svg>`,
    leaf: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M13.2 2.8C8.7 2.4 4.8 4.2 4.4 8c-.2 1.7.9 3 2.5 3.3 2.9.5 5.8-2.6 6.3-8.5z"/><path d="M3.2 13.4c2.1-3.6 4.6-6 7.6-7.7"/></svg>`,
    terminal: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="12" height="10" rx="1.8"/><path d="M4.7 6.3L6.9 8.5 4.7 10.7M8.3 10.7h3.2"/></svg>`,
    book: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M3.1 2.9c1.7-.5 3.3-.1 4.9 1.1v9.2c-1.6-1.2-3.2-1.6-4.9-1.1z"/><path d="M12.9 2.9c-1.7-.5-3.3-.1-4.9 1.1v9.2c1.6-1.2 3.2-1.6 4.9-1.1z"/></svg>`,
    layers: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"><path d="M8 2.2l5.4 3.1L8 8.4 2.6 5.3z"/><path d="M2.6 8.2L8 11.3l5.4-3.1M2.6 11.2L8 14.3l5.4-3.1"/></svg>`,
    compass: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="5.7"/><path d="M10.4 5.6L9.1 9.1 5.6 10.4 6.9 6.9z"/></svg>`,
    grid: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"><rect x="2.3" y="2.3" width="4.5" height="4.5" rx="1.1"/><rect x="9.2" y="2.3" width="4.5" height="4.5" rx="1.1"/><rect x="2.3" y="9.2" width="4.5" height="4.5" rx="1.1"/><rect x="9.2" y="9.2" width="4.5" height="4.5" rx="1.1"/></svg>`,
    bolt: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"><path d="M9.4 1.8L3.8 9h3.4L6.6 14.2 12.2 7H8.8z"/></svg>`
  };

  const PROJECT_ICONS = Object.keys(PROJECT_MARKS).map((id) => ({ id, svg: PROJECT_MARKS[id] }));

  const PROJECT_COLORS = [
    { id: 'gray', label: '灰' }, { id: 'red', label: '红' }, { id: 'orange', label: '橙' },
    { id: 'yellow', label: '黄' }, { id: 'green', label: '绿' }, { id: 'cyan', label: '青' },
    { id: 'blue', label: '蓝' }, { id: 'purple', label: '紫' }, { id: 'magenta', label: '品红' }
  ];
  const PROJECT_COLOR_IDS = PROJECT_COLORS.map((c) => c.id);

  function agentById(id) { return AGENTS.find((a) => a.id === id) || null; }

  function projectMark(id) { return PROJECT_MARKS[id] || PROJECT_MARKS.smiley; }

  function isRemoteBranch(p, b) {
    return !!(p && (p.remoteBranches || []).includes(b));
  }

  function logProjectEvent(p, text, tone, kind) {
    if (!p) return;
    p.events = p.events || [];
    p.events.unshift({ t: text, time: '刚刚', tone: tone || 'work', kind: kind || 'project' });
    if (p.events.length > 30) p.events.length = 30;
  }

  function refsMeta(p) {
    const age = p && p.refsAgeMin !== undefined ? Number(p.refsAgeMin) : 0;
    return { age, stale: !p || !p.refsUpdated || age >= 60, label: (p && p.refsUpdated) || '未同步' };
  }

  function customIconStyle(fit, zoom) {
    const f = fit === 'cover' ? 'cover' : 'contain';
    const z = Math.max(1, Math.min(2.5, Number(zoom) || 1));
    return `object-fit:${f};transform:scale(${z})`;
  }

  function customIconImg(src, fit, zoom) {
    return `<img src="${esc(src)}" alt="" style="${customIconStyle(fit, zoom)}">`;
  }

  function projectBadge(p, cls) {
    const color = PROJECT_COLOR_IDS.includes(p && p.colorId) ? p.colorId : 'gray';
    if (p && p.customIcon) {
      return `<span class="p-icon custom ${cls || ''}">${customIconImg(p.customIcon, p.customFit, p.customZoom)}</span>`;
    }
    if (p && p.icon === 'letter') {
      const initial = (p.name || 'P').trim().charAt(0).toUpperCase() || 'P';
      return `<span class="p-icon letter tint-${color} ${cls || ''}"><span>${esc(initial)}</span></span>`;
    }
    return `<span class="p-icon tint-${color} ${cls || ''}">${projectMark(p && p.icon)}</span>`;
  }
  const REPOS = ['youshi-web', 'youshi-api', 'bzti-docs', 'native-shell', 'openhanako'];
  const BRANCHES = ['main', 'develop', 'staging', 'release/2026-11'];
  const REF_EXTRA = {
    'youshi-product': ['feat/rollback-plan', 'release/2026-12'],
    bzti: ['feat/pdf-ocr'],
    native: ['feat/ios-bridge'],
    _default: ['feat/next', 'release/2026-12']
  };
  const AGENTS = [
    { id: 'veko', label: 'veko', role: 'Owner', color: '#4d6bfe' },
    { id: 'a8f2', label: 'a8f2', role: 'Worker', color: '#2ea06e' },
    { id: 'e4b1', label: 'e4b1', role: 'Worker', color: '#c9912e' },
    { id: 'deploy-check', label: 'deploy-check', role: 'Worker', color: '#7c5cff' },
    { id: 'bzti', label: 'bzti', role: 'Worker', color: '#d75f5f' },
    { id: 'c31d', label: 'c31d', role: 'Worker', color: '#3a9db8' },
    { id: '9f0a', label: '9f0a', role: 'Worker', color: '#b06fb8' },
    { id: '7d21', label: '7d21', role: 'Worker', color: '#c07a3a' },
    { id: '2c88', label: '2c88', role: 'Worker', color: '#5c9a5c' }
  ];
  const MODELS = [
    { name: 'Gemini 4 Argon', sub: 'Google Vertex' },
    { name: 'Claude Opus 4.6 (Thinking)', sub: 'Antigravity' },
    { name: 'GPT-6.1 Sol', sub: 'OpenAI' }
  ];
  const ENVS = [
    { name: '本机 Worktree', sub: '~/work/youshi', status: 'ok', health: '就绪 · Node 24.21' },
    { name: '远程 Sandbox', sub: 'ap-southeast-1', status: 'off', health: '连接超时 · 不可用' }
  ];

  function envMeta(name) {
    return ENVS.find((e) => e.name === name) || { name, sub: '', status: 'ok', health: '就绪' };
  }

  const S = {
    active: 'youshi-product',
    pane: 'list',
    detail: null,
    peek: null,
    tray: false,
    answered: {},
    collapsed: {},
    typing: false,
    typingProject: null,
    toastTimer: null,
    showArchived: false,
    searchOpen: false,
    sideQuery: '',
    focusSearch: false,
    filter: null,
    rightOpen: true,
    sideOpen: true,
    model: 'Gemini 4 Argon',
    env: '本机 Worktree',
    clickTimer: null,
    focusComposer: false,
    focusTray: false,
    stick: false,
    enterLast: false,
    logFor: null,
    scrollRightTop: false,
    animateRight: false,
    mentionIndex: 0,
    mentionOpen: false,
    swap: false,
    expandedWork: {},
    expandedProcess: {},
    expandedGroups: {},
    expandedThoughts: {},
    feedback: {},
    centerView: 'chat',
    trailFilter: 'all',
    trailMember: null,
    trailKind: null,
    depFocus: null,
    folders: {},
    paletteOpen: false,
    paletteQuery: '',
    paletteIndex: 0,
    paletteResults: [],
    newTask: null,
    dragTask: null,
    dragMode: null,
    dragTarget: null,
    suppressClickUntil: 0,
    panelSearch: false,
    panelQuery: '',
    focusPanelSearch: false,
    taskEdit: null
  };

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const isClaude = () => document.documentElement.dataset.brand === 'claude';
  const proj = () => DB.projects.find((p) => p.id === S.active) || DB.projects[0];
  const byStatus = (p, st) => p.tasks.filter((t) => t.status === st);
  const waitingTasks = (p) => p.tasks.filter((t) => t.status === 'waiting');
  const agentTasks = (p) => p.tasks.filter((t) => t.status === 'working' || t.status === 'queued');

  function toast(text) {
    const old = $('.toast');
    if (old) old.remove();
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<span class="ti">${I.check}</span>${esc(text)}`;
    document.body.appendChild(el);
    clearTimeout(S.toastTimer);
    S.toastTimer = setTimeout(() => el.remove(), 2200);
  }

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (e) { /* ignore */ }
      ta.remove();
    }
    toast('已复制');
  }

  function inline(text) {
    return String(text)
      .replace(/<span class="ref" data-pr="(\d+)">#\1<\/span>/g, '<span class="ref">' + I.branch + '#$1</span>')
      .replace(/@([A-Z]{2,4}-\d+)/g, '<span class="ref" data-ref-task="$1">@$1</span>')
      .replace(/(^|[\s（(])#(\d+)/g, '$1<span class="ref">' + I.branch + '#$2</span>');
  }

  function messagePlain(p, i) {
    const m = p.messages[i];
    if (!m) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = m.text || '';
    let out = tmp.textContent || '';
    if (m.attachments && m.attachments.length) out += (out ? '\n' : '') + m.attachments.map((a) => `[附件] ${a}`).join('\n');
    return out.trim();
  }

  function attachmentsHTML(list, removable) {
    if (!list || !list.length) return '';
    return `<div class="attachments">${list.map((f, i) => `
      <span class="attach-chip">${I.file}<span class="fn">${esc(f)}</span>
        ${removable ? `<button class="rm" data-rm-attach="${i}" aria-label="移除附件">${I.x}</button>` : ''}
      </span>`).join('')}</div>`;
  }

  const WORK_DURATION = {
    'YOU-1': '36分6秒', 'YOU-2': '8分21秒', 'YOU-3': '2分14秒',
    'YOU-4': '34秒', 'YOU-5': '45秒', 'YOU-6': '12秒',
    'BZT-1': '9分5秒', 'BZT-2': '18分40秒'
  };

  function workDuration(t) {
    return (t && WORK_DURATION[t.id]) || `${Math.max(8, (t && t.timeline ? t.timeline.length : 1) * 7)}s`;
  }

  function workSteps(p, t) {
    if (!t) return [];
    const statusMap = { done: 'Completed', working: 'In Progress', waiting: 'Waiting on you', queued: 'Queued', review: 'In Review', canceled: 'Canceled' };
    const steps = [
      { type: 'task', label: t.title, status: statusMap[t.status] || 'Queued' },
      { type: 'thought', label: t.id === 'YOU-1' ? 'Thought 3s' : 'Thought 8s' }
    ];
    const file = p.library.find((f) => f.scope === 'decision') || p.library.find((f) => f.scope === 'runbook') || p.library.find((f) => f.scope === 'spec');
    if (file) steps.push({ type: 'edit', path: file.path, add: t.id === 'YOU-1' ? 12 : 7, del: t.id === 'YOU-1' ? 3 : 2 });
    steps.push({ type: 'thought', label: 'Thought briefly' });
    const tail = t.timeline && t.timeline.length ? t.timeline[t.timeline.length - 1].t : '';
    steps.push({
      type: 'done',
      label: t.status === 'done' ? 'Finished ' + t.title : t.status === 'waiting' ? 'Waiting for your answer' : tail || 'Still running'
    });
    return steps;
  }

  function prepareMessages() {
    DB.projects.forEach((p) => {
      let lastUser = '';
      const out = [];
      p.messages.forEach((m) => {
        if (m.kind === 'relay') {
          const tid = ((m.text || '').match(/^([A-Z]{2,4}-\d+)/) || [])[1];
          const t = p.tasks.find((x) => x.id === tid);
          out.push({ kind: 'process', task: tid, duration: workDuration(t), groups: processGroups(p, t) });
          return;
        }
        if (m.kind === 'changes') return;
        if (m.kind === 'user') lastUser = m.time || lastUser;
        if (m.kind === 'agent' && !m.at) m.at = lastUser || '11 天前';
        out.push(m);
      });
      p.messages = out;
    });
  }

  function processGroups(p, t) {
    if (!t) return [];
    const file = p.library.find((f) => f.scope === 'decision') || p.library.find((f) => f.scope === 'runbook') || p.library.find((f) => f.scope === 'spec');
    const thought = t.desc || t.title;
    const command = t.status === 'waiting' ? 'npm run smoke:staging' : t.status === 'queued' ? 'git status --short' : 'npm test -- --run';
    return [{
      label: '读取 1 · 命令 1',
      steps: [
        { kind: 'thought', text: thought },
        { kind: 'tool', name: 'read', label: '读取文件', detail: file ? file.path : `${t.repo || 'repo'}/INDEX.md` },
        { kind: 'tool', name: 'bash', label: '运行命令', detail: command }
      ]
    }];
  }

  function thoughtPreview(text) {
    const line = String(text || '').split('\n').find((x) => x.trim() !== '') || '';
    return line.replace(/\*\*/g, '').slice(0, 120);
  }

  function processHTML(m, i) {
    const key = S.active + ':' + i;
    const open = !!S.expandedProcess[key];
    return `<div class="turn-process">
      <button class="tp-head" data-a="process-toggle" data-i="${i}" aria-expanded="${open}">
        <span class="tp-label">用时 <span class="tp-dur">${esc(m.duration)}</span></span>
        <span class="tp-chev ${open ? 'open' : ''}">${I.chevD}</span>
      </button>
      ${open ? `<div class="tp-body">${(m.groups || []).map((g, gi) => processGroupHTML(g, i, gi)).join('')}</div>` : ''}
    </div>`;
  }

  function processGroupHTML(g, i, gi) {
    const key = S.active + ':' + i + ':' + gi;
    const open = !!S.expandedGroups[key];
    return `<div class="tpg">
      <button class="tpg-head" data-a="process-group" data-i="${i}" data-g="${gi}" aria-expanded="${open}">
        <span class="tpg-title">${esc(g.label)}</span>
        <span class="tp-chev ${open ? 'open' : ''}">${I.chevD}</span>
      </button>
      ${open ? `<div class="tpg-body">${(g.steps || []).map((st, si) => processStepHTML(st, i, gi, si)).join('')}</div>` : ''}
    </div>`;
  }

  function processStepHTML(step, i, gi, si) {
    const tkey = S.active + ':' + i + ':' + gi + ':' + si;
    if (step.kind === 'thought') {
      const open = !!S.expandedThoughts[tkey];
      return `<div class="tps thought">
        <button class="tps-row" data-a="thought-toggle" data-i="${i}" data-g="${gi}" data-s="${si}" aria-expanded="${open}">
          <span class="tps-ico">${I.spark}</span>
          <span class="tps-title">思考</span>
          <span class="tps-dot"></span>
          <span class="tps-preview">${esc(thoughtPreview(step.text))}</span>
          <span class="tp-chev ${open ? 'open' : ''}">${I.chevD}</span>
        </button>
        ${open ? `<div class="tps-body">${esc(step.text)}</div>` : ''}
      </div>`;
    }
    const icon = step.name === 'bash' ? I.terminal : step.name === 'edit' ? I.pencil : I.fileText;
    return `<div class="tps tool">
      <span class="tps-row static"><span class="tps-ico">${icon}</span><span class="tps-title">${esc(step.label)}</span><span class="tps-detail">${esc(step.detail)}</span></span>
    </div>`;
  }

  function stepHTML(step) {
    if (step.type === 'task') {
      return `<div class="wstep"><span class="wico">${I.checkCircle}</span><div><div class="wt">${esc(step.label)}</div><div class="ws">${esc(step.status)}</div></div></div>`;
    }
    if (step.type === 'thought') {
      return `<div class="wstep"><span class="wico">${I.spark}</span><div class="wt">${esc(step.label)}</div></div>`;
    }
    if (step.type === 'edit') {
      return `<div class="wstep"><span class="wico">${I.file}</span><div class="wt">Edited <span class="mono">${esc(step.path)}</span> <span class="add">+${step.add}</span> <span class="del">-${step.del}</span></div></div>`;
    }
    return `<div class="wstep"><span class="wico">${I.check}</span><div class="wt muted">${esc(step.label)}</div></div>`;
  }

  function workHTML(m, i) {
    const key = S.active + ':' + i;
    const open = !!S.expandedWork[key];
    return `<div class="work">
      <button class="work-head" data-a="work-toggle" data-i="${i}" aria-expanded="${open}">
        <span class="wh-label">Worked <span class="wh-time">${esc(m.duration)}</span></span>
        <span class="wh-chev">${open ? I.chevD : I.chevR}</span>
      </button>
      ${open ? `<div class="work-steps">${(m.steps || []).map(stepHTML).join('')}</div>` : ''}
    </div>`;
  }

  function listeningItems(p) {
    const items = [];
    p.tasks.forEach((t) => (t.prs || []).forEach((pr) => {
      items.push({
        task: t.id,
        id: '#' + pr.num,
        title: t.title,
        sub: `${t.repo || 'repo'} · ${pr.state === 'merged' ? '已合并' : 'CI 通过'}`,
        color: pr.state === 'merged' ? 'var(--ok)' : 'var(--info)'
      });
    }));
    if (p.repos.length) {
      items.push({
        id: 'main',
        title: 'main · 部署完成',
        sub: `${p.repos[p.repos.length - 1]} · 5 分钟前`,
        color: 'var(--ok)'
      });
    }
    return items.slice(0, 4);
  }

  function overviewHTML(p) {
    const total = p.tasks.length;
    if (!total) return '';
    const done = p.tasks.filter((t) => t.status === 'done').length;
    const waiting = waitingTasks(p).length;
    const pct = Math.round((done / total) * 100);
    return `<div class="overview">
      <span>${total} 个任务</span>
      ${waiting ? `<span class="sep"></span><span class="ov-warn">${waiting} 待回答</span>` : ''}
      <span class="bar"><i style="width:${pct}%"></i></span>
      <span class="pct">${pct}%</span>
    </div>`;
  }

  function emptyHTML(icon, title, text, action) {
    return `<div class="empty">
      <span class="e-ico">${icon}</span>
      <div class="h">${esc(title)}</div>
      ${text ? `<p>${esc(text)}</p>` : ''}
      ${action ? `<button class="btn ghost" data-a="${action.act}">${esc(action.label)}</button>` : ''}
    </div>`;
  }

  /* ---------- 左栏 ---------- */
  function renderSide() {
    const brand = isClaude();
    const all = DB.projects;
    const visible = all.filter((p) => p.status !== 'archived').sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned));
    const archived = all.filter((p) => p.status === 'archived');

    const row = (p) => `
      <div class="row ${p.id === S.active ? 'on' : ''} ${p.status === 'archived' ? 'archived' : ''}"
           data-proj="${p.id}" data-search="${esc((p.name + ' ' + p.goal + ' ' + p.repos.join(' ')).toLowerCase())}"
           role="button" tabindex="0" ${p.id === S.active ? 'aria-current="page"' : ''}>
        ${projectBadge(p)}
        <span class="name">${esc(p.name)}</span>
        ${p.unread && p.id !== S.active ? '<span class="unread"></span>' : ''}
        ${p.status === 'paused' ? `<span class="paused">${I.pause}</span>` : ''}
        <span class="tail">${esc(p.time)}</span>
        <button class="more" data-projmenu="${p.id}" aria-label="项目操作">${I.more}</button>
      </div>`;

    const wsRow = (w) => {
      const collapsed = !!S.collapsed['ws:' + w.id];
      return `<div class="ws-row" data-a="ws-toggle" data-ws="${w.id}" data-search="${esc((w.name + ' ' + (w.path || '')).toLowerCase())}" role="button" tabindex="0" aria-expanded="${!collapsed}">
        <span class="ws-name">${esc(w.name)}</span>
        <button class="more" data-wsmenu="${w.id}" aria-label="工作区操作">${I.more}</button>
      </div>
      ${collapsed ? '' : (w.sessions || []).map((x, i) => `<div class="ws-session" data-ws-sess="${w.id}:${i}" data-search="${esc((w.name + ' ' + x.name).toLowerCase())}" role="button" tabindex="0" title="加入项目">
        <span class="ws-dot"></span>
        <span class="name">${esc(x.name)}</span>
        <span class="tail">${esc(x.time)}</span>
      </div>`).join('')}`;
    };

    $('#side').innerHTML = `
      <div class="side-top">
        <div class="brand">
          <span class="mark">${brand ? I.claude : I.whale}</span>
          <span class="wordmark">${brand ? 'Claude' : 'deepseek'}</span>
          <button class="iconbtn sm toggle" data-a="toggle-side" aria-label="收起侧栏" title="收起侧栏">${I.panel}</button>
        </div>
        <div class="nav">
          <div class="nav-item" data-a="new-session" role="button" tabindex="0">
            <span class="nav-plus">${I.plus}</span><span class="label">新会话</span>
          </div>
          <div class="nav-item" data-a="plugins" role="button" tabindex="0">
            <span class="ico">${I.plug}</span><span class="label">插件</span>
          </div>
        </div>
        ${S.searchOpen ? `
          <div class="side-search">
            <span class="si">${I.search}</span>
            <input id="sideSearch" value="${esc(S.sideQuery)}" placeholder="搜索项目或工作区" autocomplete="off" spellcheck="false" aria-label="搜索项目或工作区">
            <span class="esc">esc</span>
          </div>` : ''}
      </div>

      <div class="side-scroll">
        <div class="sec">
          <span class="txt">项目</span>
          <span class="acts">
            <button class="iconbtn sm" data-a="new-project" aria-label="新建项目" title="新建项目">${I.plus}</button>
          </span>
        </div>
        ${visible.map(row).join('') || (all.length ? '' : '<div class="side-empty">还没有项目。</div>')}
        ${S.showArchived ? archived.map(row).join('') : ''}
        ${archived.length ? `<div class="archive-toggle" data-a="toggle-archived" role="button" tabindex="0">
          <span>${S.showArchived ? I.chevD : I.chevR}</span><span>${S.showArchived ? '收起归档' : '已归档'} · ${archived.length}</span>
        </div>` : ''}

        <div class="sec">
          <span class="txt">工作区</span>
          <span class="acts">
            <button class="iconbtn sm" data-a="open-search" aria-label="搜索" title="搜索">${I.filter}</button>
            <button class="iconbtn sm" data-a="ws-add" aria-label="添加工作区" title="添加工作区">${I.plus}</button>
          </span>
        </div>
        ${DB.workspaces.map(wsRow).join('') || '<div class="side-empty">还没有工作区。</div>'}
        <div class="side-empty hidden" id="sideEmpty">没有匹配的项目或工作区。</div>
      </div>

      <div class="side-foot">
        <div class="account" data-a="account" role="button" tabindex="0" aria-label="账户">
          <span class="account-mark">${brand ? I.claude : I.whale}</span>
          <span class="name">veko</span>
          <span class="account-chev">${I.chevD}</span>
        </div>
      </div>`;

    if (S.focusSearch) {
      const inp = $('#sideSearch');
      if (inp) { inp.focus(); inp.select(); }
      S.focusSearch = false;
    }
    if (S.sideQuery) filterSide();
  }

  function filterSide() {
    const q = (S.sideQuery || '').trim().toLowerCase();
    let any = false;
    $$('[data-search]').forEach((el) => {
      const hit = !q || el.dataset.search.includes(q);
      el.classList.toggle('hidden', !hit);
      if (hit) any = true;
    });
    const empty = $('#sideEmpty');
    if (empty) empty.classList.toggle('hidden', !q || any);
  }

  /* ---------- 中栏 ---------- */
  function renderCenter() {
    const p = proj();
    if (!p) { $('#center').innerHTML = ''; return; }
    const q = pendingQ(p);
    const swap = S.swap;
    S.swap = false;
    const oldStream = $('#stream');
    const initial = !oldStream;
    const keepTop = oldStream ? oldStream.scrollTop : 0;
    const atBottom = !oldStream || oldStream.scrollTop + oldStream.clientHeight >= oldStream.scrollHeight - 32;

    const messages = p.messages.length
      ? p.messages.map((m, i) => messageHTML(p, m, i)).join('')
      : heroHTML(p);

    const listen = listeningItems(p);
    const pills = `
      <div class="pills">
        ${q ? `<button class="pill alert" data-a="tray" aria-expanded="${S.tray}"><span class="dot"></span>待回答<span class="n">${waitingTasks(p).length}</span></button>` : ''}
        <button class="pill" data-a="agents" aria-haspopup="dialog">${I.users}<span>Agents</span><span class="n">${agentTasks(p).length}</span></button>
        <button class="pill jump-pill" id="jumpLatest" data-a="jump-latest" aria-label="跳到最新" title="跳到最新" hidden>${I.arrowDown}</button>
        ${listen.length ? `<button class="pill" data-a="listening" aria-haspopup="dialog">${I.eye}<span>Listening</span><span class="n">${listen.length}</span></button>` : ''}
      </div>`;

    const canSend = !!(p.draft || '').trim() || (p.attachments || []).length > 0;

    $('#center').innerHTML = `
      <header class="center-head">
        ${S.sideOpen ? '' : `<button class="iconbtn" data-a="toggle-side" aria-label="显示侧栏" title="显示侧栏">${I.panel}</button>`}
        <div class="head-title">
          <button class="pname-btn" data-a="project-switch" aria-haspopup="menu" title="切换项目">
            <span class="pname">${esc(p.name)}</span><span class="pchev">${I.chevD}</span>
          </button>
          <span class="mode-chip">${I.spark}<span>项目模式</span></span>
        </div>
        <span class="spacer"></span>
        <div class="seg center-seg" role="tablist" aria-label="对话视图">
          <button role="tab" data-center="chat" class="${S.centerView === 'chat' ? 'on' : ''}" aria-selected="${S.centerView === 'chat'}">对话</button>
          <button role="tab" data-center="trail" class="${S.centerView === 'trail' ? 'on' : ''}" aria-selected="${S.centerView === 'trail'}">轨迹</button>
        </div>
        <div class="head-actions">
          <button class="iconbtn" data-a="open-library" aria-label="项目文件" title="项目文件">${I.folder}</button>
          <button class="iconbtn" data-a="project-menu" aria-label="项目操作" title="项目操作">${I.more}</button>
          <button class="iconbtn panel-toggle ${S.rightOpen ? '' : 'on'}" data-a="toggle-right" aria-label="${S.rightOpen ? '收起任务面板' : '展开任务面板'}" title="${S.rightOpen ? '收起任务面板' : '展开任务面板'}">${I.panel}</button>
        </div>
      </header>

      ${S.centerView === 'trail' ? trailHTML(p) : `
      <div class="stream" id="stream">
        <div class="stream-inner ${p.messages.length ? '' : 'hero-mode'} ${swap ? 'swap' : ''}" id="streamInner">
          ${messages}
          ${S.typing && S.typingProject === p.id ? `<div class="msg agent"><div class="txt"><span class="typing"><i></i><i></i><i></i></span></div></div>` : ''}
        </div>
      </div>
      <div class="stream-shade" aria-hidden="true"></div>

      <div class="dock">
        <div class="dock-inner">
          ${q && S.tray ? trayHTML(q) : ''}
          ${(p.tasks.length || p.messages.length) ? pills : ''}
          <div class="composer">
            ${attachmentsHTML(p.attachments || [], true)}
            <div class="composer-row">
              <textarea id="input" rows="1" placeholder="输入消息，@ 引用任务" aria-label="消息">${esc(p.draft || '')}</textarea>
              <button class="send" id="sendBtn" ${canSend ? '' : 'disabled'} aria-label="发送" title="发送">${I.arrowUp}</button>
            </div>
          </div>
          <div class="dock-foot">
            <button class="status-chip" data-a="env" aria-haspopup="dialog" title="${esc(envMeta(S.env).health)}">${I.laptop}<span class="env-dot ${envMeta(S.env).status}"></span><span>${esc(S.env)}</span><span class="chev">${I.chevD}</span></button>
            <button class="iconbtn sm foot-add" data-a="attach" aria-label="添加附件" title="添加附件">${I.plus}</button>
            <span class="foot-spacer"></span>
            <span class="foot-stats">${p.tasks.length} 个任务${waitingTasks(p).length ? ` · ${waitingTasks(p).length} 待回答` : ''}${p.tasks.length ? ` · ${Math.round(p.tasks.filter((t) => t.status === 'done').length / p.tasks.length * 100)}%` : ''}</span>
            <span class="foot-spacer"></span>
            <button class="status-chip model" data-a="model" aria-haspopup="dialog"><span>${esc(S.model)}</span><span class="chev">${I.chevD}</span></button>
          </div>
        </div>
      </div>

      ${S.peek ? peekHTML(p) : ''}
      <input type="file" id="filePick" multiple hidden>`}`;

    const stream = $('#stream');
    if (stream) {
      const shortOverflow = initial && stream.scrollHeight - stream.clientHeight < 36;
      if (S.stick || (!initial && atBottom) || (initial && !shortOverflow)) stream.scrollTop = stream.scrollHeight;
      else stream.scrollTop = initial ? 0 : Math.min(keepTop, stream.scrollHeight);
      stream.addEventListener('scroll', updateShade, { passive: true });
      updateShade();
    }
    S.stick = false;

    const input = $('#input');
    if (input) {
      grow(input);
      input.addEventListener('input', () => {
        p.draft = input.value;
        grow(input);
        updateSendState();
        updateMention(p);
      });
      input.addEventListener('keydown', (e) => {
        if (S.mentionOpen) {
          if (e.key === 'ArrowDown') { e.preventDefault(); moveMention(1); return; }
          if (e.key === 'ArrowUp') { e.preventDefault(); moveMention(-1); return; }
          if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); chooseMention(); return; }
          if (e.key === 'Escape') { e.preventDefault(); closeMention(); return; }
        }
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
      });
      if (S.focusComposer) {
        input.focus();
        const len = input.value.length;
        input.setSelectionRange(len, len);
        S.focusComposer = false;
      }
    }

    const sendBtn = $('#sendBtn');
    if (sendBtn) sendBtn.addEventListener('click', send);

    const picker = $('#filePick');
    if (picker) picker.addEventListener('change', (e) => {
      addFiles(p, e.target.files);
      e.target.value = '';
    });

    const trayInput = $('#trayInput');
    const traySend = $('#traySend');
    if (trayInput && traySend) {
      const syncTray = () => { traySend.disabled = !trayInput.value.trim(); };
      trayInput.addEventListener('input', syncTray);
      syncTray();
    }
    if (trayInput && S.focusTray) { trayInput.focus(); S.focusTray = false; }

    if (S.enterLast) {
      const msgs = $$('.msg');
      const last = msgs[msgs.length - 1];
      if (last) last.classList.add('enter');
      S.enterLast = false;
    }
  }

  function messageHTML(p, m, i) {
    if (m.kind === 'user') {
      return `<div class="msg user">
        ${m.text ? `<div class="bubble">${inline(m.text)}</div>` : ''}
        ${attachmentsHTML(m.attachments || [], false)}
        <div class="msg-foot">
          <button class="msg-act" data-a="copy" data-copy="${i}" aria-label="复制消息" title="复制">${I.copy}</button>
          <span>${esc(m.time || '刚刚')}</span>
        </div>
      </div>`;
    }
    if (m.kind === 'process') return processHTML(m, i);
    if (m.kind === 'relay') {
      const tid = ((m.text || '').match(/^([A-Z]{2,4}-\d+)/) || [])[1];
      const known = tid && p.tasks.some((t) => t.id === tid);
      return `<div class="relay" ${known ? `data-relay="${tid}" role="button" tabindex="0"` : ''} title="${known ? '查看任务' : ''}">
        <span class="label"><span class="dot"></span>${esc(m.text)}</span>
        <span class="line"></span>
        ${known ? `<span class="chev">${I.chevR}</span>` : ''}
      </div>`;
    }
    if (m.kind === 'note') return `<div class="note-line">${esc(m.text)}</div>`;

    const vote = S.feedback[S.active + ':' + i];
    const art = m.artifact ? `
      <div class="artifact" data-a="play" data-play="${i}" role="button" tabindex="0" aria-label="播放 ${esc(m.artifact.name)}">
        <div class="thumb"><span class="play">${I.play}</span><span class="dur">2:35</span></div>
        <div class="meta"><div class="nm">${esc(m.artifact.name)}</div><div class="sub">${esc(m.artifact.sub)}</div></div>
        <span class="open">播放</span>
      </div>` : '';
    return `<div class="msg agent">
      <div class="txt">${inline(m.text)}</div>
      ${art}
      <div class="msg-actions">
        <button class="mact ${vote === 'up' ? 'on' : ''}" data-a="feedback" data-vote="up" data-i="${i}" aria-label="有帮助" title="有帮助">${I.thumbUp}</button>
        <button class="mact ${vote === 'down' ? 'on' : ''}" data-a="feedback" data-vote="down" data-i="${i}" aria-label="没帮助" title="没帮助">${I.thumbDown}</button>
        <button class="mact" data-a="copy" data-copy="${i}" aria-label="复制消息" title="复制">${I.copy}</button>
        ${m.at ? `<span class="mtime">${esc(m.at)}</span>` : ''}
      </div>
    </div>`;
  }

  function changesHTML(m) {
    return `<div class="change-block">
      <div class="changes">
        <div class="changes-head"><span>${m.files || (m.rows || []).length} Files Changed</span><span class="ch-review">${esc(m.review || 'Review')}</span></div>
        ${(m.rows || []).map((r) => `<div class="ch-row"><span class="ch-name">${esc(r.name)}</span><span class="ch-path">${esc(r.path)}</span><span class="ch-add">${esc(r.add)}</span></div>`).join('')}
      </div>
      <div class="changes-chips">
        <span class="diff-chip">Changes <b>+${m.changes ? m.changes.add : 0}</b><i>-${m.changes ? m.changes.del : 0}</i></span>
        <span class="soft-badge"><i></i>Desktop</span>
        <button class="ch-down" data-a="jump-latest" aria-label="跳到最新">${I.arrowDown}</button>
      </div>
    </div>`;
  }

  function trailHTML(p) {
    const total = p.tasks.length;
    const done = p.tasks.filter((t) => t.status === 'done').length;
    const waiting = waitingTasks(p).length;
    const active = p.tasks.filter((t) => t.status === 'working').length;
    const blockedCount = p.tasks.filter((t) => (t.blockedBy || []).some((id) => {
      const b = p.tasks.find((x) => x.id === id);
      return b && b.status !== 'done' && b.status !== 'canceled';
    })).length;
    const counts = {};
    GROUP_ORDER.forEach((st) => { counts[st] = p.tasks.filter((t) => t.status === st).length; });
    const filter = S.trailFilter || 'all';
    const trailMembers = (p.members || []).map(agentById).filter(Boolean);
    const passes = (t) => !isProjectFilter && (!S.trailMember || t.assignee === S.trailMember) && (filter === 'all'
      || (filter === 'open' && t.status !== 'done' && t.status !== 'canceled')
      || (filter === 'blocked' && t.blockedBy && t.blockedBy.length > 0 && t.blockedBy.some((id) => {
        const b = p.tasks.find((x) => x.id === id);
        return b && b.status !== 'done' && b.status !== 'canceled';
      }))
      || (filter === 'done' && t.status === 'done'));
    const isProjectFilter = filter === 'project';
    const projectEvents = (isProjectFilter || (filter === 'all' && !S.trailMember))
      ? (p.events || []).filter((e) => !S.trailKind || (e.kind || 'project') === S.trailKind).map((e) => ({ project: true, e }))
      : [];
    const events = [...projectEvents];
    p.tasks.filter(passes).forEach((t) => {
      (t.timeline || []).forEach((e) => events.push({ t, e }));
    });
    const rows = events.map(({ t, e }) => `<div class="trail-row">
      <span class="trail-dot ${e.tone || ''}"></span>
      <span class="trail-time">${esc(e.time)}</span>
      <span class="trail-task">${t ? t.id : ((e.kind || 'project') === 'branch' ? '分支' : (e.kind === 'refs' ? 'refs' : '项目'))}</span>
      <span class="trail-text">${esc(e.t)}</span>
    </div>`).join('');
    const pct = total ? Math.round(done / total * 100) : 0;
    const segments = GROUP_ORDER.filter((st) => counts[st] > 0).map((st) => {
      const color = ST[st] ? ST[st].color : 'var(--ink-4)';
      return `<span class="po-seg" style="width:${counts[st] / total * 100}%;background:${color}" title="${esc(ST[st] ? ST[st].label : st)} · ${counts[st]}"></span>`;
    }).join('');
    return `<div class="trail" id="trail">
      <div class="trail-inner">
        <div class="trail-overview">
          <div class="to-goal">${esc(p.goal || '还没有写项目目标。')}</div>
          <div class="to-stats">
            <div><strong>${total}</strong><span>任务</span></div>
            <div><strong>${done}</strong><span>已完成</span></div>
            <div><strong>${active}</strong><span>进行中</span></div>
            <div><strong>${waiting}</strong><span>待回答</span></div>
          </div>
          <div class="to-progress">
            <div class="to-bar">${segments}</div>
            <div class="to-pct"><span>${pct}% 完成</span><span>${esc([p.primaryRepo || p.repos[0] || '', p.defaultBranch].filter(Boolean).join(' · '))}</span></div>
          </div>
          ${(() => {
            const members = (p.members || []).map(agentById).filter(Boolean);
            if (!members.length) return '';
            return `<div class="to-members">
              <span class="to-avatars">${members.map((a) => `<span class="to-ava" style="--av:${a.color}" title="${esc(a.label)} · ${esc(a.role)}">${esc(a.label.charAt(0).toUpperCase())}</span>`).join('')}</span>
              <span>${members.length} 名成员</span>
            </div>`;
          })()}
          ${blockedCount ? `<div class="to-blocked">${I.lock}${blockedCount} 个任务被阻塞</div>` : ''}
          <div class="to-actions">
            <button class="btn ghost sm" data-a="overview-new-task">${I.plus}新建任务</button>
            <button class="btn ghost sm" data-a="open-library">${I.folder}项目文件</button>
          </div>
        </div>
        <div class="trail-filter" role="group" aria-label="筛选最近活动">
          ${[['all', '全部'], ['open', '进行中'], ['blocked', '被阻塞'], ['done', '已完成'], ['project', '项目']].map(([id, label]) =>
            `<button class="trail-chip ${filter === id ? 'on' : ''}" data-trail="${id}" aria-pressed="${filter === id}">${label}</button>`).join('')}
        </div>
        ${trailMembers.length && filter !== 'project' ? `<div class="trail-members" role="group" aria-label="按成员筛选">
          <span class="tm-label">成员</span>
          <button class="tm-all ${!S.trailMember ? 'on' : ''}" data-trail-member="" aria-pressed="${!S.trailMember}">全部</button>
          ${trailMembers.map((a) => `<button class="tm-ava ${S.trailMember === a.id ? 'on' : ''}" data-trail-member="${a.id}" title="${esc(a.label)} · ${esc(a.role)}" aria-pressed="${S.trailMember === a.id}"><span class="mini-ava" style="--av:${a.color}">${esc(a.label.charAt(0).toUpperCase())}</span></button>`).join('')}
        </div>` : ''}
        ${isProjectFilter ? `<div class="trail-kinds" role="group" aria-label="项目活动类型">
          <span class="tm-label">类型</span>
          ${[['', '全部'], ['branch', '分支'], ['refs', 'refs'], ['project', '项目']].map(([id, label]) =>
            `<button class="trail-chip ${S.trailKind === (id || null) ? 'on' : ''}" data-trail-kind="${id}" aria-pressed="${S.trailKind === (id || null)}">${label}</button>`).join('')}
        </div>` : ''}
        <div class="trail-head">最近活动<span class="trail-count">${events.length}</span></div>
        ${rows || '<div class="empty">还没有可展示的轨迹。</div>'}
      </div>
    </div>`;
  }

  function heroHTML(p) {
    const suggestions = [
      '梳理接下来最重要的三件事',
      '读一遍仓库，列出风险清单',
      '把 INDEX.md 建起来'
    ];
    return `<div class="hero">
      ${projectBadge(p, 'xl')}
      <div class="kicker">${esc(p.name)}</div>
      <h1>${esc(p.goal || '把想法变成可推进的任务')}</h1>
      <p>说清楚要达成什么。协调者会拆成任务，交给 Worker 并行推进。</p>
      <div class="hero-sugs">
        ${suggestions.map((s) => `<button class="sug" data-suggest="${esc(s)}">${esc(s)}</button>`).join('')}
      </div>
    </div>`;
  }

  function trayHTML(q) {
    return `<div class="tray" role="region" aria-label="Worker 提问">
      <div class="tray-head">${I.bolt}<span class="who"><span class="nm">${esc(q.from)}</span><span>·</span><span>${esc(q.worker)}</span></span></div>
      <div class="tray-q">${inline(q.text)}</div>
      <div class="tray-opts">
        ${q.options.map((o, i) => `<button class="tray-opt" data-ans="${i}">${esc(o)}</button>`).join('')}
      </div>
      <div class="tray-custom">
        <input id="trayInput" placeholder="或写下你的答复…" aria-label="自定义答复" autocomplete="off">
        <button class="btn primary" id="traySend" data-a="tray-send" disabled>发送</button>
      </div>
    </div>`;
  }

  function pendingQ(p) {
    const t = p.tasks.find((x) => x.status === 'waiting' && x.question);
    if (!t) return null;
    if (S.answered[t.id]) return null;
    return t.question;
  }

  function updateShade() {
    const st = $('#stream');
    const c = $('#center');
    if (!st || !c) return;
    c.classList.toggle('scrolled', st.scrollTop > 4);
    const jump = $('#jumpLatest');
    if (jump) jump.hidden = st.scrollHeight - st.scrollTop - st.clientHeight < 120;
  }

  function grow(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }

  function updateSendState() {
    const p = proj();
    const btn = $('#sendBtn');
    const input = $('#input');
    if (!btn || !input) return;
    const can = !!input.value.trim() || (p.attachments || []).length > 0;
    btn.disabled = !can;
  }

  /* ---------- 右栏 ---------- */
  function statusIcon(st) {
    if (st === 'done') return I.checkCircle;
    if (st === 'review') return I.circle;
    if (st === 'working') return I.spinner;
    if (st === 'queued') return I.circleDashed;
    if (st === 'canceled') return I.xCircle;
    if (st === 'waiting') return I.alert;
    return I.circle;
  }

  function panelMatchesTask(t) {
    const q = S.panelQuery.trim().toLowerCase();
    if (!q) return true;
    const question = t.question ? t.question.text : '';
    const timeline = (t.timeline || []).map((e) => e.t).join(' ');
    return `${t.id} ${t.title} ${t.summary || ''} ${t.desc || ''} ${question} ${timeline} ${(t.prs || []).map((p) => '#' + p.num).join(' ')}`.toLowerCase().includes(q);
  }

  function panelMatchesFile(f) {
    const q = S.panelQuery.trim().toLowerCase();
    if (!q) return true;
    return `${f.path} ${f.scope} ${f.status || ''}`.toLowerCase().includes(q);
  }

  function prPill(num, merged, taskId) {
    return `<button class="pr-pill ${merged ? 'merged' : ''}" data-a="open-pr" data-pr="${num}" data-pr-task="${taskId || ''}" title="PR #${num}">${I.branch}<span>#${num}</span></button>`;
  }

  function badgePill(text) {
    return `<span class="soft-badge"><i></i>${esc(text)}</span>`;
  }

  function blockerTasks(p, t) {
    return (t.blockedBy || []).map((id) => p.tasks.find((x) => x.id === id)).filter(Boolean);
  }

  function activeBlockers(p, t) {
    return blockerTasks(p, t).filter((b) => b.status !== 'done' && b.status !== 'canceled');
  }

  function depPill(p, t) {
    const active = activeBlockers(p, t);
    if (!active.length) return '';
    return active.map((b) => `<button class="dep-pill" data-a="task-jump" data-task-id="${b.id}" title="被 ${b.id} 阻塞">${I.lock}<span>${b.id}</span></button>`).join('');
  }

  function depDetail(p, t) {
    const all = blockerTasks(p, t);
    const active = activeBlockers(p, t);
    if (!all.length) return `<button class="dep-manage" data-a="deps" data-task="${t.id}">${I.plus}添加依赖</button>`;
    return all.map((b) => `<button class="dep-chip ${active.some((x) => x.id === b.id) ? 'blocked' : 'resolved'}" data-a="task-jump" data-task-id="${b.id}" title="${esc(b.title)}">${active.some((x) => x.id === b.id) ? I.lock : I.check}${b.id}</button>`).join('') + `<button class="dep-manage" data-a="deps" data-task="${t.id}">管理</button>`;
  }

  function assigneeAgent(t) {
    return t && t.assignee ? agentById(t.assignee) : null;
  }

  function assigneePill(t) {
    const a = assigneeAgent(t);
    if (!a) return '';
    return `<button class="asg-pill" data-a="assignee" data-asg-task="${t.id}" title="负责人：${esc(a.label)}"><span class="mini-ava" style="--av:${a.color}">${esc(a.label.charAt(0).toUpperCase())}</span></button>`;
  }

  function assigneeInline(t, fallback) {
    const a = assigneeAgent(t);
    return `<button class="asg-inline" data-a="assignee" data-asg-task="${t.id}" title="修改负责人">${a ? `<span class="mini-ava" style="--av:${a.color}">${esc(a.label.charAt(0).toUpperCase())}</span><span>${esc(a.label)}</span>` : `<span class="asg-empty">${I.plus}${esc(fallback || '未分配')}</span>`}</button>`;
  }

  function taskPills(t) {
    const prs = (t.prs || []).map((pr) => prPill(pr.num, pr.state === 'merged', t.id)).join('');
    const badges = (t.badges || []).map(badgePill).join('');
    return depPill(proj(), t) + assigneePill(t) + prs + badges;
  }

  function renderRight() {
    const p = proj();
    if (!p) return;
    if (S.detail && !p.tasks.some((t) => t.id === S.detail)) S.detail = null;
    const oldBody = $('.right-body');
    const keepTop = oldBody ? oldBody.scrollTop : 0;
    const animate = S.animateRight;
    S.animateRight = false;
    const body = S.detail ? detailHTML(p, S.detail) : paneHTML(p);
    const showFilter = !S.detail && S.pane === 'list' && p.tasks.length > 0;

    $('#right').innerHTML = `
      <div class="pane-resizer" id="paneResizer" role="separator" aria-orientation="vertical" aria-label="调整任务面板宽度" tabindex="0" title="拖动调整宽度"></div>
      <div class="right-panel">
        <header class="right-head">
          <div class="rh-top">
            <span class="rh-kicker">Project</span>
            <button class="iconbtn sm" data-a="new-project" aria-label="新建项目" title="新建项目">${I.plus}</button>
            <span class="spacer"></span>
            <button class="iconbtn sm ${p.pinned ? 'on' : ''}" data-a="pin-project" aria-label="${p.pinned ? '取消置顶' : '置顶项目'}" title="${p.pinned ? '取消置顶' : '置顶项目'}">${I.pin}</button>
            <button class="iconbtn sm" data-a="expand-panel" aria-label="加宽面板" title="加宽面板">${I.expand}</button>
            <button class="iconbtn sm" data-a="toggle-right" aria-label="收起任务面板" title="收起任务面板">${I.x}</button>
          </div>
          <div class="rh-main">
            <button class="rh-identity" data-a="project-menu" title="项目设置">
              ${projectBadge(p, 'sm')}
              <span class="nm">${esc(p.name)}</span>
            </button>
            <span class="spacer"></span>
            ${!S.detail ? `<button class="iconbtn sm ${S.panelSearch ? 'on' : ''}" data-a="panel-search" aria-label="搜索项目" title="搜索项目">${I.search}</button>` : ''}
            ${showFilter ? `<button class="iconbtn sm ${S.filter ? 'on' : ''}" data-a="filter" aria-label="筛选任务" title="筛选任务">${I.filter}</button>` : ''}
            <div class="seg" role="tablist" aria-label="任务视图">
              <button role="tab" data-pane="list" class="${S.pane === 'list' ? 'on' : ''}" aria-selected="${S.pane === 'list'}">List</button>
              <button role="tab" data-pane="board" class="${S.pane === 'board' ? 'on' : ''}" aria-selected="${S.pane === 'board'}">Board</button>
              <button role="tab" data-pane="library" class="${S.pane === 'library' ? 'on' : ''}" aria-selected="${S.pane === 'library'}">Library</button>
            </div>
          </div>
        </header>
        ${S.panelSearch && !S.detail ? `<div class="panel-search"><span class="ps-ico">${I.search}</span><input id="panelSearchInput" value="${esc(S.panelQuery)}" placeholder="${S.pane === 'library' ? '搜索文件…' : '搜索任务…'}" autocomplete="off" spellcheck="false" aria-label="搜索项目"><button class="iconbtn sm" data-a="panel-search-close" aria-label="关闭搜索">${I.x}</button></div>` : ''}
        <div class="right-body ${animate ? 'panel-in' : ''}">${body}</div>
      </div>`;

    const nb = $('.right-body');
    if (nb) {
      if (S.scrollRightTop) { nb.scrollTop = 0; S.scrollRightTop = false; }
      else nb.scrollTop = keepTop;
    }
    bindNewTask();
    bindPanelSearch();
    bindTaskEdit();
    requestAnimationFrame(drawDependencyLines);
  }

  function paneHTML(p) {
    if (S.pane === 'board') return boardHTML(p);
    if (S.pane === 'library') return libHTML(p);
    return listHTML(p);
  }

  function listHTML(p) {
    if (!p.tasks.length && !S.newTask) {
      return emptyHTML(I.spark, '还没有任务', '', { act: 'new-task-default', label: '新建任务' });
    }
    let out = '';
    const statuses = S.filter ? [S.filter] : GROUP_ORDER;
    let any = false;

    statuses.forEach((st) => {
      const list = byStatus(p, st).filter(panelMatchesTask);
      const creating = !!(S.newTask && S.newTask.status === st);
      if (!list.length && !creating) return;
      any = true;
      const key = 'l:' + st;
      const closed = !!S.collapsed[key];
      out += `<div class="grp" data-a="collapse" data-key="${key}" role="button" tabindex="0" aria-expanded="${!closed}">
        <span class="chev">${closed ? I.chevR : I.chevD}</span>
        <span class="g-ico">${statusIcon(st)}</span>
        <span class="txt">${ST[st].label}</span>
        <button class="grp-add" data-a="add-task" data-status="${st}" aria-label="New ${esc(ST[st].label)} task" title="新建任务">${I.plus}</button>
        <span class="count">${list.length}</span>
      </div>`;
      if (closed) return;
      out += `<div class="tasks">${creating ? newTaskRow(st) : ''}${list.map((t) => {
        const desc = (t.summary || t.desc || '').trim();
        const pills = taskPills(t);
        return `<div class="task ${S.peek === t.id ? 'sel' : ''}" data-task="${t.id}" draggable="true" role="button" tabindex="0" aria-label="${esc(t.id + ' ' + t.title)}">
          <button class="t-ico" data-a="status-picker" data-task-status="${t.id}" aria-label="修改状态" title="修改状态">${statusIcon(t.status)}</button>
          <div class="t-main">
            <div class="t-top">
              <span class="tid">${t.id}</span>
              <span class="ttl">${esc(t.title)}</span>
              ${desc ? `<span class="t-desc">— ${esc(desc)}</span>` : ''}
            </div>
            ${pills ? `<div class="t-meta">${pills}</div>` : ''}
          </div>
        </div>`;
      }).join('')}</div>`;
    });

    if (!any) {
      out += emptyHTML(I.filter, S.panelQuery ? '没有匹配的任务' : '没有符合筛选的任务', '', { act: S.panelQuery ? 'clear-panel-search' : 'clear-filter', label: S.panelQuery ? '清除搜索' : '清除筛选' });
    }
    return out;
  }

  function boardHTML(p) {
    if (S.panelQuery && !p.tasks.some(panelMatchesTask)) {
      return emptyHTML(I.search, '没有匹配的任务', '', { act: 'clear-panel-search', label: '清除搜索' });
    }
    if (!p.tasks.length && !S.newTask) {
      return emptyHTML(I.spark, '看板还是空的', '', { act: 'new-task-default', label: '新建任务' });
    }
    const pairs = [];
    p.tasks.forEach((t) => activeBlockers(p, t).forEach((b) => pairs.push({ t, b })));
    const focus = S.depFocus;
    return `${pairs.length ? `<div class="board-deps">
      <span class="bd-label">${I.lock}依赖</span>
      ${pairs.map(({ t, b }) => `<button class="bd-link" data-a="task-jump" data-task-id="${t.id}" title="${b.id} 阻塞 ${t.id}">${b.id}<span class="bd-arr">→</span>${t.id}</button>`).join('')}
      <button class="bd-all" data-a="dep-panel">全部 ${pairs.length}</button>
    </div>` : ''}${focus ? `<div class="dep-focus-bar"><span class="df-label">${I.lock}聚焦</span><span class="df-path">${focus.from}<span class="bd-arr">→</span>${focus.to}</span><button class="iconbtn sm" data-a="dep-focus-clear" aria-label="清除依赖聚焦">${I.x}</button></div>` : ''}<div class="board-wrap ${focus ? 'dep-focused' : ''}"><svg class="dep-canvas" aria-hidden="true"></svg><div class="board">${GROUP_ORDER.map((st) => {
      const list = byStatus(p, st).filter(panelMatchesTask);
      const blockedN = list.filter((t) => activeBlockers(p, t).length).length;
      return `<section class="lane" data-lane="${st}">
        <div class="lane-h">
          <span class="g-ico">${statusIcon(st)}</span>
          <span class="txt">${ST[st].label}</span>
          ${blockedN ? `<span class="lane-blocked" title="${blockedN} 个任务被阻塞">${I.lock}${blockedN}</span>` : ''}
          <button class="grp-add" data-a="add-task" data-status="${st}" aria-label="New ${esc(ST[st].label)} task" title="新建任务">${I.plus}</button>
          <span class="count">${list.length}</span>
        </div>
        ${(list.length || (S.newTask && S.newTask.status === st)) ? `<div class="lane-cards">${S.newTask && S.newTask.status === st ? newTaskRow(st) : ''}${list.map((t) => `
          <div class="bcard ${activeBlockers(p, t).length ? 'blocked' : ''} ${focus ? (t.id === focus.from || t.id === focus.to ? 'focus' : '') : ''}" data-task="${t.id}" draggable="true" role="button" tabindex="0" aria-label="${esc(t.title)}">
            <div class="b-top"><span class="bid">${t.id}</span><span class="bttl">${esc(t.title)}</span></div>
            ${(t.summary || t.desc) ? `<div class="bdesc">${esc(t.summary || t.desc)}</div>` : ''}
            ${taskPills(t) ? `<div class="bottom">${taskPills(t)}</div>` : ''}
          </div>`).join('')}</div>` : ''}
      </section>`;
    }).join('')}</div></div>`;
  }

  function drawDependencyLines() {
    const board = $('.board');
    const svg = $('.dep-canvas');
    if (!board || !svg) return;
    const br = board.getBoundingClientRect();
    if (!br.width || !br.height) { svg.innerHTML = ''; return; }
    const p = proj();
    const paths = [];
    p.tasks.forEach((t) => activeBlockers(p, t).forEach((b) => {
      const from = board.querySelector(`.bcard[data-task="${b.id}"]`);
      const to = board.querySelector(`.bcard[data-task="${t.id}"]`);
      if (!from || !to) return;
      const fr = from.getBoundingClientRect();
      const tr = to.getBoundingClientRect();
      const x1 = fr.right - br.left;
      const y1 = fr.top - br.top + fr.height / 2;
      const x2 = tr.left - br.left;
      const y2 = tr.top - br.top + tr.height / 2;
      const dx = Math.max(18, Math.min(64, Math.abs(x2 - x1) * 0.5));
      const focused = S.depFocus && S.depFocus.from === b.id && S.depFocus.to === t.id;
      paths.push(`<g class="dep-group ${focused ? 'focused' : ''}" data-from="${b.id}" data-to="${t.id}">
        <path class="dep-hit" d="M${x1.toFixed(1)} ${y1.toFixed(1)} C${(x1 + dx).toFixed(1)} ${y1.toFixed(1)}, ${(x2 - dx).toFixed(1)} ${y2.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}"/>
        <path class="dep-path" d="M${x1.toFixed(1)} ${y1.toFixed(1)} C${(x1 + dx).toFixed(1)} ${y1.toFixed(1)}, ${(x2 - dx).toFixed(1)} ${y2.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}"/>
        <path class="dep-arrow" d="M${x2.toFixed(1)} ${y2.toFixed(1)} l-5 -3 l0 6 z"/>
      </g>`);
    }));
    svg.setAttribute('viewBox', `0 0 ${br.width} ${br.height}`);
    svg.setAttribute('width', String(br.width));
    svg.setAttribute('height', String(br.height));
    svg.classList.toggle('has-focus', !!S.depFocus);
    svg.innerHTML = paths.join('');
  }

  function baseName(path) {
    return String(path).split('/').pop();
  }

  function fileKind(f) {
    if (/\.(webm|mp4|mov)$/i.test(f.path)) return 'video';
    if (/\.(png|jpe?g|gif|webp)$/i.test(f.path)) return 'image';
    if (/\.pdf$/i.test(f.path)) return 'pdf';
    return 'doc';
  }

  const FILE_DATES = ['10月23日 23:32', '10月23日 21:01', '10月21日 1:54', '10月23日 22:54', '10月17日 22:19', '今天 19:04', '10月23日 23:44'];

  function fileDate(f) {
    let h = 0;
    const key = f.path || '';
    for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % 9973;
    return FILE_DATES[h % FILE_DATES.length];
  }

  function recentThumb(f) {
    const kind = fileKind(f);
    if (kind === 'video') {
      return `<span class="r-thumb video"><span class="r-play">${I.play}</span><span class="r-dur">${esc(f.meta || '')}</span></span>`;
    }
    if (kind === 'image') return `<span class="r-thumb image"><span class="r-side"></span><span class="r-photo"></span></span>`;
    if (kind === 'pdf') return `<span class="r-thumb pdf">${I.file}<span>PDF</span></span>`;
    return `<span class="r-thumb doc"><span class="r-lines"></span></span>`;
  }

  function libHTML(p) {
    const files = p.library.filter(panelMatchesFile);
    if (S.panelQuery && !files.length) {
      return emptyHTML(I.search, '没有匹配的文件', '', { act: 'clear-panel-search', label: '清除搜索' });
    }
    const recent = [
      files.find((f) => f.scope === 'index'),
      files.find((f) => f.scope === 'decision'),
      files.find((f) => /\.webm$/i.test(f.path)),
      files.find((f) => /\.png$/i.test(f.path)),
      files.find((f) => f.scope === 'user')
    ].filter(Boolean);

    const recents = recent.length ? `<div class="lib-section">
      <div class="lib-label">Recents</div>
      <div class="recents-row">
        ${recent.map((f) => `<button class="recent" data-lib="${esc(f.path)}" title="${esc(f.path)}">
          <span class="r-frame">${recentThumb(f)}</span>
          <span class="r-name">${esc(baseName(f.path))}</span>
        </button>`).join('')}
      </div>
    </div>` : '';

    return `${recents}<div class="lib-section">
      <div class="lib-label">All Files</div>
      <div class="tree">${treeHTML(p, files)}</div>
    </div>`;
  }

  function treeHTML(p, visible) {
    const source = visible || p.library;
    const roots = [
      { name: 'Project', files: source.filter((f) => f.scope !== 'user') },
      { name: 'User', files: source.filter((f) => f.scope === 'user') }
    ];

    const fileRow = (f, depth) => `<div class="tree-row file" data-lib="${esc(f.path)}" role="button" tabindex="0" style="--depth:${depth}">
      <span class="chev"></span>
      <span class="t-ico">${I.fileText}</span>
      <span class="t-name">${esc(baseName(f.path))}</span>
      <span class="t-date">${esc(fileDate(f))}</span>
    </div>`;

    const folderRow = (label, key, files, depth) => {
      const open = S.panelQuery ? true : !!S.folders[key];
      return `<div class="tree-row folder" data-a="folder" data-key="${esc(key)}" role="button" tabindex="0" aria-expanded="${open}" style="--depth:${depth}">
        <span class="chev">${open ? I.chevD : I.chevR}</span>
        <span class="t-ico">${I.folder}</span>
        <span class="t-name">${esc(label)}</span>
        <span class="t-date">${files.length ? esc(fileDate(files[0])) : ''}</span>
      </div>
      ${open ? files.map((f) => fileRow(f, depth + 1)).join('') : ''}`;
    };

    return roots.map((root) => {
      const key = 'root:' + root.name;
      const open = S.folders[key] !== false;
      const loose = root.files.filter((f) => !f.path.includes('/'));
      const dirs = {};
      root.files.filter((f) => f.path.includes('/')).forEach((f) => {
        const dir = f.path.split('/')[0];
        (dirs[dir] = dirs[dir] || []).push(f);
      });
      const rootRow = `<div class="tree-row folder root" data-a="folder" data-key="${esc(key)}" role="button" tabindex="0" aria-expanded="${open}" style="--depth:0">
        <span class="chev">${open ? I.chevD : I.chevR}</span>
        <span class="t-ico">${I.folder}</span>
        <span class="t-name">${root.name}</span>
        <span class="t-date">${root.files.length ? esc(fileDate(root.files[0])) : ''}</span>
      </div>`;
      if (!open) return rootRow;
      const looseRows = loose.map((f) => fileRow(f, 1)).join('');
      const dirRows = Object.keys(dirs).sort().map((dir) => folderRow(dir, 'dir:' + root.name + ':' + dir, dirs[dir], 1)).join('');
      return rootRow + looseRows + dirRows;
    }).join('');
  }

  function detailHTML(p, id) {
    const t = p.tasks.find((x) => x.id === id);
    if (!t) return emptyHTML(I.alert, '找不到这个任务', '', { act: 'back', label: '返回' });
    const st = ST[t.status];
    const prs = (t.prs || []).map((pr) => prPill(pr.num, pr.state === 'merged', t.id)).concat((t.badges || []).map(badgePill)).join('');

    const actions = [];
    if (t.status === 'waiting' && t.question) {
      actions.push(`<button class="btn primary" data-a="go-answer">去回答</button>`);
      actions.push(`<button class="btn ghost" data-a="mark-done" data-task="${t.id}">标记完成</button>`);
    } else if (t.status === 'working' || t.status === 'review') {
      actions.push(`<button class="btn primary" data-a="mark-done" data-task="${t.id}">标记完成</button>`);
      if (t.status === 'working') actions.push(`<button class="btn danger" data-a="stop-task" data-task="${t.id}">停止</button>`);
    } else if (t.status === 'queued') {
      const blockers = activeBlockers(p, t);
      actions.push(blockers.length
        ? `<button class="btn ghost blocked-start" disabled title="被 ${blockers.map((b) => b.id).join('、')} 阻塞">${I.lock}被 ${blockers.map((b) => b.id).join('、')} 阻塞</button>`
        : `<button class="btn primary" data-a="start-task" data-task="${t.id}">开始执行</button>`);
    } else if (t.status === 'done' || t.status === 'canceled') {
      actions.push(`<button class="btn ghost" data-a="reopen" data-task="${t.id}">${I.refresh}重新打开</button>`);
    }
    actions.push(`<button class="btn ghost" data-a="log" data-task="${t.id}">${I.terminal}${S.logFor === t.id ? '收起日志' : '查看日志'}</button>`);

    return `<div class="detail">
      <button class="back" data-a="back">${I.back}<span>全部任务</span></button>
      <div class="d-kicker">
        <span>${t.id}</span>
        <button class="st" style="--st:${st.color}" data-a="status-picker" data-task-status="${t.id}" title="修改状态">${statusIcon(t.status)}${st.label}</button>
        ${prs}
      </div>
      ${S.taskEdit && S.taskEdit.id === t.id && S.taskEdit.field === 'title'
        ? `<input id="taskEditInput" class="task-edit-title" value="${esc(t.title)}" aria-label="任务标题">`
        : `<div class="d-title-row"><h2>${esc(t.title)}</h2><button class="d-edit" data-a="edit-task" data-field="title" aria-label="编辑标题" title="编辑标题">${I.pencil}</button></div>`}
      ${S.taskEdit && S.taskEdit.id === t.id && S.taskEdit.field === 'desc'
        ? `<textarea id="taskEditInput" class="task-edit-desc" aria-label="任务描述">${esc(t.desc || '')}</textarea>`
        : `<div class="d-desc-row"><p class="d-desc">${esc(t.desc || '暂无描述')}</p><button class="d-edit" data-a="edit-task" data-field="desc" aria-label="编辑描述" title="编辑描述">${I.pencil}</button></div>`}
      ${t.question ? `<div class="question-card"><div class="qk">${I.bolt}等待你的决定</div>${inline(t.question.text)}</div>` : ''}
      <div class="meta-card">
        <div class="meta-row"><span class="k">仓库</span><span class="v">${esc(t.repo || '—')}</span></div>
        <div class="meta-row"><span class="k">负责人</span><span class="v">${assigneeInline(t)}</span></div>
        <div class="meta-row"><span class="k">依赖</span><span class="v dep-v">${depDetail(p, t)}</span></div>
        <div class="meta-row"><span class="k">Worker</span><span class="v mono">${esc(t.worker || '—')}</span></div>
        <div class="meta-row"><span class="k">Worktree</span><span class="v mono">${esc(t.worktree || '—')}</span></div>
        <div class="meta-row"><span class="k">环境</span><span class="v env-inline"><span class="env-dot ${envMeta(t.env || S.env).status}"></span>${esc(t.env || S.env)}<span class="env-health-inline">${esc(envMeta(t.env || S.env).health)}</span></span></div>
        <div class="meta-row"><span class="k">基线分支</span><span class="v"><button class="branch-pick mono" data-a="base-branch" data-task="${t.id}" title="修改基线分支">${esc(t.baseBranch || p.defaultBranch || 'main')}${t.branchLocal ? '<span class="branch-local">新</span>' : ''}${I.chevD}</button></span></div>
        <div class="meta-row"><span class="k">模型</span><span class="v">${esc(t.model || '—')}</span></div>
      </div>
      ${filesCardHTML(t)}
      ${(t.timeline && t.timeline.length) ? `
        <div>
          <div class="tl-label">执行轨迹</div>
          <div class="tl">${t.timeline.map((e) => `
            <div class="tl-i">
              <span class="tl-d ${e.tone || ''}"></span>
              <div><div class="tl-t">${esc(e.t)}</div><div class="tl-time">${esc(e.time)}</div></div>
            </div>`).join('')}</div>
        </div>` : ''}
      ${S.logFor === t.id ? logHTML(t) : ''}
      <div class="acts">${actions.join('')}</div>
    </div>`;
  }

  function logHTML(t) {
    const lines = [];
    lines.push(`<div><span class="lt">$</span>git status --short</div>`);
    if (t.status === 'waiting') {
      lines.push('<div> M src/views/merge-state.ts</div>');
      lines.push(`<div><span class="lt">$</span>npm run smoke:staging</div>`);
      lines.push('<div class="warn">! tunnel whitelist missing</div>');
      lines.push('<div class="warn">! waiting for human decision</div>');
    } else if (t.status === 'queued') {
      lines.push(`<div><span class="lt">$</span>git worktree add ../${esc(t.worktree || 'worktree')} -b ${esc(t.worktree || 'worktree')} ${t.branchLocal ? esc(t.baseBranch) : 'origin/' + esc(t.baseBranch || proj().defaultBranch || 'main')}</div>`);
      lines.push('<div class="warn">! queued behind the current task</div>');
    } else if (t.status === 'done') {
      lines.push('<div> M src/views/merge-state.ts</div>');
      lines.push(`<div><span class="lt">$</span>npm test -- --run</div>`);
      lines.push('<div class="ok">✓ 42 passed (3.8s)</div>');
      lines.push(`<div><span class="lt">$</span>git push origin ${esc(t.worktree || 'HEAD')}</div>`);
      lines.push('<div class="ok">✓ pushed</div>');
    } else {
      lines.push('<div> M src/views/merge-state.ts</div>');
      lines.push(`<div><span class="lt">$</span>npm test -- --run</div>`);
      lines.push('<div class="ok">✓ 42 passed (3.9s)</div>');
      lines.push(`<div><span class="lt">$</span>npm run smoke:staging</div>`);
      lines.push('<div class="ok">✓ login · merge-switch · message-flow</div>');
      lines.push('<div class="warn">! tunnel whitelist check pending</div>');
    }
    return `<div class="log">${lines.join('')}</div>`;
  }

  function peekHTML(p) {
    const t = p.tasks.find((x) => x.id === S.peek);
    if (!t) return '';
    const st = ST[t.status];
    const tl = (t.timeline || []).slice(-2);
    return `<aside class="peek" role="dialog" aria-label="任务预览">
      <div class="peek-head">
        <span class="st" style="--st:${st.color}">${statusIcon(t.status)}${st.label}</span>
        <span class="pid">${t.id}</span>
        <button class="iconbtn sm x" data-a="peek-close" aria-label="关闭预览">${I.x}</button>
      </div>
      <div class="peek-body">
        <h3>${esc(t.title)}</h3>
        <p class="desc">${esc(t.desc || '')}</p>
        <div class="meta">
          <span>${esc(t.repo || '—')}</span>
          ${assigneeInline(t)}
          <span class="mono">${esc(t.worker || '—')}</span>
          ${(t.prs || []).map((pr) => prPill(pr.num, pr.state === 'merged', t.id)).join('')}
          ${(t.badges || []).map(badgePill).join('')}
        </div>
        ${tl.length ? `<div class="tl-label">最近</div><div class="tl">${tl.map((e) => `
          <div class="tl-i"><span class="tl-d ${e.tone || ''}"></span>
            <div><div class="tl-t">${esc(e.t)}</div><div class="tl-time">${esc(e.time)}</div></div>
          </div>`).join('')}</div>` : ''}
      </div>
      <div class="peek-foot">
        <button class="btn primary" data-a="peek-open" data-detail="${t.id}">打开详情</button>
        <span class="spacer"></span>
        <button class="btn ghost" data-a="peek-close">关闭</button>
      </div>
    </aside>`;
  }

  /* ---------- 浮层 ---------- */
  let floatingEl = null;

  function openFloating(anchor, html, opts) {
    closeFloating();
    const el = document.createElement('div');
    el.className = 'floating ' + ((opts && opts.className) || '');
    el.innerHTML = html;
    document.body.appendChild(el);
    if (opts && opts.point) {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      el.style.left = Math.max(8, Math.min(opts.point.x, innerWidth - w - 8)) + 'px';
      el.style.top = Math.max(8, Math.min(opts.point.y, innerHeight - h - 8)) + 'px';
      floatingEl = el;
      return el;
    }
    if (!anchor) {
      el.style.left = '50%';
      el.style.top = '60px';
      floatingEl = el;
      return el;
    }
    const r = anchor.getBoundingClientRect();
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    let left = opts && opts.align === 'right' ? r.right - w : r.left;
    if (left + w > innerWidth - 8) left = innerWidth - w - 8;
    if (left < 8) left = 8;
    let top = opts && opts.above ? r.top - h - 6 : r.bottom + 6;
    if (opts && opts.above && top < 8) top = r.bottom + 6;
    if (!(opts && opts.above) && top + h > innerHeight - 8) top = Math.max(8, r.top - h - 6);
    el.style.left = left + 'px';
    el.style.top = top + 'px';
    floatingEl = el;
    return el;
  }

  function closeFloating() {
    if (floatingEl) { floatingEl.remove(); floatingEl = null; }
  }

  function newTaskRow(status) {
    return `<div class="task-new">
      <span class="nt-ico">${statusIcon(status)}</span>
      <input id="newTaskInput" placeholder="任务标题…" aria-label="New task in ${esc(ST[status].label)}" autocomplete="off" spellcheck="false">
      <span class="nt-hint">↵</span>
    </div>`;
  }

  function bindPanelSearch() {
    const input = $('#panelSearchInput');
    if (!input) return;
    if (S.focusPanelSearch) {
      input.focus();
      const len = input.value.length;
      input.setSelectionRange(len, len);
      S.focusPanelSearch = false;
    }
    input.addEventListener('input', () => {
      S.panelQuery = input.value;
      S.focusPanelSearch = true;
      renderRight();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        S.panelSearch = false;
        S.panelQuery = '';
        renderRight();
      }
    });
  }

  function bindTaskEdit() {
    const input = $('#taskEditInput');
    if (!input || !S.taskEdit) return;
    const edit = S.taskEdit;
    const commit = () => {
      const t = proj().tasks.find((x) => x.id === edit.id);
      const value = input.value.trim();
      S.taskEdit = null;
      if (!t) { renderRight(); return; }
      if (value && value !== (edit.field === 'title' ? t.title : t.desc)) {
        if (edit.field === 'title') t.title = value;
        else t.desc = value;
        t.timeline.push({ t: edit.field === 'title' ? '任务标题已更新' : '任务描述已更新', time: '刚刚', tone: 'work' });
        proj().time = '刚刚';
        S.animateRight = true;
        render();
        toast('已保存');
      } else {
        S.animateRight = true;
        renderRight();
      }
    };
    const cancel = () => {
      S.taskEdit = null;
      S.animateRight = true;
      renderRight();
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (input.tagName !== 'TEXTAREA' || !e.shiftKey)) {
        e.preventDefault(); e.stopPropagation(); commit();
      }
      if (e.key === 'Escape') {
        e.preventDefault(); e.stopPropagation(); cancel();
      }
    });
    input.addEventListener('blur', () => {
      if (!S.taskEdit) return;
      commit();
    });
    requestAnimationFrame(() => {
      input.focus();
      const len = input.value.length;
      input.setSelectionRange(len, len);
    });
  }

  function bindNewTask() {
    const input = $('#newTaskInput');
    if (!input || !S.newTask) return;
    const status = S.newTask.status;
    const finish = (value) => {
      const title = (value || '').trim();
      S.newTask = null;
      if (title) createTask(status, title);
      else renderRight();
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault(); e.stopPropagation();
        finish(input.value);
      }
      if (e.key === 'Escape') {
        e.preventDefault(); e.stopPropagation();
        S.newTask = null;
        renderRight();
      }
    });
    input.addEventListener('blur', () => {
      if (!S.newTask) return;
      finish(input.value);
    });
    requestAnimationFrame(() => {
      input.focus();
      const len = input.value.length;
      input.setSelectionRange(len, len);
    });
  }

  function createTask(status, title) {
    const p = proj();
    const text = (title || '').trim();
    if (!text) return;
    const pre = prefixFor(p);
    const id = `${pre}-${p.nextSeq++}`;
    p.tasks.unshift({
      id, title: text, summary: '', status, repo: p.primaryRepo || p.repos[0] || '',
      desc: '', worker: '', worktree: '', baseBranch: p.defaultBranch || 'main', model: p.defaultModel || S.model, prs: [], badges: [],
      timeline: [{ t: '任务已创建', time: '刚刚', tone: 'work' }]
    });
    p.time = '刚刚';
    S.animateRight = true;
    render();
    toast('已创建任务');
  }

  function filesCardHTML(t) {
    const files = t.files || [];
    if (!files.length) return '';
    const add = files.reduce((n, f) => n + (parseInt(String(f.add).replace(/[^\d]/g, ''), 10) || 0), 0);
    const del = files.reduce((n, f) => n + (parseInt(String(f.del).replace(/[^\d]/g, ''), 10) || 0), 0);
    return `<div class="detail-files">
      <div class="df-head"><span>${files.length} Files Changed</span><span class="df-stat"><b>+${add}</b><i>-${del}</i></span></div>
      ${files.map((f) => `<div class="df-row">
        <span class="df-ico">${I.fileText}</span>
        <span class="df-path">${esc(f.path)}</span>
        <span class="df-add">${esc(f.add || '')}</span>
        <span class="df-del">${esc(f.del || '')}</span>
      </div>`).join('')}
    </div>`;
  }

  const PR_META = {
    252: { commit: 'f31489d', checks: 'CI passed' },
    261: { commit: 'f61c2a7', checks: 'CI passed' },
    228: { commit: 'd006108', checks: 'CI passed' },
    41: { commit: 'a19c4d2', checks: 'CI passed' }
  };

  function openPR(num, taskId) {
    const t = proj().tasks.find((x) => x.id === taskId);
    if (!t) return;
    const n = Number(num);
    const pr = (t.prs || []).find((x) => x.num === n) || { num: n, state: 'open' };
    const meta = PR_META[n] || { commit: '—', checks: 'CI passed' };
    const branch = t.worktree || `agent/${t.id.toLowerCase()}`;
    openModal(`<div class="modal md pr-modal" role="dialog" aria-modal="true" aria-label="PR #${n}">
      <div class="doc-head">
        <span class="path">Pull Request · #${n}</span>
        <span class="tag ${pr.state === 'merged' ? 'ok' : 'pr'}">${pr.state === 'merged' ? 'merged' : 'open'}</span>
        <button class="iconbtn sm" data-close aria-label="关闭">${I.x}</button>
      </div>
      <div class="doc-body">
        <h1 class="pr-title">${esc(t.title)}</h1>
        <div class="pr-meta">
          <span>${esc(t.repo || '—')}</span>
          <span class="mono">${esc(branch)}</span>
          <span class="mono">${esc(meta.commit)}</span>
          <span>${esc(meta.checks)}</span>
        </div>
        ${filesCardHTML(t)}
        <div class="pr-note">${pr.state === 'merged' ? '已合入 main，工作树已清理。' : '等待评审；CI 通过后可直接合并。'}</div>
      </div>
      <div class="doc-foot">
        <span class="hint">${esc(t.repo || '')}</span>
        <span class="spacer"></span>
        <button class="btn ghost" data-copy-pr="${esc(branch)}">${I.copy}复制分支</button>
        <button class="btn ghost" data-close>关闭</button>
      </div>
    </div>`);
    const copyBtn = $('[data-copy-pr]', $('#overlay'));
    copyBtn?.addEventListener('click', () => copy(copyBtn.dataset.copyPr));
  }

  function confirmDeleteTask(t) {
    openModal(`<div class="modal sm" role="dialog" aria-modal="true" aria-label="删除任务">
      <div class="modal-head"><h3>删除「${esc(t.title)}」</h3><button class="iconbtn sm x" data-close aria-label="关闭">${I.x}</button></div>
      <div class="modal-body"><p class="confirm-copy">任务会从项目列表中移除，执行轨迹与关联的本地 worktree 记录一并删除。已推送的分支和 PR 不受影响。</p></div>
      <div class="modal-foot"><span class="hint">此操作不能撤销</span><button class="btn ghost" data-close>取消</button><button class="btn danger" id="delTaskBtn">删除</button></div>
    </div>`);
    const btn = $('#delTaskBtn', $('#overlay'));
    btn?.addEventListener('click', () => {
      const p = proj();
      p.tasks = p.tasks.filter((x) => x.id !== t.id);
      if (S.detail === t.id) S.detail = null;
      if (S.peek === t.id) S.peek = null;
      closeModal();
      S.animateRight = true;
      render();
      toast('已删除任务');
    });
  }

  function syncProjectRefs(p) {
    const extras = REF_EXTRA[p.id] || REF_EXTRA._default;
    p.branches = Array.from(new Set([...(p.branches || []), ...extras]));
    p.remoteBranches = Array.from(new Set([...(p.remoteBranches || []), ...extras]));
    p.refsUpdated = '刚刚';
    p.refsAgeMin = 0;
    logProjectEvent(p, `同步 refs · ${p.branches.length} 个分支`, 'work', 'refs');
    return extras.length;
  }

  function branchUsedCount(p, name) {
    return p.tasks.filter((t) => (t.baseBranch || p.defaultBranch) === name).length;
  }

  function openBranchManager(p) {
    const rows = (p.branches || []).map((b) => {
      const isDefault = b === p.defaultBranch;
      const used = branchUsedCount(p, b);
      const disabled = isDefault || used > 0;
      return `<div class="bm-row">
        <span class="bm-ico">${I.branch}</span>
        <span class="bm-name mono">${esc(b)}</span>
        ${isDefault ? '<span class="bm-tag">默认</span>' : ''}
        <span class="bm-origin">${isRemoteBranch(p, b) ? '远端' : '本地'}</span>
        <span class="bm-used">${used} 个任务</span>
        <button class="bm-act" data-bm-rename="${esc(b)}" title="重命名">${I.pencil}</button>
        <button class="bm-act" data-bm-del="${esc(b)}" ${disabled ? 'disabled' : ''} title="${disabled ? (isDefault ? '默认分支不能删除' : '仍有任务使用这个分支') : '删除分支'}">${I.trash}</button>
      </div>`;
    }).join('');
    const layer = openModal(`<div class="modal md branch-manager" role="dialog" aria-modal="true" aria-label="分支管理">
      <div class="modal-head"><h3>分支管理</h3><span class="hint">${(p.branches || []).length} 个 refs · 默认 ${esc(p.defaultBranch || 'main')}</span><button class="iconbtn sm x" data-close aria-label="关闭">${I.x}</button></div>
      <div class="modal-body">
        <div class="bm-new"><input id="bmNew" type="text" placeholder="feat/new-branch" autocomplete="off" spellcheck="false"><button class="bm-add" id="bmAdd">${I.plus}添加</button></div>
        <div class="bm-list">${rows || '<div class="dp-empty">还没有分支。</div>'}</div>
      </div>
      <div class="modal-foot"><span class="hint">重命名会同步默认分支与任务基线</span><button class="btn ghost" data-close>关闭</button></div>
    </div>`);
    $$('[data-bm-rename]', layer).forEach((b) => b.addEventListener('click', () => {
      openRenameBranchModal(p, b.dataset.bmRename);
    }));
    $$('[data-bm-del]', layer).forEach((b) => b.addEventListener('click', () => {
      openDeleteBranchModal(p, b.dataset.bmDel);
    }));
    const add = () => {
      const input = $('#bmNew', layer);
      const name = input.value.trim();
      if (!name || !/^[A-Za-z0-9._\/-]+$/.test(name)) { input.classList.add('invalid'); input.focus(); return; }
      if ((p.branches || []).includes(name)) { toast('分支已存在'); return; }
      p.branches = [...(p.branches || []), name];
      p.remoteBranches = (p.remoteBranches || []).filter((b) => b !== name);
      p.refsUpdated = '刚刚';
      p.refsAgeMin = 0;
      logProjectEvent(p, `新增分支 ${name}`, 'work', 'branch');
      closeModal();
      openBranchManager(p);
      toast('已添加分支');
    };
    $('#bmAdd', layer)?.addEventListener('click', add);
    $('#bmNew', layer)?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } });
  }

  function openRenameBranchModal(p, oldName) {
    const layer = openModal(`<div class="modal sm" role="dialog" aria-modal="true" aria-label="重命名分支">
      <div class="modal-head"><h3>重命名分支</h3><button class="iconbtn sm x" data-close aria-label="关闭">${I.x}</button></div>
      <div class="modal-body"><div class="field"><label>分支名</label><input id="renameBranchInput" type="text" value="${esc(oldName)}" autocomplete="off" spellcheck="false" data-autofocus></div></div>
      <div class="modal-foot"><button class="btn ghost" data-close>取消</button><button class="btn primary" id="renameBranchSave">保存</button></div>
    </div>`);
    const input = $('#renameBranchInput', layer);
    const save = () => {
      const name = input.value.trim();
      if (!name || !/^[A-Za-z0-9._\/-]+$/.test(name)) { input.classList.add('invalid'); input.focus(); return; }
      if (name !== oldName && (p.branches || []).includes(name)) { toast('分支已存在'); return; }
      p.branches = (p.branches || []).map((b) => b === oldName ? name : b);
      if (p.defaultBranch === oldName) p.defaultBranch = name;
      p.remoteBranches = (p.remoteBranches || []).map((b) => b === oldName ? name : b);
      p.tasks.forEach((t) => { if (t.baseBranch === oldName) t.baseBranch = name; });
      p.refsUpdated = '刚刚';
      p.refsAgeMin = 0;
      logProjectEvent(p, `重命名分支 ${oldName} → ${name}`, 'work', 'branch');
      closeModal();
      openBranchManager(p);
      toast('分支已重命名');
    };
    $('#renameBranchSave', layer)?.addEventListener('click', save);
    input?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); save(); } });
  }

  function openDeleteBranchModal(p, name) {
    if (name === p.defaultBranch) { toast('默认分支不能删除'); return; }
    if (branchUsedCount(p, name) > 0) { toast('仍有任务使用这个分支'); return; }
    const remote = isRemoteBranch(p, name);
    const layer = openModal(`<div class="modal sm" role="dialog" aria-modal="true" aria-label="删除分支">
      <div class="modal-head"><h3>删除 ${esc(name)}</h3><button class="iconbtn sm x" data-close aria-label="关闭">${I.x}</button></div>
      <div class="modal-body"><p class="confirm-copy">${remote ? '这是远端分支。「仅从项目移除」不会删除 origin；「删除远端分支」会同时从远端 refs 里移除。' : '这是本地分支。删除后不会再出现在基线分支选择器里。'}</p></div>
      <div class="modal-foot"><button class="btn ghost" data-close>取消</button>${remote ? `<button class="btn ghost" id="removeBranchBtn">仅从项目移除</button><button class="btn danger" id="delBranchBtn">删除远端分支</button>` : `<button class="btn danger" id="removeBranchBtn">删除</button>`}</div>
    </div>`);
    const remove = (fromRemote) => {
      p.branches = (p.branches || []).filter((b) => b !== name);
      if (fromRemote) p.remoteBranches = (p.remoteBranches || []).filter((b) => b !== name);
      p.refsUpdated = '刚刚';
      p.refsAgeMin = 0;
      logProjectEvent(p, fromRemote ? `删除远端分支 ${name}` : `从项目移除分支 ${name}`, fromRemote ? 'warn' : 'work', 'branch');
      closeModal();
      openBranchManager(p);
      toast(fromRemote ? '已删除远端分支' : '已从项目移除分支');
    };
    $('#removeBranchBtn', layer)?.addEventListener('click', () => remove(false));
    $('#delBranchBtn', layer)?.addEventListener('click', () => remove(true));
  }

  function openCreateBranchModal(p, t) {
    const layer = openModal(`<div class="modal sm" role="dialog" aria-modal="true" aria-label="创建新分支">
      <div class="modal-head"><h3>创建新分支</h3><button class="iconbtn sm x" data-close aria-label="关闭">${I.x}</button></div>
      <div class="modal-body">
        <div class="field"><label>分支名</label><input id="newBranchInput" type="text" value="feat/${esc(t.id.toLowerCase())}" autocomplete="off" spellcheck="false" data-autofocus></div>
        <p class="confirm-copy">从项目默认分支 ${esc(p.defaultBranch || 'main')} 创建；创建后会作为任务基线分支。</p>
      </div>
      <div class="modal-foot"><button class="btn ghost" data-close>取消</button><button class="btn primary" id="newBranchSave">创建</button></div>
    </div>`);
    const input = $('#newBranchInput', layer);
    const save = () => {
      const name = input.value.trim();
      if (!name || !/^[A-Za-z0-9._\/-]+$/.test(name)) { input.classList.add('invalid'); input.focus(); return; }
      if ((p.branches || []).includes(name)) { toast('分支已存在'); return; }
      p.branches = [...(p.branches || []), name];
      p.remoteBranches = (p.remoteBranches || []).filter((b) => b !== name);
      p.refsUpdated = '刚刚';
      p.refsAgeMin = 0;
      t.baseBranch = name;
      t.branchLocal = true;
      t.timeline = t.timeline || [];
      t.timeline.push({ t: `创建分支 ${name}（基线 ${p.defaultBranch || 'main'}）`, time: '刚刚', tone: 'work' });
      logProjectEvent(p, `创建分支 ${name}`, 'work', 'branch');
      closeModal();
      S.animateRight = true;
      render();
      toast(`已创建 ${name}`);
    };
    $('#newBranchSave', layer)?.addEventListener('click', save);
    input?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); save(); } });
  }

  function openBaseBranchPicker(anchor, id) {
    const p = proj();
    const t = p.tasks.find((x) => x.id === id);
    if (!t) return;
    const current = t.baseBranch || null;
    const refs = refsMeta(p);
    const branches = Array.from(new Set([...(p.branches || []), ...(p.defaultBranch ? [p.defaultBranch] : []), 'main', ...(current ? [current] : [])]));
    const el = openFloating(anchor, `
      <div class="menu-head">基线分支${refs.stale ? `<span class="refs-warn">refs 可能过期</span>` : ''}</div>
      <button class="menu-item" data-set-branch=""><span class="mi">${I.branch}</span>项目默认 · ${esc(p.defaultBranch || 'main')}${!current ? `<span class="check">${I.check}</span>` : ''}</button>
      <div class="menu-sep"></div>
      ${branches.map((b) => `<button class="menu-item" data-set-branch="${esc(b)}"><span class="mi">${I.branch}</span><span class="mono" style="font-family:var(--font-mono);font-size:11px;">${esc(b)}</span><span class="bp-origin">${isRemoteBranch(p, b) ? '远端' : '本地'}</span>${current === b ? `<span class="check">${I.check}</span>` : ''}</button>`).join('')}
      <div class="menu-sep"></div>
      <button class="menu-item" data-new-branch><span class="mi">${I.plus}</span>创建新分支…</button>
      <button class="menu-item" data-manage-branches><span class="mi">${I.branch}</span>管理分支…</button>
      <button class="menu-item" data-refresh-refs><span class="mi">${I.refresh}</span>刷新 refs</button>
    `, { align: 'left' });
    $('[data-refresh-refs]', el)?.addEventListener('click', () => {
      syncProjectRefs(p);
      closeFloating();
      render();
      toast('refs 已刷新');
    });
    $('[data-new-branch]', el)?.addEventListener('click', () => {
      closeFloating();
      openCreateBranchModal(p, t);
    });
    $('[data-manage-branches]', el)?.addEventListener('click', () => {
      closeFloating();
      openBranchManager(p);
    });
    $$('[data-set-branch]', el).forEach((b) => b.addEventListener('click', () => {
      const value = b.dataset.setBranch || null;
      t.baseBranch = value;
      t.branchLocal = false;
      t.timeline = t.timeline || [];
      t.timeline.push({ t: value ? `基线分支改为 ${value}` : '基线分支恢复项目默认', time: '刚刚', tone: 'work' });
      closeFloating();
      S.animateRight = true;
      render();
      toast(value ? `基线分支：${value}` : '使用项目默认分支');
    }));
  }

  function setTaskStatus(id, st) {
    const t = proj().tasks.find((x) => x.id === id);
    if (!t || t.status === st) return;
    const active = activeBlockers(proj(), t);
    if (st === 'working' && active.length) {
      toast(`仍被 ${active.map((b) => b.id).join('、')} 阻塞`);
      return;
    }
    if (st === 'working' && envMeta(t.env || S.env).status === 'off') {
      toast('运行环境不可用');
      return;
    }
    t.status = st;
    t.timeline.push({
      t: `状态改为 ${ST[st].label}`,
      time: '刚刚',
      tone: st === 'done' ? 'ok' : st === 'canceled' || st === 'waiting' ? 'warn' : 'work'
    });
    if (st === 'done' || st === 'canceled') delete t.question;
    if (st === 'done') {
      proj().tasks.forEach((x) => {
        if ((x.blockedBy || []).includes(id)) {
          x.timeline = x.timeline || [];
          x.timeline.push({ t: `依赖 ${id} 已完成`, time: '刚刚', tone: 'ok' });
        }
      });
    }
    S.tray = false;
    S.animateRight = true;
    render();
    toast(ST[st].label);
  }

  function openStatusPicker(anchor, id) {
    const t = proj().tasks.find((x) => x.id === id);
    if (!t) return;
    const el = openFloating(anchor, `
      <div class="menu-head">Status</div>
      ${GROUP_ORDER.map((st) => `<button class="menu-item" data-set-status="${st}">
        <span class="mi">${statusIcon(st)}</span>${ST[st].label}
        ${t.status === st ? `<span class="check">${I.check}</span>` : ''}
      </button>`).join('')}
    `, { align: 'left' });
    $$('[data-set-status]', el).forEach((b) => b.addEventListener('click', () => {
      const next = b.dataset.setStatus;
      closeFloating();
      setTaskStatus(id, next);
    }));
  }

  function openProjectMenu(anchor, id) {
    const p = DB.projects.find((x) => x.id === id);
    if (!p) return;
    const archived = p.status === 'archived';
    const paused = p.status === 'paused';
    const el = openFloating(anchor, `
      <div class="menu-head">${esc(p.name)}</div>
      <button class="menu-item" data-pm="settings"><span class="mi">${I.gear}</span>项目设置</button>
      <button class="menu-item" data-pm="index"><span class="mi">${I.pencil}</span>编辑 INDEX.md</button>
      <div class="menu-sep"></div>
      <button class="menu-item" data-pm="${archived ? 'unarchive' : paused ? 'resume' : 'pause'}">
        <span class="mi">${archived ? I.refresh : paused ? I.play : I.pause}</span>${archived ? '恢复归档' : paused ? '恢复项目' : '暂停项目'}
      </button>
      ${archived ? '' : `<button class="menu-item" data-pm="archive"><span class="mi">${I.archive}</span>归档</button>`}
      <div class="menu-sep"></div>
      <button class="menu-item danger" data-pm="delete"><span class="mi">${I.trash}</span>删除项目</button>
    `, { align: 'right' });
    $$('[data-pm]', el).forEach((b) => b.addEventListener('click', () => {
      const action = b.dataset.pm;
      closeFloating();
      onProjectAction(p, action);
    }));
  }

  function onProjectAction(p, action) {
    if (action === 'settings') return openProjectForm(p);
    if (action === 'index') return openFileByPath(p, 'INDEX.md');
    if (action === 'pause') { p.status = 'paused'; render(); toast('已暂停'); return; }
    if (action === 'resume') { p.status = 'active'; render(); toast('已恢复'); return; }
    if (action === 'archive') {
      p.status = 'archived';
      if (S.active === p.id) {
        const next = DB.projects.find((x) => x.status !== 'archived') || p;
        S.active = next.id; S.detail = null; S.peek = null;
      }
      render(); toast('已归档');
      return;
    }
    if (action === 'unarchive') { p.status = 'active'; S.active = p.id; S.showArchived = false; render(); toast('已恢复'); return; }
    if (action === 'delete') return confirmDelete(p);
  }

  function openWorkspaceMenu(anchor, id) {
    const w = DB.workspaces.find((x) => x.id === id);
    if (!w) return;
    const el = openFloating(anchor, `
      <div class="menu-head">${esc(w.name)}</div>
      <button class="menu-item" data-wm="add"><span class="mi">${I.folder}</span>加入项目…</button>
      <button class="menu-item" data-wm="rename"><span class="mi">${I.pencil}</span>重命名</button>
      <div class="menu-sep"></div>
      <button class="menu-item" data-wm="copy"><span class="mi">${I.copy}</span>复制路径</button>
    `, { align: 'right' });
    $$('[data-wm]', el).forEach((b) => b.addEventListener('click', () => {
      const action = b.dataset.wm;
      closeFloating();
      if (action === 'add') return openAddToProject(w);
      if (action === 'rename') return openRenameWorkspace(w);
      if (action === 'copy') return copy(w.path || w.name);
    }));
  }

  function openAssigneePicker(anchor, id, point) {
    const p = proj();
    const t = p.tasks.find((x) => x.id === id);
    if (!t) return;
    const ids = (p.members || []);
    if (t.assignee && !ids.includes(t.assignee)) ids.push(t.assignee);
    const list = ids.map(agentById).filter(Boolean);
    const el = openFloating(anchor, `
      <div class="menu-head">负责人</div>
      ${list.map((a) => `<button class="menu-item asg-option" data-assign="${a.id}">
        <span class="mini-ava" style="--av:${a.color}">${esc(a.label.charAt(0).toUpperCase())}</span>
        <span class="ao-name">${esc(a.label)}</span><span class="ao-role">${esc(a.role)}</span>
        ${t.assignee === a.id ? `<span class="check">${I.check}</span>` : ''}
      </button>`).join('')}
      ${t.assignee ? `<div class="menu-sep"></div><button class="menu-item" data-assign=""><span class="mi">${I.x}</span>取消负责人</button>` : ''}
      ${list.length ? '' : `<div class="menu-sep"></div><button class="menu-item" data-asg-settings><span class="mi">${I.gear}</span>先添加项目成员</button>`}
    `, point ? { point } : {});
    $$('[data-assign]', el).forEach((b) => b.addEventListener('click', () => {
      const next = b.dataset.assign || null;
      closeFloating();
      const a = next ? agentById(next) : null;
      t.assignee = next;
      t.timeline = t.timeline || [];
      t.timeline.push({ t: a ? `负责人改为 ${a.label}` : '移除负责人', time: '刚刚', tone: 'work' });
      p.time = '刚刚';
      S.animateRight = true;
      render();
      toast(a ? `已分配给 ${a.label}` : '已取消负责人');
    }));
    $('[data-asg-settings]', el)?.addEventListener('click', () => {
      closeFloating();
      openProjectForm(p);
    });
  }

  function depNodeHTML(p, b, depth, seen) {
    const cycle = seen.has(b.id);
    const nextSeen = new Set(seen);
    nextSeen.add(b.id);
    const kids = cycle ? [] : (b.blockedBy || []).map((id) => p.tasks.find((x) => x.id === id)).filter(Boolean);
    return `<div class="dp-branch" style="margin-left:${(depth - 1) * 16}px">
      <button class="dp-node" data-dep-open="${b.id}" title="打开 ${esc(b.id)}">
        <span class="dp-arrow-l">${I.arrowDown}</span>
        <span class="dp-status">${statusIcon(b.status)}</span>
        <span class="dp-id">${b.id}</span>
        <span class="dp-node-title">${esc(b.title)}</span>
        ${cycle ? `<span class="dp-tag blocked">循环</span>` : `<span class="dp-node-state">${ST[b.status].label}</span>`}
      </button>
      ${kids.length ? `<div class="dp-children">${kids.map((k) => depNodeHTML(p, k, depth + 1, nextSeen)).join('')}</div>` : ''}
    </div>`;
  }

  function openDependencyPanel() {
    const p = proj();
    const groups = p.tasks.filter((t) => (t.blockedBy || []).length).map((t) => {
      const blockers = blockerTasks(p, t);
      const active = activeBlockers(p, t).length > 0;
      return { t, blockers, active };
    });
    const unresolved = groups.filter((g) => g.active).length;
    const edges = groups.reduce((n, g) => n + g.blockers.length, 0);
    openModal(`<div class="modal md dep-modal" role="dialog" aria-modal="true" aria-label="项目依赖">
      <div class="modal-head"><h3>项目依赖</h3><span class="hint">${edges} 条依赖 · ${unresolved} 个阻塞</span><button class="iconbtn sm x" data-close aria-label="关闭">${I.x}</button></div>
      <div class="modal-body">
        ${groups.length ? `<div class="dp-toolbar"><button class="dp-tool" data-dp-all>收起全部</button></div>` : ''}
        ${groups.length ? groups.map(({ t, blockers, active }) => `<div class="dp-group">
          <div class="dp-target">
            <span class="dp-status">${statusIcon(t.status)}</span>
            <span class="dp-id">${t.id}</span>
            <span class="dp-title">${esc(t.title)}</span>
            <span class="dp-tag ${active ? 'blocked' : 'resolved'}">${active ? '被阻塞' : '已解除'}</span>
            <span class="dp-target-actions">
              ${active ? `<button class="dp-focus" data-dep-focus="${t.id}" title="在 Board 聚焦">${I.focus}</button>` : ''}
              <button class="dp-chev" data-dp-toggle aria-expanded="true" title="展开/收起">${I.chevD}</button>
            </span>
          </div>
          <div class="dp-blockers">
            ${blockers.map((b) => depNodeHTML(p, b, 1, new Set([t.id]))).join('')}
          </div>
        </div>`).join('') : `<div class="dp-empty">${I.check}当前项目没有依赖关系。</div>`}
      </div>
      <div class="modal-foot"><span class="hint">依赖来自任务详情里的 blocked by</span><button class="btn ghost" data-close>关闭</button></div>
    </div>`);
    $$('[data-dep-open]', $('#overlay')).forEach((b) => b.addEventListener('click', () => {
      const id = b.dataset.depOpen;
      closeModal();
      openDetail(id);
    }));
    const syncDpAll = () => {
      const btn = $('[data-dp-all]', $('#overlay'));
      if (!btn) return;
      const anyOpen = $$('.dp-group', $('#overlay')).some((g) => !g.classList.contains('collapsed'));
      btn.textContent = anyOpen ? '收起全部' : '展开全部';
    };
    $$('[data-dp-toggle]', $('#overlay')).forEach((b) => b.addEventListener('click', () => {
      const group = b.closest('.dp-group');
      const collapsed = group.classList.toggle('collapsed');
      b.classList.toggle('open', !collapsed);
      b.setAttribute('aria-expanded', String(!collapsed));
      syncDpAll();
    }));
    $('[data-dp-all]', $('#overlay'))?.addEventListener('click', () => {
      const btn = $('[data-dp-all]', $('#overlay'));
      const collapse = btn.textContent === '收起全部';
      $$('.dp-group', $('#overlay')).forEach((g) => g.classList.toggle('collapsed', collapse));
      $$('.dp-chev', $('#overlay')).forEach((b) => {
        b.classList.toggle('open', !collapse);
        b.setAttribute('aria-expanded', String(!collapse));
      });
      btn.textContent = collapse ? '展开全部' : '收起全部';
    });
    $$('[data-dep-focus]', $('#overlay')).forEach((b) => b.addEventListener('click', () => {
      const t = p.tasks.find((x) => x.id === b.dataset.depFocus);
      if (!t) return;
      const chosen = (activeBlockers(p, t)[0] || blockerTasks(p, t)[0]);
      if (!chosen) return;
      S.depFocus = { from: chosen.id, to: t.id };
      S.rightOpen = true;
      S.pane = 'board';
      S.detail = null;
      closeModal();
      S.animateRight = true;
      render();
      toast(`已聚焦 ${chosen.id} → ${t.id}`);
    }));
  }

  function wouldCreateCycle(p, taskId, depId) {
    const stack = [depId];
    const seen = new Set();
    while (stack.length) {
      const current = stack.pop();
      if (current === taskId) return true;
      if (seen.has(current)) continue;
      seen.add(current);
      const t = p.tasks.find((x) => x.id === current);
      (t && t.blockedBy ? t.blockedBy : []).forEach((next) => stack.push(next));
    }
    return false;
  }

  function openDependencyPicker(anchor, id, point) {
    const p = proj();
    const t = p.tasks.find((x) => x.id === id);
    if (!t) return;
    const current = new Set(t.blockedBy || []);
    const others = p.tasks.filter((x) => x.id !== id && x.status !== 'canceled');
    const el = openFloating(anchor, `
      <div class="menu-head">依赖</div>
      ${others.map((x) => {
        const cycle = !current.has(x.id) && wouldCreateCycle(p, t.id, x.id);
        return `<button class="menu-item dep-option ${cycle ? 'disabled' : ''}" data-dep-task="${x.id}" ${cycle ? 'aria-disabled="true"' : ''} title="${cycle ? '会形成循环依赖' : ''}">
          <span class="mi">${statusIcon(x.status)}</span>
          <span class="dep-title">${x.id} ${esc(x.title)}</span>
          ${cycle ? `<span class="dep-cycle">循环</span>` : current.has(x.id) ? `<span class="check">${I.check}</span>` : ''}
        </button>`;
      }).join('')}
      ${current.size ? `<div class="menu-sep"></div><button class="menu-item" data-dep-clear><span class="mi">${I.x}</span>清除依赖</button>` : ''}
      ${others.length ? '' : '<div class="menu-empty">没有其他任务</div>'}
    `, point ? { point } : { align: 'left' });
    $$('[data-dep-task]', el).forEach((b) => b.addEventListener('click', () => {
      const other = p.tasks.find((x) => x.id === b.dataset.depTask);
      if (!other) return;
      t.blockedBy = t.blockedBy || [];
      if (!t.blockedBy.includes(other.id) && wouldCreateCycle(p, t.id, other.id)) {
        toast('会形成循环依赖');
        return;
      }
      if (t.blockedBy.includes(other.id)) t.blockedBy = t.blockedBy.filter((x) => x !== other.id);
      else t.blockedBy.push(other.id);
      t.timeline = t.timeline || [];
      t.timeline.push({ t: t.blockedBy.includes(other.id) ? `添加依赖 ${other.id}` : `移除依赖 ${other.id}`, time: '刚刚', tone: 'work' });
      p.time = '刚刚';
      closeFloating();
      S.animateRight = true;
      render();
      toast(t.blockedBy.includes(other.id) ? `已依赖 ${other.id}` : `已移除 ${other.id}`);
    }));
    $('[data-dep-clear]', el)?.addEventListener('click', () => {
      t.blockedBy = [];
      t.timeline.push({ t: '清除所有依赖', time: '刚刚', tone: 'work' });
      closeFloating();
      S.animateRight = true;
      render();
      toast('已清除依赖');
    });
  }

  function openTaskContextMenu(id, x, y) {
    const t = proj().tasks.find((task) => task.id === id);
    if (!t) return;
    const el = openFloating(null, `
      <div class="menu-head">${t.id}</div>
      <button class="menu-item" data-ctx="peek"><span class="mi">${I.eye}</span>预览</button>
      <button class="menu-item" data-ctx="detail"><span class="mi">${I.fileText}</span>打开详情</button>
      <button class="menu-item" data-ctx="log"><span class="mi">${I.terminal}</span>执行日志</button>
      <div class="menu-sep"></div>
      <button class="menu-item" data-ctx="status"><span class="mi">${statusIcon(t.status)}</span>修改状态…</button>
      <button class="menu-item" data-ctx="assignee"><span class="mi">${I.users}</span>分配负责人…</button>
      <button class="menu-item" data-ctx="deps"><span class="mi">${I.lock}</span>依赖…</button>
      <button class="menu-item" data-ctx="copy"><span class="mi">${I.copy}</span>复制 ID</button>
      <div class="menu-sep"></div>
      <button class="menu-item danger" data-ctx="delete"><span class="mi">${I.trash}</span>删除任务</button>
    `, { point: { x, y } });
    $$('[data-ctx]', el).forEach((b) => b.addEventListener('click', () => {
      const action = b.dataset.ctx;
      closeFloating();
      if (action === 'peek') openPeek(id);
      if (action === 'detail') openDetail(id);
      if (action === 'log') {
        S.detail = id; S.logFor = id; S.peek = null; S.rightOpen = true;
        S.scrollRightTop = true; S.animateRight = true; render();
      }
      if (action === 'copy') copy(id);
      if (action === 'status') {
        const icon = $('.task[data-task="' + id + '"] .t-ico') || $('.bcard[data-task="' + id + '"]');
        if (icon) openStatusPicker(icon, id);
      }
      if (action === 'assignee') openAssigneePicker(null, id, { x, y });
      if (action === 'deps') openDependencyPicker(null, id, { x, y });
      if (action === 'delete') confirmDeleteTask(t);
    }));
  }

  function openProjectContextMenu(id, x, y) {
    const p = DB.projects.find((proj) => proj.id === id);
    if (!p) return;
    const el = openFloating(null, `
      <div class="menu-head">${esc(p.name)}</div>
      <button class="menu-item" data-px="open"><span class="mi">${I.folder}</span>打开项目</button>
      <button class="menu-item" data-px="task"><span class="mi">${I.plus}</span>新建任务</button>
      <button class="menu-item" data-px="deps"><span class="mi">${I.lock}</span>依赖链…</button>
      <button class="menu-item" data-px="library"><span class="mi">${I.book}</span>项目文件</button>
      <button class="menu-item" data-px="settings"><span class="mi">${I.gear}</span>项目设置</button>
      <button class="menu-item" data-px="copy"><span class="mi">${I.copy}</span>复制项目路径</button>
      <button class="menu-item" data-px="pin"><span class="mi">${I.pin}</span>${p.pinned ? '取消置顶' : '置顶项目'}</button>
      <div class="menu-sep"></div>
      <button class="menu-item" data-px="archive"><span class="mi">${I.archive}</span>归档</button>
      <button class="menu-item danger" data-px="delete"><span class="mi">${I.trash}</span>删除项目</button>
    `, { point: { x, y } });
    $$('[data-px]', el).forEach((b) => b.addEventListener('click', () => {
      const action = b.dataset.px;
      closeFloating();
      if (action === 'open') selectProject(id);
      if (action === 'deps') openDependencyPanel();
      if (action === 'task') {
        if (S.active !== id) selectProject(id);
        S.centerView = 'chat'; S.rightOpen = true; S.pane = 'list'; S.detail = null;
        S.newTask = { status: 'queued' }; render();
      }
      if (action === 'library') {
        if (S.active !== id) selectProject(id);
        S.rightOpen = true; S.pane = 'library'; S.detail = null; S.animateRight = true; render();
      }
      if (action === 'settings') openProjectForm(p);
      if (action === 'copy') copy(p.primaryRepo || p.repos[0] || p.name);
      if (action === 'pin') { p.pinned = !p.pinned; renderSide(); renderRight(); toast(p.pinned ? '已置顶' : '已取消置顶'); }
      if (action === 'archive') onProjectAction(p, 'archive');
      if (action === 'delete') confirmDelete(p);
    }));
  }

  function openProjectSwitcher(anchor) {
    const list = DB.projects.filter((p) => p.status !== 'archived').sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned));
    const el = openFloating(anchor, `
      <div class="menu-head">切换项目</div>
      ${list.map((p) => `<button class="menu-item sw-item" data-sw="${p.id}">
        ${projectBadge(p, 'sm')}
        <span class="sw-name">${esc(p.name)}</span>
        ${p.id === S.active ? `<span class="sw-check">${I.check}</span>` : `<span class="sw-time">${esc(p.time)}</span>`}
      </button>`).join('')}
      <div class="menu-sep"></div>
      <button class="menu-item" data-sw-new><span class="mi">${I.plus}</span>新建项目</button>
    `);
    $$('[data-sw]', el).forEach((b) => b.addEventListener('click', () => {
      const id = b.dataset.sw;
      closeFloating();
      selectProject(id);
    }));
    $('[data-sw-new]', el)?.addEventListener('click', () => {
      closeFloating();
      openProjectForm(null);
    });
    const items = $$('[data-sw]', el);
    let idx = 0;
    items.forEach((b, i) => b.addEventListener('focus', () => { idx = i; }));
    el.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        idx = (idx + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        items[idx]?.focus();
      }
      if (e.key === 'Enter' && items[idx]) {
        e.preventDefault();
        items[idx].click();
      }
    });
    requestAnimationFrame(() => items[0]?.focus());
  }

  function openFileContextMenu(path, x, y) {
    openFloating(null, `
      <div class="menu-head">${esc(path)}</div>
      <button class="menu-item" data-fx="open"><span class="mi">${I.fileText}</span>打开</button>
      <button class="menu-item" data-fx="copy"><span class="mi">${I.copy}</span>复制路径</button>
    `, { point: { x, y } });
    const el = floatingEl;
    $$('[data-fx]', el).forEach((b) => b.addEventListener('click', () => {
      const action = b.dataset.fx;
      closeFloating();
      if (action === 'open') openFileByPath(proj(), path);
      if (action === 'copy') copy(path);
    }));
  }

  function openSessionMenu(anchor, id) {
    const session = DB.homeSessions.find((x) => x.id === id);
    if (!session) return;
    const el = openFloating(anchor, `
      <div class="menu-head">${esc(session.name)}</div>
      <button class="menu-item" data-sm="add"><span class="mi">${I.folder}</span>加入项目…</button>
      <button class="menu-item" data-sm="copy"><span class="mi">${I.copy}</span>复制标题</button>
    `, { align: 'right' });
    $$('[data-sm]', el).forEach((b) => b.addEventListener('click', () => {
      const action = b.dataset.sm;
      closeFloating();
      if (action === 'add') openAddToProject({ name: session.name });
      if (action === 'copy') copy(session.name);
    }));
  }

  function openAccountMenu(anchor) {
    const el = openFloating(anchor, `
      <div class="menu-head">veko</div>
      <button class="menu-item" data-am="theme"><span class="mi">${I.spark}</span>切换到 ${isClaude() ? 'DeepSeek' : 'Claude'} 风格</button>
      <button class="menu-item" data-am="keys"><span class="mi">${I.terminal}</span>键盘快捷键</button>
    `, { above: true });
    $$('[data-am]', el).forEach((b) => b.addEventListener('click', () => {
      const action = b.dataset.am;
      closeFloating();
      if (action === 'theme') {
        const next = isClaude() ? 'deepseek' : 'claude';
        document.documentElement.dataset.brand = next;
        render();
        toast(next === 'claude' ? '已切换到 Claude 风格' : '已切换到 DeepSeek 风格');
      }
      if (action === 'keys') openShortcuts();
    }));
  }

  function openAgents(anchor) {
    const p = proj();
    const running = p.tasks.filter((t) => t.status === 'working');
    const queued = p.tasks.filter((t) => t.status === 'queued');
    const list = [...running, ...queued];
    const rows = list.map((t) => `
      <button class="pop-row" data-agent-task="${t.id}">
        <span class="pdot" style="background:${ST[t.status].color}"></span>
        <span class="ptxt"><span class="ptitle">${esc(t.title)}</span><span class="psub">${esc(t.repo || '—')} · ${ST[t.status].label}</span></span>
        <span class="pid">${t.id}</span>
      </button>`).join('');
    const el = openFloating(anchor, `
      <div class="menu-head">Agents<span class="n">${list.length}</span></div>
      ${rows || '<div class="pop-empty">没有运行中的 Agent。</div>'}
      <div class="pop-foot"><button class="menu-item" data-agent-all><span class="mi">${I.users}</span>查看全部任务</button></div>
    `, { above: true, className: 'pop' });
    $$('[data-agent-task]', el).forEach((b) => b.addEventListener('click', () => {
      closeFloating(); openPeek(b.dataset.agentTask);
    }));
    $('[data-agent-all]', el)?.addEventListener('click', () => { closeFloating(); setPane('list'); });
  }

  function openListening(anchor) {
    const p = proj();
    const items = listeningItems(p);
    const rows = items.map((it) => `
      <${it.task ? 'button' : 'div'} class="pop-row" ${it.task ? `data-agent-task="${it.task}"` : ''}>
        <span class="pdot" style="background:${it.color}"></span>
        <span class="ptxt"><span class="ptitle">${esc(it.title)}</span><span class="psub">${esc(it.sub)}</span></span>
        <span class="pid">${esc(it.id)}</span>
      </${it.task ? 'button' : 'div'}>`).join('');
    const el = openFloating(anchor, `
      <div class="menu-head">Listening<span class="n">${items.length}</span></div>
      ${rows || '<div class="pop-empty">暂时没有在监听的 PR 或 CI。</div>'}
    `, { above: true, className: 'pop' });
    $$('[data-agent-task]', el).forEach((b) => b.addEventListener('click', () => {
      closeFloating(); openPeek(b.dataset.agentTask);
    }));
  }

  function openFilter(anchor) {
    const p = proj();
    const opts = [
      { id: null, label: '全部任务', n: p.tasks.length },
      ...GROUP_ORDER.map((st) => ({ id: st, label: ST[st].label, n: byStatus(p, st).length }))
    ];
    const el = openFloating(anchor, `
      <div class="menu-head">筛选</div>
      ${opts.map((o) => `<button class="menu-item" data-filter="${o.id || ''}">
        <span class="mi">${S.filter === o.id ? I.check : ''}</span>${o.label}
        <span class="n" style="margin-left:auto;color:var(--ink-4);font-size:10.5px;">${o.n}</span>
      </button>`).join('')}
    `, { align: 'right' });
    $$('[data-filter]', el).forEach((b) => b.addEventListener('click', () => {
      S.filter = b.dataset.filter || null;
      if (S.pane !== 'list') S.pane = 'list';
      S.animateRight = true;
      closeFloating();
      renderRight();
    }));
  }

  function openModel(anchor) {
    const el = openFloating(anchor, `
      <div class="menu-head">模型</div>
      ${MODELS.map((m) => `
        <button class="pop-row" data-model="${esc(m.name)}">
          <span class="ptxt"><span class="ptitle">${esc(m.name)}</span><span class="psub">${esc(m.sub)}</span></span>
          ${S.model === m.name ? `<span class="check">${I.check}</span>` : ''}
        </button>`).join('')}
    `, { above: true, className: 'pop' });
    $$('[data-model]', el).forEach((b) => b.addEventListener('click', () => {
      S.model = b.dataset.model;
      S.focusComposer = true;
      closeFloating();
      renderCenter();
    }));
  }

  function openEnv(anchor) {
    const el = openFloating(anchor, `
      <div class="menu-head">运行环境</div>
      ${ENVS.map((e) => `
        <button class="pop-row" data-env="${esc(e.name)}">
          <span class="ptxt"><span class="ptitle"><span class="env-dot ${e.status}"></span>${esc(e.name)}</span><span class="psub">${esc(e.sub)} · ${esc(e.health)}</span></span>
          ${S.env === e.name ? `<span class="check">${I.check}</span>` : ''}
        </button>`).join('')}
    `, { above: true, className: 'pop' });
    $$('[data-env]', el).forEach((b) => b.addEventListener('click', () => {
      S.env = b.dataset.env;
      S.focusComposer = true;
      closeFloating();
      renderCenter();
    }));
  }

  /* ---------- 弹窗 ---------- */
  function openModal(html) {
    closeModal();
    const layer = document.createElement('div');
    layer.className = 'overlay';
    layer.id = 'overlay';
    layer.innerHTML = html;
    $('#layers').appendChild(layer);
    layer.addEventListener('click', (e) => { if (e.target === layer) closeModal(); });
    $$('[data-close]', layer).forEach((b) => b.addEventListener('click', closeModal));
    trapFocus(layer);
    const focusTarget = $('[data-autofocus]', layer);
    if (focusTarget) setTimeout(() => { focusTarget.focus(); if (focusTarget.select) focusTarget.select(); }, 40);
    return layer;
  }

  function closeModal() {
    const l = $('#overlay');
    if (l) l.remove();
  }

  function trapFocus(layer) {
    layer.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const f = $$('button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])', layer)
        .filter((el) => el.offsetParent !== null);
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  function projectFormHTML(p) {
    const editing = !!p;
    const usedColors = new Set(DB.projects.map((x) => x.colorId));
    const firstFree = PROJECT_COLORS.find((c) => c.id !== 'gray' && !usedColors.has(c.id));
    const defaultColor = editing ? (PROJECT_COLOR_IDS.includes(p.colorId) ? p.colorId : 'gray') : (firstFree ? firstFree.id : 'gray');
    const defaultIcon = editing && PROJECT_MARKS[p.icon] ? p.icon : 'smileyPlus';
    const defaultCustom = editing && p.customIcon ? p.customIcon : '';
    const defaultLetter = editing && p.icon === 'letter' && !defaultCustom;
    const defaultFit = editing && p.customFit === 'cover' ? 'cover' : 'contain';
    const defaultZoom = editing && Number(p.customZoom) ? Math.max(1, Math.min(2.5, Number(p.customZoom))) : 1;
    const repos = new Set(p ? p.repos || [] : []);
    const members = new Set(p ? (p.members || ['veko']) : ['veko']);
    const defaultModel = editing ? (p.defaultModel || S.model) : S.model;
    const selectedRepos = Array.from(repos);
    const defaultPrimary = editing ? (p.primaryRepo || selectedRepos[0] || '') : (selectedRepos[0] || '');
    const defaultBranch = editing ? (p.defaultBranch || 'main') : 'main';
    const branchOptions = Array.from(new Set([...(editing ? (p.branches || []) : []), defaultBranch, ...BRANCHES]));
    const initialBranchCount = editing ? (p.branches || ['main']).length : 1;
    const initialRefs = editing ? refsMeta(p) : { stale: false, label: '未同步' };

    return `<div class="modal project-modal" role="dialog" aria-modal="true" aria-label="${editing ? '项目设置' : '新建项目'}">
      <div class="modal-head">
        <h3>${editing ? '项目设置' : '新建项目'}</h3>
        <button class="iconbtn sm x" data-close aria-label="关闭">${I.x}</button>
      </div>
      <div class="modal-body">
        <div class="project-preview">
          <span class="p-icon lg tint-${defaultColor} ${defaultCustom ? 'custom' : ''} ${defaultLetter ? 'letter' : ''}" id="pPreview">${defaultCustom ? customIconImg(defaultCustom, defaultFit, defaultZoom) : defaultLetter ? `<span>${esc((editing ? p.name : '').trim().charAt(0).toUpperCase() || 'P')}</span>` : projectMark(defaultIcon)}</span>
          <input id="pName" type="text" value="${editing ? esc(p.name) : ''}" placeholder="项目名称" autocomplete="off" spellcheck="false" data-autofocus>
        </div>

        <div class="field">
          <label>图标</label>
          <div class="icon-grid tint-${defaultColor}" id="iconGrid">
            ${PROJECT_ICONS.map((o) => `<button type="button" class="icon-tile ${o.id === defaultIcon && !defaultCustom && !defaultLetter ? 'on' : ''}" data-icon-id="${o.id}" aria-label="${o.id}">
              <span class="p-icon sm">${o.svg}</span>
            </button>`).join('')}
          </div>
          <div class="icon-custom">
            <button type="button" class="icon-letter ${defaultLetter ? 'on' : ''}" id="letterBtn"><span class="letter-a">Aa</span>字母标</button>
            <button type="button" class="icon-upload" id="iconUploadBtn">${I.image}上传自定义图标</button>
            <span class="icon-custom-hint">PNG / JPG / SVG，≤ 200KB</span>
            <button type="button" class="icon-clear" id="iconClearBtn" ${defaultCustom ? '' : 'hidden'}>移除</button>
          </div>
          <div class="custom-tune" id="customTune" ${defaultCustom ? '' : 'hidden'}>
            <div class="ct-fit" role="group" aria-label="裁切方式">
              <button type="button" data-fit="contain" class="${defaultFit === 'contain' ? 'on' : ''}">完整</button>
              <button type="button" data-fit="cover" class="${defaultFit === 'cover' ? 'on' : ''}">填满</button>
            </div>
            <label class="ct-zoom">缩放 <input type="range" id="ctZoom" min="1" max="2.5" step="0.1" value="${defaultZoom}"><span class="ct-zoom-val" id="ctZoomVal">${Math.round(defaultZoom * 100)}%</span></label>
          </div>
          <input type="file" id="iconFile" accept="image/png,image/jpeg,image/svg+xml,image/webp" hidden>
        </div>

        <div class="field" id="colorField" ${defaultCustom ? 'hidden' : ''}>
          <label>颜色</label>
          <div class="color-row">
            ${PROJECT_COLORS.map((c) => `<button type="button" class="color-dot tint-${c.id} ${c.id === defaultColor ? 'on' : ''}" data-color-id="${c.id}" aria-label="${c.label}" title="${c.label}"></button>`).join('')}
          </div>
        </div>

        <div class="field">
          <label>目标 <span class="opt">可选</span></label>
          <input id="pGoal" type="text" value="${editing ? esc(p.goal) : ''}" placeholder="一句话说明要达成什么" autocomplete="off" spellcheck="false">
        </div>

        <div class="field">
          <label>默认模型 <span class="opt">新任务使用</span></label>
          <select id="pModel">
            ${MODELS.map((m) => `<option value="${esc(m.name)}" ${m.name === defaultModel ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}
          </select>
        </div>

        <div class="field">
          <label>成员 <span class="opt">已选 <b id="memberCount">${members.size}</b></span></label>
          <div class="member-grid">
            ${AGENTS.map((a) => `<button type="button" class="member-chip ${members.has(a.id) ? 'on' : ''}" data-member="${a.id}" aria-pressed="${members.has(a.id)}" title="${esc(a.label)} · ${esc(a.role)}">
              <span class="mini-ava" style="--av:${a.color}">${esc(a.label.charAt(0).toUpperCase())}</span>
              <span class="mc-name">${esc(a.label)}</span>
              <span class="mc-role">${esc(a.role)}</span>
              <span class="mc-check">${I.check}</span>
            </button>`).join('')}
          </div>
        </div>

        <div class="field">
          <label>仓库 <span class="opt">已选 <b id="repoCount">${repos.size}</b></span></label>
          <div class="repo-list" id="repoList">
            ${REPOS.map((r) => `<div class="repo ${repos.has(r) ? 'on' : ''}" data-repo="${r}" role="checkbox" aria-checked="${repos.has(r)}" tabindex="0">
              <span class="box">${I.check}</span><span class="rn">${r}</span><span class="rt">本地</span>
            </div>`).join('')}
          </div>
        </div>

        <div class="field-pair">
          <div class="field">
            <label>主仓库</label>
            <select id="pPrimary">${selectedRepos.length ? selectedRepos.map((r) => `<option value="${esc(r)}" ${r === defaultPrimary ? 'selected' : ''}>${esc(r)}</option>`).join('') : '<option value="">未选择仓库</option>'}</select>
          </div>
          <div class="field">
            <label>默认分支</label>
            <input id="pBranch" type="text" value="${esc(defaultBranch)}" placeholder="main" autocomplete="off" spellcheck="false" list="branchList">
            <datalist id="branchList">${branchOptions.map((b) => `<option value="${esc(b)}"></option>`).join('')}</datalist>
          </div>
        </div>

        <div class="refs-row">
          <span class="refs-count" id="refsCount">${initialBranchCount} 个分支 refs</span>
          <span class="refs-time ${initialRefs.stale ? 'stale' : ''}" id="refsTime">${esc(initialRefs.label)}${initialRefs.stale ? ' · 可能过期' : ''}</span>
          <button type="button" class="refs-manage" id="refsManage" ${editing ? '' : 'disabled'}>管理</button>
          <button type="button" class="refs-sync" id="refsSync">${I.refresh}同步</button>
        </div>
      </div>
      <div class="modal-foot">
        <span class="hint">${editing ? '保存后立即生效' : '可以稍后关联仓库'}</span>
        <button class="btn ghost" data-close>取消</button>
        <button class="btn primary" id="pSave">${editing ? '保存' : '创建'}</button>
      </div>
    </div>`;
  }

  function openProjectForm(p) {
    const editing = !!p;
    const layer = openModal(projectFormHTML(p));
    const nameInput = $('#pName', layer);
    const goalInput = $('#pGoal', layer);
    const modelSelect = $('#pModel', layer);
    const primarySelect = $('#pPrimary', layer);
    const branchInput = $('#pBranch', layer);
    let formBranches = editing ? Array.from(new Set([...(p.branches || []), p.defaultBranch || 'main', 'main'])) : ['main'];
    const save = $('#pSave', layer);
    const preview = $('#pPreview', layer);
    const initialIcon = ($('.icon-tile.on', layer) || {}).dataset ? $('.icon-tile.on', layer).dataset.iconId : (editing && p.icon === 'letter' ? 'letter' : (editing && p.icon && PROJECT_MARKS[p.icon] ? p.icon : 'smileyPlus'));
    const initialColor = ($('.color-dot.on', layer) || {}).dataset ? $('.color-dot.on', layer).dataset.colorId : 'gray';
    const initialFit = editing && p.customFit === 'cover' ? 'cover' : 'contain';
    const initialZoom = editing && Number(p.customZoom) ? Math.max(1, Math.min(2.5, Number(p.customZoom))) : 1;
    const initialPrimary = editing ? (p.primaryRepo || (p.repos || [])[0] || '') : '';
    const pick = { iconId: initialIcon, colorId: initialColor, customIcon: editing && p.customIcon ? p.customIcon : null, customFit: initialFit, customZoom: initialZoom, members: new Set(p ? (p.members || ['veko']) : ['veko']), repos: new Set(p ? p.repos || [] : []), primaryRepo: initialPrimary };

    const syncPreview = () => {
      if (!preview) return;
      const isLetter = pick.iconId === 'letter' && !pick.customIcon;
      const initial = (nameInput.value.trim().charAt(0) || 'P').toUpperCase();
      preview.className = 'p-icon lg tint-' + pick.colorId + (pick.customIcon ? ' custom' : '') + (isLetter ? ' letter' : '');
      preview.innerHTML = pick.customIcon ? customIconImg(pick.customIcon, pick.customFit, pick.customZoom)
        : isLetter ? `<span>${esc(initial)}</span>` : projectMark(pick.iconId);
      const clear = $('#iconClearBtn', layer);
      if (clear) clear.hidden = !pick.customIcon;
      const cf = $('#colorField', layer);
      if (cf) cf.hidden = !!pick.customIcon;
      const lb = $('#letterBtn', layer);
      if (lb) lb.classList.toggle('on', isLetter);
      const tune = $('#customTune', layer);
      if (tune) tune.hidden = !pick.customIcon;
      $$('[data-fit]', layer).forEach((b) => b.classList.toggle('on', b.dataset.fit === pick.customFit));
      const zr = $('#ctZoom', layer);
      if (zr) zr.value = String(pick.customZoom);
      const zv = $('#ctZoomVal', layer);
      if (zv) zv.textContent = Math.round(pick.customZoom * 100) + '%';
    };

    const syncPrimary = () => {
      if (!primarySelect) return;
      const selected = Array.from(pick.repos);
      const current = primarySelect.value;
      if (!selected.length) {
        primarySelect.innerHTML = '<option value="">未选择仓库</option>';
        return;
      }
      primarySelect.innerHTML = selected.map((r) => `<option value="${esc(r)}">${esc(r)}</option>`).join('');
      primarySelect.value = selected.includes(current) ? current : selected[0];
      pick.primaryRepo = primarySelect.value;
    };

    $$('[data-fit]', layer).forEach((b) => b.addEventListener('click', () => {
      pick.customFit = b.dataset.fit === 'cover' ? 'cover' : 'contain';
      syncPreview();
    }));
    $('#ctZoom', layer)?.addEventListener('input', (e) => {
      pick.customZoom = Math.max(1, Math.min(2.5, Number(e.target.value) || 1));
      syncPreview();
    });

    $$('[data-icon-id]', layer).forEach((b) => b.addEventListener('click', () => {
      $$('[data-icon-id]', layer).forEach((x) => x.classList.remove('on'));
      b.classList.add('on');
      pick.iconId = b.dataset.iconId;
      pick.customIcon = null;
      syncPreview();
    }));
    $('#letterBtn', layer)?.addEventListener('click', () => {
      $$('[data-icon-id]', layer).forEach((x) => x.classList.remove('on'));
      pick.iconId = 'letter';
      pick.customIcon = null;
      syncPreview();
    });

    $$('[data-color-id]', layer).forEach((b) => b.addEventListener('click', () => {
      $$('[data-color-id]', layer).forEach((x) => x.classList.remove('on'));
      b.classList.add('on');
      pick.colorId = b.dataset.colorId;
      const grid = $('#iconGrid', layer);
      if (grid) grid.className = 'icon-grid tint-' + pick.colorId;
      syncPreview();
    }));

    const fileInput = $('#iconFile', layer);
    const uploadBtn = $('#iconUploadBtn', layer);
    uploadBtn?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      if (!/^image\//.test(file.type)) { toast('请选择图片文件'); fileInput.value = ''; return; }
      if (file.size > 200 * 1024) { toast('图片不能超过 200KB'); fileInput.value = ''; return; }
      const reader = new FileReader();
      reader.onload = () => {
        pick.customIcon = String(reader.result || '');
        pick.customFit = 'contain';
        pick.customZoom = 1;
        $$('[data-icon-id]', layer).forEach((x) => x.classList.remove('on'));
        syncPreview();
        toast('已选择自定义图标');
      };
      reader.onerror = () => toast('图片读取失败');
      reader.readAsDataURL(file);
    });
    $('#iconClearBtn', layer)?.addEventListener('click', () => {
      pick.customIcon = null;
      pick.customFit = 'contain';
      pick.customZoom = 1;
      const first = $('[data-icon-id]', layer);
      if (first) first.classList.add('on');
      if (first) pick.iconId = first.dataset.iconId;
      syncPreview();
    });

    $$('[data-member]', layer).forEach((b) => b.addEventListener('click', () => {
      const on = !b.classList.contains('on');
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
      if (on) pick.members.add(b.dataset.member); else pick.members.delete(b.dataset.member);
      const mc = $('#memberCount', layer);
      if (mc) mc.textContent = String(pick.members.size);
    }));

    $$('[data-repo]', layer).forEach((row) => {
      const toggle = () => {
        const on = !row.classList.contains('on');
        row.classList.toggle('on', on);
        row.setAttribute('aria-checked', String(on));
        const r = row.dataset.repo;
        if (on) pick.repos.add(r); else pick.repos.delete(r);
        const rc = $('#repoCount', layer);
        if (rc) rc.textContent = String(pick.repos.size);
        syncPrimary();
      };
      row.addEventListener('click', toggle);
      row.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      });
    });

    const renderBranchRefs = () => {
      const dl = $('#branchList', layer);
      if (dl) dl.innerHTML = Array.from(new Set([...formBranches, branchInput.value.trim()].filter(Boolean))).map((b) => `<option value="${esc(b)}"></option>`).join('');
      const count = $('#refsCount', layer);
      if (count) count.textContent = formBranches.length + ' 个分支 refs';
    };
    $('#refsSync', layer)?.addEventListener('click', () => {
      const extras = REF_EXTRA[editing ? p.id : '_default'] || REF_EXTRA._default;
      formBranches = Array.from(new Set([...formBranches, ...extras]));
      if (editing) {
        p.branches = [...formBranches];
        p.refsUpdated = '刚刚';
        p.refsAgeMin = 0;
        logProjectEvent(p, `同步 refs · ${formBranches.length} 个分支`, 'work', 'refs');
      }
      const time = $('#refsTime', layer);
      if (time) { time.textContent = '刚刚'; time.classList.remove('stale'); }
      renderBranchRefs();
      toast(`已同步 ${formBranches.length} 个分支`);
    });
    branchInput?.addEventListener('change', renderBranchRefs);
    $('#refsManage', layer)?.addEventListener('click', () => { closeModal(); openBranchManager(p); });

    const updateSave = () => { save.disabled = !nameInput.value.trim(); };
    nameInput.addEventListener('input', () => { updateSave(); nameInput.classList.remove('invalid'); syncPreview(); });
    updateSave();

    const commit = () => {
      const name = nameInput.value.trim();
      if (!name) { nameInput.classList.add('invalid'); nameInput.focus(); return; }
      const goal = goalInput.value.trim();
      const repos = Array.from(pick.repos);
      if (editing) {
        p.name = name; p.goal = goal; p.repos = repos; p.members = Array.from(pick.members); p.defaultModel = modelSelect ? modelSelect.value : p.defaultModel; p.primaryRepo = primarySelect ? primarySelect.value : (repos[0] || ''); p.defaultBranch = (branchInput && branchInput.value.trim()) || 'main'; p.branches = [...formBranches];
        p.icon = pick.iconId; p.colorId = pick.colorId; p.customIcon = pick.customIcon || null; p.customFit = pick.customIcon ? pick.customFit : null; p.customZoom = pick.customIcon ? pick.customZoom : null;
        closeModal(); render(); toast('已保存');
      } else {
        const id = 'p' + Date.now();
        DB.projects.unshift({
          id, name, icon: pick.iconId, colorId: pick.colorId, customIcon: pick.customIcon || null, customFit: pick.customIcon ? pick.customFit : null, customZoom: pick.customIcon ? pick.customZoom : null, goal, repos, members: Array.from(pick.members), defaultModel: modelSelect ? modelSelect.value : S.model, primaryRepo: primarySelect ? primarySelect.value : (repos[0] || ''), defaultBranch: (branchInput && branchInput.value.trim()) || 'main', branches: [...formBranches], refsUpdated: '刚刚', refsAgeMin: 0,
          time: '刚刚', unread: false, status: 'active', nextSeq: 1,
          tasks: [],
          library: [{ path: 'INDEX.md', scope: 'index', status: 'proposed', meta: '草稿' }],
          events: [{ t: '项目已创建', time: '刚刚', tone: 'work', kind: 'project' }],
          messages: []
        });
        S.active = id; S.pane = 'list'; S.detail = null; S.peek = null;
        S.filter = null; S.tray = false; S.showArchived = false;
        S.searchOpen = false; S.sideQuery = '';
        closeModal();
        S.stick = true; S.focusComposer = true;
        render();
        toast('项目已创建');
      }
    };

    save.addEventListener('click', commit);
    layer.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.target === nameInput || e.target === goalInput)) {
        e.preventDefault(); commit();
      }
    });
  }

  function openWorkspaceAdd() {
    const layer = openModal(`<div class="modal sm" role="dialog" aria-modal="true" aria-label="添加工作区">
      <div class="modal-head"><h3>添加工作区</h3><button class="iconbtn sm x" data-close aria-label="关闭">${I.x}</button></div>
      <div class="modal-body">
        <div class="field"><label>名称</label><input id="wsName" type="text" placeholder="例如：youshi" autocomplete="off" data-autofocus></div>
        <div class="field"><label>路径</label><input id="wsPath" type="text" placeholder="~/work/youshi" autocomplete="off" spellcheck="false"></div>
      </div>
      <div class="modal-foot"><span class="hint">加入后可在工作区右键收编</span><button class="btn ghost" data-close>取消</button><button class="btn primary" id="wsSave">添加</button></div>
    </div>`);
    const name = $('#wsName', layer);
    const path = $('#wsPath', layer);
    const save = $('#wsSave', layer);
    save.addEventListener('click', () => {
      const n = name.value.trim();
      if (!n) { name.focus(); name.classList.add('invalid'); return; }
      DB.workspaces.push({ id: 'ws-' + Date.now(), name: n, path: path.value.trim() });
      closeModal(); renderSide(); toast('已添加工作区');
    });
    layer.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.target === name || e.target === path)) { e.preventDefault(); save.click(); }
    });
  }

  function openRenameWorkspace(w) {
    const layer = openModal(`<div class="modal sm" role="dialog" aria-modal="true" aria-label="重命名工作区">
      <div class="modal-head"><h3>重命名工作区</h3><button class="iconbtn sm x" data-close aria-label="关闭">${I.x}</button></div>
      <div class="modal-body">
        <div class="field"><label>名称</label><input id="renameInput" type="text" value="${esc(w.name)}" autocomplete="off" data-autofocus></div>
      </div>
      <div class="modal-foot"><button class="btn ghost" data-close>取消</button><button class="btn primary" id="renameSave">保存</button></div>
    </div>`);
    const input = $('#renameInput', layer);
    const save = () => {
      const v = input.value.trim();
      if (!v) { input.focus(); return; }
      w.name = v;
      closeModal(); renderSide(); toast('已重命名');
    };
    $('#renameSave', layer).addEventListener('click', save);
    layer.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); save(); } });
  }

  function confirmDelete(p) {
    if (DB.projects.length <= 1) { toast('至少保留一个项目'); return; }
    const layer = openModal(`<div class="modal sm" role="dialog" aria-modal="true" aria-label="删除项目">
      <div class="modal-head"><h3>删除「${esc(p.name)}」</h3><button class="iconbtn sm x" data-close aria-label="关闭">${I.x}</button></div>
      <div class="modal-body">
        <p class="confirm-copy">任务记录、Library 文件与受管的本地 worktree 会一并清除。已经推到 GitHub 的分支和 PR 不受影响。</p>
      </div>
      <div class="modal-foot"><span class="hint">此操作不能撤销</span><button class="btn ghost" data-close>取消</button><button class="btn danger" id="delBtn">删除</button></div>
    </div>`);
    $('#delBtn', layer).addEventListener('click', () => {
      const i = DB.projects.findIndex((x) => x.id === p.id);
      if (i >= 0) DB.projects.splice(i, 1);
      if (S.active === p.id) {
        S.active = DB.projects[0].id;
        S.detail = null; S.peek = null; S.pane = 'list';
      }
      closeModal(); render(); toast('已删除');
    });
  }

  function openAddToProject(w) {
    const targets = DB.projects.filter((p) => p.status !== 'archived');
    const layer = openModal(`<div class="modal" role="dialog" aria-modal="true" aria-label="加入项目">
      <div class="modal-head"><h3>把「${esc(w.name)}」加入项目</h3><button class="iconbtn sm x" data-close aria-label="关闭">${I.x}</button></div>
      <div class="modal-body">
        <p class="confirm-copy" style="margin-top:-2px;">协调者会读取最近的会话，整理出可以推进的任务。</p>
        <div class="repo-list">
          ${targets.map((p) => `<div class="repo" data-target="${p.id}" role="button" tabindex="0" style="height:38px;">
            ${projectBadge(p, 'sm')}
            <span style="font-family:var(--font-ui);font-size:12.5px;">${esc(p.name)}</span>
            <span class="rt">${p.tasks.length} 个任务</span>
          </div>`).join('')}
        </div>
      </div>
      <div class="modal-foot"><span class="hint">${targets.length} 个进行中的项目</span><button class="btn ghost" data-close>取消</button></div>
    </div>`);

    $$('[data-target]', layer).forEach((row) => row.addEventListener('click', () => {
      const p = DB.projects.find((x) => x.id === row.dataset.target);
      if (!p) return;
      const pre = prefixFor(p);
      p.messages.push({ kind: 'agent', text: `读完了「${esc(w.name)}」。整理出两条可以进 <code class="inl">INDEX.md</code> 的结论，另外有一个可以立刻开工的任务。` });
      p.tasks.unshift({
        id: `${pre}-${p.nextSeq++}`, title: `跟进「${w.name}」的遗留问题`, status: 'queued',
        repo: p.primaryRepo || p.repos[0] || '', desc: '从收编的会话里提取。', baseBranch: p.defaultBranch || 'main', worker: '', worktree: '',
        model: p.defaultModel || S.model, prs: [], timeline: []
      });
      S.active = p.id; S.pane = 'list'; S.detail = null; S.peek = null; S.filter = null;
      S.searchOpen = false; S.sideQuery = '';
      closeModal(); S.stick = true; render(); toast('已加入项目');
    }));
  }

  function prefixFor(p) {
    const known = { 'youshi-product': 'YOU', bzti: 'BZT', native: 'NAT' };
    return known[p.id] || 'PRJ';
  }

  /* ---------- 文档与工件 ---------- */
  const SCOPE_LABEL = { index: '项目索引', decision: '决策', runbook: '操作手册', spec: '规格', artifact: '工件', user: '资料' };

  function fileTag(f) {
    if (f.status === 'ratified') return '<span class="tag ok">已确认</span>';
    if (f.status === 'proposed') return '<span class="tag warn">待确认</span>';
    if (f.status === 'disputed') return '<span class="tag danger">有争议</span>';
    return '';
  }

  function openFileByPath(p, path) {
    const f = p.library.find((x) => x.path === path);
    if (!f) { toast('找不到这个文件'); return; }
    const isArtifact = f.scope === 'artifact' || f.scope === 'user';
    const layer = openModal(`<div class="modal md" role="dialog" aria-modal="true" aria-label="${esc(path)}">
      <div class="doc-head">
        <span class="path">${esc(path)}</span>
        ${fileTag(f)}
        <button class="iconbtn sm" data-close aria-label="关闭">${I.x}</button>
      </div>
      <div class="doc-body">${isArtifact ? artifactDoc(f, p) : docContent(f, p)}</div>
      <div class="doc-foot">
        <span class="hint">${SCOPE_LABEL[f.scope] || '文件'}</span>
        <span class="spacer"></span>
        <button class="btn ghost" data-copy-path="${esc(f.path)}">${I.copy}复制路径</button>
        <button class="btn ghost" data-close>关闭</button>
      </div>
    </div>`);
    $('[data-copy-path]', layer)?.addEventListener('click', (e) => copy(e.currentTarget.dataset.copyPath));
    const docBody = $('.doc-body', layer);
    if (docBody) {
      const upd = () => docBody.classList.toggle('fade-bottom', docBody.scrollHeight - docBody.scrollTop - docBody.clientHeight > 12);
      docBody.addEventListener('scroll', upd, { passive: true });
      requestAnimationFrame(upd);
    }
    $('.big-play', layer)?.addEventListener('click', (e) => {
      const stage = e.currentTarget.closest('.stage');
      stage.classList.toggle('playing');
      e.currentTarget.innerHTML = stage.classList.contains('playing') ? I.pause : I.play;
    });
  }

  function docContent(f, p) {
    const front = `scope: ${f.scope}\nstatus: ${f.status || 'artifact'}\nproject: ${p.name}`;
    let body = '';

    if (f.path === 'INDEX.md') {
      body = `<h1>${esc(p.name)} · INDEX</h1>
        <div class="front">${esc(front)}</div>
        <p>只放北极星目标、仓库表、硬约束和检索指针。细节留在 decisions 与 specs 里。</p>
        <h2>北极星</h2>
        <p>${esc(p.goal || '统一产品体验，减少线上回归。')}</p>
        <h2>仓库</h2>
        <ul>${p.repos.map((r) => `<li><code class="inl">${esc(r)}</code></li>`).join('') || '<li>暂未关联</li>'}</ul>
        <h2>硬约束</h2>
        <ul>
          <li>发布前必须跑 Chromium 与 WebKit 三档视口回归。</li>
          <li>生产变更先过 staging，不接受直接上线。</li>
          <li>决策记录一旦被替代，旧文档标记 superseded。</li>
        </ul>
        <h2>检索指针</h2>
        <ul>
          <li>合盘状态机：<code class="inl">decisions/004-single-switch-state.md</code></li>
          <li>分数数据源：<code class="inl">decisions/003-score-source.md</code></li>
          <li>回归手册：<code class="inl">runbooks/playwright-3-viewports.md</code></li>
        </ul>`;
    } else if (f.path.includes('004-single-switch-state')) {
      body = `<h1>合盘切回单人盘</h1>
        <div class="front">${esc(front)}</div>
        <p>合盘与单人盘各自持有一份视图状态，切换时靠事件互相通知，导致胶囊上的 ×、「+」选盘、左侧返回三条路径行为不一致。</p>
        <h2>决定</h2>
        <ul>
          <li>视图模式统一由 <code class="inl">mergeState.mode</code> 驱动，入口只派发意图，不各自改状态。</li>
          <li>胶囊 × 与「+」选盘复用同一个 reducer，退出合盘时清理临时会话。</li>
          <li>触摸端断点保留 390×844、390×664、360×740 三档。</li>
        </ul>
        <h2>后果</h2>
        <p>切换路径的回归用例从 9 条收敛到 3 条；旧的事件监听在下一个版本移除。</p>`;
    } else if (f.path.includes('003-score-source')) {
      body = `<h1>分数数据源</h1>
        <div class="front">${esc(front)}</div>
        <p>合盘分数原来读旧的 relationship 表，新关系写入后要等定时任务才能看到变化。</p>
        <h2>决定</h2>
        <ul>
          <li>读路径切到新的关系聚合视图，保留旧表作为回落。</li>
          <li>分数缺省为 0，不再展示「—」占位。</li>
        </ul>
        <h2>后果</h2>
        <p>分数刷新延迟从分钟级降到秒级；聚合视图加索引后，P95 从 180ms 降到 42ms。</p>`;
    } else if (f.path.includes('001-pdf-parser')) {
      body = `<h1>历史标书解析器</h1>
        <div class="front">${esc(front)}</div>
        <p>历史标书以扫描件为主，纯文本抽取会丢掉章节层级。</p>
        <h2>决定</h2>
        <ul>
          <li>先用 OCR 拿文本与坐标，再按字体大小聚类章节。</li>
          <li>表格单独走单元格识别，不拼进正文。</li>
          <li>无法识别的页落盘保留原图，供人工复核。</li>
        </ul>`;
    } else if (f.path.includes('playwright-3-viewports')) {
      body = `<h1>三档视口回归</h1>
        <div class="front">${esc(front)}</div>
        <p>合盘相关改动至少要覆盖以下三档，Chromium 与 WebKit 各跑一遍。</p>
        <div class="doc-code">390 × 844   iPhone 14 / 15
390 × 664   紧凑高度
360 × 740   Android 常见宽度</div>
        <h2>步骤</h2>
        <ul>
          <li>启动本地 staging，登录测试账号。</li>
          <li>进入合盘，切换两对合盘、点胶囊 ×、用「+」选盘。</li>
          <li>在已产生消息的合盘里点左侧返回单人盘。</li>
          <li>录屏保存到 <code class="inl">artifacts/</code>，失败截图一并归档。</li>
        </ul>`;
    } else if (f.path.includes('cf-tunnel-whitelist')) {
      body = `<h1>Cloudflare Tunnel 白名单</h1>
        <div class="front">${esc(front)}</div>
        <p>预发容器换 IP 后，Tunnel 白名单不会自动更新，健康检查会误报。</p>
        <h2>步骤</h2>
        <ul>
          <li>拿到新容器的出口 IP，写进 <code class="inl">infra/tunnel.yaml</code>。</li>
          <li>先只更 staging，观察 10 分钟。</li>
          <li>生产切换前确认旧 IP 仍在白名单里，避免回滚时断流。</li>
        </ul>
        <div class="doc-quote">这条手册还在争议中：有人主张用 Tunnel 的 access rule 替代 IP 白名单。</div>`;
    } else if (f.path.includes('ocr-fallback')) {
      body = `<h1>OCR 兜底</h1>
        <div class="front">${esc(front)}</div>
        <p>当 PDF 文本层缺失时，降级到 OCR；仍失败则整页保留原图。</p>
        <h2>步骤</h2>
        <ul>
          <li>检测文本层，空页占比超过 30% 触发 OCR。</li>
          <li>按页处理，失败页写进 <code class="inl">retry.json</code>。</li>
          <li>整份文档失败时，任务转 <code class="inl">waiting</code> 等人决定。</li>
        </ul>`;
    } else if (f.path.includes('youshi-merge-ux')) {
      body = `<h1>合盘交互规格</h1>
        <div class="front">${esc(front)}</div>
        <p>合盘是两个人的共享会话，单人盘是默认形态，两者共用一个输入区。</p>
        <h2>规则</h2>
        <ul>
          <li>进入合盘时，胶囊展开显示双方头像与 ×。</li>
          <li>已有消息的合盘，左侧返回只退出视图，不删除会话。</li>
          <li>「+」选盘最多同时存在两对，超出时替换最早的一对。</li>
          <li>切回单人盘后，输入框的草稿保留。</li>
        </ul>`;
    } else {
      body = `<h1>${esc(f.path.split('/').pop().replace(/\.[^.]+$/, ''))}</h1>
        <div class="front">${esc(front)}</div>
        <p>${esc(f.meta ? `体量 ${f.meta}。` : '')}这份资料由协调者维护，Worker 只读。</p>
        <h2>要点</h2>
        <ul>
          <li>结论先行，背景放在后面。</li>
          <li>涉及仓库的改动附上 PR 号。</li>
          <li>被替代的条目保留链接并标记 superseded。</li>
        </ul>`;
    }
    return body;
  }

  function artifactDoc(f, p) {
    const isImage = /\.png$/i.test(f.path);
    const isPdf = /\.pdf$/i.test(f.path);
    if (isPdf) {
      return `<h1>${esc(f.path.split('/').pop().replace(/\.pdf$/i, ''))}</h1>
        <div class="front">${esc(`type: PDF\nsize: ${f.meta || '—'}\nproject: ${p.name}`)}</div>
        <p>竞品的合盘流程拆解，上传后由协调者阅读并提炼成任务。</p>
        <h2>摘要</h2>
        <ul>
          <li>合盘入口放在会话顶部，切换成本低于侧栏。</li>
          <li>退出合盘时保留单人盘输入草稿。</li>
          <li>合盘内不支持再拉第三人，减少权限分支。</li>
        </ul>`;
    }
    return `<div class="stage ${isImage ? 'still' : ''}">
        <button class="big-play" aria-label="播放">${I.play}</button>
        <span class="track"><i></i></span>
        <span class="tc">${isImage ? '390 × 844' : '00:12 / 02:35'}</span>
      </div>
      <h1>${esc(f.path.split('/').pop())}</h1>
      <p>${isImage ? '触摸回归截图 · 合盘切回单人盘 · 390×844' : '触摸回归录屏 · 48 步 · Chromium 390×844'}</p>
      <div class="doc-code">${isImage ? 'dandelion-merge-flow.png' : 'WebM · VP9 · 2.6 MB'}</div>`;
  }

  function openArtifact(a) {
    if (!a) return;
    const layer = openModal(`<div class="modal md" role="dialog" aria-modal="true" aria-label="${esc(a.name)}">
      <div class="doc-head"><span class="path">artifacts · 录屏</span><span class="tag">${esc(a.sub)}</span><button class="iconbtn sm" data-close aria-label="关闭">${I.x}</button></div>
      <div class="doc-body">
        <div class="stage">
          <button class="big-play" aria-label="播放">${I.play}</button>
          <span class="track"><i></i></span>
          <span class="tc">00:12 / 02:35</span>
        </div>
        <h1>${esc(a.name)}</h1>
        <p>48 步 · 触摸回归 · Chromium 390×844</p>
        <div class="doc-code">agent/you-1-single-switch · f31489d</div>
      </div>
      <div class="doc-foot"><span class="hint">来自 YOU-1</span><span class="spacer"></span><button class="btn ghost" data-close>关闭</button></div>
    </div>`);
    $('.big-play', layer)?.addEventListener('click', (e) => {
      const stage = e.currentTarget.closest('.stage');
      stage.classList.toggle('playing');
      e.currentTarget.innerHTML = stage.classList.contains('playing') ? I.pause : I.play;
    });
  }

  function openAutomations() {
    openModal(`<div class="modal" role="dialog" aria-modal="true" aria-label="自动化任务">
      <div class="modal-head"><h3>自动化任务</h3><button class="iconbtn sm x" data-close aria-label="关闭">${I.x}</button></div>
      <div class="modal-body" style="padding-top:2px;">
        <div class="plugin-row">
          <span class="pico">${I.clock}</span>
          <span class="pinfo"><span class="pn">夜间三档回归</span><span class="pd">每天 02:00 · Chromium / WebKit · 390×844、390×664、360×740</span></span>
          <span class="tag ok">已启用</span>
        </div>
        <div class="plugin-row">
          <span class="pico">${I.terminal}</span>
          <span class="pinfo"><span class="pn">每周项目摘要</span><span class="pd">周一 09:00 · 汇总 Done 与 For Review</span></span>
          <span class="tag ok">已启用</span>
        </div>
        <div class="plugin-row">
          <span class="pico">${I.eye}</span>
          <span class="pinfo"><span class="pn">PR 与 CI 监听</span><span class="pd">每 5 分钟 · 只读取，不写入</span></span>
          <span class="tag ok">已启用</span>
        </div>
      </div>
      <div class="modal-foot"><span class="hint">下次运行：明天 02:00</span><button class="btn ghost" data-close>关闭</button></div>
    </div>`);
  }

  function openNewSessionMenu(anchor) {
    const el = openFloating(anchor, `
      <div class="menu-head">新会话</div>
      <button class="menu-item" data-ns="task"><span class="mi">${I.plus}</span>在当前项目新建任务</button>
      <button class="menu-item" data-ns="project"><span class="mi">${I.folder}</span>新建项目</button>
    `, { className: 'pop' });
    $$('[data-ns]', el).forEach((b) => b.addEventListener('click', () => {
      const action = b.dataset.ns;
      closeFloating();
      if (action === 'task') {
        S.centerView = 'chat';
        S.rightOpen = true;
        S.pane = 'list';
        S.newTask = { status: 'queued' };
        render();
      }
      if (action === 'project') openProjectForm(null);
    }));
  }

  function openPlugins() {
    openModal(`<div class="modal" role="dialog" aria-modal="true" aria-label="插件">
      <div class="modal-head"><h3>插件</h3><button class="iconbtn sm x" data-close aria-label="关闭">${I.x}</button></div>
      <div class="modal-body" style="padding-top:2px;">
        <div class="plugin-row">
          <span class="pico">${I.spark}</span>
          <span class="pinfo"><span class="pn">dsh-claude-style</span><span class="pd">主题 · 0.19.7</span></span>
          <span class="tag ok">已启用</span>
        </div>
        <div class="plugin-row">
          <span class="pico">${I.folder}</span>
          <span class="pinfo"><span class="pn">dsh-projects</span><span class="pd">项目工作台 · 0.1.0</span></span>
          <span class="tag warn">开发中</span>
        </div>
      </div>
      <div class="modal-foot"><span class="hint">同一时刻只启用一个主题</span><button class="btn ghost" data-close>关闭</button></div>
    </div>`);
  }

  function openShortcuts() {
    const rows = [
      ['搜索项目与工作区', ['⌘', 'K']],
      ['发送消息', ['Enter']],
      ['换行', ['⇧', 'Enter']],
      ['关闭浮层', ['Esc']],
      ['引用任务', ['@']],
      ['预览 / 打开详情', ['单击', '双击']]
    ];
    openModal(`<div class="modal sm" role="dialog" aria-modal="true" aria-label="键盘快捷键">
      <div class="modal-head"><h3>键盘快捷键</h3><button class="iconbtn sm x" data-close aria-label="关闭">${I.x}</button></div>
      <div class="modal-body" style="padding-top:2px;">
        <div class="kbd-list">
          ${rows.map(([label, keys]) => `<div class="kbd-row"><span>${label}</span><span class="keys">${keys.map((k) => `<span class="kbd">${k}</span>`).join('')}</span></div>`).join('')}
        </div>
      </div>
      <div class="modal-foot"><span class="spacer"></span><button class="btn ghost" data-close>关闭</button></div>
    </div>`);
  }

  /* ---------- 动作 ---------- */
  function selectProject(id) {
    if (!DB.projects.some((p) => p.id === id)) return;
    if (S.active === id && !S.detail) return;
    const p = DB.projects.find((x) => x.id === id);
    p.unread = false;
    S.active = id;
    S.detail = null;
    S.peek = null;
    S.pane = 'list';
    S.filter = null;
    S.tray = false;
    S.logFor = null;
    S.searchOpen = false;
    S.expandedWork = {};
    S.expandedProcess = {};
    S.expandedGroups = {};
    S.expandedThoughts = {};
    S.feedback = {};
    S.centerView = 'chat';
    S.folders = {};
    S.newTask = null;
    S.sideQuery = '';
    S.stick = true;
    S.swap = true;
    render();
  }

  function setPane(pane) {
    if (S.pane === pane && !S.detail) return;
    S.newTask = null;
    S.taskEdit = null;
    S.pane = pane;
    S.detail = null;
    S.logFor = null;
    S.scrollRightTop = true;
    S.animateRight = true;
    renderRight();
  }

  function send() {
    const p = proj();
    const input = $('#input');
    if (!input || S.typing) return;
    const text = input.value.trim();
    const atts = (p.attachments || []).slice();
    if (!text && !atts.length) return;

    p.messages.push({ kind: 'user', text, time: '刚刚', attachments: atts });
    p.draft = '';
    p.attachments = [];
    p.time = '刚刚';
    S.typing = true;
    S.typingProject = p.id;
    S.stick = true;
    S.enterLast = true;
    S.focusComposer = true;
    closeMention();
    render();

    setTimeout(() => {
      S.typing = false;
      S.typingProject = null;
      const r = reply(text, p);
      r.messages.forEach((m) => { if (m.kind === 'agent') m.at = '刚刚'; });
      p.messages.push(...r.messages);
      if (r.tasks && r.tasks.length) {
        r.tasks.forEach((t) => {
          p.tasks.unshift(t);
          p.nextSeq = Math.max(p.nextSeq, parseInt(t.id.split('-')[1], 10) + 1);
        });
        p.messages.push({ kind: 'note', text: `新建 ${r.tasks.length} 个任务` });
      }
      S.stick = true;
      S.enterLast = true;
      S.focusComposer = true;
      render();
    }, 900);
  }

  function reply(text, p) {
    const pre = prefixFor(p);
    const n = p.nextSeq;

    if (/拆|分成|几个|并行|三块/.test(text)) {
      const titles = ['抽离合盘状态源', '单人盘入口回归', '迁移脚本与数据校验'];
      return {
        messages: [{
          kind: 'agent',
          text: `拆成 3 个。<code class="inl">${pre}-${n}</code> 先跑，摸清状态源之后另外两个再动，避免同时改同一处。`
        }],
        tasks: titles.map((t, i) => ({
          id: `${pre}-${n + i}`, title: t, status: i === 0 ? 'working' : 'queued',
          repo: p.repos[i % Math.max(p.repos.length, 1)] || '', desc: t,
          worker: i === 0 ? 'worker-' + Math.random().toString(16).slice(2, 6) : '',
          worktree: i === 0 ? `agent/${pre.toLowerCase()}-${n + i}` : '',
          model: S.model, prs: [],
          timeline: i === 0 ? [{ t: '已拉起 worktree，开始读代码', time: '刚刚', tone: 'work' }] : []
        }))
      };
    }

    if (/上线|发布|deploy|生产/i.test(text)) {
      return {
        messages: [{
          kind: 'agent',
          text: '发布分两步：先确认 staging 的 <code class="inl">f31489d</code> 冒烟通过，再滚动到生产。这一步派 Worker 去做，做完把健康检查结果贴回来。'
        }],
        tasks: [{
          id: `${pre}-${n}`, title: '生产发布 f31489d', status: 'queued',
          repo: p.repos[p.repos.length - 1] || '', desc: '滚动发布 f31489d 到生产，带健康检查与回滚预案。',
          worker: '', worktree: '', model: S.model, prs: [], timeline: []
        }]
      };
    }

    if (/测试|回归|验证/.test(text)) {
      return {
        messages: [{
          kind: 'agent',
          text: '回归用 Playwright 跑三档视口，Chromium 和 WebKit 各一遍。跑完把录屏和失败截图放进 Library。'
        }],
        tasks: []
      };
    }

    return {
      messages: [{
        kind: 'agent',
        text: `先看一下 <code class="inl">${esc(p.repos[0] || '仓库')}</code> 里相关的部分，需要动手就拆成任务派下去。`
      }],
      tasks: []
    };
  }

  function answerQ(idx, q, custom) {
    const p = proj();
    const t = p.tasks.find((x) => x.id === q.from);
    if (!t) return;
    const text = (custom || q.options[idx] || '').trim();
    if (!text) return;

    S.answered[t.id] = true;
    S.tray = false;
    p.messages.push({ kind: 'user', text, time: '刚刚' });
    p.messages.push({ kind: 'relay', text: `${q.from} · 1 条` });
    t.status = 'working';
    t.timeline.push({ t: `已收到答复：${text}`, time: '刚刚', tone: 'work' });
    delete t.question;
    p.time = '刚刚';
    S.stick = true;
    S.enterLast = true;
    S.focusComposer = true;
    render();

    setTimeout(() => {
      p.messages.push({
        kind: 'agent',
        at: '刚刚',
        text: `收到，已经转给 <code class="inl">${esc(q.worker || 'Worker')}</code>，按「${esc(text)}」继续。`
      });
      S.stick = true;
      S.enterLast = true;
      render();
    }, 700);
  }

  function startTask(t, opts) {
    const p = proj();
    const blockers = activeBlockers(p, t);
    if (blockers.length) { toast(`仍被 ${blockers.map((b) => b.id).join('、')} 阻塞`); return; }
    if (opts) {
      if (opts.env) t.env = opts.env;
      if (opts.model) t.model = opts.model;
    }
    const env = t.env || S.env;
    if (envMeta(env).status === 'off') { toast('运行环境不可用'); return; }
    t.status = 'working';
    if (!t.worktree) t.worktree = env === '远程 Sandbox' ? 'sandbox/' + t.id.toLowerCase() : 'agent/' + t.id.toLowerCase() + '-work';
    t.baseBranch = t.baseBranch || p.defaultBranch || 'main';
    t.timeline = t.timeline || [];
    t.timeline.push({ t: `从 ${t.baseBranch} 创建 worktree · ${t.worktree}（${env}）`, time: '刚刚', tone: 'work' });
    S.tray = false;
    render();
    toast('已开始');
  }

  function startTaskWithRefs(t) {
    const p = proj();
    const refs = refsMeta(p);
    const base = t.baseBranch || p.defaultBranch || 'main';
    const env = t.env || S.env;
    const envOff = envMeta(env).status === 'off';
    const model = t.model || p.defaultModel || S.model;
    const wtFor = (e) => t.worktree || (e === '远程 Sandbox' ? 'sandbox/' + t.id.toLowerCase() : 'agent/' + t.id.toLowerCase() + '-work');
    const repo = p.primaryRepo || (p.repos && p.repos[0]) || '—';
    const layer = openModal(`<div class="modal sm start-modal" role="dialog" aria-modal="true" aria-label="启动任务">
      <div class="modal-head"><h3>启动任务</h3><button class="iconbtn sm x" data-close aria-label="关闭">${I.x}</button></div>
      <div class="modal-body">
        <div class="start-task"><span class="pid">${t.id}</span><span class="stitle">${esc(t.title)}</span></div>
        <div class="start-meta">
          <div><span class="k">仓库</span><span class="v mono">${esc(repo)}</span></div>
          <div><span class="k">基线分支</span><span class="v mono">${esc(base)}${t.branchLocal ? ' · 新建' : ''}</span></div>
          <div><span class="k">Worktree</span><span class="v mono" id="startWorktreeValue">${esc(wtFor(env))}</span></div>
          <div><span class="k">环境</span><span class="v"><select id="startEnv">${ENVS.map((e) => `<option value="${esc(e.name)}" ${e.name === env ? 'selected' : ''}>${esc(e.name)}</option>`).join('')}</select><span class="env-health" id="startEnvHealth"><span class="env-dot ${envMeta(env).status}"></span>${esc(envMeta(env).health)}</span></span></div>
          <div><span class="k">模型</span><span class="v"><select id="startModel">${MODELS.map((m) => `<option value="${esc(m.name)}" ${m.name === model ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}</select></span></div>
          <div><span class="k">refs</span><span class="v ${refs.stale ? 'warn' : ''}">${esc(refs.label)}${refs.stale ? ' · 可能过期' : ''}</span></div>
        </div>
        ${refs.stale ? `<div class="start-warn">${I.lock}refs 已超过 60 分钟未同步，直接启动可能错过新分支或提交。</div>` : ''}
        <div class="start-warn off" id="startEnvWarn" ${envOff ? '' : 'hidden'}>${I.lock}当前环境不可用（${esc(envMeta(env).health)}），无法启动。</div>
      </div>
      <div class="modal-foot">
        <button class="btn ghost" data-close>取消</button>
        ${refs.stale
          ? `<button class="btn ghost" id="startAnyway" ${envOff ? 'disabled' : ''}>仍然开始</button><button class="btn primary" id="syncStart" ${envOff ? 'disabled' : ''}>刷新并开始</button>`
          : `<button class="btn primary" id="startNow" ${envOff ? 'disabled' : ''}>开始执行</button>`}
      </div>
    </div>`);
    const readOpts = () => ({ env: $('#startEnv', layer)?.value, model: $('#startModel', layer)?.value });
    const syncEnv = () => {
      const envName = $('#startEnv', layer).value;
      const wt = $('#startWorktreeValue', layer);
      if (wt) wt.textContent = wtFor(envName);
      const health = envMeta(envName);
      const el = $('#startEnvHealth', layer);
      if (el) { el.className = 'env-health'; el.innerHTML = `<span class="env-dot ${health.status}"></span>${esc(health.health)}`; }
      const off = health.status === 'off';
      ['#startNow', '#startAnyway', '#syncStart'].forEach((sel) => { const b = $(sel, layer); if (b) b.disabled = off; });
      const warn = $('#startEnvWarn', layer);
      if (warn) { warn.hidden = !off; warn.innerHTML = `${I.lock}当前环境不可用（${esc(health.health)}），无法启动。`; }
    };
    $('#startEnv', layer)?.addEventListener('change', syncEnv);
    $('#startNow', layer)?.addEventListener('click', () => { closeModal(); startTask(t, readOpts()); });
    $('#startAnyway', layer)?.addEventListener('click', () => { closeModal(); startTask(t, readOpts()); });
    $('#syncStart', layer)?.addEventListener('click', () => {
      syncProjectRefs(p);
      closeModal();
      startTask(t, readOpts());
    });
  }

  function markTask(id, action) {
    const t = proj().tasks.find((x) => x.id === id);
    if (!t) return;
    if (action === 'done') {
      t.status = 'done';
      delete t.question;
      t.timeline.push({ t: '人工标记完成', time: '刚刚', tone: 'ok' });
      toast('已完成');
    } else if (action === 'reopen') {
      t.status = 'working';
      t.timeline.push({ t: '人工重新打开', time: '刚刚', tone: 'work' });
      toast('已重新打开');
    } else if (action === 'stop') {
      t.status = 'queued';
      t.timeline.push({ t: '人工停止', time: '刚刚', tone: 'warn' });
      toast('已停止');
    } else if (action === 'start') {
      startTaskWithRefs(t);
      return;
    }
    S.tray = false;
    render();
  }

  function addFiles(p, files) {
    const list = Array.from(files || []);
    if (!list.length) return;
    p.attachments = p.attachments || [];
    list.forEach((f) => p.attachments.push(f.name));
    S.focusComposer = true;
    renderCenter();
  }

  function focusTaskRow(id) {
    requestAnimationFrame(() => {
      const row = $('.task[data-task="' + id + '"], .bcard[data-task="' + id + '"]');
      row?.focus();
    });
  }

  function openPeek(id) {
    const p = proj();
    if (!p.tasks.some((t) => t.id === id)) return;
    S.peek = id;
    render();
  }

  function closePeek() {
    if (!S.peek) return;
    const id = S.peek;
    S.peek = null;
    render();
    focusTaskRow(id);
  }

  function openDetail(id) {
    const p = proj();
    S.taskEdit = null;
    if (!p.tasks.some((t) => t.id === id)) return;
    S.detail = id;
    S.peek = null;
    S.rightOpen = true;
    S.logFor = null;
    S.scrollRightTop = true;
    S.animateRight = true;
    render();
  }

  function openSearch() {
    S.searchOpen = true;
    S.focusSearch = true;
    if (!S.sideOpen) { S.sideOpen = true; render(); }
    else renderSide();
  }

  /* ---------- @ 引用 ---------- */
  function updateMention(p) {
    const input = $('#input');
    if (!input) return;
    const caret = input.selectionStart || 0;
    const m = /@([A-Za-z0-9-]*)$/.exec(input.value.slice(0, caret));
    if (!m) { closeMention(); return; }
    const q = m[1].toLowerCase();
    const list = p.tasks.filter((t) => !q || (t.id + ' ' + t.title).toLowerCase().includes(q));
    if (!list.length) { closeMention(); return; }

    let box = $('#mentionBox');
    if (!box) {
      box = document.createElement('div');
      box.className = 'mention';
      box.id = 'mentionBox';
      $('.composer')?.appendChild(box);
    }
    box.innerHTML = `<div class="mh">任务<span class="n">${list.length}</span></div>` + list.map((t, i) => `
      <button class="mrow ${i === 0 ? 'sel' : ''}" data-mention="${t.id}">
        <span class="mdot" style="background:${ST[t.status].color};"></span>
        <span class="mid">${t.id}</span>
        <span class="mtt">${esc(t.title)}</span>
      </button>`).join('');
    S.mentionOpen = true;
    S.mentionIndex = 0;
    $$('[data-mention]', box).forEach((b) => b.addEventListener('mousedown', (e) => {
      e.preventDefault();
      applyMention(b.dataset.mention);
    }));
  }

  function closeMention() {
    const box = $('#mentionBox');
    if (box) box.remove();
    S.mentionOpen = false;
    S.mentionIndex = 0;
  }

  function moveMention(delta) {
    const rows = $$('#mentionBox .mrow');
    if (!rows.length) return;
    S.mentionIndex = (S.mentionIndex + delta + rows.length) % rows.length;
    rows.forEach((r, i) => r.classList.toggle('sel', i === S.mentionIndex));
    rows[S.mentionIndex].scrollIntoView({ block: 'nearest' });
  }

  function chooseMention() {
    const row = $('#mentionBox .mrow.sel') || $('#mentionBox .mrow');
    if (row) applyMention(row.dataset.mention);
  }

  function applyMention(id) {
    const input = $('#input');
    if (!input) return;
    const caret = input.selectionStart || 0;
    const before = input.value.slice(0, caret).replace(/@([A-Za-z0-9-]*)$/, '@' + id + ' ');
    input.value = before + input.value.slice(caret);
    input.selectionStart = input.selectionEnd = before.length;
    const p = proj();
    p.draft = input.value;
    closeMention();
    input.focus();
    grow(input);
    updateSendState();
  }

  /* ---------- Command palette ---------- */
  function paletteItems() {
    const p = proj();
    const items = [];
    const command = (label, sub, icon, run) => items.push({ group: 'Commands', label, sub, icon, run });

    command('New Project', '创建一个新的 Projects 容器', I.plus, () => openProjectForm(null));
    command('Open List', '回到任务列表', I.fileText, () => setPane('list'));
    command('Open Board', '按状态看任务', PROJECT_MARKS.layers, () => setPane('board'));
    command('Open Library', '浏览文件与工件', I.folder, () => setPane('library'));
    command(p.pinned ? 'Unpin Project' : 'Pin Project', p.name, I.pin, () => {
      p.pinned = !p.pinned;
      renderSide(); renderRight();
      toast(p.pinned ? '已置顶' : '已取消置顶');
    });
    command(isClaude() ? 'Switch to DeepSeek' : 'Switch to Claude', '切换主题色卡', I.spark, () => {
      const next = isClaude() ? 'deepseek' : 'claude';
      document.documentElement.dataset.brand = next;
      render();
      toast(next === 'claude' ? '已切换到 Claude 风格' : '已切换到 DeepSeek 风格');
    });
    command('Keyboard Shortcuts', '查看全部快捷键', I.terminal, () => openShortcuts());
    command('Automations', '查看宿主调度任务', I.clock, () => openAutomations());
    command('Plugins', '查看已安装插件', I.plug, () => openPlugins());
    command('Toggle Project Panel', '显示或收起右侧任务面板', I.panel, () => { S.rightOpen = !S.rightOpen; render(); });
    command('Toggle Sidebar', '显示或收起左侧栏', I.panel, () => { S.sideOpen = !S.sideOpen; render(); });
    command('New Task', '在项目中新建一个任务', I.plus, () => { S.pane = 'list'; S.rightOpen = true; S.newTask = { status: 'queued' }; render(); });

    DB.projects.forEach((pr) => items.push({
      group: 'Projects', label: pr.name, sub: pr.goal || (pr.repos[0] || ''), icon: projectBadge(pr), run: () => selectProject(pr.id)
    }));
    p.tasks.forEach((t) => items.push({
      group: 'Tasks', label: `${t.id} · ${t.title}`, sub: ST[t.status].label, icon: `<span class="pal-svg">${statusIcon(t.status)}</span>`, run: () => openPeek(t.id)
    }));
    p.library.forEach((f) => items.push({
      group: 'Files', label: baseName(f.path), sub: f.path, icon: `<span class="pal-svg">${I.fileText}</span>`, run: () => openFileByPath(p, f.path)
    }));
    return items;
  }

  function paletteResults() {
    const q = S.paletteQuery.trim().toLowerCase();
    const all = S.paletteItems || [];
    if (!q) return all;
    return all.filter((it) => `${it.group} ${it.label} ${it.sub}`.toLowerCase().includes(q));
  }

  function renderPaletteResults() {
    const box = $('#palList');
    if (!box) return;
    const items = paletteResults();
    S.paletteResults = items;
    if (S.paletteIndex >= items.length) S.paletteIndex = Math.max(0, items.length - 1);
    let html = '';
    let group = '';
    items.forEach((it, i) => {
      if (it.group !== group) {
        group = it.group;
        html += `<div class="pal-group">${group}</div>`;
      }
      html += `<button class="pal-item ${i === S.paletteIndex ? 'sel' : ''}" data-pal-index="${i}">
        <span class="pal-icon">${it.icon}</span>
        <span class="pal-text"><span class="pal-label">${esc(it.label)}</span>${it.sub ? `<span class="pal-sub">${esc(it.sub)}</span>` : ''}</span>
        <span class="pal-enter">↵</span>
      </button>`;
    });
    box.innerHTML = html || `<div class="pal-empty">没有找到「${esc(S.paletteQuery)}」</div>`;
    const sel = box.querySelector('.pal-item.sel');
    if (sel) sel.scrollIntoView({ block: 'nearest' });
  }

  function openPalette() {
    if ($('#paletteOverlay')) return;
    closeFloating();
    closeMention();
    S.paletteItems = paletteItems();
    S.paletteQuery = '';
    S.paletteIndex = 0;
    const layer = document.createElement('div');
    layer.className = 'palette-overlay';
    layer.id = 'paletteOverlay';
    layer.innerHTML = `<div class="palette" role="dialog" aria-modal="true" aria-label="Command palette">
      <div class="pal-head"><span class="pi">${I.search}</span><input id="paletteInput" placeholder="搜索项目、任务、文件，或输入命令…" autocomplete="off" spellcheck="false"><span class="pk">esc</span></div>
      <div class="pal-list" id="palList"></div>
      <div class="pal-foot"><span><span class="kbd">↑</span><span class="kbd">↓</span> 选择</span><span><span class="kbd">↵</span> 执行</span><span><span class="kbd">esc</span> 关闭</span></div>
    </div>`;
    document.body.appendChild(layer);
    layer.addEventListener('click', (e) => { if (e.target === layer) closePalette(); });
    const input = $('#paletteInput');
    input.addEventListener('input', () => {
      S.paletteQuery = input.value;
      S.paletteIndex = 0;
      renderPaletteResults();
    });
    renderPaletteResults();
    input.focus();
  }

  function closePalette() {
    const layer = $('#paletteOverlay');
    if (layer) layer.remove();
    S.paletteItems = null;
    S.paletteResults = [];
    S.paletteOpen = false;
  }

  function movePalette(delta) {
    const items = S.paletteResults;
    if (!items.length) return;
    S.paletteIndex = (S.paletteIndex + delta + items.length) % items.length;
    $$('#palList .pal-item').forEach((el, i) => el.classList.toggle('sel', i === S.paletteIndex));
    const sel = $('#palList .pal-item.sel');
    if (sel) sel.scrollIntoView({ block: 'nearest' });
  }

  function choosePalette(index) {
    const item = (S.paletteResults || [])[index];
    if (!item) return;
    closePalette();
    item.run();
  }

  /* ---------- 事件 ---------- */
  document.addEventListener('click', (e) => {
    if (Date.now() < (S.suppressClickUntil || 0)) return;
    const depGroup = e.target.closest && e.target.closest('.dep-group');
    if (depGroup && depGroup.dataset.from && depGroup.dataset.to) {
      S.depFocus = { from: depGroup.dataset.from, to: depGroup.dataset.to };
      renderRight();
      return;
    }
    const t = e.target;
    const inside = (sel) => !!(t.closest && t.closest(sel));

    if (!inside('.floating')) closeFloating();
    if (!inside('.composer') && !inside('.mention')) closeMention();
    if (S.peek && !inside('.peek') && !inside('[data-task]') && !inside('[data-relay]')) {
      S.peek = null;
      $('.peek')?.remove();
      $$('.task.sel').forEach((el) => el.classList.remove('sel'));
    }

    const sm = t.closest('[data-sessionmenu]');
    if (sm) { e.stopPropagation(); openSessionMenu(sm, sm.dataset.sessionmenu); return; }

    const wsSess = t.closest('[data-ws-sess]');
    if (wsSess) {
      const [wid, idx] = wsSess.dataset.wsSess.split(':');
      const w = DB.workspaces.find((x) => x.id === wid);
      const session = w && w.sessions ? w.sessions[+idx] : null;
      if (session) openAddToProject({ name: session.name });
      return;
    }

    const sessionRow = t.closest('[data-session]');
    if (sessionRow && !t.closest('.more')) {
      const session = DB.homeSessions.find((x) => x.id === sessionRow.dataset.session);
      if (session) openAddToProject({ name: session.name });
      return;
    }

    const palItem = t.closest('[data-pal-index]');
    if (palItem) { choosePalette(+palItem.dataset.palIndex); return; }

    const pm = t.closest('[data-projmenu]');
    if (pm) { e.stopPropagation(); openProjectMenu(pm, pm.dataset.projmenu); return; }

    const wm = t.closest('[data-wsmenu]');
    if (wm) { e.stopPropagation(); openWorkspaceMenu(wm, wm.dataset.wsmenu); return; }

    const ref = t.closest('[data-ref-task]');
    if (ref) { openPeek(ref.dataset.refTask); return; }

    const pr = t.closest('[data-proj]');
    if (pr && !t.closest('.more')) { selectProject(pr.dataset.proj); return; }

    const a = t.closest('[data-a]');
    if (a) {
      const k = a.dataset.a;
      if (k === 'new-project') { openProjectForm(null); return; }
      if (k === 'plugins') { openPlugins(); return; }
      if (k === 'palette') { openPalette(); return; }
      if (k === 'automations') { openAutomations(); return; }
      if (k === 'new-session') { openNewSessionMenu(a); return; }
      if (k === 'ws-toggle') { S.collapsed['ws:' + a.dataset.ws] = !S.collapsed['ws:' + a.dataset.ws]; renderSide(); return; }
      if (k === 'panel-search') {
        S.panelSearch = !S.panelSearch;
        if (S.panelSearch) S.focusPanelSearch = true;
        else S.panelQuery = '';
        renderRight();
        return;
      }
      if (k === 'panel-search-close') {
        S.panelSearch = false;
        S.panelQuery = '';
        renderRight();
        return;
      }
      if (k === 'clear-panel-search') {
        S.panelSearch = false;
        S.panelQuery = '';
        renderRight();
        return;
      }
      if (k === 'project-switch') { openProjectSwitcher(a); return; }
      if (k === 'dep-panel') { openDependencyPanel(); return; }
      if (k === 'dep-focus-clear') { S.depFocus = null; renderRight(); return; }
      if (k === 'open-library') { S.rightOpen = true; S.pane = 'library'; S.detail = null; S.scrollRightTop = true; S.animateRight = true; render(); return; }
      if (k === 'process-toggle') {
        const key = S.active + ':' + a.dataset.i;
        S.expandedProcess[key] = !S.expandedProcess[key];
        renderCenter();
        requestAnimationFrame(() => $('.tp-head[data-i="' + a.dataset.i + '"]')?.scrollIntoView({ block: 'start' }));
        return;
      }
      if (k === 'process-group') {
        const key = S.active + ':' + a.dataset.i + ':' + a.dataset.g;
        S.expandedGroups[key] = !S.expandedGroups[key];
        renderCenter();
        requestAnimationFrame(() => $('.tpg-head[data-i="' + a.dataset.i + '"][data-g="' + a.dataset.g + '"]')?.scrollIntoView({ block: 'start' }));
        return;
      }
      if (k === 'thought-toggle') {
        const key = S.active + ':' + a.dataset.i + ':' + a.dataset.g + ':' + a.dataset.s;
        S.expandedThoughts[key] = !S.expandedThoughts[key];
        renderCenter();
        requestAnimationFrame(() => $('.tps-row[data-a="thought-toggle"][data-i="' + a.dataset.i + '"][data-g="' + a.dataset.g + '"][data-s="' + a.dataset.s + '"]')?.scrollIntoView({ block: 'start' }));
        return;
      }
      if (k === 'customize') { openAccountMenu(a); return; }
      if (k === 'toggle-side') { S.sideOpen = !S.sideOpen; render(); return; }
      if (k === 'toggle-right') { S.rightOpen = !S.rightOpen; render(); return; }
      if (k === 'project-menu') { openProjectMenu(a, S.active); return; }
      if (k === 'toggle-archived') { S.showArchived = !S.showArchived; renderSide(); return; }
      if (k === 'new-task') { $('#input')?.focus(); return; }
      if (k === 'tray') {
        S.tray = !S.tray;
        render();
        return;
      }
      if (k === 'tray-send') {
        const q = pendingQ(proj());
        const v = ($('#trayInput')?.value || '').trim();
        if (q && v) answerQ(-1, q, v);
        return;
      }
      if (k === 'agents') { openAgents(a); return; }
      if (k === 'listening') { openListening(a); return; }
      if (k === 'env') { openEnv(a); return; }
      if (k === 'model') { openModel(a); return; }
      if (k === 'attach') { $('#filePick')?.click(); return; }
      if (k === 'filter') { openFilter(a); return; }
      if (k === 'account') { openAccountMenu(a); return; }
      if (k === 'open-search') { openSearch(); return; }
      if (k === 'ws-add') { openWorkspaceAdd(); return; }
      if (k === 'copy') { copy(messagePlain(proj(), +a.dataset.copy)); return; }
      if (k === 'jump-latest') { const st = $('#stream'); if (st) st.scrollTo({ top: st.scrollHeight, behavior: 'smooth' }); return; }
      if (k === 'add-task') {
        S.newTask = { status: a.dataset.status };
        S.filter = null;
        renderRight();
        return;
      }
      if (k === 'overview-new-task') {
        S.centerView = 'chat';
        S.rightOpen = true;
        S.pane = 'list';
        S.newTask = { status: 'queued' };
        render();
        return;
      }
      if (k === 'new-task-default') {
        S.newTask = { status: 'queued' };
        S.filter = null;
        S.pane = 'list';
        S.rightOpen = true;
        render();
        return;
      }
      if (k === 'open-pr') { openPR(a.dataset.pr, a.dataset.prTask); return; }
      if (k === 'base-branch') { openBaseBranchPicker(a, a.dataset.task); return; }
      if (k === 'assignee') { openAssigneePicker(a, a.dataset.asgTask); return; }
      if (k === 'deps') { openDependencyPicker(a, a.dataset.task); return; }
      if (k === 'task-jump') { openPeek(a.dataset.taskId); return; }
      if (k === 'edit-task') {
        S.taskEdit = { id: S.detail, field: a.dataset.field };
        S.animateRight = true;
        renderRight();
        return;
      }
      if (k === 'status-picker') { openStatusPicker(a, a.dataset.taskStatus); return; }
      if (k === 'work-toggle') {
        const idx = a.dataset.i;
        const key = S.active + ':' + idx;
        S.expandedWork[key] = !S.expandedWork[key];
        renderCenter();
        return;
      }
      if (k === 'feedback') {
        const key = S.active + ':' + a.dataset.i;
        S.feedback[key] = S.feedback[key] === a.dataset.vote ? null : a.dataset.vote;
        renderCenter();
        return;
      }
      if (k === 'pin-project') {
        const p = proj();
        p.pinned = !p.pinned;
        renderSide();
        renderRight();
        toast(p.pinned ? '已置顶' : '已取消置顶');
        return;
      }
      if (k === 'expand-panel') {
        const rc = $('.right-col');
        const current = rc ? rc.getBoundingClientRect().width : 480;
        const next = current < 560 ? Math.min(640, Math.round(current + 120)) : 540;
        document.documentElement.style.setProperty('--right-w', next + 'px');
        return;
      }
      if (k === 'folder') {
        S.folders[a.dataset.key] = !S.folders[a.dataset.key];
        renderRight();
        return;
      }
      if (k === 'play') { openArtifact(proj().messages[+a.dataset.play]?.artifact); return; }
      if (k === 'peek-close') { closePeek(); return; }
      if (k === 'peek-open') { openDetail(a.dataset.detail); return; }
      if (k === 'back') { const id = S.detail; S.detail = null; S.logFor = null; S.animateRight = true; renderRight(); if (id) focusTaskRow(id); return; }
      if (k === 'log') { S.logFor = S.logFor === a.dataset.task ? null : a.dataset.task; renderRight(); return; }
      if (k === 'mark-done') { markTask(a.dataset.task, 'done'); return; }
      if (k === 'reopen') { markTask(a.dataset.task, 'reopen'); return; }
      if (k === 'stop-task') { markTask(a.dataset.task, 'stop'); return; }
      if (k === 'start-task') { markTask(a.dataset.task, 'start'); return; }
      if (k === 'go-answer') { S.tray = true; S.focusTray = true; render(); return; }
      if (k === 'focus-composer') { S.focusComposer = true; renderCenter(); return; }
      if (k === 'clear-filter') { S.filter = null; S.animateRight = true; renderRight(); return; }
      if (k === 'collapse') {
        const key = a.dataset.key;
        S.collapsed[key] = !S.collapsed[key];
        S.animateRight = false;
        renderRight();
        return;
      }
      return;
    }

    const ans = t.closest('[data-ans]');
    if (ans) { const q = pendingQ(proj()); if (q) answerQ(+ans.dataset.ans, q); return; }

    const kindChip = t.closest('[data-trail-kind]');
    if (kindChip) {
      S.trailKind = kindChip.dataset.trailKind || null;
      renderCenter();
      return;
    }

    const memberChip = t.closest('[data-trail-member]');
    if (memberChip) {
      S.trailMember = memberChip.dataset.trailMember || null;
      renderCenter();
      return;
    }

    const trailChip = t.closest('[data-trail]');
    if (trailChip) {
      S.trailFilter = trailChip.dataset.trail;
      S.trailKind = null;
      if (S.trailFilter === 'project') S.trailMember = null;
      renderCenter();
      return;
    }

    const centerTab = t.closest('[data-center]');
    if (centerTab) {
      S.centerView = centerTab.dataset.center;
      renderCenter();
      return;
    }

    const pane = t.closest('[data-pane]');
    if (pane) { setPane(pane.dataset.pane); return; }

    const task = t.closest('[data-task]');
    if (task) {
      clearTimeout(S.clickTimer);
      const id = task.dataset.task;
      S.clickTimer = setTimeout(() => openPeek(id), 150);
      return;
    }

    const relay = t.closest('[data-relay]');
    if (relay) { openPeek(relay.dataset.relay); return; }

    const lib = t.closest('[data-lib]');
    if (lib) { openFileByPath(proj(), lib.dataset.lib); return; }

    const sug = t.closest('[data-suggest]');
    if (sug) {
      const p = proj();
      p.draft = sug.dataset.suggest;
      S.focusComposer = true;
      renderCenter();
      return;
    }

    const rm = t.closest('[data-rm-attach]');
    if (rm) {
      const p = proj();
      p.attachments.splice(+rm.dataset.rmAttach, 1);
      S.focusComposer = true;
      renderCenter();
    }
  });

  function clearDropMarks() {
    $$('.lane.drop-target').forEach((l) => l.classList.remove('drop-target'));
    $$('.bcard.dragging, .task.dragging').forEach((c) => c.classList.remove('dragging'));
    $$('.task.drop-before, .task.drop-after').forEach((r) => r.classList.remove('drop-before', 'drop-after'));
  }

  document.addEventListener('dragstart', (e) => {
    const row = e.target.closest('.task[data-task]');
    const card = e.target.closest('.bcard[data-task]');
    const el = card || row;
    if (!el) return;
    S.dragTask = el.dataset.task;
    S.dragMode = row ? 'reorder' : 'status';
    el.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', S.dragTask);
  });

  document.addEventListener('dragover', (e) => {
    if (!S.dragTask) return;
    if (S.dragMode === 'reorder') {
      const row = e.target.closest('.task[data-task]');
      if (!row || row.dataset.task === S.dragTask) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const rect = row.getBoundingClientRect();
      const after = e.clientY > rect.top + rect.height / 2;
      $$('.task.drop-before, .task.drop-after').forEach((r) => r.classList.remove('drop-before', 'drop-after'));
      row.classList.add(after ? 'drop-after' : 'drop-before');
      S.dragTarget = { id: row.dataset.task, after };
      return;
    }
    const lane = e.target.closest('.lane[data-lane]');
    if (!lane) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    $$('.lane.drop-target').forEach((l) => { if (l !== lane) l.classList.remove('drop-target'); });
    lane.classList.add('drop-target');
  });

  document.addEventListener('dragleave', (e) => {
    if (S.dragMode === 'reorder') {
      const row = e.target.closest('.task[data-task]');
      if (row && !row.contains(e.relatedTarget)) row.classList.remove('drop-before', 'drop-after');
      return;
    }
    const lane = e.target.closest('.lane[data-lane]');
    if (!lane) return;
    if (!lane.contains(e.relatedTarget)) lane.classList.remove('drop-target');
  });

  document.addEventListener('drop', (e) => {
    if (!S.dragTask) return;
    if (S.dragMode === 'reorder') {
      e.preventDefault();
      const p = proj();
      const from = p.tasks.find((t) => t.id === S.dragTask);
      const target = S.dragTarget ? p.tasks.find((t) => t.id === S.dragTarget.id) : null;
      const targetInfo = S.dragTarget;
      S.dragTask = null;
      S.dragMode = null;
      S.dragTarget = null;
      clearDropMarks();
      if (from && target && from.id !== target.id) {
        const fromIdx = p.tasks.indexOf(from);
        p.tasks.splice(fromIdx, 1);
        let idx = p.tasks.indexOf(target);
        if (targetInfo.after) idx += 1;
        const statusChanged = from.status !== target.status;
        if (statusChanged) {
          const label = ST[target.status] ? ST[target.status].label : target.status;
          from.status = target.status;
          from.timeline = from.timeline || [];
          from.timeline.push({ t: `状态更新 · ${label}`, time: '刚刚', tone: 'work' });
          p.time = '刚刚';
        }
        p.tasks.splice(idx, 0, from);
        S.suppressClickUntil = Date.now() + 350;
        S.animateRight = true;
        render();
        focusTaskRow(from.id);
        if (statusChanged) toast('已移到 ' + (ST[target.status] ? ST[target.status].label : target.status));
      }
      return;
    }
    const lane = e.target.closest('.lane[data-lane]');
    if (!lane) return;
    e.preventDefault();
    const id = S.dragTask;
    const status = lane.dataset.lane;
    S.dragTask = null;
    S.dragMode = null;
    lane.classList.remove('drop-target');
    setTaskStatus(id, status);
  });

  document.addEventListener('dragend', () => {
    S.dragTask = null;
    S.dragMode = null;
    S.dragTarget = null;
    clearDropMarks();
  });

  function highlightDeps(id) {
    const svg = $('.dep-canvas');
    if (!svg) return;
    $$('.dep-group', svg).forEach((g) => g.classList.toggle('hot', !!id && (g.dataset.from === id || g.dataset.to === id)));
    svg.classList.toggle('has-hot', !!id);
  }

  document.addEventListener('mouseover', (e) => {
    const card = e.target.closest && e.target.closest('.bcard[data-task]');
    if (card) highlightDeps(card.dataset.task);
  });

  document.addEventListener('mouseout', (e) => {
    const card = e.target.closest && e.target.closest('.bcard[data-task]');
    if (card && !card.contains(e.relatedTarget)) highlightDeps(null);
  });

  document.addEventListener('focusin', (e) => {
    const card = e.target.closest && e.target.closest('.bcard[data-task]');
    if (card) highlightDeps(card.dataset.task);
  });

  document.addEventListener('focusout', (e) => {
    const card = e.target.closest && e.target.closest('.bcard[data-task]');
    if (card && !card.contains(e.relatedTarget)) highlightDeps(null);
  });

  document.addEventListener('contextmenu', (e) => {
    const taskRow = e.target.closest('.task[data-task], .bcard[data-task]');
    if (taskRow) {
      e.preventDefault();
      openTaskContextMenu(taskRow.dataset.task, e.clientX, e.clientY);
      return;
    }
    const projectRow = e.target.closest('[data-proj]');
    if (projectRow) {
      e.preventDefault();
      openProjectContextMenu(projectRow.dataset.proj, e.clientX, e.clientY);
      return;
    }
    const fileRow = e.target.closest('.tree-row.file[data-lib], .recent[data-lib]');
    if (fileRow) {
      e.preventDefault();
      openFileContextMenu(fileRow.dataset.lib, e.clientX, e.clientY);
    }
  });

  document.addEventListener('dblclick', (e) => {
    const task = e.target.closest('[data-task]');
    if (!task) return;
    clearTimeout(S.clickTimer);
    openDetail(task.dataset.task);
  });

  document.addEventListener('input', (e) => {
    if (e.target.id === 'sideSearch') {
      S.sideQuery = e.target.value;
      filterSide();
    }
  });

  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (!$('#overlay')) {
        if ($('#paletteOverlay')) closePalette();
        else openPalette();
      }
      return;
    }

    if ($('#paletteOverlay')) {
      if (e.key === 'Escape') { e.preventDefault(); closePalette(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); movePalette(1); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); movePalette(-1); return; }
      if (e.key === 'Enter') { e.preventDefault(); choosePalette(S.paletteIndex); return; }
      if (e.key === 'Tab') { e.preventDefault(); return; }
      return;
    }

    if (e.key === 'Escape') {
      if ($('#overlay')) { closeModal(); return; }
      if (floatingEl) { closeFloating(); return; }
      if (S.peek) { closePeek(); return; }
      if (S.mentionOpen) { closeMention(); return; }
      if (S.searchOpen) {
        S.searchOpen = false;
        S.sideQuery = '';
        renderSide();
        return;
      }
      if (S.detail) {
        const id = S.detail;
        S.detail = null;
        S.logFor = null;
        S.animateRight = true;
        renderRight();
        focusTaskRow(id);
        return;
      }
    }

    if ($('#overlay')) return;

    const target = e.target;
    if (!target || !target.closest) return;

    if (target.id === 'paneResizer' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault();
      const rc = $('.right-col')?.getBoundingClientRect();
      const base = rc ? rc.width : 392;
      const max = Math.min(640, innerWidth - 520);
      const next = Math.max(320, Math.min(max, base + (e.key === 'ArrowLeft' ? 16 : -16)));
      document.documentElement.style.setProperty('--right-w', next + 'px');
      return;
    }
    if (target.id === 'paneResizer' && (e.key === 'Home' || e.key === 'Escape')) {
      e.preventDefault();
      document.documentElement.style.removeProperty('--right-w');
      return;
    }

    if (S.peek && !target.closest('button, input, textarea, select') && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      const p = proj();
      const ids = [];
      GROUP_ORDER.forEach((st) => p.tasks.filter((t) => t.status === st).forEach((t) => ids.push(t.id)));
      const idx = ids.indexOf(S.peek);
      const next = ids[idx + (e.key === 'ArrowDown' ? 1 : -1)];
      if (next) openPeek(next);
      return;
    }

    const projRow = target.closest('[data-proj]');
    if (projRow && !target.closest('.more') && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      selectProject(projRow.dataset.proj);
      return;
    }

    const taskRow = target.closest('[data-task]');
    const onControl = !!target.closest('button, input, textarea, select, a');
    if (taskRow && !onControl) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const sel = taskRow.classList.contains('bcard') ? '.bcard[data-task]' : '.task[data-task]';
        const rows = $$(sel).filter((el) => el.offsetParent !== null);
        const idx = rows.indexOf(taskRow);
        const next = rows[idx + (e.key === 'ArrowDown' ? 1 : -1)];
        if (next) next.focus();
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        openDetail(taskRow.dataset.task);
        return;
      }
      if (e.key === ' ') {
        e.preventDefault();
        openPeek(taskRow.dataset.task);
        return;
      }
      if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        const anchor = taskRow.querySelector('.t-ico') || taskRow;
        openStatusPicker(anchor, taskRow.dataset.task);
        return;
      }
    }

    const relay = target.closest('[data-relay]');
    if (relay && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      openPeek(relay.dataset.relay);
      return;
    }

    const lib = target.closest('[data-lib]');
    if (lib && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      openFileByPath(proj(), lib.dataset.lib);
      return;
    }

    if (target.id === 'trayInput' && e.key === 'Enter') {
      e.preventDefault();
      const q = pendingQ(proj());
      const v = target.value.trim();
      if (q && v) answerQ(-1, q, v);
      return;
    }

    if (target.id === 'sideSearch' && e.key === 'Escape') {
      S.searchOpen = false;
      S.sideQuery = '';
      renderSide();
    }
  });


  /* ---------- 面板宽度 ---------- */
  let resizing = null;

  document.addEventListener('pointerdown', (e) => {
    const handle = e.target.closest('#paneResizer');
    if (!handle || e.button !== 0) return;
    e.preventDefault();
    window.getSelection()?.removeAllRanges();
    const rc = $('.right-col')?.getBoundingClientRect();
    if (!rc) return;
    resizing = { startX: e.clientX, startW: rc.width };
    handle.classList.add('dragging');
    document.body.classList.add('resizing');
  });

  window.addEventListener('pointermove', (e) => {
    if (!resizing) return;
    const max = Math.min(640, innerWidth - 520);
    const next = Math.max(320, Math.min(max, resizing.startW - (e.clientX - resizing.startX)));
    document.documentElement.style.setProperty('--right-w', next + 'px');
    requestAnimationFrame(drawDependencyLines);
  });

  window.addEventListener('blur', () => {
    resizing = null;
    document.body.classList.remove('resizing');
    $('#paneResizer')?.classList.remove('dragging');
  });

  window.addEventListener('pointerup', () => {
    if (!resizing) return;
    resizing = null;
    document.body.classList.remove('resizing');
    $('#paneResizer')?.classList.remove('dragging');
    window.getSelection()?.removeAllRanges();
  });

  document.addEventListener('dblclick', (e) => {
    if (!e.target.closest('#paneResizer')) return;
    document.documentElement.style.removeProperty('--right-w');
  });

  window.addEventListener('resize', () => {
    drawDependencyLines();
    const v = document.documentElement.style.getPropertyValue('--right-w');
    if (!v) return;
    const max = Math.min(640, innerWidth - 520);
    document.documentElement.style.setProperty('--right-w', Math.max(320, Math.min(max, parseFloat(v))) + 'px');
  });

  function render() {
    const app = $('#app');
    app.classList.toggle('right-closed', !S.rightOpen);
    app.classList.toggle('side-closed', !S.sideOpen);
    renderSide();
    renderCenter();
    renderRight();
  }

  /* ---------- 启动 ---------- */
  prepareMessages();

  const params = new URLSearchParams(location.search);
  if (params.get('brand') === 'claude') document.documentElement.dataset.brand = 'claude';

  const h = (location.hash || '').replace(/^#/, '');
  if (h === 'board') S.pane = 'board';
  else if (h === 'library') S.pane = 'library';
  else if (h === 'tray') S.tray = true;
  else if (h.startsWith('detail=')) S.detail = decodeURIComponent(h.slice(7));
  else if (h.startsWith('project=')) S.active = decodeURIComponent(h.slice(8));

  render();
  if (h === 'new') openProjectForm(null);
})();
