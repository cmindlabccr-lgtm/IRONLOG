/* ===========================================================
   IRONLOG CORE - SCRIPT COMPLETO V2.2 (CON MEMORIA)
   =========================================================== */

// === CONFIGURACIÓN Y ESTADO GLOBAL ===
const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

let currentWeekStart = getMonday(new Date()); // Lunes de la semana actual
let selectedDayIndex = getCurrentDayIndex(); // 0 (Lun) - 6 (Dom)

// Variables Cronómetro
let stopwatchInterval;
let startTime;
let elapsedTime = 0;
let isRunning = false;

// Variables de UI (Referencias DOM)
let weekRangeDisplay, monthDisplay, daysTabsContainer, exerciseSlotsContainer, dailyVolumeDisplay, weeklyVolumeDisplay;
let navTabs, tabContents, stopwatchWidget, swDisplay, btnAnalytics, analyticsModal, exerciseSelect;
let hamburgerBtn, sidebar, backdrop;
let swPlayPauseBtn, swResetBtn, swCloseBtn;
let strengthChartInstance = null;
let biometricsChartInstance = null;

// === SIDEBAR CONTROLS (GLOBAL) ===
window.toggleSidebar = function () {
    const s = document.getElementById('sidebar');
    const b = document.getElementById('backdrop');
    if (s) s.classList.toggle('active');
    if (b) b.classList.toggle('active');
}
// Alias
window.toggleMenu = window.toggleSidebar;

window.closeSidebar = function () {
    const s = document.getElementById('sidebar');
    const b = document.getElementById('backdrop');
    if (s) s.classList.remove('active');
    if (b) b.classList.remove('active');
}

// === INICIALIZACIÓN (DOMContentLoaded) ===
document.addEventListener('DOMContentLoaded', () => {
    // 1. Inicializar Referencias DOM Básicas
    weekRangeDisplay = document.getElementById('week-range');
    monthDisplay = document.getElementById('month-display');
    daysTabsContainer = document.getElementById('days-tabs');
    exerciseSlotsContainer = document.getElementById('exercises-container');
    dailyVolumeDisplay = document.getElementById('daily-volume');
    weeklyVolumeDisplay = document.getElementById('weekly-volume');
    hamburgerBtn = document.getElementById('hamburger-btn');
    sidebar = document.getElementById('sidebar');
    backdrop = document.getElementById('backdrop');

    // Cronómetro UI
    stopwatchWidget = document.getElementById('stopwatch-widget');
    swDisplay = stopwatchWidget ? stopwatchWidget.querySelector('.stopwatch-display') : null;
    swPlayPauseBtn = document.getElementById('sw-play-pause');
    swResetBtn = document.getElementById('sw-reset');
    swCloseBtn = document.getElementById('sw-close');

    // Analítica UI
    btnAnalytics = document.getElementById('btn-analytics');
    exerciseSelect = document.getElementById('exercise-select');

    // Tabs
    navTabs = document.querySelectorAll('.nav-tab');
    tabContents = document.querySelectorAll('.tab-content');

    // 2. Event Listeners Básicos
    if (hamburgerBtn) hamburgerBtn.addEventListener('click', () => window.toggleSidebar());
    if (backdrop) backdrop.addEventListener('click', () => window.toggleSidebar());

    const toggleStopwatchBtn = document.getElementById('toggle-stopwatch');
    if (toggleStopwatchBtn) {
        toggleStopwatchBtn.addEventListener('click', () => {
            if (stopwatchWidget) stopwatchWidget.classList.remove('hidden');
            toggleSidebar();
        });
    }

    if (swPlayPauseBtn) swPlayPauseBtn.addEventListener('click', toggleStopwatch);
    if (swResetBtn) swResetBtn.addEventListener('click', resetStopwatch);
    if (swCloseBtn) swCloseBtn.addEventListener('click', () => {
        if (stopwatchWidget) stopwatchWidget.classList.add('hidden');
    });

    // Analítica Listeners
    if (btnAnalytics) {
        btnAnalytics.addEventListener('click', (e) => {
            e.preventDefault();
            openAnalytics();
            toggleSidebar();
        });
    }

    if (exerciseSelect) exerciseSelect.addEventListener('change', () => updateChart(exerciseSelect.value));

    // Navegación Semanal


    // 3. INICIALIZAR UI PRINCIPAL
    renderWeekHeader();


    // Renderizar el día actual
    const targetDate = new Date(currentWeekStart);
    targetDate.setDate(currentWeekStart.getDate() + selectedDayIndex);
    renderDailyView(targetDate);
    updateWeeklyStats();

    // 4. Inicializar Módulos Extra
    generateStaticParticles();

    // === CARGA DE DATOS INICIAL ===
    try {
        loadUserName();
        updateRoutinesDropdown();

        loadNutritionData();
        updateStepsUI();
        initSupplements(); // Cargar estado de suplementos

        // Inicializar pestaña de Calentamiento
        if (typeof renderWarmupProtocol === 'function') {
            renderWarmupProtocol();
        }

        // REGISTRO DE PWA SERVICE WORKER
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js')
                .then(reg => console.log('Service Worker registrado', reg))
                .catch(err => console.log('Error registrando SW', err));
        }

    } catch (e) { console.log("Error cargando datos usuario/rutinas", e); }
});

// === SECCIÓN 1: NAVEGACIÓN Y TABS ===

function selectDay(index) {
    selectedDayIndex = index;
    renderWeekHeader(); // Re-render strip to show active state

    // Calcular fecha y renderizar
    const targetDate = new Date(currentWeekStart);
    targetDate.setDate(currentWeekStart.getDate() + selectedDayIndex);

    renderDailyView(targetDate);
}

function prevWeek() {
    currentWeekStart.setDate(currentWeekStart.getDate() - 7);
    renderWeekHeader();
    selectDay(0); // Reset to Monday on week change
    updateWeeklyStats();
}

function nextWeek() {
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    renderWeekHeader();
    selectDay(0);
    updateWeeklyStats();
}



function renderWeekHeader() {
    const strip = document.getElementById('days-strip');
    const monthLabel = document.getElementById('calendar-month-year');
    if (!strip || !monthLabel) return;

    strip.innerHTML = '';

    // Set Month Year Title
    const monthNames = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
    const monthStr = monthNames[currentWeekStart.getMonth()];
    const yearStr = currentWeekStart.getFullYear();
    monthLabel.textContent = `${monthStr} ${yearStr}`;

    // Generate 7 Days
    for (let i = 0; i < 7; i++) {
        const d = new Date(currentWeekStart);
        d.setDate(currentWeekStart.getDate() + i);

        const dayNum = d.getDate();
        const dayName = d.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '');
        const fullDateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD
        const storageKey = 'ironlog_' + fullDateStr;

        // Check if data exists for dot indicator
        let hasData = false;
        const raw = localStorage.getItem(storageKey);
        if (raw) {
            try {
                const data = JSON.parse(raw);
                if (Array.isArray(data) && data.length > 0 && data.some(ex => ex.exercise.trim() !== '')) {
                    hasData = true;
                }
            } catch (e) { }
        }

        const isActive = (i === selectedDayIndex);

        const dayHTML = `
            <div class="day-strip-item ${isActive ? 'active' : ''} ${hasData ? 'day-has-data' : ''}" onclick="selectDay(${i})">
                <span class="day-strip-name">${dayName}</span>
                <span class="day-strip-num">${dayNum}</span>
            </div>
        `;
        strip.insertAdjacentHTML('beforeend', dayHTML);
    }
}

// === SECCIÓN 2: LÓGICA DE RENDERIZADO "3 POR DEFECTO" (CORE) ===

function renderDailyView(dateObj) {
    if (!exerciseSlotsContainer) return;

    const storageKey = getStorageKey(dateObj);

    // LIMPIEZA TOTAL DEL DOM
    exerciseSlotsContainer.innerHTML = '';

    // Recuperar datos
    let savedData = [];
    try {
        const raw = localStorage.getItem(storageKey);
        if (raw) savedData = JSON.parse(raw);
    } catch (e) {
        console.error("Error leyendo LS", e);
    }

    // Si no hay datos, iniciamos con 1 vacío (Minimalist start)
    if (!savedData || savedData.length === 0) {
        savedData = [
            { exercise: '', series: [{ kg: '', reps: '', rir: '' }] }
        ];
    }

    // Renderizar Loop
    savedData.forEach((data, index) => {
        const cardHTML = createCardHTML(index, data, storageKey);
        exerciseSlotsContainer.insertAdjacentHTML('beforeend', cardHTML);
    });

    updateDailyVolumeUI(savedData || []);
}

function createCardHTML(index, data, storageKey) {
    const series = Array.isArray(data.series) ? data.series : [];
    if (series.length === 0) series.push({ kg: '', reps: '' });

    return `
        <div class="exercise-card-v2" data-index="${index}">
            <div class="ex-v2-header">
                <div style="display:flex; align-items:center; flex-grow:1;">
                    <span class="ex-v2-num">#${index + 1}</span>
                    <div class="autocomplete-container">
                        <input type="text" class="ex-v2-name-input" 
                            autocomplete="off"
                            placeholder="Escribe Ejercicio..." 
                            value="${data.exercise}" 
                            oninput="handleAutocomplete(this, ${index}, '${storageKey}')"
                            onfocus="handleAutocomplete(this, ${index}, '${storageKey}')"
                            onblur="hideAutocompleteDelayed(this)"
                            onchange="updateExerciseName(${index}, this.value, '${storageKey}')">
                        <div class="autocomplete-list" id="autocomplete-list-${index}"></div>
                    </div>
                </div>
                <button class="ex-v2-delete" onclick="deleteExercise(${index}, '${storageKey}')">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
            
            <div class="ex-v2-body">
                <div class="series-list-v2" id="series-list-${index}">
                    ${series.map((s, sIndex) => {
        const isDrop = s.type === 'drop';
        return `
                        <div class="ex-v2-set-row ${isDrop ? 'drop-set-row' : ''}">
                            <span class="ex-v2-set-num">${isDrop ? '<i class="fas fa-level-down-alt"></i> ↳' : sIndex + 1}</span>
                            
                            <div class="input-v2-group">
                            <div style="flex:1;">
                                <input type="number" class="input-v2" placeholder="-" value="${s.kg}" step="0.5"
                                    onchange="updateSeriesData(${index}, ${sIndex}, 'kg', this.value, '${storageKey}')">
                                <div class="label-v2">KG</div>
                            </div>
                            <div style="flex:1;">
                                <input type="number" class="input-v2" placeholder="-" value="${s.reps}"
                                    onchange="updateSeriesData(${index}, ${sIndex}, 'reps', this.value, '${storageKey}')">
                                <div class="label-v2">REPS</div>
                            </div>
                            <div style="flex:0.8;">
                                <input type="number" class="input-v2" placeholder="-" value="${s.rir || ''}" step="0.5" min="0" max="10"
                                    onchange="updateSeriesData(${index}, ${sIndex}, 'rir', this.value, '${storageKey}')">
                                <div class="label-v2">RIR</div>
                            </div>
                            </div>

                            <button class="btn-v2-action" onclick="deleteSeries(${index}, ${sIndex}, '${storageKey}')">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    `;
    }).join('')}
                </div>
                <div style="display:flex; gap:10px;">
                    <button class="ex-v2-add-btn" onclick="addNewSeries(${index}, '${storageKey}')">
                        <i class="fas fa-plus"></i> Añadir Serie
                    </button>
                    <button class="ex-v2-add-btn btn-dropset" onclick="addNewDropSet(${index}, '${storageKey}')">
                        <i class="fas fa-bolt"></i> + Drop Set
                    </button>
                </div>
            </div>
        </div>
    `;
}


// === SECCIÓN 3: MANEJO DE DATOS (DATA HANDLERS) ===

function updateExerciseName(index, value, storageKey) {
    let data = getOrInitData(storageKey);
    ensureIndexExists(data, index);
    data[index].exercise = value;
    saveAndRefresh(storageKey, data, false);
}

function updateSeriesData(cardIndex, seriesIndex, field, value, storageKey) {
    let data = getOrInitData(storageKey);
    ensureIndexExists(data, cardIndex);

    if (!data[cardIndex].series[seriesIndex]) {
        data[cardIndex].series[seriesIndex] = { kg: '', reps: '', rir: '' };
    }

    data[cardIndex].series[seriesIndex][field] = value;
    saveAndRefresh(storageKey, data, false);
    updateDailyVolumeUI(data);
}

function addNewSeries(cardIndex, storageKey) {
    let data = getOrInitData(storageKey);
    ensureIndexExists(data, cardIndex);
    data[cardIndex].series.push({ kg: '', reps: '', rir: '' });
    saveAndRefresh(storageKey, data, true);
}

function addNewDropSet(cardIndex, storageKey) {
    let data = getOrInitData(storageKey);
    ensureIndexExists(data, cardIndex);
    data[cardIndex].series.push({ kg: '', reps: '', rir: '', type: 'drop' });
    saveAndRefresh(storageKey, data, true);
}

function deleteSeries(cardIndex, seriesIndex, storageKey) {
    let data = getOrInitData(storageKey);
    if (data[cardIndex] && data[cardIndex].series) {
        data[cardIndex].series.splice(seriesIndex, 1);
        saveAndRefresh(storageKey, data, true);
    }
}

function deleteExercise(index, storageKey) {
    if (!confirm("¿Eliminar este ejercicio?")) return;
    let data = getOrInitData(storageKey);
    data.splice(index, 1);
    saveAndRefresh(storageKey, data, true);
}

function addManualExercise() {
    const targetDate = new Date(currentWeekStart);
    targetDate.setDate(currentWeekStart.getDate() + selectedDayIndex);
    const storageKey = getStorageKey(targetDate);

    let data = getOrInitData(storageKey);
    data.push({ exercise: '', series: [{ kg: '', reps: '' }] });
    saveAndRefresh(storageKey, data, true);
}

// Helpers de Datos
function getOrInitData(storageKey) {
    const raw = localStorage.getItem(storageKey);
    try {
        return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
}

function ensureIndexExists(dataArray, index) {
    while (dataArray.length <= index) {
        dataArray.push({ exercise: '', series: [{ kg: '', reps: '', rpe: '' }] });
    }
}

function saveAndRefresh(storageKey, data, shouldRender) {
    localStorage.setItem(storageKey, JSON.stringify(data));
    updateWeeklyStats();

    if (shouldRender) {
        const dateStr = storageKey.replace('ironlog_', '');
        renderDailyView(new Date(dateStr));
    }
}

function updateDailyVolumeUI(data) {
    let total = 0;
    if (Array.isArray(data)) {
        data.forEach(ex => {
            if (ex.series) {
                ex.series.forEach(s => {
                    const k = parseFloat(s.kg) || 0;
                    const r = parseFloat(s.reps) || 0;
                    total += k * r;
                });
            }
        });
    }
    if (dailyVolumeDisplay) dailyVolumeDisplay.textContent = `${total.toLocaleString()} kg`;
}

function updateWeeklyStats() {
    let weeklyTotal = 0;
    let workoutsCount = 0;
    let totalSets = 0;

    for (let i = 0; i < 7; i++) {
        const date = new Date(currentWeekStart);
        date.setDate(currentWeekStart.getDate() + i);
        const key = getStorageKey(date);
        let data = [];
        try {
            const raw = localStorage.getItem(key);
            if (raw) data = JSON.parse(raw);
        } catch (e) { }

        let dayHasWorkout = false;

        if (Array.isArray(data)) {
            data.forEach(slot => {
                if (slot && slot.exercise && slot.exercise.trim() !== '') {
                    dayHasWorkout = true;
                    if (Array.isArray(slot.series)) {
                        slot.series.forEach(s => {
                            const k = parseFloat(s.kg) || 0;
                            const r = parseFloat(s.reps) || 0;
                            weeklyTotal += k * r;
                            if ((k > 0 || r > 0) && s.type !== 'drop') totalSets++;
                        });
                    }
                }
            });
        }
        if (dayHasWorkout) workoutsCount++;
    }

    // Update UI
    if (document.getElementById('stat-volume')) document.getElementById('stat-volume').textContent = (weeklyTotal >= 1000) ? (weeklyTotal / 1000).toFixed(1) + 'k' : weeklyTotal;
    if (document.getElementById('stat-workouts')) document.getElementById('stat-workouts').textContent = workoutsCount;
    if (document.getElementById('stat-sets')) document.getElementById('stat-sets').textContent = totalSets;

    // Legacy support (if element exists)
    if (weeklyVolumeDisplay) weeklyVolumeDisplay.textContent = `${weeklyTotal.toLocaleString()} kg`;
}

// === UTILIDADES GENERALES ===

function getMonday(d) {
    d = new Date(d);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

function getCurrentDayIndex() {
    const day = new Date().getDay();
    return day === 0 ? 6 : day - 1;
}

function formatDate(dateObj) {
    const day = dateObj.getDate().toString().padStart(2, '0');
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    return `${day}/${month}`;
}

function getStorageKey(dateObj) {
    const offset = dateObj.getTimezoneOffset();
    const localDate = new Date(dateObj.getTime() - (offset * 60 * 1000));
    return 'ironlog_' + localDate.toISOString().split('T')[0];
}

function switchTab(tabId) {
    // 1. Referencias
    navTabs = document.querySelectorAll('.nav-tab');
    tabContents = document.querySelectorAll('.tab-content');

    // 2. Ocultar todas las pestañas
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    // 3. Mostrar la pestaña objetivo
    const target = document.getElementById(tabId);
    if (target) target.classList.add('active');

    // === LÓGICA DE CADA PESTAÑA ===

    // A) Si entras en ESTADÍSTICAS -> Carga la gráfica
    if (tabId === 'stats') {
        setTimeout(() => {
            loadStatsView();
        }, 50);
    }

    // B) Si entras en PERFIL -> Calcula tu Nivel y carga medidas
    if (tabId === 'profile') {
        updateProfileUI();
        loadBodyStats();
    }

    // C) Si entras en FILOSOFÍA -> Carga frase aleatoria
    if (tabId === 'philosophy') {
        currentQuoteIndex = Math.floor(Math.random() * STOIC_QUOTES.length);
        updateDailyQuote();
    }

    // D) BITÁCORA -> Renderizar lista
    if (tabId === 'logbook') {
        renderLogbook();
    }

    // E) CALCULADORA 1RM -> Renderizar historial
    if (tabId === 'calc_1rm') {
        renderRMHistory();
    }

    // F) MAESTRÍA DE CORE -> Renderizar tarjetas
    if (tabId === 'core-mastery') {
        renderCoreMastery();
    }

    // 4. Cerrar menú móvil automáticamente si está abierto
    if (sidebar && sidebar.classList.contains('active')) {
        toggleMenu();
    }
}

function toggleMenu() {
    if (hamburgerBtn && sidebar && backdrop) {
        hamburgerBtn.classList.toggle('active');
        sidebar.classList.toggle('active');
        backdrop.classList.toggle('active');
    }
}

function generateStaticParticles() {
    const container = document.getElementById('particles-container');
    if (!container) return;
    const count = 50;
    for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        const size = Math.random() * 2 + 1;
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        const opacity = Math.random() * 0.05 + 0.05;
        p.style.width = `${size}px`;
        p.style.height = `${size}px`;
        p.style.left = `${x}%`;
        p.style.top = `${y}%`;
        p.style.opacity = opacity;
        container.appendChild(p);
    }
}

// === FUNCIONALIDADES EXTRA ===

// Quotes
const STOIC_QUOTES = [
    { quote: "No es que tengamos poco tiempo, sino que perdemos mucho.", author: "SÉNECA" },
    { quote: "La disciplina es el puente entre metas y logros.", author: "JIM ROHN" },
    { quote: "Vence a tu mente y vencerás al mundo.", author: "IRON MENTALITY" },
    { quote: "El dolor es temporal, la gloria es eterna.", author: "ANÓNIMO" },
    { quote: "Si estás atravesando el infierno, sigue caminando.", author: "WINSTON CHURCHILL" },
    { quote: "El hombre que mueve una montaña comienza cargando pequeñas piedras.", author: "CONFUCIO" },
    { quote: "No cuentes los días, haz que los días cuenten.", author: "MUHAMMAD ALI" },
    { quote: "La fuerza no viene de la capacidad física. Viene de una voluntad indomable.", author: "MAHATMA GANDHI" },
    { quote: "Haz hoy lo que otros no quieren, haz mañana lo que otros no pueden.", author: "JERRY RICE" },
    { quote: "Somos lo que hacemos repetidamente. La excelencia, entonces, no es un acto, sino un hábito.", author: "ARISTÓTELES" },
    { quote: "El único día fácil fue ayer.", author: "NAVY SEALS" },
    { quote: "Obsesión es la palabra que los vagos usan para describir la dedicación.", author: "ARNOLD SCHWARZENEGGER" },
    { quote: "No te detengas cuando estés cansado. Detente cuando hayas terminado.", author: "DAVID GOGGINS" },
    { quote: "La suerte es lo que ocurre cuando la preparación coincide con la oportunidad.", author: "SÉNECA" },
    { quote: "El hierro nunca te miente.", author: "HENRY ROLLINS" }
];

let currentQuoteIndex = 0;

function updateDailyQuote() {
    const quoteContent = document.querySelector('.quote-content');
    const quoteElem = document.getElementById('daily-quote');
    const authorElem = document.getElementById('quote-author');

    if (!quoteElem) return;

    if (quoteContent) {
        quoteContent.classList.add('fade-out');
        quoteContent.classList.remove('fade-in');
    }

    setTimeout(() => {
        const quoteData = STOIC_QUOTES[currentQuoteIndex];
        quoteElem.textContent = `"${quoteData.quote}"`;
        authorElem.textContent = quoteData.author;

        if (quoteContent) {
            quoteContent.classList.remove('fade-out');
            quoteContent.classList.add('fade-in');
        }
    }, 300);
}

function nextQuote() {
    currentQuoteIndex = (currentQuoteIndex + 1) % STOIC_QUOTES.length;
    updateDailyQuote();
}

// === CÓDEX DEL HIERRO LOGIC ===
function toggleCodex(headerElement) {
    const card = headerElement.closest('.codex-card');

    // Optional: Close all other cards first (Accordion behavior)
    // Uncomment these lines if the user wants only ONE card open at a time
    /*
    const allCards = document.querySelectorAll('.codex-card');
    allCards.forEach(c => {
        if (c !== card && c.classList.contains('active')) {
            c.classList.remove('active');
        }
    });
    */

    card.classList.toggle('active');
}

function prevQuote() {
    currentQuoteIndex = (currentQuoteIndex - 1 + STOIC_QUOTES.length) % STOIC_QUOTES.length;
    updateDailyQuote();
}

// === CEREBRO DE DATOS (GRÁFICAS REALES) ===

const MUSCLE_MAP_KEYWORDS = [
    // Prioritized multi-word concepts
    { keys: ['jalon al pecho', 'jalon al pecho supino', 'press de pecho', 'pull over', 'pullover'], muscle: 'Espalda' }, // Exception: press de pecho handled below
    { keys: ['peso muerto', 'deadlift', 'rdl', 'curl femoral', 'hiperextensiones'], muscle: 'Femoral' },
    { keys: ['patada de gluteo', 'hip thrust', 'puente de gluteo', 'pendular (gluteo)'], muscle: 'Glúteo' },
    { keys: ['patada de tricep', 'patada de triceps', 'press frances'], muscle: 'Tríceps' },
    { keys: ['press militar'], muscle: 'Hombro' },

    // PECHO
    { keys: ['pecho', 'bench', 'banca', 'aperturas', 'flexiones', 'pec deck', 'cruces', 'flyes', 'push up', 'chest', 'declinado', 'fondos en paralelas (pecho)'], muscle: 'Pecho' },
    // ESPALDA
    { keys: ['espalda', 'remo', 'jalon', 'dominadas', 'pull', 'row', 'lat pulldown', 'serrucho', 'lumbar', 'espalda baja', 'chin up', 'seal row'], muscle: 'Espalda' },
    // HOMBRO
    { keys: ['hombro', 'militar', 'lateral', 'pajaro', 'shoulder', 'press arnold', 'elevaciones', 'frontales', 'face pull', 'deltoides', 'encogimientos', 'shrugs'], muscle: 'Hombro' },
    // BÍCEPS
    { keys: ['biceps', 'curl', 'martillo', 'predicador', 'hammer', 'araña', 'spider', 'inverso'], muscle: 'Bíceps' },
    // TRÍCEPS
    { keys: ['triceps', 'tricep', 'copa', 'fondos', 'frances', 'extensiones', 'kickback', 'dips', 'skullcrusher', 'cuerda'], muscle: 'Tríceps' },
    // CUÁDRICEPS
    { keys: ['cuadriceps', 'sentadilla', 'prensa', 'extension', 'squat', 'leg press', 'bulgaras', 'bulgarian', 'zancadas', 'lunge', 'hack'], muscle: 'Cuádriceps' },
    // FEMORAL
    { keys: ['femoral'], muscle: 'Femoral' },
    // GLÚTEO
    { keys: ['gluteo', 'abductores'], muscle: 'Glúteo' },
    // GEMELO
    { keys: ['gemelo', 'pantorrilla', 'calf', 'elevacion talones', 'soleo'], muscle: 'Gemelo' },
    // CORE
    { keys: ['abs', 'plancha', 'abdomen', 'rueda', 'ab', 'crunch', 'sit up', 'elevacion de piernas', 'russian twist', 'core', 'abdominales'], muscle: 'Core' },
    // ADUCTORES
    { keys: ['aductores', 'adductor'], muscle: 'Aductores' }
];

function normalizeString(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function detectMuscle(exerciseName) {
    const lower = normalizeString(exerciseName);

    // Explicit exceptions fixes
    if (lower.includes('press de pecho') || lower.includes('press inclinado') || lower.includes('press declinado')) return 'Pecho';
    if (lower.includes('pullover con mancuerna') || lower.includes('pullover en polea')) return 'Espalda';

    for (const group of MUSCLE_MAP_KEYWORDS) {
        for (const key of group.keys) {
            if (lower.includes(key)) {
                return group.muscle;
            }
        }
    }
    return 'Otros';
}


function loadStatsView() {
    loadPersonalRecords();

    // Calculate Analytics
    const analytics = calculateAnalytics();

    // Update Summary Header Cards
    const elWorkouts = document.getElementById('stat-workouts');
    const elVolume = document.getElementById('stat-volume');
    const elSets = document.getElementById('stat-sets');

    if (elWorkouts) elWorkouts.textContent = analytics.totalWorkouts || 0;
    if (elSets) elSets.textContent = analytics.totalSets || 0;
    if (elVolume) {
        let vol = analytics.totalVolume || 0;
        if (vol >= 1000) {
            elVolume.textContent = (vol / 1000).toFixed(1) + 'k';
        } else {
            elVolume.textContent = Math.round(vol);
        }
    }

    // Calculate Weekly Volume Radar (Last 7 Days)
    const radarData = calculateWeeklyVolumeRadar();

    // Render Widgets
    renderHeatmap(analytics.heatmap);
    renderMuscleChart(analytics.muscles);
    renderVolumeChart(analytics.volume);

    // Render Radar
    renderWeeklyVolumeRadar(radarData);
}

function calculateAnalytics() {
    const heatmap = {};
    const muscles = {};
    const volumeByWeek = {};

    let totalWorkouts = 0;
    let totalVolume = 0;
    let totalSetsGlobal = 0;

    // Helper for ISO Week
    function getWeekKey(date) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 4 - (d.getDay() || 7));
        const yearStart = new Date(d.getFullYear(), 0, 1);
        const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        return `Sem ${weekNo}`;
    }

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('ironlog_') && !key.includes('username') && !key.includes('body_stats')) {
            const dateStr = key.replace('ironlog_', '');
            try {
                const raw = localStorage.getItem(key);
                const data = JSON.parse(raw);
                if (!Array.isArray(data) || data.length === 0) continue;

                // Heatmap Data (1 workout = level 1, +volume = level 2/3/4?)
                // Simple version: just count existence for now, or total volume based intensity
                let dailyVol = 0;
                let dailySets = 0;
                let hasValidWorkout = false;

                data.forEach(ex => {
                    if (ex.exercise && ex.exercise.trim() !== '') {
                        // Muscle Breakdown
                        const m = detectMuscle(ex.exercise);
                        const setsCount = ex.series ? ex.series.filter(s => s.type !== 'drop').length : 0;
                        if (setsCount > 0) {
                            muscles[m] = (muscles[m] || 0) + setsCount;
                            dailySets += setsCount;
                            hasValidWorkout = true;
                        }

                        // Volume
                        if (ex.series) {
                            ex.series.forEach(s => {
                                const vol = (parseFloat(s.kg) || 0) * (parseFloat(s.reps) || 0);
                                dailyVol += vol;
                                totalVolume += vol;
                            });
                        }
                    }
                });

                if (dailySets > 0) {
                    heatmap[dateStr] = Math.min(4, Math.ceil(dailySets / 5)); // 1-4 scale based on sets

                    const weekKey = getWeekKey(new Date(dateStr));
                    volumeByWeek[weekKey] = (volumeByWeek[weekKey] || 0) + dailyVol;
                }

                if (hasValidWorkout) {
                    totalWorkouts++;
                    totalSetsGlobal += dailySets;
                }

            } catch (e) { console.error(e); }
        }
    }

    return { heatmap, muscles, volume: volumeByWeek, totalWorkouts, totalVolume, totalSets: totalSetsGlobal };
}

function calculateWeeklyVolumeRadar() {
    const radar = {
        'Pecho': 0, 'Espalda': 0, 'Hombro': 0, 'Bíceps': 0, 'Tríceps': 0,
        'Cuádriceps': 0, 'Femoral': 0, 'Glúteo': 0, 'Gemelo': 0, 'Core': 0,
        'Aductores': 0
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calcular días desde el lunes (0 = domingo, 1 = lunes...)
    const currentDay = today.getDay();
    const daysSinceMonday = currentDay === 0 ? 6 : currentDay - 1;

    for (let i = 0; i <= daysSinceMonday; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const storageKey = getStorageKey(d);

        try {
            const raw = localStorage.getItem(storageKey);
            if (raw) {
                const data = JSON.parse(raw);
                if (Array.isArray(data)) {
                    data.forEach(ex => {
                        if (ex.exercise && ex.exercise.trim() !== '') {
                            const muscle = detectMuscle(ex.exercise);
                            if (radar[muscle] !== undefined) {
                                // Solo sumamos series válidas (tienen kg o reps)
                                let validSets = 0;
                                if (Array.isArray(ex.series)) {
                                    ex.series.forEach(s => {
                                        if ((s.kg !== '' || s.reps !== '') && s.type !== 'drop') {
                                            validSets++;
                                        }
                                    });
                                }
                                radar[muscle] += validSets;
                            }
                        }
                    });
                }
            }
        } catch (e) {
            console.error("Error leyendo volumen semanal:", e);
        }
    }
    return radar;
}

function getRadarTargets() {
    const defaultTargets = {
        'Pecho': 12, 'Espalda': 14, 'Hombro': 10, 'Bíceps': 8, 'Tríceps': 8,
        'Cuádriceps': 10, 'Femoral': 8, 'Glúteo': 6, 'Gemelo': 6, 'Core': 8,
        'Aductores': 4
    };
    try {
        const raw = localStorage.getItem('ironlog_volume_targets');
        if (raw) return JSON.parse(raw);
    } catch (e) {
        console.error("Error leyendo ironlog_volume_targets", e);
    }
    return defaultTargets;
}

const RADAR_PRESETS = {
    hipertrofia: {
        targets: { Pecho: 15, Espalda: 16, Hombro: 12, Bíceps: 10, Tríceps: 12, Cuádriceps: 14, Femoral: 12, Glúteo: 10, Gemelo: 10, Core: 10, Aductores: 6 },
        info: 'El volumen moderado-alto es el principal motor para la síntesis de nueva masa muscular.'
    },
    fuerza: {
        targets: { Pecho: 10, Espalda: 12, Hombro: 8, Bíceps: 6, Tríceps: 6, Cuádriceps: 10, Femoral: 8, Glúteo: 6, Gemelo: 6, Core: 8, Aductores: 4 },
        info: 'Menor volumen para permitir alta intensidad (cargas pesadas) sin saturar el sistema nervioso central.'
    },
    mantenimiento: {
        targets: { Pecho: 6, Espalda: 6, Hombro: 4, Bíceps: 4, Tríceps: 4, Cuádriceps: 6, Femoral: 4, Glúteo: 4, Gemelo: 4, Core: 4, Aductores: 2 },
        info: 'El volumen mínimo efectivo. Ideal para conservar masa y fuerza cuando hay poco tiempo.'
    }
};

function applyRadarPreset(presetKey) {
    const infoP = document.getElementById('volume-goal-info');
    if (presetKey === 'personalizado') {
        if (infoP) infoP.textContent = 'Selecciona un objetivo para autocompletar las series recomendadas por la ciencia.';
        return;
    }

    const preset = RADAR_PRESETS[presetKey];
    if (preset) {
        document.getElementById('radar-target-pecho').value = preset.targets.Pecho;
        document.getElementById('radar-target-espalda').value = preset.targets.Espalda;
        document.getElementById('radar-target-hombro').value = preset.targets.Hombro;
        document.getElementById('radar-target-biceps').value = preset.targets.Bíceps;
        document.getElementById('radar-target-triceps').value = preset.targets.Tríceps;
        document.getElementById('radar-target-cuadriceps').value = preset.targets.Cuádriceps;
        document.getElementById('radar-target-femoral').value = preset.targets.Femoral;
        document.getElementById('radar-target-gluteo').value = preset.targets.Glúteo;
        document.getElementById('radar-target-gemelo').value = preset.targets.Gemelo;
        document.getElementById('radar-target-core').value = preset.targets.Core;
        const targetAductores = document.getElementById('radar-target-aductores');
        if (targetAductores) targetAductores.value = preset.targets.Aductores;
        if (infoP) infoP.textContent = preset.info;
    }
}

function openRadarSettingsModal() {
    const modal = document.getElementById('radar-settings-modal');
    if (!modal) return;

    // Load current values into inputs
    const targets = getRadarTargets();
    document.getElementById('radar-target-pecho').value = targets['Pecho'] || 12;
    document.getElementById('radar-target-espalda').value = targets['Espalda'] || 14;
    document.getElementById('radar-target-hombro').value = targets['Hombro'] || 10;
    document.getElementById('radar-target-biceps').value = targets['Bíceps'] || 8;
    document.getElementById('radar-target-triceps').value = targets['Tríceps'] || 8;
    document.getElementById('radar-target-cuadriceps').value = targets['Cuádriceps'] || 10;
    document.getElementById('radar-target-femoral').value = targets['Femoral'] || 8;
    document.getElementById('radar-target-gluteo').value = targets['Glúteo'] || 6;
    document.getElementById('radar-target-gemelo').value = targets['Gemelo'] || 6;
    document.getElementById('radar-target-core').value = targets['Core'] || 8;
    const targetAductoresModal = document.getElementById('radar-target-aductores');
    if (targetAductoresModal) targetAductoresModal.value = targets['Aductores'] || 4;

    // Reset dropdown and info text manually
    const select = document.getElementById('volume-goal-select');
    if (select) select.value = 'personalizado';
    const infoP = document.getElementById('volume-goal-info');
    if (infoP) infoP.textContent = 'Selecciona un objetivo para autocompletar las series recomendadas por la ciencia.';

    modal.classList.remove('hidden');
}

function closeRadarSettingsModal() {
    const modal = document.getElementById('radar-settings-modal');
    if (modal) modal.classList.add('hidden');
}

function saveRadarTargets() {
    const targets = {
        'Pecho': parseInt(document.getElementById('radar-target-pecho').value) || 12,
        'Espalda': parseInt(document.getElementById('radar-target-espalda').value) || 14,
        'Hombro': parseInt(document.getElementById('radar-target-hombro').value) || 10,
        'Bíceps': parseInt(document.getElementById('radar-target-biceps').value) || 8,
        'Tríceps': parseInt(document.getElementById('radar-target-triceps').value) || 8,
        'Cuádriceps': parseInt(document.getElementById('radar-target-cuadriceps').value) || 10,
        'Femoral': parseInt(document.getElementById('radar-target-femoral').value) || 8,
        'Glúteo': parseInt(document.getElementById('radar-target-gluteo').value) || 6,
        'Gemelo': parseInt(document.getElementById('radar-target-gemelo').value) || 6,
        'Core': parseInt(document.getElementById('radar-target-core').value) || 8,
        'Aductores': document.getElementById('radar-target-aductores') ? (parseInt(document.getElementById('radar-target-aductores').value) || 4) : 4
    };

    const select = document.getElementById('volume-goal-select');
    if (select) {
        if (select.value && select.value !== 'personalizado') {
            const text = select.options[select.selectedIndex].text;
            localStorage.setItem('ironlog_volume_goal_name', text);
        } else {
            localStorage.setItem('ironlog_volume_goal_name', 'Personalizado');
        }
    }

    localStorage.setItem('ironlog_volume_targets', JSON.stringify(targets));
    closeRadarSettingsModal();
    loadStatsView(); // Refresh the chart
}

window.openRadarSettingsModal = openRadarSettingsModal;
window.closeRadarSettingsModal = closeRadarSettingsModal;
window.saveRadarTargets = saveRadarTargets;
window.applyRadarPreset = applyRadarPreset;

function renderWeeklyVolumeRadar(data) {
    const container = document.getElementById('radar-container');
    if (!container) return;

    container.innerHTML = '';

    // Actualizar Badge Visual
    const badge = document.getElementById('volume-goal-badge');
    if (badge) {
        const goalName = localStorage.getItem('ironlog_volume_goal_name');
        if (goalName) {
            badge.textContent = goalName;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }

    const targets = getRadarTargets();
    const muscles = ['Pecho', 'Espalda', 'Hombro', 'Bíceps', 'Tríceps', 'Cuádriceps', 'Femoral', 'Glúteo', 'Gemelo', 'Core', 'Aductores'];

    muscles.forEach(m => {
        const count = data[m] || 0;
        const maxSets = targets[m];

        let percentage = (count / maxSets) * 100;
        let displayPercentage = percentage > 100 ? 100 : percentage;

        let colorClass = 'radar-warning'; // Menos de 60% (azul/amarillo - Mantenimiento)
        if (percentage >= 60 && percentage <= 100) colorClass = 'radar-success'; // 60-100% (verde - Optimo)
        else if (percentage > 100) colorClass = 'radar-danger'; // >100% (rojo - Riesgo SR)

        const html = `
            <div class="volume-radar-item">
                <div class="radar-header">
                    <span class="radar-muscle">${m}</span>
                    <span class="radar-count">${count} / ${maxSets} series</span>
                </div>
                <div class="radar-bar-bg">
                    <div class="radar-bar-fill ${colorClass}" style="width: ${displayPercentage}%"></div>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', html);
    });
}

function renderHeatmap(data) {
    const container = document.getElementById('heatmap-container');
    if (!container) return;
    container.innerHTML = '';

    // Generate last 365 days (or approx 52 weeks)
    const today = new Date();
    // Start 52 weeks ago
    const startDate = new Date();
    startDate.setDate(today.getDate() - (52 * 7)); // roughly a year

    // Align to Sunday/Monday? Let's confirm logic. 
    // Usually heatmaps are columns (weeks) x rows (days 0-6).

    // Let's build simple grid: 52 columns, 7 rows.

    for (let w = 0; w < 52; w++) {
        const col = document.createElement('div');
        col.style.display = 'flex';
        col.style.flexDirection = 'column';
        col.style.gap = '4px';

        for (let d = 0; d < 7; d++) {
            const dayShift = (w * 7) + d;
            const currentDay = new Date(startDate);
            currentDay.setDate(startDate.getDate() + dayShift);

            // Fix Timezone discrepancy to match getStorageKey logic
            const offset = currentDay.getTimezoneOffset();
            const localDate = new Date(currentDay.getTime() - (offset * 60 * 1000));
            const dateStr = localDate.toISOString().split('T')[0];

            const intensity = data[dateStr] || 0;

            const cell = document.createElement('div');
            cell.style.width = '10px';
            cell.style.height = '10px';
            cell.style.borderRadius = '2px';
            cell.title = `${dateStr}: ${intensity > 0 ? 'Entreno Registrado' : 'Descanso'}`;

            // Color Scale
            let bg = 'rgba(255,255,255,0.05)';
            if (intensity === 1) bg = 'rgba(16, 185, 129, 0.3)';
            if (intensity === 2) bg = 'rgba(16, 185, 129, 0.5)';
            if (intensity === 3) bg = 'rgba(16, 185, 129, 0.8)';
            if (intensity >= 4) bg = '#10b981';

            cell.style.background = bg;
            col.appendChild(cell);
        }
        container.appendChild(col);
    }

    // Scroll to end
    const wrapper = document.querySelector('.heatmap-scroll-wrapper');
    if (wrapper) wrapper.scrollLeft = wrapper.scrollWidth;
}

let muscleChartInstance = null;
let volumeChartInstance = null;

function renderMuscleChart(data) {
    const ctxCanvas = document.getElementById('muscleChart');
    if (!ctxCanvas) return;
    const ctx = ctxCanvas.getContext('2d');

    if (muscleChartInstance) muscleChartInstance.destroy();

    const labels = Object.keys(data);
    const values = Object.values(data);

    // Colors
    const colors = ['#dc2626', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#64748b'];

    muscleChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors,
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: '#94a3b8', font: { size: 10 }, boxWidth: 10 }
                }
            },
            cutout: '70%'
        }
    });
}

function renderVolumeChart(data) {
    const ctxCanvas = document.getElementById('volumeChart');
    if (!ctxCanvas) return;
    const ctx = ctxCanvas.getContext('2d');

    if (volumeChartInstance) volumeChartInstance.destroy();

    // Sort weeks? They might be unsorted from Object keys
    // Since keys are "Sem X", maybe not sorted numerically.
    // Ideally use proper dates. For simplicity, we just take keys. 
    // NOTE: sorting keys "Sem 1", "Sem 10" is tricky.
    // Let's rely on simple Object.keys for now or better sorting if needed.

    const labels = Object.keys(data).sort((a, b) => {
        const nA = parseInt(a.replace('Sem ', ''));
        const nB = parseInt(b.replace('Sem ', ''));
        return nA - nB;
    });

    // Take only last 12 weeks to distinguish
    const recentLabels = labels.slice(-12);
    const recentValues = recentLabels.map(k => data[k]); // in tons?
    // Scale down to tons? e.g. 10000kg -> 10k

    volumeChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: recentLabels,
            datasets: [{
                label: 'Volumen (kg)',
                data: recentValues,
                backgroundColor: '#8b5cf6',
                borderRadius: 4,
                hoverBackgroundColor: '#a78bfa'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#64748b', font: { size: 9 } }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#64748b', font: { size: 9 } }
                }
            }
        }
    });
}

function loadPersonalRecords() {
    const list = document.getElementById('pr-list-container');
    if (!list) return;

    const history = getHistoryData();
    const records = [];

    // Find max weight for each exercise
    Object.keys(history).forEach(exName => {
        let maxWeight = 0;
        let dateStr = '';
        history[exName].forEach(entry => {
            if (entry.weight > maxWeight) {
                maxWeight = entry.weight;
                dateStr = entry.date;
            }
        });
        if (maxWeight > 0) {
            records.push({ name: exName, weight: maxWeight, date: dateStr });
        }
    });

    // Sort by weight (descending)
    records.sort((a, b) => b.weight - a.weight);

    list.innerHTML = '';
    if (records.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-dumbbell"></i>
                <p>Registra entrenamientos para ver tus récords aquí.</p>
            </div>`;
        return;
    }

    records.forEach(pr => {
        const dateObj = new Date(pr.date);
        const dateFmt = dateObj.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });

        const html = `
            <div class="pr-item">
                <div style="display:flex; align-items:center;">
                    <i class="fas fa-medal" style="color:#FFD700; margin-right:10px; font-size:0.9rem;"></i>
                    <span class="pr-name">${pr.name}</span>
                </div>
                <div>
                    <span class="pr-weight">${pr.weight} kg</span>
                    <span class="pr-date">${dateFmt}</span>
                </div>
            </div>
        `;
        list.insertAdjacentHTML('beforeend', html);
    });
}

function getHistoryData() {
    const history = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('ironlog_')) {
            const dateStr = key.replace('ironlog_', '');
            try {
                const raw = localStorage.getItem(key);
                if (!raw) continue;
                const dayData = JSON.parse(raw);

                if (Array.isArray(dayData)) {
                    dayData.forEach(slot => {
                        if (slot && slot.exercise && slot.exercise.trim() !== "") {
                            const name = slot.exercise.trim().toLowerCase();
                            let maxWeight = 0;
                            if (Array.isArray(slot.series)) {
                                slot.series.forEach(s => {
                                    const w = parseFloat(s.kg);
                                    if (w > maxWeight) maxWeight = w;
                                });
                            }
                            if (maxWeight > 0) {
                                if (!history[name]) history[name] = [];
                                history[name].push({ date: dateStr, weight: maxWeight });
                            }
                        }
                    });
                }
            } catch (e) { console.error("Error leyendo datos", e); }
        }
    }
    for (const ex in history) {
        history[ex].sort((a, b) => new Date(a.date) - new Date(b.date));
    }
    return history;
}

function updateChart(exerciseName) {
    if (!exerciseName) return;

    const history = getHistoryData();
    const dataPoints = history[exerciseName.toLowerCase()] || [];

    const labels = dataPoints.map(p => {
        const d = new Date(p.date);
        return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
    });

    const weights = dataPoints.map(p => p.weight);

    const ctxCanvas = document.getElementById('strengthChart');
    if (!ctxCanvas) return;
    const ctx = ctxCanvas.getContext('2d');

    if (strengthChartInstance) {
        strengthChartInstance.destroy();
    }

    // Gradient fill
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.5)'); // Blue
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');

    strengthChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: `Progreso: ${exerciseName.toUpperCase()}`,
                data: weights,
                borderColor: getComputedStyle(document.body).getPropertyValue('--accent-primary').trim() || '#dc2626',
                backgroundColor: gradient,
                borderWidth: 3,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#dc2626',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#1e293b',
                    titleColor: '#f8fafc',
                    bodyColor: '#f8fafc',
                    cornerRadius: 8,
                    displayColors: false
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: {
                        color: '#f1f5f9',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#64748b',
                        font: { size: 10, weight: 'bold' }
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: {
                        color: '#94a3b8',
                        font: { size: 10 }
                    }
                }
            }
        }
    });
}

// === LÓGICA DE BITÁCORA (NUEVO) ===
// === LÓGICA DE BITÁCORA (NUEVO) ===
function renderLogbook() {
    const listContainer = document.getElementById('logbook-list');
    if (!listContainer) {
        console.error("Logbook container not found!");
        return;
    }

    listContainer.innerHTML = '';

    // 1. Obtener todos los días con datos
    const allDays = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        // Filtrar claves válidas
        if (key.startsWith('ironlog_') && !key.includes('username') && !key.includes('body_stats')) {
            const dateStr = key.replace('ironlog_', '');
            try {
                const raw = localStorage.getItem(key);
                const data = JSON.parse(raw);
                if (Array.isArray(data) && data.length > 0) {
                    let hasContent = false;
                    let totalVol = 0;
                    let exercisesCount = 0;

                    data.forEach(ex => {
                        if (ex.exercise && ex.exercise.trim() !== '') {
                            hasContent = true;
                            exercisesCount++;
                            if (ex.series) {
                                ex.series.forEach(s => {
                                    totalVol += (parseFloat(s.kg) || 0) * (parseFloat(s.reps) || 0);
                                });
                            }
                        }
                    });

                    if (hasContent) {
                        allDays.push({
                            dateStr: dateStr,
                            dateObj: new Date(dateStr),
                            volume: totalVol,
                            count: exercisesCount
                        });
                    }
                }
            } catch (e) {
                console.error("Error parsing log for key:", key, e);
            }
        }
    }

    // 2. Ordenar por fecha (Descendente)
    allDays.sort((a, b) => b.dateObj - a.dateObj);

    if (allDays.length === 0) {
        listContainer.innerHTML = `
            <div class="log-card" style="justify-content: center; flex-direction: column; text-align: center; padding: 40px; cursor: default; border: 2px dashed var(--border-light); background: var(--bg-card);">
                <i class="fas fa-scroll" style="font-size: 2rem; color: var(--accent-primary); margin-bottom: 15px; opacity: 0.5;"></i>
                <h4 style="margin: 0; color: var(--text-primary); font-size: 1.1rem;">Bitácora vacía</h4>
                <p style="margin: 8px 0 0 0; font-size: 0.85rem; color: var(--text-muted); line-height: 1.5;">
                    Aún no has registrado ningún entrenamiento.<br>Tus batallas aparecerán aquí.
                </p>
            </div>
        `;
        return;
    }

    // 3. Renderizar Lista
    allDays.forEach(day => {
        let monthShort = '???';
        let dayNum = '?';
        let dayName = 'Fecha Desconocida';

        try {
            monthShort = day.dateObj.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase().replace('.', '');
            dayNum = day.dateObj.getDate();
            dayName = day.dateObj.toLocaleDateString('es-ES', { weekday: 'long' });
        } catch (e) { console.error(e); }

        const html = `
            <div class="log-card" onclick="openLogbookModal('${day.dateStr}')">
                <div class="log-calendar">
                    <span class="log-cal-month">${monthShort}</span>
                    <span class="log-cal-day">${dayNum}</span>
                </div>
                <div class="log-details">
                    <h4 class="log-title">${dayName}</h4>
                    <div class="log-stats-row">
                        <span class="log-stat">
                            <i class="fas fa-dumbbell"></i> ${day.count} Ejercicios
                        </span>
                        <span class="log-stat">
                            <i class="fas fa-weight-hanging"></i> ${day.volume.toLocaleString()} kg
                        </span>
                    </div>
                </div>
                <div class="log-action">
                    <i class="fas fa-chevron-right"></i>
                </div>
            </div>
        `;
        listContainer.insertAdjacentHTML('beforeend', html);
    });
}

function closeLogbookModal() {
    const modal = document.getElementById('logbook-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function openLogbookModal(dateStr) {
    const modal = document.getElementById('logbook-modal');
    const modalBody = document.getElementById('modal-body');
    const modalTitle = document.getElementById('modal-date-title');

    if (!modal || !modalBody) return;

    // 1. Get Data
    const key = 'ironlog_' + dateStr;
    const raw = localStorage.getItem(key);
    if (!raw) return;

    let data = [];
    try {
        data = JSON.parse(raw);
    } catch (e) { return; }

    // 2. Set Title
    const dateObj = new Date(dateStr);
    const dateTitle = dateObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    modalTitle.textContent = dateTitle.toUpperCase();

    // 3. Render Body
    modalBody.innerHTML = '';

    if (data.length === 0) {
        modalBody.innerHTML = '<p style="text-align:center; color: var(--text-muted);">No hay datos para este día.</p>';
        return;
    }

    data.forEach(ex => {
        if (!ex.exercise) return;

        // Build Sets HTML
        let setsHtml = '';
        if (ex.series && ex.series.length > 0) {
            ex.series.forEach((s, idx) => {
                setsHtml += `
                    <div class="modal-set-row">
                        <span class="modal-set-badge">Serie ${idx + 1}</span>
                        <span><strong>${s.kg}</strong> kg x <strong>${s.reps}</strong> reps</span>
                    </div>
                `;
            });
        }

        const html = `
            <div class="modal-exercise-item">
                <span class="modal-ex-name">${ex.exercise}</span>
                ${setsHtml}
            </div>
        `;
        modalBody.insertAdjacentHTML('beforeend', html);
    });

    // 4. Show Modal
    modal.classList.remove('hidden');
}

function loadHistoryDate(dateStr) {
    const targetDate = new Date(dateStr);

    // Calcular el inicio de esa semana
    currentWeekStart = getMonday(targetDate);

    // Calcular el índice del día (0-6)
    const day = targetDate.getDay();
    selectedDayIndex = day === 0 ? 6 : day - 1;

    // Actualizar UI
    renderWeekHeader();
    renderTabs(); // Tabs de días

    // Cambiar a pestaña de entrenamiento
    switchTab('training');

    // Renderizar el día específico
    selectDay(selectedDayIndex);
}

// === CALCULADORA 1RM ===

function calculate1RM() {
    const weight = parseFloat(document.getElementById('rm-weight').value);
    const reps = parseFloat(document.getElementById('rm-reps').value);
    const exercise = document.getElementById('rm-exercise').value.trim() || "TU EJERCICIO";

    const resultContainer = document.getElementById('rm-result-container');
    const resultValue = document.getElementById('rm-result-value');
    const resultName = document.getElementById('rm-result-name');

    if (!weight || !reps || isNaN(weight) || isNaN(reps)) {
        alert("Por favor introduce peso y repeticiones válidos.");
        return;
    }

    if (reps === 1) {
        // Si es 1 rep, ese es el RM
        var rm = weight;
    } else {
        // Fórmula Brzycki: Peso / (1.0278 - (0.0278 * Reps))
        // Nota: Brzycki suele ser menos precisa con muchas reps (más de 10-12), pero sirve de estimado standard.
        var rm = weight / (1.0278 - (0.0278 * reps));
    }

    // Redondear a 1 decimal
    rm = Math.round(rm * 10) / 10;

    // Actualizar UI
    if (resultValue && resultContainer) {
        resultValue.textContent = `${rm} KG`;
        if (resultName) resultName.textContent = exercise.toUpperCase();

        // Calcular porcentajes
        document.getElementById('rm-90').textContent = Math.round(rm * 0.9) + ' kg';
        document.getElementById('rm-80').textContent = Math.round(rm * 0.8) + ' kg';
        document.getElementById('rm-70').textContent = Math.round(rm * 0.7) + ' kg';

        resultContainer.classList.remove('hidden');

        // Mostrar botón de guardar (separado)
        const btnSave = document.getElementById('btn-save-rm');
        if (btnSave) btnSave.classList.remove('hidden');
    }
}

function saveCalculated1RM() {
    const resultValue = document.getElementById('rm-result-value').textContent;
    const exerciseName = document.getElementById('rm-result-name').textContent;
    const weightVal = parseFloat(resultValue);

    if (!weightVal || weightVal <= 0) return;

    if (!confirm(`¿Guardar ${weightVal} kg en ${exerciseName} como récord personal?`)) return;

    // Guardar como un log del día actual para que cuente como PR y en estadísticas
    const today = new Date(); // Usamos hoy
    const storageKey = getStorageKey(today);
    const dayData = getOrInitData(storageKey);

    // Creamos una entrada "ficticia" o real de 1 repetición con ese peso
    // Esto asegura que el sistema de PR lo detecte
    dayData.push({
        id: Date.now(),
        exercise: exerciseName === "TU EJERCICIO" ? "Sin Nombre" : exerciseName,
        series: [{ kg: weightVal, reps: 1, rpe: 10 }] // RPE 10 porque es 1RM
    });

    localStorage.setItem(storageKey, JSON.stringify(dayData));

    // Actualizar caché de estadísticas si es necesario
    loadStatsView();

    alert(`✅ Récord guardado. Aparecerá en tu Centro de Mando y Historial.`);
    renderRMHistory(); // Actualizar lista
}

function renderRMHistory() {
    const list = document.getElementById('rm-history-list');
    if (!list) return;

    const history = getHistoryData();
    const records = [];

    // Flatten history to simple list of maxes ordered by date
    Object.keys(history).forEach(exName => {
        history[exName].forEach(entry => {
            records.push({ name: exName, weight: entry.weight, date: entry.date });
        });
    });

    // Ordenar por fecha (más reciente primero)
    records.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Mostrar solo los últimos 5
    const recent = records.slice(0, 5);

    list.innerHTML = '';

    if (recent.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: var(--text-muted); font-size: 0.8rem;">No hay registros recientes.</p>';
        return;
    }

    recent.forEach(r => {
        const d = new Date(r.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
        const html = `
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border-light); font-size: 0.85rem;">
                <span style="font-weight: 600; color: var(--text-primary);">${r.name.toUpperCase()}</span>
                <span>
                    <strong style="color: #334155;">${r.weight} kg</strong>
                    <span style="color: var(--text-muted); font-size: 0.75rem; margin-left: 5px;">(${d})</span>
                </span>
            </div>
        `;
        list.insertAdjacentHTML('beforeend', html);
    });
}

// === SISTEMA DE SUPLEMENTACIÓN (DINÁMICO) ===

const SUPPLEMENT_DB = {
    creatine: { name: "Creatina Monohidrato", desc: "Mejora fuerza y recuperación entre series." },
    protein: { name: "Proteína de Suero", desc: "Fuente rápida de aminoácidos para músculo." },
    casein: { name: "Caseína Micelar", desc: "Proteína de absorción lenta (ideal para la noche)." },
    cyclodextrin: { name: "Ciclodextrina", desc: "Carbohidrato rápido intra-entreno sin digestión pesada." },
    caffeine: { name: "Cafeína Anhidra", desc: "Estimulante para energía y enfoque mental." },
    preworkout: { name: "Pre-Entreno", desc: "Mezcla de estimulantes y bombeo." },
    eaa: { name: "EAA / BCAA", desc: "Aminoácidos esenciales para prevenir catabolismo." },
    glutamine: { name: "Glutamina", desc: "Salud intestinal y recuperación post-esfuerzo." },
    citrulline: { name: "Citrulina Malato", desc: "Mejora el flujo sanguíneo y el bombeo." },
    beta_alanine: { name: "Beta-Alanina", desc: "Reduce la fatiga muscular (picores)." },
    electrolytes: { name: "Electrolitos", desc: "Hidratación óptima durante el ejercicio." },
    omega3: { name: "Omega-3", desc: "Antiinflamatorio y salud cardiovascular." },
    multivitamin: { name: "Multivitamínico", desc: "Cubre necesidades básicas de micronutrientes." },
    magnesium: { name: "Magnesio/ZMA", desc: "Ayuda a la relajación muscular y sueño." },
    zinc: { name: "Zinc", desc: "Soporte hormonal y sistema inmune." },
    ashwagandha: { name: "Ashwagandha", desc: "Adaptógeno para reducir estrés y cortisol." },
    melatonin: { name: "Melatonina", desc: "Hormona para regular el ciclo de sueño." },
    vitamin_d: { name: "Vitamina D3", desc: "Esencial para huesos y sistema inmune." }
};

function initSupplements() {
    renderSupplementsList();
}

function getActiveSupplements() {
    const json = localStorage.getItem('ironlog_active_supplements');
    return json ? JSON.parse(json) : [];
}

function getDailyChecks() {
    const today = new Date().toISOString().split('T')[0];
    const key = `ironlog_supplements_checks_${today}`;
    const json = localStorage.getItem(key);
    return json ? JSON.parse(json) : {};
}

function renderSupplementsList() {
    const listContainer = document.getElementById('user-supplements-list');
    if (!listContainer) return;

    listContainer.innerHTML = '';

    const activeSupps = getActiveSupplements();
    const dailyChecks = getDailyChecks();

    if (activeSupps.length === 0) {
        listContainer.innerHTML = '<div class="empty-log-msg" style="padding: 20px; color: var(--text-muted);">No has añadido ningún suplemento a tu pila aún. Selecciona uno arriba.</div>';
        return;
    }

    activeSupps.forEach(key => {
        const data = SUPPLEMENT_DB[key];
        if (!data) return; // Por si acaso

        const isChecked = dailyChecks[key] === true;

        const html = `
            <div class="supplement-item">
                <label class="supp-checkbox-wrapper" style="flex-grow: 1; display: flex; align-items: center; cursor: pointer;">
                    <input type="checkbox" onchange="toggleSupplement('${key}')" ${isChecked ? 'checked' : ''}>
                    <div class="supp-content">
                        <span class="supp-name">${data.name}</span>
                        <span class="supp-desc">${data.desc}</span>
                    </div>
                    <i class="fas fa-check-circle check-icon"></i>
                </label>
                <button class="remove-supp-btn" onclick="removeSupplement('${key}')" title="Eliminar de mi lista">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `;
        listContainer.insertAdjacentHTML('beforeend', html);
    });
}

function addSelectedSupplement() {
    const dropdown = document.getElementById('supp-dropdown');
    const selectedKey = dropdown.value;

    if (!selectedKey) {
        alert("Selecciona un suplemento de la lista.");
        return;
    }

    const activeSupps = getActiveSupplements();
    if (activeSupps.includes(selectedKey)) {
        alert("Ya tienes este suplemento en tu lista.");
        return;
    }

    activeSupps.push(selectedKey);
    localStorage.setItem('ironlog_active_supplements', JSON.stringify(activeSupps));

    renderSupplementsList();
}

function removeSupplement(key) {
    if (!confirm("¿Eliminar este suplemento de tu lista habitual?")) return;

    let activeSupps = getActiveSupplements();
    activeSupps = activeSupps.filter(k => k !== key);
    localStorage.setItem('ironlog_active_supplements', JSON.stringify(activeSupps));

    renderSupplementsList();
}

function toggleSupplement(key) {
    const today = new Date().toISOString().split('T')[0];
    const storageKey = `ironlog_supplements_checks_${today}`;

    let checks = getDailyChecks();

    // Si ya existe (true), lo borramos (false/unchecked)
    // Si no existe (undefined/false), lo creamos (true/checked)
    if (checks[key]) {
        delete checks[key];
    } else {
        checks[key] = true;
    }

    localStorage.setItem(storageKey, JSON.stringify(checks));

    // Actualizar visualmente
    renderSupplementsList();
}

// === SISTEMA DE RPG ===

function calculateRPGStats() {
    let totalVolume = 0;
    let workoutDays = 0;
    let maxVolDay = 0;

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('ironlog_')) {
            workoutDays++;
            let dailyVol = 0;
            try {
                const raw = localStorage.getItem(key);
                if (raw) {
                    const data = JSON.parse(raw);
                    if (Array.isArray(data)) {
                        data.forEach(ex => {
                            if (ex.series) {
                                ex.series.forEach(s => {
                                    dailyVol += (parseFloat(s.kg) || 0) * (parseFloat(s.reps) || 0);
                                });
                            }
                        });
                    }
                }
            } catch (e) { }
            totalVolume += dailyVol;
            if (dailyVol > maxVolDay) maxVolDay = dailyVol;
        }
    }
    return { xp: totalVolume, days: workoutDays, maxRecord: maxVolDay };
}

function updateProfileUI() {
    const stats = calculateRPGStats();
    const levels = [
        { name: "INICIADO", limit: 5000, color: "#94a3b8" },
        { name: "CONSTANTE", limit: 25000, color: "#64748b" },
        { name: "DEDICADO", limit: 100000, color: "#64748b" },
        { name: "AVANZADO", limit: 500000, color: "#dc2626" },
        { name: "PRO", limit: 999999999, color: "#FFD700" }
    ];

    let currentRank = levels[0];
    let nextRank = levels[1];

    for (let i = 0; i < levels.length; i++) {
        if (stats.xp < levels[i].limit) {
            currentRank = levels[i - 1] || levels[0];
            nextRank = levels[i];
            break;
        }
    }

    if (stats.xp >= levels[levels.length - 2].limit) {
        currentRank = levels[levels.length - 1];
        nextRank = { name: "ÉLITE ABSOLUTO", limit: stats.xp * 1.5 };
    }

    const prevLimit = currentRank.name === "INICIADO" ? 0 : levels[levels.indexOf(currentRank) - 1].limit;
    const range = nextRank.limit - prevLimit;
    const progress = stats.xp - prevLimit;
    const percent = Math.min(100, Math.max(0, (progress / range) * 100));

    const rankText = document.getElementById('profile-rank-text');
    const xpVal = document.getElementById('profile-xp-value');
    const xpBar = document.getElementById('profile-xp-bar');
    const nextMsg = document.getElementById('next-rank-msg');
    const totalW = document.getElementById('total-workouts');
    const maxV = document.getElementById('max-volume');

    if (rankText) rankText.textContent = `CONSTANCIA: ${currentRank.name}`;
    if (xpVal) xpVal.textContent = `${stats.xp.toLocaleString()} / ${nextRank.limit.toLocaleString()} PTS`;
    if (xpBar) xpBar.style.width = `${percent}%`;
    if (nextMsg) nextMsg.textContent = `Siguiente Nivel: ${nextRank.name}`;
    if (totalW) totalW.textContent = stats.days;
    if (maxV) maxV.textContent = `${stats.maxRecord.toLocaleString()}kg`;

    const sidebarXp = document.querySelector('.sidebar-xp-text');
    if (sidebarXp) sidebarXp.textContent = `${stats.xp.toLocaleString()} XP TOTAL`;
}

// === SISTEMA DE BIOMETRÍA ===

function saveBodyStats() {
    const stats = {
        neck: document.getElementById('bio-neck').value,
        chest: document.getElementById('bio-chest').value,
        biceps: document.getElementById('bio-biceps').value,
        waist: document.getElementById('bio-waist').value,
        thigh: document.getElementById('bio-thigh').value,
        weight: document.getElementById('bio-weight').value
    };
    localStorage.setItem('ironlog_body_stats', JSON.stringify(stats));

    // snapshot for history
    saveBiometricsSnapshot(stats);

    alert('✅ Medidas actualizadas correctamente');
    renderBiometricsChart(); // Update chart immediately
}

function saveBiometricsSnapshot(stats) {
    const history = JSON.parse(localStorage.getItem('ironlog_biometrics_history')) || [];
    const today = new Date().toISOString().split('T')[0];

    const newSnapshot = {
        date: today,
        ...stats
    };

    const existingIndex = history.findIndex(entry => entry.date === today);

    if (existingIndex !== -1) {
        history[existingIndex] = newSnapshot;
    } else {
        history.push(newSnapshot);
    }

    // Sort by date chronologically
    history.sort((a, b) => new Date(a.date) - new Date(b.date));

    localStorage.setItem('ironlog_biometrics_history', JSON.stringify(history));
}

function loadBodyStats() {
    const saved = localStorage.getItem('ironlog_body_stats');
    if (saved) {
        try {
            const stats = JSON.parse(saved);
            if (document.getElementById('bio-neck')) document.getElementById('bio-neck').value = stats.neck || '';
            if (document.getElementById('bio-chest')) document.getElementById('bio-chest').value = stats.chest || '';
            if (document.getElementById('bio-biceps')) document.getElementById('bio-biceps').value = stats.biceps || '';
            if (document.getElementById('bio-waist')) document.getElementById('bio-waist').value = stats.waist || '';
            if (document.getElementById('bio-thigh')) document.getElementById('bio-thigh').value = stats.thigh || '';
            if (document.getElementById('bio-weight')) document.getElementById('bio-weight').value = stats.weight || '';
        } catch (e) { }
    }
    renderBiometricsChart();
}

function renderBiometricsChart() {
    const history = JSON.parse(localStorage.getItem('ironlog_biometrics_history')) || [];
    const metricSelector = document.getElementById('biometrics-metric-selector');
    if (!metricSelector) return;

    const selectedMetric = metricSelector.value;
    const metricLabelMap = {
        weight: 'Peso (kg)',
        neck: 'Cuello (cm)',
        chest: 'Pecho (cm)',
        biceps: 'Bíceps (cm)',
        waist: 'Cintura (cm)',
        thigh: 'Muslo (cm)'
    };

    const labels = history.map(entry => {
        const d = new Date(entry.date + 'T00:00:00'); // Ensure local date
        return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
    });

    const dataPoints = history.map(entry => parseFloat(entry[selectedMetric]) || 0);

    const canvas = document.getElementById('biometricsChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (biometricsChartInstance) {
        biometricsChartInstance.destroy();
    }

    // Gradient fill - mimicking the strength chart
    const accentColor = getComputedStyle(document.body).getPropertyValue('--accent-primary').trim() || '#dc2626';
    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, accentColor.replace(')', ', 0.3)').replace('rgb', 'rgba'));
    gradient.addColorStop(1, accentColor.replace(')', ', 0.0)').replace('rgb', 'rgba'));

    biometricsChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: metricLabelMap[selectedMetric],
                data: dataPoints,
                borderColor: accentColor,
                backgroundColor: gradient,
                borderWidth: 3,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: accentColor,
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1e293b',
                    titleColor: '#f8fafc',
                    bodyColor: '#f8fafc',
                    cornerRadius: 8,
                    displayColors: false
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: { color: 'rgba(148, 163, 184, 0.1)', drawBorder: false },
                    ticks: {
                        color: '#64748b',
                        font: { size: 10, weight: 'bold' }
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: {
                        color: '#94a3b8',
                        font: { size: 10 }
                    }
                }
            }
        }
    });
}

// === MÓDULO DE AJUSTES ===

function loadUserName() {
    const name = localStorage.getItem('ironlog_username') || 'ATLETA';
    document.querySelectorAll('.sidebar-username, .hero-name').forEach(el => el.textContent = name);
    const welcomeName = document.querySelector('.dashboard-header-modern h2 span');
    if (welcomeName) welcomeName.textContent = name;
    const input = document.getElementById('user-name-input');
    if (input) input.value = name;
}

function saveUserName() {
    const input = document.getElementById('user-name-input');
    if (input && input.value.trim() !== "") {
        localStorage.setItem('ironlog_username', input.value.trim());
        loadUserName();
        alert("✅ Nombre de guerrero actualizado");
    }
}

function factoryReset() {
    if (confirm("⚠️ ¡ADVERTENCIA! ⚠️\n\nEsto borrará TODOS tus entrenamientos, récords y nivel.\n\n¿Estás seguro de que quieres empezar de cero?")) {
        localStorage.clear();
        location.reload();
    }
}

// === MÓDULO DE RUTINAS ===

function saveCurrentRoutine() {
    const name = prompt("Nombre para esta rutina (ej: Pecho y Tríceps):");
    if (!name) return;

    const targetDate = new Date(currentWeekStart);
    targetDate.setDate(currentWeekStart.getDate() + selectedDayIndex);
    const storageKey = getStorageKey(targetDate);

    const currentData = getOrInitData(storageKey);

    if (currentData.length === 0) {
        alert("⚠️ La rutina está vacía. Añade ejercicios antes de guardar.");
        return;
    }

    let savedRoutines = {};
    try {
        const raw = localStorage.getItem('ironlog_templates');
        if (raw) savedRoutines = JSON.parse(raw);
    } catch (e) { }

    // Overwrite check
    if (savedRoutines[name]) {
        if (!confirm(`⚠️ Ya existe una rutina guardada con el nombre "${name}".\n\n¿Deseas sobrescribirla con el entrenamiento actual?`)) {
            return;
        }
    }

    savedRoutines[name] = currentData;
    localStorage.setItem('ironlog_templates', JSON.stringify(savedRoutines));
    updateRoutinesDropdown();
    alert(`✅ Rutina "${name}" guardada con éxito.`);
}

// === MÓDULO VISUAL DE RUTINAS ===

function openLoadRoutineModal() {
    const modal = document.getElementById('load-routine-modal');
    if (!modal) return;

    renderRoutinesList();
    modal.classList.remove('hidden');
}

function closeLoadRoutineModal() {
    const modal = document.getElementById('load-routine-modal');
    if (modal) modal.classList.add('hidden');
}

function renderRoutinesList() {
    const container = document.getElementById('routine-list-container');
    if (!container) return;

    container.innerHTML = '';

    let savedRoutines = {};
    try {
        const raw = localStorage.getItem('ironlog_templates');
        if (raw) savedRoutines = JSON.parse(raw);
    } catch (e) { }

    const routineNames = Object.keys(savedRoutines);

    if (routineNames.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-muted); font-size: 0.9rem; margin-top: 20px;">No tienes rutinas guardadas aún.</p>';
        return;
    }

    routineNames.forEach(name => {
        const item = document.createElement('div');
        item.className = 'routine-list-item';

        // Count exercises to show in meta
        const exCount = savedRoutines[name].length || 0;

        item.innerHTML = `
            <div class="routine-details">
                <span class="routine-name">${name}</span>
                <span class="routine-meta">${exCount} ejercicios</span>
            </div>
            <div class="routine-actions">
                <button class="btn-load-routine" onclick="confirmLoadRoutine('${name.replace(/'/g, "\\'")}')" title="Cargar">
                    <i class="fas fa-download"></i> Cargar
                </button>
                <button class="btn-delete-routine" onclick="deleteRoutine('${name.replace(/'/g, "\\'")}')" title="Eliminar">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        container.appendChild(item);
    });
}

function confirmLoadRoutine(name) {
    let savedRoutines = {};
    try {
        const raw = localStorage.getItem('ironlog_templates');
        if (raw) savedRoutines = JSON.parse(raw);
    } catch (e) { }

    const templateData = savedRoutines[name];
    if (!templateData) return;

    if (!confirm(`⚠️ ¿Cargar "${name}" en el día de hoy?\nSe SOBREESCRIBIRÁ cualquier entrenamiento que ya tengas apuntado hoy.`)) return;

    const targetDate = new Date(currentWeekStart);
    targetDate.setDate(currentWeekStart.getDate() + selectedDayIndex);
    const storageKey = getStorageKey(targetDate);

    localStorage.setItem(storageKey, JSON.stringify(templateData));
    renderDailyView(targetDate);
    updateWeeklyStats();

    closeLoadRoutineModal();
    setTimeout(() => {
        alert(`✅ Rutina "${name}" cargada con éxito.`);
    }, 100);
}

function deleteRoutine(name) {
    if (!confirm(`⚠️ Estás a punto de ELIMINAR permanentemente la rutina "${name}".\n\n¿Estás seguro?`)) return;

    let savedRoutines = {};
    try {
        const raw = localStorage.getItem('ironlog_templates');
        if (raw) savedRoutines = JSON.parse(raw);
    } catch (e) { }

    delete savedRoutines[name];
    localStorage.setItem('ironlog_templates', JSON.stringify(savedRoutines));

    renderRoutinesList();
}

// Alias for backwards compatibility with saveCurrentRoutine
function updateRoutinesDropdown() {
    renderRoutinesList();
}

// === SISTEMA DE RESPALDO (BACKUP & RESTORE) ===

// 1. Exportar Datos (Guardar Partida)
function downloadBackup() {
    const backupData = {};

    // Recorremos todo el LocalStorage
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        // Solo guardamos las llaves de nuestra app
        if (key.startsWith('ironlog_')) {
            backupData[key] = localStorage.getItem(key);
        }
    }

    // Convertimos a texto JSON
    const dataStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    // Creamos un link invisible para forzar la descarga
    const a = document.createElement('a');
    a.href = url;
    a.download = `ironlog_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    alert("✅ Copia de seguridad descargada. Guárdala en un lugar seguro.");
}

// 2. Importar Datos (Cargar Partida)
function triggerImport() {
    // Simula clic en el input oculto
    document.getElementById('import-file-input').click();
}

function loadBackupFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = function (e) {
        try {
            const data = JSON.parse(e.target.result);

            // Advertencia de seguridad
            if (!confirm("⚠️ ESTO SOBREESCRIBIRÁ TUS DATOS ACTUALES.\n¿Estás seguro de cargar este respaldo?")) return;

            // Insertamos los datos nuevos
            Object.keys(data).forEach(key => {
                if (key.startsWith('ironlog_')) {
                    localStorage.setItem(key, data[key]);
                }
            });

            alert("🚀 ¡Datos restaurados con éxito! Recargando sistema...");
            location.reload(); // Recargar página para ver cambios

        } catch (error) {
            console.error(error);
            alert("❌ Error: El archivo de respaldo está corrupto o no es válido.");
        }
    };

    reader.readAsText(file);
}

/* ===========================================================
   MÓDULO DE NUTRICIÓN (CON MEMORIA V2.0)
   =========================================================== */

function calculateMacros() {
    // 1. Obtener valores
    const weight = parseFloat(document.getElementById('nutri-weight').value);
    const height = parseFloat(document.getElementById('nutri-height').value);
    const age = parseFloat(document.getElementById('nutri-age').value);
    const gender = document.getElementById('nutri-gender').value;
    const activity = parseFloat(document.getElementById('nutri-activity').value);
    const goal = document.getElementById('nutri-goal').value;

    if (!weight || !height || !age) {
        alert("⚠️ Por favor, rellena todos los datos.");
        return;
    }

    // 2. Cálculos (Mifflin-St Jeor)
    let bmr = (10 * weight) + (6.25 * height) - (5 * age);
    bmr += (gender === 'male') ? 5 : -161;

    let tdee = bmr * activity;
    let targetCalories = tdee;
    if (goal === 'lose') targetCalories -= 500;
    if (goal === 'gain') targetCalories += 300;
    if (goal === 'recomp') targetCalories -= 200;

    // Macros
    let proteinGrams = weight * 2.2;
    if (goal === 'recomp') proteinGrams = weight * 2.5; // Extra protein to prevent catabolism in a recomp deficit
    let fatGrams = weight * 0.9;
    let remainingCals = targetCalories - ((proteinGrams * 4) + (fatGrams * 9));
    if (remainingCals < 0) remainingCals = 0;
    let carbGrams = remainingCals / 4;

    // 3. Mostrar Resultados
    document.getElementById('result-calories').textContent = Math.round(targetCalories) + " kcal";
    document.getElementById('result-protein').textContent = Math.round(proteinGrams) + "g";
    document.getElementById('result-fats').textContent = Math.round(fatGrams) + "g";
    document.getElementById('result-carbs').textContent = Math.round(carbGrams) + "g";

    document.getElementById('nutri-results').classList.remove('hidden');
    document.getElementById('nutri-results').scrollIntoView({ behavior: 'smooth' });

    // 4. GUARDAR EN MEMORIA
    const nutriData = {
        weight, height, age, gender, activity, goal,
        results: {
            cals: Math.round(targetCalories),
            pro: Math.round(proteinGrams),
            fat: Math.round(fatGrams),
            carbs: Math.round(carbGrams)
        }
    };
    localStorage.setItem('ironlog_nutrition_data', JSON.stringify(nutriData));
}

// Función para cargar los datos al iniciar la app
function loadNutritionData() {
    const saved = localStorage.getItem('ironlog_nutrition_data');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            // Rellenar inputs
            if (document.getElementById('nutri-weight')) document.getElementById('nutri-weight').value = data.weight;
            if (document.getElementById('nutri-height')) document.getElementById('nutri-height').value = data.height;
            if (document.getElementById('nutri-age')) document.getElementById('nutri-age').value = data.age;
            if (document.getElementById('nutri-gender')) document.getElementById('nutri-gender').value = data.gender;
            if (document.getElementById('nutri-activity')) document.getElementById('nutri-activity').value = data.activity;
            if (document.getElementById('nutri-goal')) document.getElementById('nutri-goal').value = data.goal;

            // Mostrar resultados antiguos si existen
            if (data.results) {
                document.getElementById('result-calories').textContent = data.results.cals + " kcal";
                document.getElementById('result-protein').textContent = data.results.pro + "g";
                document.getElementById('result-fats').textContent = data.results.fat + "g";
                document.getElementById('result-carbs').textContent = data.results.carbs + "g";
                document.getElementById('nutri-results').classList.remove('hidden');
            }
        } catch (e) { console.error("Error cargando nutrición", e); }
    }
}

/* ===========================================================
   MÓDULO DE PASOS (PODÓMETRO RPG)
   =========================================================== */

function saveSteps() {
    const input = document.getElementById('input-steps');
    const steps = parseInt(input.value);

    if (isNaN(steps)) return;

    // Guardamos en memoria
    localStorage.setItem('ironlog_daily_steps', steps);

    // Actualizamos la barra visual
    updateStepsUI(steps);

    alert("👣 ¡Pasos registrados! Buen trabajo.");
}

function updateStepsUI(steps) {
    // Si no le pasamos pasos, intentamos leerlos de la memoria
    if (steps === undefined) {
        steps = parseInt(localStorage.getItem('ironlog_daily_steps')) || 0;
    }

    // Actualizamos el input por si acaso estaba vacío
    const input = document.getElementById('input-steps');
    if (input) input.value = steps > 0 ? steps : '';

    // Actualizamos textos y barra
    const display = document.getElementById('steps-display');
    const bar = document.getElementById('steps-bar');
    const goal = 10000;

    if (display) display.textContent = `${steps.toLocaleString()} / ${goal.toLocaleString()}`;

    // Calculamos porcentaje (máximo 100%)
    let percent = (steps / goal) * 100;
    if (percent > 100) percent = 100;

    if (bar) bar.style.width = `${percent}%`;
}

/* ===========================================================
   LÓGICA DEL CRONÓMETRO (VERSIÓN FINAL BLINDADA + CENTÉSIMAS)
   =========================================================== */

// Variables globales del cronómetro
var _swIntervalo = null;
var _swTiempoInicio = 0;
var _swTiempoAcumulado = 0;
var _swCorriendo = false;

// 1. MOSTRAR U OCULTAR EL WIDGET
// 1. MOSTRAR U OCULTAR EL WIDGET
function openStopwatchWidget() {
    var widget = document.getElementById('stopwatch-widget');
    if (widget) {
        widget.classList.remove('hidden');
        if (typeof toggleMenu === 'function' && sidebar && sidebar.classList.contains('active')) {
            toggleMenu();
        }
    }
}

function closeStopwatchWidget() {
    var widget = document.getElementById('stopwatch-widget');
    if (widget) {
        widget.classList.add('hidden');
        if (_swCorriendo) toggleStopwatch(); // Pausar si está corriendo
    }
}

// 2. PLAY / PAUSE
function toggleStopwatch() {
    var btn = document.getElementById('sw-play-pause');
    if (!btn) return;

    var icon = btn.querySelector('i');

    if (_swCorriendo) {
        // --- PAUSAR ---
        clearInterval(_swIntervalo);
        _swCorriendo = false;
        // Cambiar icono a Play
        if (icon) icon.className = 'fas fa-play';
        // Guardamos el tiempo recorrido hasta ahora
        _swTiempoAcumulado += Date.now() - _swTiempoInicio;
    } else {
        // --- CORRER (START) ---
        _swTiempoInicio = Date.now();
        _swIntervalo = setInterval(updateStopwatch, 10); // 10ms para ver centésimas
        _swCorriendo = true;
        // Cambiar icono a Pausa
        if (icon) icon.className = 'fas fa-pause';
    }
}

// 3. RESETEAR
function resetStopwatch() {
    clearInterval(_swIntervalo);
    _swTiempoAcumulado = 0;
    _swCorriendo = false;

    // Resetear Pantalla a 00:00:00.00
    var display = document.getElementById('stopwatch-display');
    if (display) display.innerHTML = '00:00:00<span class="stopwatch-ms">.00</span>';

    // Resetear Botón a Play
    var btn = document.getElementById('sw-play-pause');
    if (btn) {
        var icon = btn.querySelector('i');
        if (icon) icon.className = 'fas fa-play';
    }
}

// 4. ACTUALIZAR TIEMPO (CÁLCULO MATEMÁTICO)
function updateStopwatch() {
    // El tiempo total es: Lo que ya tenías acumulado + (Hora actual - Hora de inicio)
    var tiempoTotal = _swTiempoAcumulado + (Date.now() - _swTiempoInicio);

    var totalSeconds = Math.floor(tiempoTotal / 1000);
    var hrs = Math.floor(totalSeconds / 3600);
    var mins = Math.floor((totalSeconds % 3600) / 60);
    var secs = totalSeconds % 60;
    var ms = Math.floor((tiempoTotal % 1000) / 10); // Centésimas

    // Formatear con ceros (01:05:09)
    var hDisplay = hrs.toString().padStart(2, '0');
    var mDisplay = mins.toString().padStart(2, '0');
    var sDisplay = secs.toString().padStart(2, '0');
    var msDisplay = ms.toString().padStart(2, '0');

    // Pintar en pantalla
    var display = document.getElementById('stopwatch-display');
    if (display) {
        // Nota: He añadido una clase al span de milisegundos para que quede más pequeño si quieres
        display.innerHTML = `${hDisplay}:${mDisplay}:${sDisplay}<span style="font-size:0.7em; opacity:0.8">.${msDisplay}</span>`;
    }
}

// === GESTIÓN DE AVATAR DE USUARIO ===

function triggerAvatarUpload() {
    const input = document.getElementById('avatar-upload');
    if (input) input.click();
}

function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
        alert('Por favor selecciona un archivo de imagen válido.');
        return;
    }

    const reader = new FileReader();

    reader.onload = function (e) {
        const base64Image = e.target.result;

        // 1. Guardar en LocalStorage
        try {
            localStorage.setItem('userAvatar', base64Image);
            // 2. Actualizar UI inmediatamente
            updateAvatarUI(base64Image);
        } catch (error) {
            console.error("Error guardando imagen:", error);
            alert("La imagen es demasiado grande. Intenta con una más pequeña.");
        }
    };

    reader.readAsDataURL(file);
}

function loadUserAvatar() {
    const savedAvatar = localStorage.getItem('userAvatar');
    if (savedAvatar) {
        updateAvatarUI(savedAvatar);
    }
}

function updateAvatarUI(base64Image) {
    // Actualizar imagen del perfil grande
    const heroImg = document.getElementById('hero-avatar-img');
    if (heroImg) heroImg.src = base64Image;

    // Actualizar imagen pequeña del sidebar (header)
    const sidebarImg = document.querySelector('.header-avatar img');
    if (sidebarImg) sidebarImg.src = base64Image;

    // Actualizar imagen grande del sidebar (menú)
    const sidebarMenuImg = document.querySelector('.sidebar-avatar-img');
    if (sidebarMenuImg) sidebarMenuImg.src = base64Image;
}

// === INICIALIZACIÓN DE EVENTOS ===
document.addEventListener('DOMContentLoaded', () => {
    // Botón del Sidebar para abrir
    const btnOpen = document.getElementById('btn-open-stopwatch');
    if (btnOpen) btnOpen.addEventListener('click', openStopwatchWidget);

    // Botones del Widget
    const btnPlay = document.getElementById('sw-play-pause');
    if (btnPlay) btnPlay.addEventListener('click', toggleStopwatch);

    const btnReset = document.getElementById('sw-reset');
    if (btnReset) btnReset.addEventListener('click', resetStopwatch);

    const btnClose = document.getElementById('sw-close');
    if (btnClose) btnClose.addEventListener('click', closeStopwatchWidget);

    // Cargar avatar al inicio
    loadUserAvatar();
});

// === MENTAL BOOST FEATURE ===
const BOOST_QUOTES = [
    "El dolor de la disciplina es mejor que el del arrepentimiento.",
    "No esperes a tener ganas. Hazlo sin ganas.",
    "Tu yo del futuro te está suplicando que no renuncies hoy.",
    "La comodidad es una droga lenta. Mátala antes de que te mate.",
    "Si fuera fácil, todo el mundo estaría fuerte. Tú no eres todo el mundo.",
    "Cada repetición es un voto por la persona en la que te quieres convertir.",
    "Nadie va a venir a salvarte. Tienes que salvarte tú mismo.",
    "El cansancio es mental. Tu cuerpo puede más.",
    "No negocies contigo mismo. La decisión ya está tomada.",
    "Hazlo por las personas que te dijeron que no podrías.",
    "Un mal entreno es 100 veces mejor que quedarse en el sofá.",
    "Deja de llorar y empieza a sudar.",
    "El único día fácil fue ayer.",
    "La motivación es para aficionados. La disciplina es para profesionales.",
    "Sufre ahora y vive el resto de tu vida como un campeón.",
    "No te detengas cuando estés cansado. Detente cuando hayas terminado.",
    "Tu mente se rinde 10 pasos antes que tu cuerpo. Sigue caminando.",
    "El sudor es la grasa llorando. Hazla sufrir.",
    "Cierra la boca y mueve los hierros.",
    "Hoy duele, mañana transforma.",
    "Excusas o resultados. No puedes tener ambos.",
    "Cada día que fallas, tu rival te gana terreno.",
    "No eres lo que dices que harás. Eres lo que haces.",
    "El respeto se gana en el barro, no en la grada.",
    "Levantarse. Entrenar. Repetir. Sin excusas."
];

function triggerMentalBoost() {
    const randomIndex = Math.floor(Math.random() * BOOST_QUOTES.length);
    const quote = BOOST_QUOTES[randomIndex];

    // Target the NEW dedicated modal
    const modal = document.getElementById('mental-boost-modal');
    if (!modal) {
        console.error("Mental Boost Modal not found!");
        alert("MENTAL BOOST:\n\n" + quote);
        return;
    }

    const modalBody = document.getElementById('boost-body');
    if (modalBody) {
        modalBody.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
                <div style="
                    width: 60px; 
                    height: 60px; 
                    background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-hover) 100%);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 15px;
                    box-shadow: 0 0 20px var(--accent-light);
                    border: 3px solid var(--bg-card);
                ">
                    <i class="fas fa-bolt" style="font-size: 28px; color: white;"></i>
                </div>
                
                <h3 style="color: var(--accent-primary); margin: 0 0 10px 0; font-size: 1rem; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 800;">Mensaje del Mentor</h3>

                <p style="
                    font-size: 0.95rem; 
                    font-weight: 500; 
                    color: var(--text-primary); 
                    line-height: 1.6;
                    margin-bottom: 25px;
                    font-style: italic;
                    background: var(--bg-input);
                    padding: 15px;
                    border-radius: 12px;
                    border-left: 4px solid var(--accent-primary);
                    border: 1px solid var(--border-light);
                ">
                    "${quote}"
                </p>

                <button onclick="closeMentalBoostModal()" style="
                    background: var(--accent-primary); 
                    color: white; 
                    border: none; 
                    padding: 12px 35px; 
                    border-radius: 50px;
                    font-weight: 900;
                    font-size: 0.85rem;
                    cursor: pointer;
                    text-transform: uppercase;
                    box-shadow: 0 4px 15px var(--accent-light);
                    transition: all 0.2s;
                " onmousedown="this.style.transform='scale(0.95)'" onmouseup="this.style.transform='scale(1)'">
                    ENTENDIDO
                </button>
            </div>
        `;
    }

    // Force show with class manipulation
    modal.classList.remove('hidden');
}

function closeMentalBoostModal() {
    const modal = document.getElementById('mental-boost-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

/* ===========================================================
   PROTOCOLO R.A.M.P VISUAL Y EDUCATIVO (CALENTAMIENTO)
   =========================================================== */
const WARMUP_PROTOCOLS = {
    pecho_hombro: [
        { phase: 'R', title: 'ELEVAR (Raise)', desc: 'Cardio suave para irrigar el tren superior', sug: ['3 min Remo en máquina (ritmo moderado)', '3 min Elíptica (enfoque en brazos)', '3 min Assault Bike suave', 'Saltos de tijera (Jumping Jacks) - 2 min', 'Comba suave (muñecas) - 2 min'] },
        { phase: 'A', title: 'ACTIVAR (Activate)', desc: 'Pre-activación de estabilizadores y manguito rotador', sug: ['Face Pulls con banda o polea 2x15', 'Rotación externa con goma 2x15/lado', 'Y-T-W-L boca abajo en banco inclinado 2x10', 'Plancha con toques de hombro 2x20', 'Pájaros con mancuernas muy ligeras 2x15'] },
        { phase: 'M', title: 'MOVILIZAR (Mobilize)', desc: 'Apertura de la caja torácica y rango articular de hombro', sug: ['Dislocaciones de hombro con pica 2x10', 'Movilidad torácica en cuadrupedia (Thread the needle)', 'Estiramiento pectoral apoyado en pared', 'Giros de brazo amplios hacia adelante/atrás 2x10', 'Cat-Cow enfocando zona escapular 10 reps'] },
        { phase: 'P', title: 'POTENCIAR (Potentiate)', desc: 'Sistema nervioso listo para levantar pesado', sug: ['Press Banca solo con barra 2x15', 'Flexiones explosivas con palmada (apoyo rodillas si necesario) 2x5', 'Press Militar con mancuernas ligeras (rápidas) 1x10', 'Lanzamiento de balón medicinal al pecho 2x5', 'Aproximación inicial del primer ejercicio a 50% RM'] }
    ],
    espalda: [
        { phase: 'R', title: 'ELEVAR (Raise)', desc: 'Cardio global enfocado en cadena posterior', sug: ['4 min Remo en máquina (ritmo moderado)', '3 min Comba', '3 min Ski-Erg (si disponible)', 'Jumping Jacks progresivos 2 min'] },
        { phase: 'A', title: 'ACTIVAR (Activate)', desc: 'Activación dorsal, trapecio y core abdominal', sug: ['Retracciones escapulares colgado en barra 2x15', 'Pullover con banda elástica de pie 2x15', 'Hollow Hold (Plancha inversa isométrico) 3x20s', 'Superman Hold en el suelo 2x20s', 'Activación de dorsal unilateral con goma 2x15'] },
        { phase: 'M', title: 'MOVILIZAR (Mobilize)', desc: 'Extensión espinal y rotación torácica', sug: ['Rotaciones torácicas en cuadrupedia 2x10/lado', 'Deslizamiento escapular en pared (Wall Slides) 2x10', 'Cat-Cow transiciones suaves 15 reps', 'Estiramiento del dorsal colgado en barra 30s', 'Giros espinales tumbado 10 reps'] },
        { phase: 'P', title: 'POTENCIAR (Potentiate)', desc: 'Reclutamiento de unidades motoras para tirones', sug: ['Jalón al pecho agarre prono muy ligero (50%) 1x15', 'Dominadas con salto (controlando excéntrica) 1x5', 'Remo invertido en TRX súper rápido 1x8', 'Slam de balón medicinal al suelo 2x5', 'Aproximación progresiva a la carga de trabajo'] }
    ],
    pierna: [
        { phase: 'R', title: 'ELEVAR (Raise)', desc: 'Cardio de tren inferior articular', sug: ['5 min Bicicleta Estática (ritmo vivo)', '5 min Cinta caminando con inclinación máxima', '3 min Escaleras (Stairmaster)', '3 min Comba dinámica progresiva'] },
        { phase: 'A', title: 'ACTIVAR (Activate)', desc: 'Despertar el glúteo medio, mayor y core (Evitar Valgo)', sug: ['Puente de Glúteo a 1 pierna 2x15/lado', 'Monster Walks laterales con mini-band 2x20', 'Abducciones tumbado con goma 2x15', 'Plancha lateral corta (Activación oblícuos) 2x30s', 'Clamshells (Ostras) con goma 2x15'] },
        { phase: 'M', title: 'MOVILIZAR (Mobilize)', desc: 'Dorsiflexión de tobillo y apertura de cadera', sug: ['Zancadas dinámicas anchas (Spiderman Lunge) 2x10', 'Estiramiento Couch Stretch en pared (Cuádriceps) 1 min/lado', 'Movilidad de tobillo forzada en pared 2x15', 'Prying Goblet Squat (Posición profunda con kettlebell ligera) 30s', 'Cossack Squats dinámicas 2x6/lado'] },
        { phase: 'P', title: 'POTENCIAR (Potentiate)', desc: 'Salto vertical y velocidad para hipertrofia pura', sug: ['Sentadilla Libre o Copa profunda solo barra/peso corporal 2x15', 'Saltos al cajón bajos (Box Jumps controlados) 2x5', 'Kettlebell Swings rápidos 1x12', 'Serie de aproximación al 50% RM de sentadilla o prensa', 'Saltos verticales máximos desde el sitio 2x3'] }
    ],
    fullbody: [
        { phase: 'R', title: 'ELEVAR (Raise)', desc: 'Activación multijoint', sug: ['5 min Elíptica moviendo brazos vigorosamente', '5 min Remo completo', 'Circuito de saltos ligeros (Jacks, High Knees) 3 min'] },
        { phase: 'A', title: 'ACTIVAR (Activate)', desc: 'Integración Core-Brazos-Piernas', sug: ['Plancha frontal a plancha lateral transiciones 1 min', 'Bear Crawls (Caminar el Oso) 10 metros x2', 'Bird-Dog contracción cruzada 2x15/lado', 'Deadbug con pesa moderada 2x20', 'Puentes de glúteo marchando 2x20'] },
        { phase: 'M', title: 'MOVILIZAR (Mobilize)', desc: 'Rangos de movimiento extremos', sug: ['World\'s Greatest Stretch 5 reps muy lentas/lado', 'Sentadilla de gargola profunda estática 1 min', 'Pasos de gusano (Inchworms) con flexión 8 reps', 'Desplazamientos laterales tipo simio 10 metros', 'Giros de cuello y hombros 360 grados 2x10'] },
        { phase: 'P', title: 'POTENCIAR (Potentiate)', desc: 'Multijoint Neural Wakeup', sug: ['Burpees (sin tirarse al suelo, con salto al final) 2x6', 'Sentadilla Copa ligera + Press Militar (Thrusters) 1x15', 'Aproximaciones al primer ejercicio base de la tabla al 50%'] }
    ]
};

function selectWarmupPill(buttonElement) {
    // 1. Remove active class from all pills
    const pills = document.querySelectorAll('.warmup-pill');
    pills.forEach(pill => pill.classList.remove('active'));

    // 2. Add active class to clicked pill
    buttonElement.classList.add('active');

    // 3. Re-render the protocol based on new selection
    renderWarmupProtocol();
}

function renderWarmupProtocol() {
    const listContainer = document.getElementById('warmup-exercises-list');
    const activePill = document.querySelector('.warmup-pill.active');

    if (!listContainer || !activePill) return;

    const muscleGroup = activePill.getAttribute('data-muscle');
    const selectedProtocol = WARMUP_PROTOCOLS[muscleGroup];

    // Create the timeline container
    let finalHtml = `<div class="ramp-timeline-container"><div class="ramp-timeline-line"></div>`;

    if (selectedProtocol) {
        selectedProtocol.forEach((item, index) => {
            // Build the string of suggestions as a list of tags/bullets
            let suggestionsHtml = '';
            item.sug.forEach(ex => {
                // LIGHT THEME TAG STYLE
                suggestionsHtml += `<div style="background: var(--accent-light); padding: 5px 10px; border-radius: 6px; margin-bottom: 5px; font-size: 0.85rem; color: var(--text-secondary);"><i class="fas fa-caret-right" style="color: var(--accent-primary); margin-right: 5px;"></i> ${ex}</div>`;
            });

            // Map phases to specific icons
            let phaseIcon = '';
            switch (item.phase) {
                case 'R': phaseIcon = '<i class="fas fa-fire-alt"></i>'; break;
                case 'A': phaseIcon = '<i class="fas fa-bolt"></i>'; break;
                case 'M': phaseIcon = '<i class="fas fa-sync-alt"></i>'; break;
                case 'P': phaseIcon = '<i class="fas fa-dumbbell"></i>'; break;
                default: phaseIcon = item.phase;
            }

            // Calculate staggered animation delay for cascade effect
            const delay = index * 0.15; // 0s, 0.15s, 0.3s, 0.45s

            // Render Card with Light Theme elegance
            finalHtml += `
                <div class="ramp-card" style="animation-delay: ${delay}s;">
                    <div class="ramp-info">
                        <h3 class="ramp-title" style="font-size: 1.05rem; font-weight: 700;">
                            <span class="ramp-letter" style="background: var(--accent-light); color: var(--accent-primary); border-radius: 50%; box-shadow: none;">${phaseIcon}</span> 
                            ${item.title}
                        </h3>
                        <p class="ramp-desc" style="font-size: 0.85rem; margin-bottom: 12px; color: var(--text-secondary);">${item.desc}</p>
                        <div class="ramp-sug-list">
                            <span style="font-size: 0.7rem; color: var(--text-muted); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Opciones Recomendadas:</span>
                            ${suggestionsHtml}
                        </div>
                    </div>
                </div>
            `;
        });
    }

    finalHtml += `</div>`; // Close timeline container
    listContainer.innerHTML = finalHtml;
}

function completeWarmup() {
    // Already moved to the Training tab by HTML onclick directly over the button, but keeping function for semantic legacy or future use
    switchTab('training');
}

window.renderWarmupProtocol = renderWarmupProtocol;
window.completeWarmup = completeWarmup;

// === CUSTOM AUTOCOMPLETE LOGIC ===
const EXERCISE_DATABASE = [
    // PECHO
    "Press de Banca", "Press de Banca Inclinado", "Press Inclinado con Mancuernas",
    "Press de Banca con Mancuernas", "Aperturas con Mancuernas", "Aperturas en Polea (Cruces)",
    "Cruces en Polea Alta", "Cruces en Polea Baja", "Flexiones (Push-ups)", "Flexiones Lastradas",
    "Pec Deck (Máquina)", "Press Declinado", "Fondos en Paralelas (Pecho)",
    "Press de Pecho Plano en Máquina", "Press de Pecho Superior en Máquina",
    // ESPALDA
    "Dominadas Prone", "Dominadas Supinas (Chin-ups)", "Dominadas Lastradas", "Jalón al Pecho",
    "Jalón al Pecho Supino", "Jalón al Pecho Agarre Estrecho", "Jalón al Pecho con Triángulo", "Jalón Unilateral en Polea",
    "Remo con Barra", "Remo en T", "Remo Gironda (Polea Baja)", "Remo en Polea Baja Agarre Ancho", "Remo en Polea Baja Agarre Estrecho",
    "Remo en Polea Alta con Barra Larga", "Remo Unilateral en Polea Baja", "Remo Unilateral en Polea Alta",
    "Remo con Mancuerna", "Remo Unilateral", "Pullover en Polea", "Pullover con Mancuerna",
    "Peso Muerto Tradicional", "Remo en Máquina", "Seal Row en Máquina", "Seal Row con Mancuernas",
    // PIERNA
    "Sentadilla Libre", "Sentadilla en Máquina Smith", "Sentadilla Hack", "Sentadilla en Máquina Pendular", "Sentadilla en Máquina Pendular (Glúteo)",
    "Prensa de Piernas", "Extensión de Cuádriceps", "Curl Femoral Tumbado", "Curl Femoral Sentado",
    "Curl Femoral de Pie", "Peso Muerto Rumano (RDL)", "Hiperextensiones (Femoral)", "Zancadas (Lunges)", "Sentadilla Búlgara",
    "Elevación de Talones de Pie", "Elevación de Talones Sentado", "Sóleo en Máquina",
    "Hip Thrust", "Patada de Glúteo", "Abductores en Máquina (Externos)", "Aductores en Máquina (Internos)",
    // HOMBRO
    "Press Militar con Barra", "Press de Hombros con Mancuernas", "Elevaciones Laterales",
    "Elevaciones Laterales en Polea", "Elevaciones Frontales", "Pájaros (Elevaciones Posteriores)",
    "Press Arnold", "Face Pull", "Encogimientos (Shrugs)", "Press Militar en Máquina",
    // BRAZO (BICEPS / TRICEPS)
    "Curl de Bíceps con Barra", "Curl de Bíceps con Mancuernas", "Curl Martillo", "Curl Predicador",
    "Curl Araña (Spider Curl)", "Curl Inverso", "Extensión de Tríceps en Polea",
    "Tríceps Cuerda", "Press Francés", "Fondos en Paralelas (Tríceps)",
    "Extensión Tras Nuca (Copa)", "Patada de Trícep",
    "Extensión de Tríceps en Polea Alta",
    "Extensión de Tríceps en Polea Tras Nuca",
    // CORE
    "Plancha Abdominal (Plank)", "Plancha con Peso", "Crunch Abdominal", "Abdominales Lastrados",
    "Elevación de Piernas Colgado", "Elevación de Piernas Tumbado", "Rueda Abdominal (Ab Wheel)",
    "Russian Twists (Giros Rusos)"
];

let autocompleteTimeout;

function handleAutocomplete(inputElement, index, storageKey) {
    const listElement = document.getElementById(`autocomplete-list-${index}`);
    if (!listElement) return;

    const val = inputElement.value;

    // Always render options to simulate dropdown if input is focused
    renderAutocompleteList(val, listElement, inputElement, index, storageKey);
}

function renderAutocompleteList(query, listElement, inputElement, index, storageKey) {
    listElement.innerHTML = '';
    const lowerQuery = query.toLowerCase();

    // Filter matching exercises
    const matches = EXERCISE_DATABASE.filter(ex => ex.toLowerCase().includes(lowerQuery));

    if (matches.length === 0) {
        listElement.style.display = 'none';
        return;
    }

    matches.forEach(ex => {
        const item = document.createElement('div');
        item.className = 'autocomplete-item';

        // Highlight matching part
        if (query.trim() !== '') {
            const regex = new RegExp(`(${query})`, 'gi');
            item.innerHTML = ex.replace(regex, '<span class="autocomplete-match">$1</span>');
        } else {
            item.textContent = ex;
        }

        // On click, select the item
        item.onmousedown = function (e) {
            e.preventDefault(); // Prevent blur
            selectAutocompleteOption(ex, inputElement, index, storageKey);
            listElement.style.display = 'none';
        };

        listElement.appendChild(item);
    });

    listElement.style.display = 'block';
}

function selectAutocompleteOption(value, inputElement, index, storageKey) {
    inputElement.value = value;
    updateExerciseName(index, value, storageKey);
}

function hideAutocompleteDelayed(inputElement) {
    // Small delay to allow mousedown on item to fire first
    setTimeout(() => {
        const container = inputElement.closest('.autocomplete-container');
        if (container) {
            const list = container.querySelector('.autocomplete-list');
            if (list) list.style.display = 'none';
        }
    }, 150);
}

// === SISTEMA DE TEMAS (CLARO/OSCURO) ===
function initTheme() {
    const savedTheme = localStorage.getItem('ironlog_theme');
    const themeIcon = document.getElementById('theme-icon');

    if (savedTheme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        if (themeIcon) {
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
        }
    } else {
        document.body.removeAttribute('data-theme');
        if (themeIcon) {
            themeIcon.classList.remove('fa-sun');
            themeIcon.classList.add('fa-moon');
        }
    }
}

function toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme');
    const themeIcon = document.getElementById('theme-icon');
    const settingsToggle = document.getElementById('theme-toggle-switch');

    if (currentTheme === 'dark') {
        document.body.removeAttribute('data-theme');
        localStorage.setItem('ironlog_theme', 'light');
        if (themeIcon) {
            themeIcon.classList.remove('fa-sun');
            themeIcon.classList.add('fa-moon');
        }
        if (settingsToggle) settingsToggle.checked = false;
    } else {
        document.body.setAttribute('data-theme', 'dark');
        localStorage.setItem('ironlog_theme', 'dark');
        if (themeIcon) {
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
        }
        if (settingsToggle) settingsToggle.checked = true;
    }
}

function toggleThemeFromSettings() {
    toggleTheme();
}

function togglePerformanceMode() {
    const isFast = document.body.classList.toggle('fast-animations');
    localStorage.setItem('ironlog_performance', isFast ? 'on' : 'off');
}

function initSettings() {
    // Theme Switch
    const savedTheme = localStorage.getItem('ironlog_theme');
    const themeSwitch = document.getElementById('theme-toggle-switch');
    if (themeSwitch) {
        themeSwitch.checked = (savedTheme === 'dark');
    }

    // Performance Switch
    const performanceSaved = localStorage.getItem('ironlog_performance');
    const perfSwitch = document.getElementById('performance-mode-switch');
    if (performanceSaved === 'on') {
        document.body.classList.add('fast-animations');
        if (perfSwitch) perfSwitch.checked = true;
    } else {
        if (perfSwitch) perfSwitch.checked = false;
    }
}

// Inicializar ajustes interactivos
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initSettings();
});


// === SISTEMA DE MAESTRÍA DE CORE (GAMER) ===

const CORE_ROUTINES = [
    {
        name: 'Fundamento (Estabilidad Base)',
        exercises: [
            '3 series x 12 reps Bicho Muerto (Deadbug) - Control lumbar total',
            '3 series x 45s Plancha Frontal RKC (Tensión activa)',
            '3 series x 10 reps/lado Bird-Dog - Coordinación cruzada'
        ]
    },
    {
        name: 'Aspirante (Isometría Dinámica)',
        exercises: [
            '3 series x 30s Hollow Body Hold - Pegar lumbares al suelo',
            '3 series x 30s/lado Plancha Lateral Estricta',
            '3 series x 15 reps Crunch Invertido - Control excéntrico'
        ]
    },
    {
        name: 'Desafío (Anti-Rotación)',
        exercises: [
            '3 series x 12 reps Hanging Knee Raises (Rodillas al pecho)',
            '3 series x 12 reps/lado Pallof Press (Polea o Goma)',
            '3 series x 20 reps Plancha con toques de hombro (Sin oscilar)'
        ]
    },
    {
        name: 'Vanguardia (Tensión Mecánica)',
        exercises: [
            '3 series x 12 reps Woodchoppers en polea media',
            '3 series x 12 reps Elevación de piernas estiradas (Tumbado)',
            '3 series x 10 reps Plancha "Body Saw" (Serrat)'
        ]
    },
    {
        name: 'Veteranía (Anti-Extensión Alpha)',
        exercises: [
            '3 series x 10 reps Rueda Abdominal (Desde rodillas)',
            '3 series x 40m Paseo del Granjero Pesado (Estabilidad núcleo)',
            '3 series x 12 reps/lado Copenhagen Plank (Aductor/Core)'
        ]
    },
    {
        name: 'Élite (Funcionalidad Avanzada)',
        exercises: [
            '3 series x 10 reps Hanging Leg Raises (Piernas estiradas)',
            '3 series x 10 reps/lado Press Pallof + Paso Lateral',
            '3 series x 30m Paseo de Maleta (Suitcase Carry) - Anti-flexión'
        ]
    },
    {
        name: 'Maestría (Poder Explosivo)',
        exercises: [
            '3 series x 30s L-Sit Intro (Pies apoyados/Talones)',
            '3 series x 10 reps Pies a la Barra (Toes to Bar)',
            '3 series x 12 reps Rueda Abdominal (Rango extendido)'
        ]
    },
    {
        name: 'Excelencia (Control Extremo)',
        exercises: [
            '3 series x 5 reps Dragon Flag (Bajada lenta en 5s)',
            '3 series x 20s L-Sit Estricto en Paralelas',
            '3 series x 12 reps V-Ups con Med Ball o Disco'
        ]
    },
    {
        name: 'Leyenda (Fuerza Absoluta)',
        exercises: [
            '4 series x 10 reps Dragon Flag Completo (Estilo Bruce Lee)',
            '4 series x 12 reps Hanging Windshield Wipers (Parabrisas)',
            '3 series x 8 reps Toes to Bar Estrictos (Sin balanceo)'
        ]
    },
    {
        name: 'Dominio Gravitatorio (Cénit de Core)',
        exercises: [
            '4 series x 5 reps Rueda Abdominal (De pie)',
            '3 series x 10s Front Lever Hold (o Progresión avanzada)',
            '3 series x 10 reps Elevación de piernas colgado + Pausa arriba'
        ]
    }
];

function renderCoreMastery() {
    const grid = document.getElementById('core-levels-grid');
    if (!grid) return;

    const currentLevel = parseInt(localStorage.getItem('ironlog_core_level')) || 1;
    let html = '';

    CORE_ROUTINES.forEach((level, index) => {
        const levelNum = index + 1;
        const isLocked = levelNum > currentLevel;
        const isActive = levelNum === currentLevel;
        const isCompleted = levelNum < currentLevel;

        let statusClass = '';
        if (isLocked) statusClass = 'level-locked';
        if (isActive) statusClass = 'level-active';

        const exercisesHtml = level.exercises.map(ex => `
            <div class="core-ex-item">
                <i class="fas fa-check-circle"></i>
                <span class="core-ex-text">${ex}</span>
            </div>
        `).join('');

        let footerHtml = '';
        if (isActive) {
            footerHtml = `
                <button class="btn-core-dominate" onclick="unlockNextCoreLevel(${levelNum})">
                    <i class="fas fa-trophy"></i> RUTINA DOMINADA
                </button>
            `;
        } else if (isCompleted) {
            footerHtml = `
                <div style="text-align: center; color: #10b981; font-weight: bold; font-size: 0.9rem;">
                    <i class="fas fa-check-double level-completed-check"></i> DOMINADO
                </div>
            `;
        }

        html += `
            <div class="core-level-card ${statusClass}">
                <div class="core-level-header">
                    <span class="core-level-badge">Nivel ${levelNum}</span>
                    ${isLocked ? '<i class="fas fa-lock core-locked-icon"></i>' : ''}
                </div>
                <h3 class="core-level-title">${level.name}</h3>
                <div class="core-routine-list" style="margin-top: 15px;">
                    ${exercisesHtml}
                </div>
                ${footerHtml}
            </div>
        `;
    });

    grid.innerHTML = html;
}

function unlockNextCoreLevel(levelNum) {
    if (levelNum >= 10) {
        alert("🔱 ¡HAS ALCANZADO EL CÉNIT! Has logrado el Dominio Gravitatorio. Tu centro es ahora una fuerza inamovible.");
        return;
    }

    const nextLevel = levelNum + 1;
    localStorage.setItem('ironlog_core_level', nextLevel);

    // Alert with style
    alert(`🔥 ¡BRUTAL! Has dominado el Nivel ${levelNum}.\n\nHas desbloqueado la rutina de '${CORE_ROUTINES[nextLevel - 1].name}' (Nivel ${nextLevel}).`);

    renderCoreMastery();
}

// === TEXTOS LEGALES (RGPD / AVISO MÉDICO) ===
function openLegalModal(type) {
    const modal = document.getElementById('legal-modal');
    const title = document.getElementById('legal-modal-title');
    const body = document.getElementById('legal-modal-body');

    if (!modal || !title || !body) return;

    if (type === 'privacy') {
        title.innerHTML = '<i class="fas fa-user-shield"></i> POLÍTICA DE PRIVACIDAD';
        body.innerHTML = `
            <div style="color: var(--text-primary); font-size: 0.9rem; line-height: 1.6;">
                <h4 style="color: var(--accent-primary); margin-bottom: 10px; border-bottom: 1px solid var(--border-light); padding-bottom: 5px;">1. Protección de Datos (RGPD y LOPDGDD)</h4>
                <p style="margin-bottom: 15px;">En cumplimiento del Reglamento (UE) 2016/679 (RGPD) y la Ley Orgánica 3/2018 (LOPDGDD), le informamos que <strong>IRONLOG no recopila, almacena ni transmite datos personales a servidores externos</strong>.</p>
                
                <h4 style="color: var(--accent-primary); margin-bottom: 10px; border-bottom: 1px solid var(--border-light); padding-bottom: 5px;">2. Almacenamiento Local (Local Storage)</h4>
                <p style="margin-bottom: 15px;">Todos los datos generados por su uso de la aplicación (entrenamientos, pesos levantados, medidas biométricas, rutinas guardadas, y preferencias de configuración) se almacenan <strong>exclusivamente de forma local en su dispositivo</strong> mediante la tecnología <em>Local Storage</em> del navegador.</p>
                <p style="margin-bottom: 15px;">Usted tiene el control absoluto sobre estos datos. Puede eliminarlos en cualquier momento utilizando la opción "Borrar Todos los Datos" disponible en la sección <em>Ajustes -> Zona de Peligro</em>, o borrando los datos de navegación de su navegador web.</p>

                <h4 style="color: var(--accent-primary); margin-bottom: 10px; border-bottom: 1px solid var(--border-light); padding-bottom: 5px;">3. Servicios de Terceros e Inteligencia Artificial</h4>
                <p style="margin-bottom: 15px;">En el caso de utilizar funciones interactivas como el Chatbot de IA, las consultas de texto introducidas explícitamente por el usuario podrían ser procesadas por la API correspondiente (ej. Google Gemini) con el único fin de generar una respuesta. Ningún dato histórico de entrenamiento se envía automáticamente a terceros sin su interacción.</p>

                <h4 style="color: var(--accent-primary); margin-bottom: 10px; border-bottom: 1px solid var(--border-light); padding-bottom: 5px;">4. Exención de Responsabilidad Técnica</h4>
                <p style="margin-bottom: 15px;">Dado que los datos residen únicamente en su dispositivo, IRONLOG no puede recuperar su información en caso de que borre la caché de su navegador o pierda el dispositivo. Se recomienda el uso rutinario de la herramienta "Descargar Copia de Seguridad".</p>
            </div>
        `;
    } else if (type === 'terms') {
        title.innerHTML = '<i class="fas fa-file-contract"></i> TÉRMINOS Y CONDICIONES';
        body.innerHTML = `
            <div style="color: var(--text-primary); font-size: 0.9rem; line-height: 1.6;">
                <h4 style="color: #ef4444; margin-bottom: 10px; border-bottom: 1px solid var(--border-light); padding-bottom: 5px;"><i class="fas fa-exclamation-triangle"></i> Descargo de Responsabilidad Médica</h4>
                <p style="margin-bottom: 15px; font-weight: bold; color: var(--text-primary);">IRONLOG es exclusivamente una herramienta de registro y seguimiento informático. NO proporciona consejo médico ni sustituye a un profesional sanitario, fisioterapeuta, o entrenador personal cualificado.</p>
                <p style="margin-bottom: 15px;">El usuario asume todos los riesgos derivados de la actividad física. Las fórmulas de estimación (como el cálculo del 1RM) y los protocolos de calentamiento son meramente orientativos. Consulte siempre a un especialista antes de iniciar cualquier programa de entrenamiento intenso.</p>
                
                <h4 style="color: var(--accent-primary); margin-bottom: 10px; border-bottom: 1px solid var(--border-light); padding-bottom: 5px;">Aceptación de las Condiciones</h4>
                <p style="margin-bottom: 15px;">El uso de esta aplicación web implica la aceptación total de estos términos. La aplicación se proporciona "tal cual" (AS IS), sin garantía explícita o implícita de su idoneidad para un propósito particular.</p>

                <h4 style="color: var(--accent-primary); margin-bottom: 10px; border-bottom: 1px solid var(--border-light); padding-bottom: 5px;">Propiedad Intelectual</h4>
                <p style="margin-bottom: 15px;">El código fuente, diseño de interfaz, identidad gráfica ("IRONLOG"), y contenidos textuales originales ("Códex del Hierro") son propiedad intelectual de su creador. Queda prohibida su reproducción, distribución o uso con fines comerciales sin autorización previa y por escrito.</p>
                
                <h4 style="color: var(--accent-primary); margin-bottom: 10px; border-bottom: 1px solid var(--border-light); padding-bottom: 5px;">Desarrollo Continuo</h4>
                <p style="margin-bottom: 15px;">IRONLOG se encuentra en fase de desarrollo activo. Nos reservamos el derecho a modificar, suspender o descontinuar temporal o permanentemente cualquier característica de la aplicación sin previo aviso.</p>
            </div>
        `;
    }

    modal.classList.remove('hidden');
}

function closeLegalModal() {
    const modal = document.getElementById('legal-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// === INTEGRACIÓN GOOGLE FIT ===
function handleFitAuth() {
    // Nota: El ID de cliente es ficticio para demostración
    const CLIENT_ID = 'TU_CLIENT_ID_GOOGLE_AQUI';
    const SCOPES = 'https://www.googleapis.com/auth/fitness.activity.read https://www.googleapis.com/auth/fitness.body.read';

    if (CLIENT_ID === 'TU_CLIENT_ID_GOOGLE_AQUI') {
        alert("🔱 MODO DEMO: En una versión de producción, aquí se abriría el selector de Google para sincronizar tus pasos automáticamente.\n\nHe simulado la conexión para que veas cómo quedaría el Perfil.");
        const statusArea = document.getElementById('fit-status-area');
        const btn = document.getElementById('btn-connect-fit');
        if (statusArea) statusArea.classList.remove('hidden');
        if (btn) {
            btn.innerHTML = '<i class="fas fa-sync-alt"></i> ACTUALIZAR SALUD';
            btn.classList.replace('btn-premium-blue', 'btn-premium-gold');
        }
        return;
    }

    // Lógica real de OAuth (Redirección)
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${window.location.href}&response_type=token&scope=${SCOPES}`;
    window.location.href = authUrl;
}

/* ===========================================================
   CHATBOT DEMO (MOCK IA)
   =========================================================== */

function toggleChatbot() {
    const chatbotWindow = document.getElementById('chatbot-window');
    const isHidden = chatbotWindow.classList.contains('hidden');

    if (isHidden) {
        chatbotWindow.classList.remove('hidden');
        document.getElementById('chatbot-input').focus();
    } else {
        chatbotWindow.classList.add('hidden');
    }
}

function handleChatbotKeyPress(event) {
    if (event.key === 'Enter') {
        sendChatbotMessage();
    }
}

function sendChatbotMessage() {
    const input = document.getElementById('chatbot-input');
    const message = input.value.trim();
    if (!message) return;

    const messagesContainer = document.getElementById('chatbot-messages');

    // 1. Añadir mensaje de usuario
    const userMsg = document.createElement('div');
    userMsg.className = 'user-message';
    userMsg.textContent = message;
    messagesContainer.appendChild(userMsg);

    // Limpiar input
    input.value = '';

    // Auto scroll abajo
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // 2. Simular "Escribiendo..." y respuesta
    setTimeout(() => {
        const botMsg = document.createElement('div');
        botMsg.className = 'bot-message';

        // Simular respuestas "inteligentes" básicas
        let msgLower = message.toLowerCase();
        if (msgLower.includes('pecho') && msgLower.includes('ejercicio')) {
            botMsg.innerHTML = "Basado en tu nivel, te recomiendo empezar con <strong>Press de Banca Inclinado</strong> para enfatizar el haz clavicular, seguido de <strong>Cruces en Polea</strong>. ¡Mantén un RIR 1-2!";
        } else if (msgLower.includes('cansado') || msgLower.includes('fatiga')) {
            botMsg.innerHTML = "La fatiga es parte del proceso. Asegúrate de dormir 7-8h esta noche. ¿Has considerado que tal vez necesites una <strong>Semana de Descarga (Deload)</strong>? Revisa el Códex, Pestaña 'Gestión de Fatiga'.";
        } else if (msgLower.includes('hola')) {
            botMsg.innerHTML = "¡Hola Máquina! Listo para forjar hierro hoy. ¿Qué toca entrenar?";
        } else if (msgLower.includes('gracias')) {
            botMsg.innerHTML = "¡A ti! A mutar 🔥";
        } else {
            botMsg.innerHTML = "*(Fase Experimental)* IRONLOG IA está actualmente en desarrollo continuo. Próximamente dispondrás de un verdadero ecosistema inteligente capaz de adaptar tu planificación y resolver tus dudas de entrenamiento al instante.";
        }

        messagesContainer.appendChild(botMsg);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

    }, 1000 + Math.random() * 1000); // 1-2 segundos de delay
}
