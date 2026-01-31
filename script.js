/* ========================================= */
/* 1. CONFIGURATION & GLOBAL STATE           */
/* ========================================= */

const BASE_API = "https://renbotstream.onrender.com/stream/";
const AI_HANDLER_URL = "https://rensiteer.netlify.app/.netlify/functions/gemini-handler"; 

let appState = {
    view: 'home', classId: null, batchIdx: null, chapterIdx: null,
    tab: 'videos', batchTab: 'subjects', chapTab: 'chapters', searchTerm: ''
};

let DB = {}; 
let favSubjects = JSON.parse(localStorage.getItem('favSubjects')) || [];
let favChapters = JSON.parse(localStorage.getItem('favChapters')) || [];

const player = new Plyr('#player', {
    controls: ['play-large', 'rewind', 'play', 'fast-forward', 'progress', 'current-time', 'duration', 'mute', 'volume', 'settings', 'fullscreen'],
    seekTime: 10,
});

/* ========================================= */
/* 2. INITIALIZATION                         */
/* ========================================= */

window.onload = function() {
    const d11 = (typeof class11Data !== 'undefined') ? class11Data : [];
    const d12 = (typeof class12Data !== 'undefined') ? class12Data : [];
    const d13 = (typeof class13Data !== 'undefined') ? class13Data : [];
    
    DB = {
        '11': { name: 'Class 11th', batches: d11 },
        '12': { name: 'Class 12th', batches: d12 },
        '13': { name: 'Eduniti 2025', batches: d13 },
        'allen-11': { name: 'Allen Class 11th', batches: (typeof allenClass11Data !== 'undefined' ? allenClass11Data : []) },
        'allen-12': { name: 'Allen Class 12th', batches: (typeof allenClass12Data !== 'undefined' ? allenClass12Data : []) },
        'allen-more': { name: 'Allen More Videos', batches: (typeof allenMoreData !== 'undefined' ? allenMoreData : []) }
    };

    initTheme();
    initSearchListener();
    handleRouting();
    window.addEventListener('hashchange', handleRouting);
    setupPlayerModalControls(); 
    initKeepAlive();
};

/* ========================================= */
/* 3. RENDERERS (BATCHES & CHAPTERS)         */
/* ========================================= */

function renderBatches() {
    const main = document.getElementById('main-content');
    if (!appState.classId || !DB[appState.classId]) return;

    const currentClass = DB[appState.classId];
    document.getElementById('current-path').innerText = currentClass.name;

    let html = `
        <div class="batch-tabs" style="justify-content: center;">
            <button class="batch-tab ${appState.batchTab !== 'fav' ? 'active' : ''}" onclick="filterContent('all')">Total Subjects</button>
            <button class="batch-tab ${appState.batchTab === 'fav' ? 'active' : ''}" onclick="filterContent('fav')">Favorites ❤️</button>
        </div>
        <div id="batch-container" style="display:flex; flex-direction:column; gap:15px; margin-top:20px;">
    `;

    const batches = currentClass.batches || [];
    let filtered = batches.filter(b => b.batch_name.toLowerCase().includes(appState.searchTerm));

    if (appState.batchTab === 'fav') {
        filtered = filtered.filter(batch => {
            const originalIdx = batches.indexOf(batch);
            return favSubjects.includes(`${appState.classId}-${originalIdx}`);
        });
    }

    filtered.forEach(batch => {
        const originalIdx = batches.indexOf(batch);
        const stats = getBatchStats(batch); 
        const style = getSubjectIcon(batch.batch_name); 
        const cardId = `${appState.classId}-${originalIdx}`;
        const isFav = favSubjects.includes(cardId);

        html += `
            <div class="subject-card-list" onclick="updateURL('/class/${appState.classId}/batch/${originalIdx}')">
                <div class="sub-icon-box" style="color:${style.color}">${style.text || 'SUB'}</div>
                <div class="sub-info">
                    <div class="sub-title">${batch.batch_name}</div>
                    <div class="sub-meta">${stats.chapters} Chapters • ${stats.percent}% Done</div>
                </div>
                <div class="bookmark-btn ${isFav ? 'active' : ''}" onclick="toggleBookmark(event, '${cardId}', 'subject')">
                    <i class="${isFav ? 'ri-heart-fill' : 'ri-heart-line'}"></i>
                </div>
            </div>`;
    });
    main.innerHTML = html + `</div>`;
}

function renderChapters() {
    const main = document.getElementById('main-content');
    if (!appState.classId || appState.batchIdx === null) return;

    const batch = DB[appState.classId].batches[appState.batchIdx];
    document.getElementById('current-path').innerText = `${DB[appState.classId].name} > ${batch.batch_name}`;

    let html = `<div class="grid-layout" style="margin-top:20px;">`;
    const chapters = batch.chapters || [];

    chapters.forEach((chap, idx) => {
        const chapId = `${appState.classId}-${appState.batchIdx}-${idx}`; 
        const isFav = favChapters.includes(chapId);

        html += `
            <div class="card chapter-card" onclick="updateURL('/class/${appState.classId}/batch/${appState.batchIdx}/chapter/${idx}')">
                <div class="bookmark-btn ${isFav ? 'active' : ''}" onclick="toggleBookmark(event, '${chapId}', 'chapter')">
                    <i class="${isFav ? 'ri-heart-fill' : 'ri-heart-line'}"></i>
                </div>
                <div class="card-body">
                    <div class="chapter-tag">CH - ${String(idx+1).padStart(2, '0')}</div>
                    <div class="card-title">${chap.chapter_name}</div>
                </div>
            </div>`;
    });
    main.innerHTML = html + `</div>`;
}

/* ========================================= */
/* 4. BOOKMARK & FILTER LOGIC                */
/* ========================================= */

function toggleBookmark(event, id, type) {
    event.stopPropagation();
    const btn = event.currentTarget;
    
    let currentFavs = (type === 'subject') ? favSubjects : favChapters;
    let storageKey = (type === 'subject') ? 'favSubjects' : 'favChapters';

    const index = currentFavs.indexOf(id);
    if (index === -1) {
        currentFavs.push(id);
    } else {
        currentFavs.splice(index, 1);
    }

    localStorage.setItem(storageKey, JSON.stringify(currentFavs));
    
    const isFav = currentFavs.includes(id);
    btn.classList.toggle('active', isFav);
    btn.innerHTML = `<i class="${isFav ? 'ri-heart-fill' : 'ri-heart-line'}"></i>`;
}

function filterContent(type) {
    appState.batchTab = type; 
    renderBatches();
}

/* ========================================= */
/* 5. SWITCH TABS & ROUTING                  */
/* ========================================= */

function switchBatchTab(tab) { appState.batchTab = tab; renderBatches(); }
function switchChapterTab(tab) { appState.chapTab = tab; renderChapters(); }

function handleRouting() {
    const hash = window.location.hash.slice(1); 
    const parts = hash.split('/'); 
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
    document.getElementById('video-player-modal').classList.add('hidden'); 
    document.getElementById('nav-controls').classList.remove('hidden');

    if (hash === 'allen-menu') { renderAllenMenu(); return; }
    if (!hash || hash === '/') { renderHome(); return; }
    
    if (parts[1] === 'class' && !parts[3]) {
        appState.classId = parts[2];
        appState.view = 'batches';
        renderBatches();
    } else if (parts[1] === 'class' && parts[3] === 'batch' && !parts[5]) {
        appState.classId = parts[2];
        appState.batchIdx = parseInt(parts[4]);
        appState.view = 'chapters';
        renderChapters();
    } else if (parts[1] === 'class' && parts[3] === 'batch' && parts[5] === 'chapter') {
        appState.classId = parts[2];
        appState.batchIdx = parseInt(parts[4]);
        appState.chapterIdx = parseInt(parts[6]);
        appState.view = 'player';
        renderPlayerView();
    }
}

/* ========================================= */
/* 6. ADDITIONAL HELPERS (Stats, Theme, etc) */
/* ========================================= */

function getBatchStats(batch) {
    let totalLectures = 0, completedCount = 0;
    const completedList = getCompletedLectures();
    if (batch.chapters) {
        batch.chapters.forEach(chap => {
            if (chap.lectures) {
                totalLectures += chap.lectures.length;
                chap.lectures.forEach(l => {
                    if(l.video_id && completedList.includes(l.video_id.toString())) completedCount++;
                });
            }
        });
    }
    return { 
        chapters: batch.chapters ? batch.chapters.length : 0, 
        percent: totalLectures > 0 ? Math.round((completedCount / totalLectures) * 100) : 0 
    };
}

function initTheme() {
    const btn = document.getElementById('theme-toggle');
    btn.onclick = () => {
        const isDark = !document.body.hasAttribute('data-theme');
        if(isDark) document.body.setAttribute('data-theme', 'light');
        else document.body.removeAttribute('data-theme');
    };
}

function initSearchListener() {
    document.getElementById('global-search').addEventListener('input', (e) => {
        appState.searchTerm = e.target.value.toLowerCase().trim();
        if (appState.view === 'batches') renderBatches();
        else if (appState.view === 'chapters') renderChapters();
    });
}
