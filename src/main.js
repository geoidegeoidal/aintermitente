import './style.css'
import { Chart, registerables } from 'chart.js'
Chart.register(...registerables)

// =========================================================================
// IndexedDB Helpers
// =========================================================================
const DB_NAME = 'ayunopro-db'
const DB_VERSION = 2

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains('sessions')) {
        const store = db.createObjectStore('sessions', { keyPath: 'id', autoIncrement: true })
        store.createIndex('startTime', 'startTime', { unique: false })
        store.createIndex('endTime', 'endTime', { unique: false })
      }
      if (!db.objectStoreNames.contains('appState')) {
        db.createObjectStore('appState', { keyPath: 'key' })
      }
      if (!db.objectStoreNames.contains('healthLog')) {
        const store = db.createObjectStore('healthLog', { keyPath: 'id', autoIncrement: true })
        store.createIndex('date', 'date', { unique: false })
        store.createIndex('type', 'type', { unique: false })
      }
    }
    request.onsuccess = (e) => resolve(e.target.result)
    request.onerror = (e) => reject(e.target.error)
  })
}

function dbPut(db, storeName, data) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const request = store.put(data)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function dbGet(db, storeName, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const request = store.get(key)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function dbDelete(db, storeName, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const request = store.delete(key)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

function dbGetAll(db, storeName, indexName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const source = indexName ? store.index(indexName) : store
    const request = source.getAll()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function dbGetByIndex(db, storeName, indexName, value, reverse = false) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const index = store.index(indexName)
    const request = index.getAll(value)
    request.onsuccess = () => {
      const results = request.result
      if (reverse) results.reverse()
      resolve(results)
    }
    request.onerror = () => reject(request.error)
  })
}

// =========================================================================
// Constants
// =========================================================================
const CHART_COLORS = {
  cyan: '#00d4ff',
  blue: '#0088ff',
  purple: '#a855f7',
  amber: '#f59e0b',
  neon: '#00ffcc',
  red: '#ef4444',
  grid: 'rgba(255,255,255,0.05)',
  text: '#6b7280'
}

const ZONES = [
  { name: 'Transici\u00f3n', hours: 4, color: '#f59e0b', label: '0-4h', description: 'Agotando glucosa' },
  { name: 'Quema de grasa', hours: 16, color: '#00d4ff', label: '4-16h', description: 'Oxidando grasas' },
  { name: 'Autofagia', hours: 999, color: '#a855f7', label: '16h+', description: 'Regeneraci\u00f3n celular' }
]

const RING_CIRCUMFERENCE = 565.48
const STATE_KEY = 'liveState'
const NOTIFY_HYDRATION_KEY = 'hydrationEnabled'
const NOTIFY_FASTING_END_KEY = 'fastingEndEnabled'

// =========================================================================
// Global State
// =========================================================================
let db = null
let currentView = 'dashboard'
let currentHistoryTab = 'fasting'
let charts = {}
let notificationPermission = 'default'

const state = {
  fastingStartTime: null,
  accumulatedMs: 0,
  pausedAt: null,
  interval: null,
  waterCount: 0,
  protocol: '16:8',
  currentWeight: null,
  currentBP: null,
  hydrationNotify: false,
  fastingEndNotify: true
}

// =========================================================================
// Utility Functions
// =========================================================================
function formatTime(ms) {
  const total = Math.floor(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatDurationHourMin(ms) {
  const h = Math.floor(ms / (1000 * 60 * 60))
  const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
  if (h === 0) return `${m}m`
  return `${h}h ${m}m`
}

function formatDateShort(isoStr) {
  const d = new Date(isoStr)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatDateFull(isoStr) {
  const d = new Date(isoStr)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const hrs = String(d.getHours()).padStart(2, '0')
  const mins = String(d.getMinutes()).padStart(2, '0')
  return `${day}/${month} ${hrs}:${mins}`
}

function formatDateLabel(isoStr) {
  return formatDateShort(isoStr)
}

function getElapsedMs() {
  if (!state.fastingStartTime) return state.accumulatedMs
  if (state.pausedAt) return state.accumulatedMs
  return state.accumulatedMs + (Date.now() - state.fastingStartTime)
}

function getProtocolHours() {
  return state.protocol === 'OMAD' ? 23 : parseInt(state.protocol.split(':')[0])
}

function getCurrentZoneIndex(elapsedMs) {
  const hours = elapsedMs / (1000 * 60 * 60)
  for (let i = 0; i < ZONES.length; i++) {
    if (hours < ZONES[i].hours) return i
  }
  return ZONES.length - 1
}

function getBPClassification(systolic, diastolic) {
  if (systolic < 120 && diastolic < 80) return { level: 'Normal', css: 'normal' }
  if (systolic < 130 && diastolic < 85) return { level: 'Elevada', css: 'elevated' }
  if (systolic < 140 || diastolic < 90) return { level: 'Alta (Stage 1)', css: 'high' }
  return { level: 'Muy Alta (Stage 2)', css: 'high' }
}

function getBPItemClass(systolic, diastolic) {
  const cls = getBPClassification(systolic, diastolic)
  return cls.css === 'normal' ? 'bp-normal' : cls.css === 'elevated' ? 'bp-elevated' : 'bp-high'
}

// =========================================================================
// DOM Element Cache
// =========================================================================
const $ = (sel) => document.querySelector(sel)
const $$ = (sel) => document.querySelectorAll(sel)

const viewsContainer = $('#viewsContainer')
const bottomNav = $('#bottomNav')
const headerTitle = $('#headerTitle')
const modal = $('#modal')
const modalTitle = $('#modalTitle')
const modalBody = $('#modalBody')
const modalClose = $('#modalClose')

// =========================================================================
// View Router
// =========================================================================
function navigateTo(viewName) {
  currentView = viewName

  $$('.view').forEach(v => v.classList.remove('active'))
  $(`#view-${viewName}`).classList.add('active')

  $$('.nav-item').forEach(n => n.classList.remove('active'))
  $(`.nav-item[data-view="${viewName}"]`).classList.add('active')

  const titles = { dashboard: 'AyunoPro', history: 'Historial', profile: 'Perfil' }
  headerTitle.innerHTML = `<span class="title-icon">&#9201;</span>${titles[viewName]}`

  destroyAllCharts()

  if (viewName === 'history') renderHistoryTab(currentHistoryTab)
  if (viewName === 'profile') renderProfile()
}

function navigateToHistoryTab(tabName) {
  currentHistoryTab = tabName
  $$('#historyTabs .tab').forEach(t => t.classList.remove('active'))
  $(`#historyTabs [data-tab="${tabName}"]`).classList.add('active')
  $$('.tab-content').forEach(c => c.classList.remove('active'))
  $(`#tab-${tabName}`).classList.add('active')
  renderHistoryTab(tabName)
}

// =========================================================================
// Chart Management
// =========================================================================
const baseChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { labels: { color: CHART_COLORS.text, font: { family: 'Outfit', size: 11 } } } },
  scales: {
    x: {
      ticks: { color: CHART_COLORS.text, font: { size: 10 }, maxTicksLimit: 8 },
      grid: { color: CHART_COLORS.grid }
    },
    y: {
      ticks: { color: CHART_COLORS.text, font: { size: 10 } },
      grid: { color: CHART_COLORS.grid },
      beginAtZero: false
    }
  }
}

function destroyAllCharts() {
  Object.values(charts).forEach(c => { try { c.destroy() } catch (_) {} })
  charts = {}
}

function renderFastingChart(sessions) {
  destroyAllCharts()
  if (sessions.length === 0) return

  const sorted = [...sessions].sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
  const labels = sorted.map(s => formatDateShort(s.startTime))
  const durations = sorted.map(s => Math.round((s.durationMs / (1000 * 60 * 60)) * 10) / 10)

  const canvas = $('#fastingChart')
  if (!canvas) return

  charts.fasting = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Horas de ayuno',
        data: durations,
        backgroundColor: (ctx) => {
          const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, ctx.chart.height)
          gradient.addColorStop(0, 'rgba(0, 212, 255, 0.6)')
          gradient.addColorStop(1, 'rgba(0, 136, 255, 0.2)')
          return gradient
        },
        borderColor: CHART_COLORS.cyan,
        borderWidth: 1,
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: {
      ...baseChartOptions,
      scales: {
        ...baseChartOptions.scales,
        y: {
          ...baseChartOptions.scales.y,
          ticks: { ...baseChartOptions.scales.y.ticks, callback: (v) => v + 'h' }
        }
      }
    }
  })
}

function renderWeightChart(weightLogs) {
  destroyAllCharts()
  if (weightLogs.length < 2) return

  const sorted = [...weightLogs].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
  const labels = sorted.map(l => formatDateShort(l.timestamp))
  const values = sorted.map(l => l.weight)

  const canvas = $('#weightChart')
  if (!canvas) return

  charts.weight = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Peso (kg)',
        data: values,
        borderColor: CHART_COLORS.cyan,
        backgroundColor: 'rgba(0, 212, 255, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: CHART_COLORS.cyan,
        borderWidth: 2
      }]
    },
    options: {
      ...baseChartOptions,
      scales: {
        ...baseChartOptions.scales,
        y: { ...baseChartOptions.scales.y, ticks: { ...baseChartOptions.scales.y.ticks, callback: (v) => v + ' kg' } }
      }
    }
  })
}

function renderBPChart(bpLogs) {
  destroyAllCharts()
  if (bpLogs.length < 2) return

  const sorted = [...bpLogs].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
  const labels = sorted.map(l => formatDateShort(l.timestamp))
  const systolic = sorted.map(l => l.systolic)
  const diastolic = sorted.map(l => l.diastolic)

  const canvas = $('#bpChart')
  if (!canvas) return

  charts.bp = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Sist\u00f3lica',
          data: systolic,
          borderColor: CHART_COLORS.amber,
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          fill: false,
          tension: 0.3,
          pointRadius: 4,
          pointBackgroundColor: CHART_COLORS.amber,
          borderWidth: 2
        },
        {
          label: 'Diast\u00f3lica',
          data: diastolic,
          borderColor: CHART_COLORS.purple,
          backgroundColor: 'rgba(168, 85, 247, 0.1)',
          fill: false,
          tension: 0.3,
          pointRadius: 4,
          pointBackgroundColor: CHART_COLORS.purple,
          borderWidth: 2
        }
      ]
    },
    options: {
      ...baseChartOptions,
      scales: {
        ...baseChartOptions.scales,
        y: { ...baseChartOptions.scales.y, ticks: { ...baseChartOptions.scales.y.ticks, callback: (v) => v + ' mmHg' } }
      },
      plugins: {
        ...baseChartOptions.plugins,
        annotation: undefined
      }
    }
  })
}

// =========================================================================
// History Page Rendering
// =========================================================================
async function renderHistoryTab(tabName) {
  if (!db) return

  switch (tabName) {
    case 'fasting': await renderFastingHistory(); break
    case 'weight': await renderWeightHistory(); break
    case 'bp': await renderBPHistory(); break
  }
}

async function renderFastingHistory() {
  const sessions = await dbGetAll(db, 'sessions', 'startTime')
  sessions.sort((a, b) => new Date(b.startTime) - new Date(a.startTime))

  renderFastingChart(sessions)

  if (sessions.length > 0) {
    const totalHours = sessions.reduce((sum, s) => sum + s.durationMs, 0) / (1000 * 60 * 60)
    const avgHours = totalHours / sessions.length
    const longest = sessions.reduce((max, s) => Math.max(max, s.durationMs), 0)
    $('#fastingStats').innerHTML = `
      <div class="stat-mini"><div class="stat-value-mini">${sessions.length}</div><div class="stat-label-mini">Sesiones</div></div>
      <div class="stat-mini"><div class="stat-value-mini">${avgHours.toFixed(1)}h</div><div class="stat-label-mini">Promedio</div></div>
      <div class="stat-mini"><div class="stat-value-mini">${formatDurationHourMin(longest)}</div><div class="stat-label-mini">M\u00e1s largo</div></div>
    `
  } else {
    $('#fastingStats').innerHTML = ''
  }

  const listEl = $('#fastingList')
  if (sessions.length === 0) {
    listEl.innerHTML = '<div class="empty-state">No hay ayunos registrados a\u00fan</div>'
    return
  }

  listEl.innerHTML = sessions.slice(0, 30).map(s => `
    <div class="history-item">
      <div class="history-item-left">
        <span class="history-date">${formatDateFull(s.startTime)}</span>
        <span class="history-meta">${s.protocol} ${s.completed ? '' : '(incompleto)'}</span>
      </div>
      <div class="history-item-right">
        <span class="history-duration">${formatDurationHourMin(s.durationMs)}</span>
        <span class="history-status ${s.completed ? 'completed' : ''}">${s.completed ? '\u2713' : '\u2717'}</span>
      </div>
    </div>
  `).join('')
}

async function renderWeightHistory() {
  const logs = await dbGetByIndex(db, 'healthLog', 'type', 'weight', true)

  const validLogs = logs.filter(l => l.weight && !isNaN(l.weight))
  renderWeightChart(validLogs)

  const listEl = $('#weightList')
  if (validLogs.length === 0) {
    listEl.innerHTML = '<div class="empty-state">No hay registros de peso a\u00fan</div>'
    return
  }

  listEl.innerHTML = validLogs.slice(0, 30).map(l => `
    <div class="history-item">
      <div class="history-item-left">
        <span class="history-date">${formatDateFull(l.timestamp)}</span>
        <span class="history-meta">${formatDateShort(l.timestamp)}</span>
      </div>
      <div class="history-item-right">
        <span class="history-value">${parseFloat(l.weight).toFixed(1)} kg</span>
      </div>
    </div>
  `).join('')
}

async function renderBPHistory() {
  const logs = await dbGetByIndex(db, 'healthLog', 'type', 'bp', true)

  const validLogs = logs.filter(l => l.systolic && l.diastolic)
  renderBPChart(validLogs)

  const listEl = $('#bpList')
  if (validLogs.length === 0) {
    listEl.innerHTML = '<div class="empty-state">No hay registros de presi\u00f3n a\u00fan</div>'
    return
  }

  listEl.innerHTML = validLogs.slice(0, 30).map(l => {
    const classification = getBPClassification(l.systolic, l.diastolic)
    return `
      <div class="history-item ${getBPItemClass(l.systolic, l.diastolic)}">
        <div class="history-item-left">
          <span class="history-date">${formatDateFull(l.timestamp)}</span>
          <span class="bp-classification ${classification.css}">${classification.level}</span>
        </div>
        <div class="history-item-right">
          <span class="history-value systolic">${l.systolic}</span>
          <span style="color:var(--text-muted)">/</span>
          <span class="history-value diastolic">${l.diastolic}</span>
          ${l.heartRate ? `<span class="history-value hr">${l.heartRate} bpm</span>` : ''}
        </div>
      </div>
    `
  }).join('')
}

// =========================================================================
// Profile Page
// =========================================================================
async function renderProfile() {
  if (!db) return

  const sessions = await dbGetAll(db, 'sessions', 'startTime')
  const totalFasts = sessions.length
  const totalMs = sessions.reduce((sum, s) => sum + s.durationMs, 0)
  const totalHours = Math.round(totalMs / (1000 * 60 * 60))
  const longestMs = sessions.reduce((max, s) => Math.max(max, s.durationMs), 0)

  let streak = 0
  if (sessions.length > 0) {
    const sorted = sessions.sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    let checkDate = new Date(today)
    for (const s of sorted) {
      const sDate = new Date(s.startTime)
      sDate.setHours(0, 0, 0, 0)
      if (Math.abs(checkDate.getTime() - sDate.getTime()) <= 86400000 || checkDate.getTime() === sDate.getTime()) {
        streak++
        checkDate.setDate(checkDate.getDate() - 1)
      } else if ((checkDate.getTime() - sDate.getTime()) > 86400000) {
        break
      } else {
        continue
      }
    }
  }

  $('#statTotalFasts').textContent = totalFasts
  $('#statTotalHours').textContent = totalHours + 'h'
  $('#statLongest').textContent = formatDurationHourMin(longestMs)
  $('#statCurrentStreak').textContent = streak

  const defaultProtocol = state.protocol || '16:8'
  const defaultSelect = $('#defaultProtocol')
  if (defaultSelect) defaultSelect.value = defaultProtocol

  const hydraToggle = $('#toggleHydrationNotify')
  const fastEndToggle = $('#toggleFastingEndNotify')
  if (hydraToggle) hydraToggle.checked = state.hydrationNotify
  if (fastEndToggle) fastEndToggle.checked = state.fastingEndNotify
}

// =========================================================================
// Ring Rendering
// =========================================================================
function updateRing(elapsedMs) {
  const ringProgress = $('.ring-progress')
  const ringGradient = $('#ringGradient')
  if (!ringProgress || !ringGradient) return

  const protocolHours = getProtocolHours()
  const targetMs = protocolHours * 60 * 60 * 1000
  const progress = Math.min(elapsedMs / targetMs, 1)
  const zoneIndex = getCurrentZoneIndex(elapsedMs)
  const zoneColor = ZONES[zoneIndex].color

  ringProgress.style.strokeDashoffset = RING_CIRCUMFERENCE * (1 - progress)
  ringProgress.style.stroke = zoneColor

  const stops = ringGradient.querySelectorAll('stop')
  if (stops.length >= 2) {
    stops[0].setAttribute('stop-color', zoneColor)
    stops[1].setAttribute('stop-color', zoneColor)
  }
}

function updateZoneIndicators(elapsedMs) {
  const zoneItems = $$('.zone')
  const currentZone = getCurrentZoneIndex(elapsedMs)

  zoneItems.forEach((item, i) => {
    item.classList.remove('active', 'completed')
    if (i < currentZone) item.classList.add('completed')
    else if (i === currentZone) item.classList.add('active')
  })
}

// =========================================================================
// Timer Logic
// =========================================================================
function tick() {
  const elapsedMs = getElapsedMs()
  const timeEl = $('#fastingTime')
  if (timeEl) timeEl.textContent = formatTime(elapsedMs)
  updateRing(elapsedMs)
  updateZoneIndicators(elapsedMs)

  checkFastingEndNotification(elapsedMs)
}

let lastHydrationNotify = null
let fastingEndNotified = false

function checkFastingEndNotification(elapsedMs) {
  if (!state.fastingEndNotify || fastingEndNotified) return

  const targetMs = getProtocolHours() * 60 * 60 * 1000
  if (elapsedMs >= targetMs) {
    fastingEndNotified = true
    sendNotification('Ayuno completado', `Has alcanzado tu objetivo de ${state.protocol}. Buen trabajo.`)
  }
}

function scheduleHydrationReminder() {
  if (!state.hydrationNotify || !state.fastingStartTime || state.pausedAt) return

  const now = Date.now()
  if (lastHydrationNotify && (now - lastHydrationNotify) < 2 * 60 * 60 * 1000) return

  lastHydrationNotify = now
  sendNotification('Hora de hidratarte', 'Recuerda tomar agua durante tu ayuno.')
}

function sendNotification(title, body) {
  if (notificationPermission !== 'granted') return

  try {
    const notif = new Notification(title, {
      body,
      icon: '/icon-192.svg',
      badge: '/icon-192.svg',
      tag: 'ayunopro',
      silent: false
    })
    setTimeout(() => notif.close(), 5000)
  } catch (_) {}
}

async function requestNotificationPermission() {
  if (!('Notification' in window)) return
  if (Notification.permission === 'granted') {
    notificationPermission = 'granted'
  } else if (Notification.permission !== 'denied') {
    const perm = await Notification.requestPermission()
    notificationPermission = perm
  } else {
    notificationPermission = 'denied'
  }
}

function startFasting() {
  state.fastingStartTime = Date.now()
  state.accumulatedMs = 0
  state.pausedAt = null
  state.interval = setInterval(tick, 1000)
  fastingEndNotified = false
  lastHydrationNotify = null
  tick()
  saveLiveState()
  updateButtonStates('running')
}

function pauseFasting() {
  if (!state.fastingStartTime || state.pausedAt) return
  state.accumulatedMs += (Date.now() - state.fastingStartTime)
  state.pausedAt = Date.now()
  state.fastingStartTime = null
  clearInterval(state.interval)
  state.interval = null
  const label = $('.fasting-label')
  if (label) label.textContent = 'PAUSADO'
  saveLiveState()
  updateButtonStates('paused')
}

function resumeFasting() {
  if (!state.pausedAt) return
  state.fastingStartTime = Date.now()
  state.pausedAt = null
  state.interval = setInterval(tick, 1000)
  fastingEndNotified = false
  tick()
  const label = $('.fasting-label')
  if (label) label.textContent = 'EN AYUNO'
  saveLiveState()
  updateButtonStates('running')
}

async function stopFasting() {
  clearInterval(state.interval)
  state.interval = null

  if (state.pausedAt) {
    state.fastingStartTime = null
  } else if (state.fastingStartTime) {
    state.accumulatedMs += (Date.now() - state.fastingStartTime)
    state.fastingStartTime = null
  }

  const elapsedMs = state.accumulatedMs
  const now = new Date()
  const startTime = new Date(now.getTime() - elapsedMs)

  if (db && elapsedMs > 60000) {
    await dbPut(db, 'sessions', {
      startTime: startTime.toISOString(),
      endTime: now.toISOString(),
      durationMs: elapsedMs,
      protocol: state.protocol,
      completed: true
    })
  }

  state.fastingStartTime = null
  state.accumulatedMs = 0
  state.pausedAt = null
  fastingEndNotified = false

  const timeEl = $('#fastingTime')
  const labelEl = $('.fasting-label')
  const ring = $('.ring-progress')
  if (timeEl) timeEl.textContent = '00:00:00'
  if (labelEl) labelEl.textContent = 'EN AYUNO'
  if (ring) {
    ring.style.strokeDashoffset = RING_CIRCUMFERENCE
    ring.style.stroke = 'url(#ringGradient)'
  }

  $$('.zone').forEach(item => item.classList.remove('active', 'completed'))
  clearLiveState()
  updateButtonStates('stopped')
}

function updateButtonStates(status) {
  const startBtn = $('#startFasting')
  const pauseBtn = $('#pauseFasting')
  const stopBtn = $('#stopFasting')

  if (!startBtn || !pauseBtn || !stopBtn) return

  switch (status) {
    case 'running':
      startBtn.disabled = true; startBtn.textContent = 'Ayunando...'; startBtn.style.background = ''
      pauseBtn.disabled = false; pauseBtn.textContent = 'Pausar'
      stopBtn.disabled = false
      break
    case 'paused':
      startBtn.disabled = false; startBtn.textContent = 'Reanudar'
      startBtn.style.background = 'linear-gradient(135deg, #a855f7, #7c3aed)'
      pauseBtn.disabled = true; pauseBtn.textContent = 'Pausado'
      stopBtn.disabled = false
      break
    case 'stopped':
      startBtn.disabled = false; startBtn.textContent = 'Iniciar Ayuno'; startBtn.style.background = ''
      pauseBtn.disabled = true; pauseBtn.textContent = 'Pausar'
      stopBtn.disabled = true
      break
  }
}

// =========================================================================
// Persistence
// =========================================================================
async function saveLiveState() {
  if (db) {
    await dbPut(db, 'appState', {
      key: STATE_KEY,
      fastingStartTime: state.fastingStartTime,
      accumulatedMs: state.accumulatedMs,
      pausedAt: state.pausedAt,
      protocol: state.protocol,
      updatedAt: Date.now()
    })
  }
  localStorage.setItem('waterCount', state.waterCount.toString())
  localStorage.setItem('protocol', state.protocol)
  localStorage.setItem(NOTIFY_HYDRATION_KEY, state.hydrationNotify.toString())
  localStorage.setItem(NOTIFY_FASTING_END_KEY, state.fastingEndNotify.toString())
}

async function clearLiveState() {
  if (db) {
    await dbDelete(db, 'appState', STATE_KEY)
  }
  localStorage.removeItem('fastingStartTime')
}

async function saveHealthLog(type, data) {
  const today = new Date().toISOString().split('T')[0]
  if (db) {
    await dbPut(db, 'healthLog', { date: today, type, ...data, timestamp: Date.now() })
  }
}

// =========================================================================
// Event Handlers
// =========================================================================
function bindEvents() {
  const startBtn = $('#startFasting')
  const pauseBtn = $('#pauseFasting')
  const stopBtn = $('#stopFasting')
  const addWaterBtn = $('#addWater')
  const protocolSelect = $('#protocolSelect')
  const logWeightBtn = $('#logWeight')
  const logBPBtn = $('#logBP')

  startBtn?.addEventListener('click', () => {
    if (state.pausedAt) resumeFasting()
    else if (!state.fastingStartTime) startFasting()
  })

  pauseBtn?.addEventListener('click', () => {
    if (state.fastingStartTime && !state.pausedAt) pauseFasting()
  })

  stopBtn?.addEventListener('click', stopFasting)

  addWaterBtn?.addEventListener('click', async () => {
    state.waterCount++
    const el = $('#waterCount')
    if (el) el.textContent = state.waterCount
    await saveHealthLog('water', { count: state.waterCount })
    localStorage.setItem('waterCount', state.waterCount.toString())
  })

  logWeightBtn?.addEventListener('click', showWeightModal)
  logBPBtn?.addEventListener('click', showBPModal)

  protocolSelect?.addEventListener('change', async () => {
    state.protocol = protocolSelect.value
    localStorage.setItem('protocol', state.protocol)
    const defaultSelect = $('#defaultProtocol')
    if (defaultSelect) defaultSelect.value = state.protocol
    if (state.fastingStartTime || state.pausedAt) {
      tick()
      await saveLiveState()
    }
  })

  modalClose?.addEventListener('click', hideModal)
  modal?.addEventListener('click', (e) => { if (e.target === modal) hideModal() })

  bottomNav?.addEventListener('click', (e) => {
    const navItem = e.target.closest('.nav-item')
    if (navItem) {
      e.preventDefault()
      navigateTo(navItem.dataset.view)
    }
  })

  $('#historyTabs')?.addEventListener('click', (e) => {
    const tab = e.target.closest('.tab')
    if (tab) navigateToHistoryTab(tab.dataset.tab)
  })

  $('#saveWeightHistory')?.addEventListener('click', async () => {
    const input = $('#weightInputHistory')
    const weight = parseFloat(input.value)
    if (isNaN(weight) || weight < 30 || weight > 300) {
      input.classList.add('invalid')
      return
    }
    input.classList.remove('invalid')
    state.currentWeight = weight
    await saveHealthLog('weight', { weight })
    localStorage.setItem('currentWeight', weight.toString())
    const currentWeightEl = $('#currentWeight')
    if (currentWeightEl) currentWeightEl.textContent = weight.toFixed(1)
    input.value = ''
    await renderWeightHistory()
  })

  $('#saveBPHistory')?.addEventListener('click', async () => {
    const systolicInput = $('#systolicInputHistory')
    const diastolicInput = $('#diastolicInputHistory')
    const hrInput = $('#hrInputHistory')

    const systolic = parseInt(systolicInput.value)
    const diastolic = parseInt(diastolicInput.value)

    let valid = true
    if (isNaN(systolic) || systolic < 70 || systolic > 250) { systolicInput.classList.add('invalid'); valid = false }
    else systolicInput.classList.remove('invalid')
    if (isNaN(diastolic) || diastolic < 40 || diastolic > 150) { diastolicInput.classList.add('invalid'); valid = false }
    else diastolicInput.classList.remove('invalid')

    if (!valid) return

    const hr = hrInput.value ? parseInt(hrInput.value) : null
    const bp = `${systolic}/${diastolic}`
    state.currentBP = bp

    await saveHealthLog('bp', { systolic, diastolic, heartRate: hr })
    localStorage.setItem('currentBP', bp)
    const currentBpEl = $('#currentBP')
    if (currentBpEl) currentBpEl.textContent = bp

    systolicInput.value = ''; diastolicInput.value = ''; hrInput.value = ''
    await renderBPHistory()
  })

  $('#toggleHydrationNotify')?.addEventListener('change', async (e) => {
    state.hydrationNotify = e.target.checked
    localStorage.setItem(NOTIFY_HYDRATION_KEY, state.hydrationNotify.toString())
    if (state.hydrationNotify && notificationPermission !== 'granted') {
      await requestNotificationPermission()
    }
  })

  $('#toggleFastingEndNotify')?.addEventListener('change', async (e) => {
    state.fastingEndNotify = e.target.checked
    localStorage.setItem(NOTIFY_FASTING_END_KEY, state.fastingEndNotify.toString())
    if (state.fastingEndNotify && notificationPermission !== 'granted') {
      await requestNotificationPermission()
    }
  })

  $('#defaultProtocol')?.addEventListener('change', (e) => {
    state.protocol = e.target.value
    localStorage.setItem('protocol', state.protocol)
    const protocolSelect = $('#protocolSelect')
    if (protocolSelect) protocolSelect.value = state.protocol
    if (state.fastingStartTime || state.pausedAt) {
      tick()
      saveLiveState()
    }
  })
}

// =========================================================================
// Modal Handlers
// =========================================================================
function showModal(title, content) {
  if (modalTitle) modalTitle.textContent = title
  if (modalBody) modalBody.innerHTML = content
  if (modal) modal.classList.add('active')
}

function hideModal() {
  if (modal) modal.classList.remove('active')
}

function showWeightModal() {
  showModal('Registrar Peso', `
    <form id="weightForm">
      <div class="form-group">
        <label class="form-label" for="weightInput">Peso (kg)</label>
        <input type="number" id="weightInput" class="form-input" step="0.1" min="30" max="300" required placeholder="Ej: 75.5">
        <span class="form-error" style="display:none">Ingresa un peso v\u00e1lido (30-300 kg)</span>
      </div>
      <button type="submit" class="btn btn-primary">Guardar</button>
    </form>
  `)

  $('#weightForm')?.addEventListener('submit', async (e) => {
    e.preventDefault()
    const input = $('#weightInput')
    const error = $('.form-error')
    const weight = parseFloat(input.value)
    if (isNaN(weight) || weight < 30 || weight > 300) {
      input.classList.add('invalid')
      error.style.display = 'block'
      return
    }
    input.classList.remove('invalid')
    error.style.display = 'none'
    state.currentWeight = weight
    const currentWeightEl = $('#currentWeight')
    if (currentWeightEl) currentWeightEl.textContent = weight.toFixed(1)
    await saveHealthLog('weight', { weight })
    localStorage.setItem('currentWeight', weight.toString())
    hideModal()
  })
}

function showBPModal() {
  showModal('Registrar Presi\u00f3n', `
    <form id="bpForm">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="systolicInput">Sist\u00f3lica</label>
          <input type="number" id="systolicInput" class="form-input" min="70" max="250" required placeholder="120">
          <span class="form-error" style="display:none">70-250 mmHg</span>
        </div>
        <div class="form-group">
          <label class="form-label" for="diastolicInput">Diast\u00f3lica</label>
          <input type="number" id="diastolicInput" class="form-input" min="40" max="150" required placeholder="80">
          <span class="form-error" style="display:none">40-150 mmHg</span>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" for="hrInput">Frecuencia Card\u00edaca (opcional)</label>
        <input type="number" id="hrInput" class="form-input" min="30" max="220" placeholder="72">
      </div>
      <button type="submit" class="btn btn-primary">Guardar</button>
    </form>
  `)

  $('#bpForm')?.addEventListener('submit', async (e) => {
    e.preventDefault()
    const systolicInput = $('#systolicInput')
    const diastolicInput = $('#diastolicInput')
    const hrInput = $('#hrInput')

    let valid = true
    const systolic = parseInt(systolicInput.value)
    const diastolic = parseInt(diastolicInput.value)

    if (isNaN(systolic) || systolic < 70 || systolic > 250) {
      systolicInput.classList.add('invalid')
      systolicInput.parentElement.querySelector('.form-error').style.display = 'block'
      valid = false
    } else {
      systolicInput.classList.remove('invalid')
      systolicInput.parentElement.querySelector('.form-error').style.display = 'none'
    }

    if (isNaN(diastolic) || diastolic < 40 || diastolic > 150) {
      diastolicInput.classList.add('invalid')
      diastolicInput.parentElement.querySelector('.form-error').style.display = 'block'
      valid = false
    } else {
      diastolicInput.classList.remove('invalid')
      diastolicInput.parentElement.querySelector('.form-error').style.display = 'none'
    }

    if (!valid) return

    const hr = hrInput.value ? parseInt(hrInput.value) : null
    const bp = `${systolic}/${diastolic}`
    state.currentBP = bp

    await saveHealthLog('bp', { systolic, diastolic, heartRate: hr })
    localStorage.setItem('currentBP', bp)
    const currentBpEl = $('#currentBP')
    if (currentBpEl) currentBpEl.textContent = bp
    hideModal()
  })
}

// =========================================================================
// Hydration Reminder Interval
// =========================================================================
let hydrationInterval = null

function startHydrationReminders() {
  stopHydrationReminders()
  if (!state.hydrationNotify) return
  hydrationInterval = setInterval(scheduleHydrationReminder, 30 * 60 * 1000)
}

function stopHydrationReminders() {
  if (hydrationInterval) {
    clearInterval(hydrationInterval)
    hydrationInterval = null
  }
}

// =========================================================================
// Initialization
// =========================================================================
async function init() {
  db = await openDB()
  await requestNotificationPermission()

  state.waterCount = parseInt(localStorage.getItem('waterCount') || '0')
  state.protocol = localStorage.getItem('protocol') || '16:8'
  state.hydrationNotify = localStorage.getItem(NOTIFY_HYDRATION_KEY) === 'true'
  state.fastingEndNotify = localStorage.getItem(NOTIFY_FASTING_END_KEY) !== 'false'

  const savedWeight = localStorage.getItem('currentWeight')
  if (savedWeight) {
    state.currentWeight = parseFloat(savedWeight)
    const el = $('#currentWeight')
    if (el) el.textContent = savedWeight
  }

  const savedBP = localStorage.getItem('currentBP')
  if (savedBP) {
    state.currentBP = savedBP
    const el = $('#currentBP')
    if (el) el.textContent = savedBP
  }

  const waterEl = $('#waterCount')
  if (waterEl) waterEl.textContent = state.waterCount

  const protocolEl = $('#protocolSelect')
  if (protocolEl) protocolEl.value = state.protocol

  bindEvents()

  const savedState = await dbGet(db, 'appState', STATE_KEY)
  if (savedState && savedState.fastingStartTime) {
    state.accumulatedMs = savedState.accumulatedMs || 0
    state.pausedAt = savedState.pausedAt || null
    state.fastingStartTime = savedState.fastingStartTime
    state.protocol = savedState.protocol || state.protocol
    if (protocolEl) protocolEl.value = state.protocol

    if (state.pausedAt) {
      const label = $('.fasting-label')
      if (label) label.textContent = 'PAUSADO'
      updateButtonStates('paused')
      tick()
    } else {
      state.interval = setInterval(tick, 1000)
      tick()
      updateButtonStates('running')
    }
  }

  startHydrationReminders()
  navigateTo('dashboard')
}

init()
