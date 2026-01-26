/* ========================================= */
/* 1. CONFIGURATION & GLOBAL STATE           */
/* ========================================= */

const BASE_API = "https://renbotstream.onrender.com/stream/";
const AI_HANDLER_URL = "https://rensiteer.netlify.app/.netlify/functions/gemini-handler"; 

let appState = {
    view: 'home',        
    classId: null,       
    batchIdx: null,      
    chapterIdx: null,
    tab: 'videos',          
    batchTab: 'subjects',    
    chapTab: 'chapters',    
    searchTerm: ''
};

let DB = {}; 

// Plyr Setup with 10s Skip
const player = new Plyr('#player', {
    controls: ['play-large', 'rewind', 'play', 'fast-forward', 'progress', 'current-time', 'duration', 'mute', 'volume', 'settings', 'fullscreen'],
    seekTime: 10,
});

// Force Landscape on Mobile
player.on('enterfullscreen', event => {
    try {
        if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('landscape').catch((e) => console.log("Orientation lock not supported/allowed"));
        }
    } catch (err) {
        console.log("Landscape mode error:", err);
    }
});

let currentVideoId = null;

player.on('timeupdate', () => {
    if (currentVideoId) {
        saveWatchTime(currentVideoId, player.currentTime);
    }
});


/* ========================================= */
/* 2. INITIALIZATION & DATA LOADING          */
/* ========================================= */



function shareLecture(vidId) {
    const t = Math.floor(player.currentTime || 0);
    const url = `${location.origin}${location.pathname}#${location.hash}?t=${t}`;
    navigator.clipboard.writeText(url);
    alert("Link copied with timestamp!");
}


function saveDailyTime(seconds) {
    const today = new Date().toISOString().slice(0,10);
    const data = JSON.parse(localStorage.getItem('daily_progress')) || {};
    data[today] = (data[today] || 0) + seconds;
    localStorage.setItem('daily_progress', JSON.stringify(data));
}


let lastTick = 0;

player.on('timeupdate', () => {
    if (player.currentTime - lastTick >= 10) {
        saveDailyTime(10);
        lastTick = player.currentTime;
    }
});


function getBookmarks() {
    return JSON.parse(localStorage.getItem('bookmarks')) || [];
}

function toggleBookmark(vidId) {
    let bm = getBookmarks();
    bm.includes(vidId) ? bm = bm.filter(v => v !== vidId) : bm.push(vidId);
    localStorage.setItem('bookmarks', JSON.stringify(bm));
}


function saveLastVideo(vidId) {
    localStorage.setItem('last_video', JSON.stringify({
        classId: appState.classId,
        batchIdx: appState.batchIdx,
        chapterIdx: appState.chapterIdx,
        videoId: vidId
    }));
}

function getLastVideo() {
    return JSON.parse(localStorage.getItem('last_video'));
}


function getWatchKey(vidId) {
    return `watch_${appState.classId}_${appState.batchIdx}_${appState.chapterIdx}_${vidId}`;
}

function saveWatchTime(vidId, time) {
    localStorage.setItem(getWatchKey(vidId), time);
}

function getWatchTime(vidId) {
    return parseFloat(localStorage.getItem(getWatchKey(vidId))) || 0;
}


if (player) {
    player.stop();
    player.source = { type: 'video', sources: [] };
}


function setupPlayerModalControls() {
    const notesBtn = document.getElementById('vp-menu-btn');
    const closeSidebarBtn = document.getElementById('close-sidebar');
    const sidebar = document.getElementById('vp-sidebar');
    
    if (notesBtn && sidebar) {
        notesBtn.onclick = () => sidebar.classList.toggle('sidebar-open');
    }
    if (closeSidebarBtn && sidebar) {
        closeSidebarBtn.onclick = () => sidebar.classList.remove('sidebar-open');
    }
}

function initKeepAlive() {
    const interval = 300000; 
    const sendPing = () => {
        fetch(BASE_API + 'ping', { method: 'HEAD', mode: 'no-cors' })
            .then(() => console.log('Keep-Alive: Server pinged.'))
            .catch((error) => console.error('Keep-Alive: Failed', error));
    };
    sendPing(); 
    setInterval(sendPing, interval);
}

window.onload = function() {
    if(typeof particlesJS !== 'undefined') {
        particlesJS("particles-js", {"particles":{"number":{"value":40,"density":{"enable":true,"value_area":800}},"color":{"value":"#ffffff"},"opacity":{"value":0.1},"line_linked":{"enable":true,"distance":150,"color":"#ffffff","opacity":0.1}}});
    }

    // Load Data safely
    const d11 = (typeof class11Data !== 'undefined') ? class11Data : ((typeof batch11 !== 'undefined') ? batch11 : (typeof dataClass11 !== 'undefined' ? dataClass11 : []));
    const d12 = (typeof class12Data !== 'undefined') ? class12Data : ((typeof batch12 !== 'undefined') ? batch12 : (typeof dataClass12 !== 'undefined' ? dataClass12 : []));
    const d13 = (typeof class13Data !== 'undefined') ? class13Data : ((typeof batch13 !== 'undefined') ? batch13 : (typeof dataClass13 !== 'undefined' ? dataClass13 : []));
    
    // Allen Data Loading
    const allen11 = (typeof allenClass11Data !== 'undefined') ? allenClass11Data : [];
    const allen12 = (typeof allenClass12Data !== 'undefined') ? allenClass12Data : [];
    const allenMore = (typeof allenMoreData !== 'undefined') ? allenMoreData : [];

    DB = {
        '11': { name: 'Class 11th', batches: d11 },
        '12': { name: 'Class 12th', batches: d12 },
        '13': { name: 'Eduniti 2025', batches: d13 },
        
        // Allen Batches (Subjects handle honge renderBatches mein)
        'allen-11': { name: 'Allen Class 11th', batches: allen11 },
        'allen-12': { name: 'Allen Class 12th', batches: allen12 },
        'allen-more': { name: 'Allen More Videos', batches: allenMore }
    };

    console.log("Database Loaded:", DB);
    
    initTheme();
    initSearchListener();
    handleRouting();
    window.addEventListener('hashchange', handleRouting);
    setupPlayerModalControls(); 
    setTimeout(initDoubtSolver, 500);
    initKeepAlive();
};

/* ========================================= */
/* 3. HELPERS                                */
/* ========================================= */

function getCompletedLectures() {
    const data = localStorage.getItem('completed_lectures');
    return data ? JSON.parse(data) : [];
}

function toggleLectureComplete(lecId) {
    if(!lecId) return;
    let completed = getCompletedLectures();
    if(completed.includes(lecId)) {
        completed = completed.filter(id => id !== lecId);
    } else {
        completed.push(lecId);
    }
    localStorage.setItem('completed_lectures', JSON.stringify(completed));
    if(appState.view === 'player') {
        const batch = DB[appState.classId].batches[appState.batchIdx];
        const chapter = batch.chapters[appState.chapterIdx];
        renderResources(chapter);
    }
}

function getBatchStats(batch) {
    let totalLectures = 0;
    let completedCount = 0;
    const completedList = getCompletedLectures();

    if (batch.chapters) {
        batch.chapters.forEach(chap => {
            if (chap.lectures) {
                totalLectures += chap.lectures.length;
                chap.lectures.forEach(l => {
                    if(l.video_id && completedList.includes(l.video_id.toString())) {
                        completedCount++;
                    }
                });
            }
        });
    }
    const percent = totalLectures > 0 ? Math.round((completedCount / totalLectures) * 100) : 0;
    return { 
        chapters: batch.chapters ? batch.chapters.length : 0, 
        lectures: totalLectures, 
        completed: completedCount,
        percent: percent 
    };
}

function getSubjectIcon(name) {
    name = name.toLowerCase();
    // Allen specific colors
    if(name.includes('physics')) return { text: 'PHY', color: '#3b82f6', bg: '#fff' }; // Blue
    if(name.includes('physical')) return { text: 'PC', color: '#f59e0b', bg: '#fff' }; // Yellow
    if(name.includes('botany')) return { text: 'BOT', color: '#10b981', bg: '#fff' }; // Green
    if(name.includes('zoology')) return { text: 'ZOO', color: '#8b5cf6', bg: '#fff' }; // Purple
    if(name.includes('ORGANIC')) return { text: 'OC', color: '#10b981', bg: '#fff' }; // Green
    if(name.includes('INORGANIC')) return { text: 'IOC', color: '#8b5cf6', bg: '#fff' }; // Purple
    
    // Existing logic
    if(name.includes('skm sir')) return { text: 'SKM', color: '#a855f7', bg: '#fff' };
    if(name.includes('vj sir')) return { text: 'VJ', color: '#a855f7', bg: '#fff' };
    if(name.includes('beast')) return { text: 'BG', color: '#a855f7', bg: '#fff' };
    if(name.includes('jp sir')) return { text: 'JP', color: '#3b82f6', bg: '#fff' };
    if(name.includes('(NS sir)')) return { text: 'NS', color: '#3b82f6', bg: '#fff' };
    if(name.includes('gb sir')) return { text: 'GB', color: '#f59e0b', bg: '#fff' };
    if(name.includes('BIOLOGY sir')) return { text: 'BIO', color: '#f59e0b', bg: '#fff' };
    if(name.includes('akk sir')) return { text: 'AKK', color: '#a855f7', bg: '#fff' };
    if(name.includes('vg sir')) return { text: 'VG', color: '#f59e0b', bg: '#fff' };
    if(name.includes('ms')) return { text: 'MS', color: '#f59e0b', bg: '#fff' };
    if(name.includes('2025')) return { text: '2025', color: '#a855f7', bg: '#fff' };
    if(name.includes('2024')) return { text: '2024', color: '#a855f7', bg: '#fff' };
    return { text: 'OT', color: '#10b981', bg: '#fff' };
}

/* ========================================= */
/* 4. ROUTING                                */
/* ========================================= */

function stopAndResetPlayer() {
    try {
        if (player) {
    player.stop();
    player.source = { type: 'video', sources: [] };
}



        const videoEl = document.getElementById('active-player');
        if (videoEl) {
            videoEl.pause();
            videoEl.removeAttribute('src');
            videoEl.load();
        }
    } catch (e) {
        console.log("Player cleanup error:", e);
    }

    document.getElementById('video-player-modal').classList.add('hidden');
}

function updateURL(hash) { window.location.hash = hash; }

// ✅ BACK BUTTON LOGIC FOR ALLEN MENU
document.getElementById('back-btn').onclick = () => {

    // 1️⃣ Player open hai → close player
    if (appState.view === 'player') {
        stopAndResetPlayer();
        updateURL(`/class/${appState.classId}/batch/${appState.batchIdx}`);
        return;
    }

    // 2️⃣ Allen subjects ke andar ho → Allen menu
    if (appState.view === 'batches' && appState.classId && appState.classId.startsWith('allen-')) {
        updateURL('allen-menu');
        return;
    }

    // 3️⃣ Allen menu → Home
    if (appState.view === 'allen-menu') {
        updateURL('/');
        return;
    }

    // 4️⃣ Default → Home
    updateURL('/');
};

function handleRouting() {
    const hash = window.location.hash.slice(1); 
    const parts = hash.split('/'); 

    const sBox = document.getElementById('global-search');
    if(document.activeElement !== sBox) { sBox.value = ''; appState.searchTerm = ''; }
    
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
    document.getElementById('video-player-modal').classList.add('hidden'); 
    document.getElementById('nav-controls').classList.remove('hidden');

    // ✅ ALLEN MENU ROUTE
    if (hash === 'allen-menu') {
        renderAllenMenu(); 
        return;
    }

    if (!hash || hash === '/') {
        renderHome(); return;
    }
    if (parts[1] === 'class' && !parts[3]) {
        appState.classId = parts[2];
        appState.view = 'batches';
        appState.batchTab = 'subjects'; 
        renderBatches(); return;
    }
    if (parts[1] === 'class' && parts[3] === 'batch' && !parts[5]) {
        appState.classId = parts[2];
        appState.batchIdx = parseInt(parts[4]);
        appState.view = 'chapters';
        appState.chapTab = 'chapters'; 
        renderChapters(); return;
    }
    if (parts[1] === 'class' && parts[3] === 'batch' && parts[5] === 'chapter') {
        appState.classId = parts[2];
        appState.batchIdx = parseInt(parts[4]);
        appState.chapterIdx = parseInt(parts[6]);
        appState.view = 'player';
        renderPlayerView(); return;
    }
}

/* ========================================= */
/* 5. SEARCH LOGIC                           */
/* ========================================= */

function initSearchListener() {
    const searchInput = document.getElementById('global-search');
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase().trim();
        appState.searchTerm = term;
        
        if (appState.view === 'home') {
            (term.length === 0) ? renderHome() : renderGlobalSearch(term);
        } else if (appState.view === 'batches') {
            renderBatches(); 
        } else if (appState.view === 'chapters') {
            renderChapters(); 
        } else if (appState.view === 'player') {
            const batch = DB[appState.classId].batches[appState.batchIdx];
            const chapter = batch.chapters[appState.chapterIdx];
            renderResources(chapter); 
        }
    });
}

function renderGlobalSearch(term) {
    const main = document.getElementById('main-content');
    let html = `<div class="grid-layout">`;
    let found = false;
    // Iterate all keys in DB
    Object.keys(DB).forEach(cId => {
        if(DB[cId]) {
            DB[cId].batches.forEach((b, idx) => {
                if (b.batch_name.toLowerCase().includes(term)) {
                    found = true;
                    html += createHomeBatchCard(b, cId, idx);
                }
            });
        }
    });
    html += `</div>`;
    main.innerHTML = found ? html : `<div class="empty-state"><i class="ri-search-2-line empty-icon"></i><p>No Batches Found</p></div>`;
}

function createHomeBatchCard(batch, classId, idx) {
    const design = getSubjectIcon(batch.batch_name);
    return `
        <div class="card" onclick="updateURL('/class/${classId}/batch/${idx}')">
            <div class="card-img" style="height:140px; background:linear-gradient(135deg, #1f2937 0%, #111827 100%); display:flex; flex-direction:column; align-items:center; justify-content:center; position:relative;">
                <span style="position:absolute; top:10px; right:10px; background:#333; color:white; padding:2px 8px; border-radius:4px; font-size:0.7rem; font-weight:bold;">${classId.toUpperCase()}</span>
                <div style="font-size:2.5rem; font-weight:800; color:${design.color};">${design.text}</div>
            </div>
            <div class="card-body">
                <div class="card-title" style="font-size:1.1rem;">${batch.batch_name}</div>
                <div class="card-meta"><span>Open Batch</span></div>
            </div>
        </div>
    `;
}

/* ========================================= */
/* 6. RENDERERS                              */
/* ========================================= */

function renderHome() {
    appState.view = 'home';
    document.getElementById('nav-controls').classList.add('hidden');
    const main = document.getElementById('main-content');
    const sBox = document.getElementById('global-search');
    if(sBox) { sBox.placeholder = "Search..."; sBox.disabled = false; sBox.value = ''; }

    main.innerHTML = `
        <div class="grid-layout" style="justify-content:center; margin-top:50px;">
            
            <div class="card class-card" onclick="updateURL('/class/11')">
                <div class="card-img" style="height:160px; background:#1e293b; display:flex; align-items:center; justify-content:center;">
                    <i class="ri-stack-line" style="font-size:4rem; color:#8b5cf6;"></i>
                </div>
                <div class="card-body"><div class="card-title">Class 11th</div></div>
            </div>
            <div class="card class-card" onclick="updateURL('/class/12')">
                <div class="card-img" style="height:160px; background:#1e293b; display:flex; align-items:center; justify-content:center;">
                    <i class="ri-graduation-cap-line" style="font-size:4rem; color:#22c55e;"></i>
                </div>
                <div class="card-body"><div class="card-title">Class 12th</div></div>
            </div>
            <div class="card class-card" onclick="updateURL('/class/13')">
                <div class="card-img" style="height:160px; background:#1e293b; display:flex; align-items:center; justify-content:center;">
                    <i class="ri-graduation-cap-line" style="font-size:4rem; color:#22c55e;"></i>
                </div>
                <div class="card-body"><div class="card-title">Other Batch</div></div>
            </div>

            <div class="card class-card" onclick="updateURL('allen-menu')" style="border: 2px solid #00ff88;">
                <div class="card-img" style="height:160px; background:linear-gradient(135deg, #11998e 0%, #38ef7d 100%); display:flex; flex-direction:column; align-items:center; justify-content:center;">
                     <h1 style="color:white; margin:0; letter-spacing:2px; font-weight:900; font-size:2.2rem;">ALLEN</h1>
                     <span style="color:#003300; background:white; padding:2px 8px; border-radius:4px; font-weight:bold; font-size:0.8rem; margin-top:5px;">NEET CLASSROOM</span>
                </div>
                <div class="card-body">
                    <div class="card-title">Enter Classroom</div>
                    <div class="card-meta">Select Class Inside</div>
                </div>
            </div>

        </div>
    `;
}

// ✅ NEW: Allen Menu Renderer
function renderAllenMenu() {
    appState.view = 'allen-menu';
    document.getElementById('current-path').innerText = "Allen Classroom";
    const main = document.getElementById('main-content');
    
    main.innerHTML = `
        <h2 style="text-align:center; margin-bottom:20px; color:#00ff88;">Select Your Class</h2>
        <div class="grid-layout" style="justify-content:center;">
            
            <div class="card class-card" onclick="updateURL('/class/allen-11')" style="border: 2px solid #00c6ff;">
                <div class="card-img" style="height:160px; background:linear-gradient(135deg, #00c6ff 0%, #0072ff 100%); display:flex; align-items:center; justify-content:center;">
                    <h1 style="color:white; font-size:3rem; font-weight:800;">11<span style="font-size:1.5rem;">TH</span></h1>
                </div>
                <div class="card-body"><div class="card-title">Class 11th NEET</div></div>
            </div>

            <div class="card class-card" onclick="updateURL('/class/allen-12')" style="border: 2px solid #00c6ff;">
                <div class="card-img" style="height:160px; background:linear-gradient(135deg, #00c6ff 0%, #0072ff 100%); display:flex; align-items:center; justify-content:center;">
                    <h1 style="color:white; font-size:3rem; font-weight:800;">12<span style="font-size:1.5rem;">TH</span></h1>
                </div>
                <div class="card-body"><div class="card-title">Class 12th NEET</div></div>
            </div>

            <div class="card class-card" onclick="updateURL('/class/allen-more')" style="border: 2px solid #ff0055;">
                <div class="card-img" style="height:160px; background:linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%); display:flex; align-items:center; justify-content:center;">
                    <i class="ri-movie-2-line" style="font-size:4rem; color:white;"></i>
                </div>
                <div class="card-body"><div class="card-title">Extra Videos</div></div>
            </div>
        </div>
    `;
}

function renderBatches() {
    const main = document.getElementById('main-content');
    if (!appState.classId || !DB[appState.classId]) {
        console.error("Class ID not found or DB not loaded");
        main.innerHTML = `<div class="empty-state"><p>Error loading data. Please go back.</p></div>`;
        return;
    }

    const currentClass = DB[appState.classId];
    document.getElementById('current-path').innerText = currentClass.name;
    document.getElementById('global-search').placeholder = `Search subjects...`;

    let html = `
        <div class="batch-tabs">
            <button class="batch-tab ${appState.batchTab === 'subjects' ? 'active' : ''}" onclick="switchBatchTab('subjects')">Subjects</button>
            <button class="batch-tab ${appState.batchTab === 'resources' ? 'active' : ''}" onclick="switchBatchTab('resources')">Resources</button>
        </div>
        <div id="batch-container">
    `;

    if (appState.batchTab === 'subjects') {
        const batches = currentClass.batches;
        const term = appState.searchTerm;
        const filtered = batches.filter(b => b.batch_name.toLowerCase().includes(term));
        
        if (filtered.length === 0) {
            html += `<div class="empty-state"><i class="ri-search-2-line empty-icon"></i><p>No Subjects Found</p></div>`;
        } else {
            html += `<div style="display:flex; flex-direction:column;">`;
            filtered.forEach(batch => {
                const originalIdx = batches.indexOf(batch);
                const stats = getBatchStats(batch); 
                const style = getSubjectIcon(batch.batch_name); 
                
                html += `
                    <div class="subject-card-list" onclick="updateURL('/class/${appState.classId}/batch/${originalIdx}')">
                        <div class="sub-icon-box" style="color:${style.color}; border:1px solid ${style.color}40;">${style.text}</div>
                        <div class="sub-info">
                            <div class="sub-title">${batch.batch_name}</div>
                            <div class="sub-meta"><span>${stats.chapters} Chapters</span> • <span>${stats.completed}/${stats.lectures} Lectures</span></div>
                        </div>
                        <div class="sub-progress">
                            <span class="prog-text" style="color:${style.color}">${stats.percent}% Done</span>
                            <div class="prog-bg"><div class="prog-fill" style="width:${stats.percent}%; background:${style.color};"></div></div>
                        </div>
                    </div>
                `;
            });
            html += `</div>`;
        }
    } 
    else {
        // Resources Tab Logic
        const fileBatch = currentClass.batches.find(b => b.batch_name.includes("Files"));
        if (fileBatch && fileBatch.resources && fileBatch.resources.length > 0) {
            html += `<div class="grid-layout">`;
            fileBatch.resources.forEach(res => {
                let iconClass = 'ri-file-list-3-line'; 
                let action = '';
                if (res.type === 'VIDEO') {
                    iconClass = 'ri-play-circle-line';
                    action = `onclick="openPlayer('-1003345907635', '${res.url_or_id}', '${res.title}')"`;
                } else {
                    iconClass = 'ri-file-pdf-line';
                    action = `onclick="openPDF('${res.url_or_id}')"`;
                }
                
                html += `
                    <div class="card resource-item" ${action} style="cursor: pointer;">
                        <div class="res-left">
                            <i class="${iconClass} res-icon"></i>
                            <div><div style="font-weight:600">${res.title}</div></div>
                        </div>
                    </div>
                `;
            });
            html += `</div>`;
        } else {
             html += `<div class="empty-state"><i class="ri-folder-open-line empty-icon"></i><p>No Global Resources Available.</p></div>`;
        }
    }
    html += `</div>`;
    main.innerHTML = html;
}

function switchBatchTab(tab) { appState.batchTab = tab; renderBatches(); }

function renderChapters() {
    const main = document.getElementById('main-content');
    const batch = DB[appState.classId].batches[appState.batchIdx];
    document.getElementById('current-path').innerText = `${DB[appState.classId].name} > ${batch.batch_name}`;
    document.getElementById('global-search').placeholder = `Search content...`;

    let html = `
        <div class="batch-tabs">
            <button class="batch-tab ${appState.chapTab === 'chapters' ? 'active' : ''}" onclick="switchChapterTab('chapters')">Chapters</button>
            <button class="batch-tab ${appState.chapTab === 'material' ? 'active' : ''}" onclick="switchChapterTab('material')">Study Material</button>
        </div>
        <div id="chapters-content">
    `;

    if (appState.chapTab === 'chapters') {
        const chapters = batch.chapters || [];
        const term = appState.searchTerm;
        const filtered = chapters.filter(c => c.chapter_name.toLowerCase().includes(term));
        const completedList = getCompletedLectures();

        if (filtered.length === 0) {
            html += `<div class="empty-state"><p>No Chapters Found</p></div>`;
        } else {
            html += `<div class="grid-layout">`;
            filtered.forEach((chap, idx) => {
                const originalIdx = chapters.indexOf(chap);
                const lecCount = chap.lectures ? chap.lectures.length : 0;
                let completedInChap = 0;
                if(chap.lectures) {
                    chap.lectures.forEach(l => {
                        if(l.video_id && completedList.includes(l.video_id.toString())) completedInChap++;
                    });
                }

                html += `
                    <div class="card chapter-card" onclick="updateURL('/class/${appState.classId}/batch/${appState.batchIdx}/chapter/${originalIdx}')">
                        <div class="card-body" style="height:100%; display:flex; flex-direction:column; justify-content:space-between;">
                            <div>
                                <div class="chapter-tag">CH - ${String(originalIdx+1).padStart(2, '0')}</div>
                                <div class="card-title" style="font-size:1rem; line-height:1.4;">${chap.chapter_name}</div>
                            </div>
                            <div class="lecture-status" style="display:flex; justify-content:space-between; align-items:center;">
                                <span><i class="ri-play-circle-line"></i> ${lecCount} Lectures</span>
                                <span style="font-size:0.75rem; color:var(--accent); font-weight:bold;">${completedInChap}/${lecCount} Done</span>
                            </div>
                        </div>
                    </div>
                `;
            });
            html += `</div>`;
        }
    } else {
        html += `<div class="empty-state"><i class="ri-folder-open-line empty-icon"></i><p>No Study Material Uploaded Yet.</p></div>`;
    }

    html += `</div>`;
    main.innerHTML = html;
}

function switchChapterTab(tab) {
    appState.chapTab = tab;
    renderChapters();
}

function renderPlayerView() {
    const main = document.getElementById('main-content');
    const batch = DB[appState.classId].batches[appState.batchIdx];
    const chapter = batch.chapters[appState.chapterIdx];
    document.getElementById('current-path').innerText = `${batch.batch_name} > ${chapter.chapter_name}`;
    document.getElementById('global-search').placeholder = `Search content...`;

    main.innerHTML = `
        <div class="chapter-container">
            <div class="chapter-sidebar">
                <div class="sidebar-header">Unit List</div>
                <div class="sidebar-list">
                    ${batch.chapters.map((c, i) => `
                        <div class="chapter-list-item ${i === appState.chapterIdx ? 'active' : ''}"
                             onclick="updateURL('/class/${appState.classId}/batch/${appState.batchIdx}/chapter/${i}')">
                             ${i+1}. ${c.chapter_name}
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="chapter-content-area">
                <div class="content-header">
                     <div class="tabs" style="margin:0; border:none;">
                        <div class="tab ${appState.tab==='videos'?'active':''}" onclick="setTab('videos')">Videos</div>
                        <div class="tab ${appState.tab==='notes'?'active':''}" onclick="setTab('notes')">Notes</div>
                        <div class="tab ${appState.tab==='dpps'?'active':''}" onclick="setTab('dpps')">DPPs</div>
                        <div class="tab ${appState.tab==='sheets'?'active':''}" onclick="setTab('sheets')">Sheets</div>
                    </div>
                </div>
                <div id="content-list-container"></div>
            </div>
        </div>
    `;

    renderResources(chapter);
    setTimeout(() => {
        const active = document.querySelector('.chapter-list-item.active');
        if(active) active.scrollIntoView({block:'center', behavior:'smooth'});
    }, 200);
}

function setTab(tab, el) {
    appState.tab = tab;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    if (el) el.classList.add('active');

    const batch = DB[appState.classId].batches[appState.batchIdx];
    const chapter = batch.chapters[appState.chapterIdx];
    renderResources(chapter);
}

function renderResources(chapter) {
    const container = document.getElementById('content-list-container');
if (!container) return;
container.innerHTML = '';

    const bookmarks = getBookmarks();
const isBookmarked = vidId && bookmarks.includes(vidId);

<button onclick="toggleBookmark('${vidId}')">
   <i class="${isBookmarked ? 'ri-star-fill' : 'ri-star-line'}"></i>
</button>

    // ✅ STEP 1: Sahi Channel ID nikalo
    const batch = DB[appState.classId].batches[appState.batchIdx];
    const channelID = batch.channel_id || "-1003345907635"; 

    const type = appState.tab;
    const term = appState.searchTerm;
    const completedList = getCompletedLectures();

    let data = [];
    if (type === 'videos') data = chapter.lectures || [];
    else if (type === 'dpps') data = chapter.dpps || [];
    else if (type === 'sheets') data = chapter.sheets || [];
    else if (type === 'notes') {
        data = chapter.notes || [];
        if (data.length === 0 && chapter.lectures) {
            chapter.lectures.forEach(l => {
                if (l.notes_id) data.push({ title: l.title + " (Notes)", id: l.notes_id, type: 'Lecture Notes' });
            });
        }
    }

    const filteredData = data.filter(item => {
        let name = item.title || item.name || `Lecture ${item.lec_no}`;
        return name.toLowerCase().includes(term);
    });

    if (filteredData.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="ri-search-eye-line empty-icon"></i><p>No Results Found</p></div>`;
        return;
    }

    filteredData.forEach(item => {
        const title = item.title || item.name || `Lecture ${item.lec_no}`;
        const row = document.createElement('div');
        row.className = 'resource-item';

        if (type === 'videos') {
            let vidId = item.video_id ? item.video_id.toString() : null;
            let isDone = vidId && completedList.includes(vidId);
            
            // Video Player Button
            let btnHtml = item.video_id 
                ? `<button class="btn-small play-btn" onclick="openPlayer('${channelID}', '${item.video_id}', '${title}')"><i class="ri-play-fill"></i> Play</button>`
                : `<span style="font-size:0.8rem; color:#666;">No Video</span>`;
                
            // ✅ FIX: PDF Button me Channel ID bhejo
            if (item.notes_id) {
                btnHtml += `<button class="btn-small" style="margin-left:10px" onclick="openPDF('${channelID}', '${item.notes_id}')">PDF</button>`;
            }

            let checkHtml = item.video_id ? `
                <div class="mark-done" onclick="toggleLectureComplete('${vidId}')" title="Mark as Complete" style="font-size:1.5rem; cursor:pointer; color:${isDone ? '#22c55e' : '#666'};">
                     <i class="${isDone ? 'ri-checkbox-circle-fill' : 'ri-checkbox-blank-circle-line'}"></i>
                </div>
            ` : '';

            row.innerHTML = `
                <div class="res-left" style="display:flex; align-items:center; gap:15px;">
                    ${checkHtml}
                    <div class="res-info">
                        <div style="font-weight:600;">${title}</div>
                        <div style="font-size:0.8rem; color:var(--text-sub);">Video Lecture</div>
                    </div>
                </div>
                <div class="res-buttons">${btnHtml}</div>
            `;
        } else {
            let id = item.id || item.notes_id;
            let btnHtml = '';
            if(item.quizId || title.toLowerCase().includes('quiz')) {
                 btnHtml = `<button class="btn-small play-btn" onclick="startQuiz('${item.quizId || 'dpp-02-diff'}')">Start Quiz</button>`;
            } else {
                 // ✅ FIX: View Button me Channel ID bhejo
                 btnHtml = `<button class="btn-small" onclick="openPDF('${channelID}', '${id}')">View</button>`;
            }
            row.innerHTML = `
                <div class="res-left">
                    <i class="ri-file-pdf-line" style="font-size:1.5rem; color:var(--text-sub);"></i>
                    <div class="res-info">
                        <div style="font-weight:600;">${title}</div>
                        <div style="font-size:0.8rem; color:var(--text-sub);">PDF Document</div>
                    </div>
                </div>
                <div class="res-buttons">${btnHtml}</div>
            `;
        }
        container.appendChild(row);
    });
}

player.on('fullscreenchange', event => {
    if (player.fullscreen.active) {
        try {
            if (screen.orientation && screen.orientation.lock) {
                screen.orientation.lock('landscape').catch(() => {});
            }
        } catch (e) {}
    } else {
        try {
            if (screen.orientation && screen.orientation.unlock) {
                screen.orientation.unlock();
            }
        } catch (e) {}
    }
});


// ✅ UPDATED OPEN PLAYER (Fixes Sidebar PDF Issue)
function openPlayer(channelId, vidId, title) {
    const modal = document.getElementById('video-player-modal');
    modal.classList.remove('hidden');
    document.getElementById('vp-sidebar').classList.remove('sidebar-open');
    
    let batchName = "Class Batch";
    // Batch Info Nikalo
    let currentBatchChannelId = channelId; // Default to passed ID

    if(appState.classId && appState.batchIdx !== null && DB[appState.classId]) {
         const batch = DB[appState.classId].batches[appState.batchIdx];
         batchName = batch.batch_name.toUpperCase();
         // Data se Channel ID lo (Backup)
         if(batch.channel_id) currentBatchChannelId = batch.channel_id; 
    }

currentVideoId = vidId;

const lastTime = getWatchTime(vidId);
if (lastTime > 5) {
    player.once('loadedmetadata', () => {
        player.currentTime = lastTime;
    });
}

    
    document.getElementById('vp-title').innerText = batchName; 
    document.getElementById('vp-lecture-name').innerText = title; 
    
    // 3. Set Motivational Quote
    const quotes = [
        { text: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
        { text: "Believe in yourself and all that you are.", author: "Christian D. Larson" },
        { text: "The future belongs to those who believe in the beauty of their study goals.", author: "Eleanor Roosevelt" },
        { text: "The only way to do great work is to love what you study.", author: "Steve Jobs" },
        { text: "Success is not the key to happiness. Happiness is the key to success.", author: "Albert Schweitzer" },
        { text: "The only limit to our realization of tomorrow will be our doubts of today.", author: "Franklin D. Roosevelt" },
        { text: "Don’t watch the clock; do what it does. Keep studying.", author: "Sam Levenson" },
        { text: "Your education is a dress rehearsal for a future that is yours to design.", author: "Unknown" },
        { text: "The harder you work for something, the greater you’ll feel when you achieve it.", author: "Unknown" },
        { text: "It does not matter how slowly you go, as long as you do not stop.", author: "Confucius" },
        { text: "Education is not the filling of a pail, but the lighting of a fire.", author: "William Butler Yeats" },
        { text: "The beautiful thing about learning is that no one can take it away from you.", author: "B.B. King" },
        { text: "Study while others are sleeping; work while others are loafing.", author: "William Arthur Ward" },
        { text: "Success is no accident. It is hard work, perseverance, learning, studying, sacrifice.", author: "Pelé" },
        { text: "You don’t have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
        { text: "The more that you read, the more things you will know.", author: "Dr. Seuss" },
        { text: "Education is the passport to the future.", author: "Malcolm X" },
        { text: "Dream big, work hard, stay focused.", author: "Unknown" },
        { text: "Study hard, for the well is deep, and our brains are shallow.", author: "Richard Baxter" },
        { text: "There are no shortcuts to any place worth going.", author: "Beverly Sills" },
        { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
        { text: "Success is not final, failure is not fatal: It is the courage to continue that counts.", author: "Winston Churchill" },
        { text: "The expert in anything was once a beginner.", author: "Helen Hayes" },
        { text: "Don’t let what you cannot do interfere with what you can do.", author: "John Wooden" },
        { text: "Push yourself, because no one else is going to do it for you.", author: "Unknown" },
        { text: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela" },
        { text: "Don’t watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
        { text: "The future depends on what you do today.", author: "Mahatma Gandhi" },
        { text: "Mistakes are proof that you are trying.", author: "Unknown" },
        { text: "It always seems impossible until it’s done.", author: "Nelson Mandela" },
        { text: "Work hard in silence. Let your success be your noise.", author: "Frank Ocean" },
        { text: "The best way to predict your future is to create it.", author: "Abraham Lincoln" },
        { text: "Be stronger than your strongest excuse.", author: "Unknown" },
        { text: "Motivation is what gets you started. Habit is what keeps you going.", author: "Jim Ryun" },
        { text: "Doubt kills more dreams than failure ever will.", author: "Suzy Kassem" },
        { text: "Hard work beats talent when talent doesn’t work hard.", author: "Tim Notke" },
        { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
        { text: "The key to success is to start before you’re ready.", author: "Marie Forleo" },
        { text: "Stay focused, go after your dreams and keep moving toward your goals.", author: "LL Cool J" },
        { text: "Learn from yesterday, live for today, hope for tomorrow.", author: "Albert Einstein" },
        { text: "Don’t stop when you’re tired. Stop when you’re done.", author: "Marilyn Monroe" },
        { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
        { text: "The pain you feel today will be the strength you feel tomorrow.", author: "Unknown" },
        { text: "Consistency is what transforms average into excellence.", author: "Unknown" },
        { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
        { text: "Don't fear failure. Fear being in the same place next year as you are today.", author: "Unknown" },
        { text: "You don't drown by falling in the water; you drown by staying there.", author: "Ed Cole" },
        { text: "There is no substitute for hard work.", author: "Thomas Edison" },
        { text: "What you don't sweat out when you're young will turn into tears when you're old.", author: "Japanese Proverb" },
        { text: "All progress takes place outside the comfort zone.", author: "Michael John Bobak" },
        { text: "The purpose of learning is growth, and our minds, unlike our bodies, can continue growing as long as we live.", author: "Mortimer Adler" },
        { text: "The man who moves a mountain begins by carrying away small stones.", author: "Confucius" },
        { text: "Nothing can dim the light which shines from within.", author: "Maya Angelou" },
        { text: "Shoot for the moon. Even if you miss, you'll land among the stars.", author: "Les Brown" },
        { text: "A winner is just a loser who tried one more time.", author: "George Augustus Moore" },
        { text: "Persist and persevere, and you will find most things that are attainable, possible.", author: "Lord Chesterfield" },
        { text: "Success doesn't come to you, you've got to go to it.", author: "Marva Collins" },
        { text: "The secret of your success is determined by your daily agenda.", author: "John C. Maxwell" },
        { text: "Opportunities don't happen. You create them.", author: "Chris Grosser" },
        { text: "Don't quit. Suffer now and live the rest of your life as a champion.", author: "Muhammad Ali" },
        { text: "Success doesn't come from what you do occasionally, it comes from what you do consistently.", author: "Marie Forleo" },
        { text: "Don't let yesterday take up too much of today.", author: "Will Rogers" },
        { text: "Every accomplishment starts with the decision to try.", author: "John F. Kennedy" },
        { text: "Do something today that your future self will thank you for.", author: "Sean Patrick Flanery" },
        { text: "A little progress each day adds up to big results.", author: "Satya Nani" },
        { text: "Your attitude determines your direction.", author: "Unknown" },
        { text: "Don't wait for opportunity. Create it.", author: "Unknown" },
        { text: "Success is the result of preparation meeting opportunity.", author: "Seneca" },
        { text: "Success is not for the lazy.", author: "Unknown" },
        { text: "Hard work compounds like interest. The earlier you start, the more you gain.", author: "Unknown" },
        { text: "Believe in your infinite potential. Your only limitations are those you set upon yourself.", author: "Roy T. Bennett" },
        { text: "Success is the result of preparation, hard work, and learning from failure.", author: "Colin Powell" },
        { text: "Motivation gets you started. Habit keeps you going.", author: "Jim Ryun" },
        { text: "Don't limit yourself. Many people limit themselves to what they think they can do.", author: "Mary Kay Ash" },
        { text: "Success is built daily, one small effort at a time.", author: "Unknown" },
        { text: "Good habits are the key to all success.", author: "Og Mandino" },
        { text: "The only way to grow is to step out of your comfort zone.", author: "Unknown" },
        { text: "Dreams don't work unless you do.", author: "John C. Maxwell" },
        { text: "Small daily improvements over time lead to stunning results.", author: "Robin Sharma" },
        { text: "Don't wait for opportunity. Create it with hard work.", author: "Unknown" },
        { text: "Discipline is the key to turning dreams into reality.", author: "Unknown" },
        { text: "Your habits shape your future.", author: "Jack Canfield" },
        { text: "The harder you work, the luckier you get.", author: "Gary Player" },
        { text: "Success is nothing more than a few simple disciplines practiced every day.", author: "Jim Rohn" },
        { text: "Learning is a lifelong process. Commit to growth every day.", author: "Unknown" },
        { text: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln" },
        { text: "The key to success is consistency, not intensity.", author: "Unknown" },
        { text: "Hard work compounds over time.", author: "Unknown" },
        { text: "Growth begins at the end of your comfort zone.", author: "Tony Robbins" },
        { text: "Focus on progress, not perfection.", author: "Unknown" },
        { text: "Success is built on the foundation of daily habits.", author: "Unknown" },
        { text: "Small efforts repeated consistently lead to extraordinary results.", author: "Unknown" },
        { text: "Don't fear failure. Fear being in the same place next year as you are today.", author: "Unknown" }
    ];
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    
    // FIX: Get the element and apply the class (This will use the CSS fix)
    const vpQuoteEl = document.getElementById('vp-quote');
    vpQuoteEl.className = 'vp-quote purple-bracket'; 

    vpQuoteEl.innerHTML = `
        "${randomQuote.text}" 
        <br><span style="font-size:0.85rem; opacity:0.8; display:block; margin-top:5px; color: var(--primary);">— ${randomQuote.author}</span>
    `;

    // Video Play Logic
    const streamUrl = `${BASE_API}${channelId}/${vidId}?t=${Date.now()}`;
    const activePlayerEl = document.getElementById('active-player');
    
    if (activePlayerEl) {
        let sourceEl = activePlayerEl.querySelector('source');
        if (!sourceEl) {
             sourceEl = document.createElement('source');
             activePlayerEl.appendChild(sourceEl);
        }
        sourceEl.src = streamUrl;
        sourceEl.type = 'video/mp4'; 
        player.source = {
            type: 'video',
            sources: [{ src: streamUrl, type: 'video/mp4' }],
        };
        player.play();
    } else {
        document.getElementById('video-wrapper').innerHTML = `<video id="active-player" playsinline controls autoplay><source src="${streamUrl}" type="video/mp4" /></video>`;
        new Plyr('#active-player', { autoplay: true, seekTime: 10, controls: ['play-large', 'rewind', 'play', 'fast-forward', 'progress', 'current-time', 'duration', 'mute', 'volume', 'settings', 'fullscreen'] });
    }
    
    // --- SIDEBAR ATTACHMENTS LOGIC ---
    const attachList = document.getElementById('vp-attachments-list');
    attachList.innerHTML = ''; 
    
    if(appState.classId && appState.batchIdx !== null && appState.chapterIdx !== null) {
        const batch = DB[appState.classId].batches[appState.batchIdx];
        const chapter = batch.chapters[appState.chapterIdx];
        let notesData = [];
        
        const addCategorizedData = (items, type) => {
            if (items) {
                items.forEach(item => {
                    const title = item.title || (item.lec_no ? `${type} ${item.lec_no}` : `Document`);
                    const id = item.id || item.notes_id;
                    if (id) notesData.push({ title: title, id: id, type: type });
                });
            }
        };

        if (chapter.lectures) {
            chapter.lectures.forEach(l => {
                if (l.notes_id) notesData.push({ title: l.title + " (Notes)", id: l.notes_id, type: 'Lecture Notes' });
            });
        }
        addCategorizedData(chapter.notes, 'Dedicated Notes');
        addCategorizedData(chapter.dpps, 'DPPs');
        addCategorizedData(chapter.sheets, 'Sheets');
        
        const groupedData = notesData.reduce((acc, item) => {
            const type = item.type || 'Other Files';
            if (!acc[type]) acc[type] = [];
            acc[type].push(item);
            return acc;
        }, {});
        
        if (notesData.length > 0) {
            const order = ['Lecture Notes', 'Dedicated Notes', 'DPPs', 'Sheets', 'Other Files'];
            order.forEach(type => {
                if (groupedData[type] && groupedData[type].length > 0) {
                    const headerEl = document.createElement('div');
                    headerEl.style.cssText = 'font-weight: 700; color: var(--primary); padding: 10px 5px 5px; margin-top: 15px; border-bottom: 1px solid #222; font-size: 0.9rem;';
                    headerEl.innerText = type.toUpperCase();
                    attachList.appendChild(headerEl);
                    
                    groupedData[type].forEach(doc => {
                        const docId = doc.id;
                        const docTitle = doc.title;
                        const noteEl = document.createElement('div');
                        noteEl.className = 'attachment-item';
                        noteEl.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #111;';
                        let icon = (type === 'DPPs' || type === 'Sheets') ? 'ri-test-tube-line' : 'ri-file-text-line';
                        
                        // ✅ FIX: Added currentBatchChannelId here
                        noteEl.innerHTML = `
                            <div class="res-left" style="gap:10px; display:flex; align-items:center;">
                                <i class="${icon}" style="color:var(--text-sub);"></i>
                                <div style="font-size:0.9rem; color:white;">${docTitle}</div>
                            </div>
                            <button class="btn-small" onclick="openPDF('${currentBatchChannelId}', '${docId}')" style="font-size:0.8rem; padding: 5px 10px;"><i class="ri-eye-line"></i> View</button>
                        `;
                        attachList.appendChild(noteEl);
                    });
                }
            });
        } else { 
            attachList.innerHTML = '<div style="color:#666; padding:10px; text-align:center; margin-top: 20px;">No notes or resources available for this chapter.</div>'; 
        }
    } else {
         attachList.innerHTML = '<div style="color:#666; padding:10px; text-align:center; margin-top: 20px;">Attachments only available in Chapter View.</div>';
    }
}

document.getElementById('close-player').onclick = () => {
    stopAndResetPlayer();
};
function openPDF(channelId, id) { 
    if(!id) return alert("PDF not available");
    
    // Agar channelId missing hai, toh default use karo
    if(!channelId || channelId === 'undefined' || channelId === 'null') {
        channelId = "-1003345907635";
    }

    // pdf.html ko ID aur CID dono bhejo
    window.open(`pdf.html?id=${id}&cid=${channelId}`, '_blank');
}

function initTheme() {
    const btn = document.getElementById('theme-toggle');
    if(localStorage.getItem('theme') === 'light') document.body.setAttribute('data-theme', 'light');
    btn.onclick = () => {
        if(document.body.hasAttribute('data-theme')) {
            document.body.removeAttribute('data-theme');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
        }
    };
}

function initDoubtSolver() {
    const btn = document.getElementById('doubt-btn');
    const modal = document.getElementById('doubt-modal');
    const closeBtn = document.getElementById('close-doubt');
    
    if(btn && modal) {
        btn.style.zIndex = "9999";
        btn.onclick = () => {
             modal.classList.toggle('hidden');
             if (!modal.classList.contains('hidden')) {
                 document.getElementById('doubt-input').focus();
             }
        };
        if(closeBtn) {
            closeBtn.onclick = () => modal.classList.add('hidden');
        }
        
        const sendBtn = document.getElementById('send-doubt');
        const inputField = document.getElementById('doubt-input');
        const chatHistory = document.getElementById('chat-history');
        chatHistory.style.cssText = 'flex: 1; padding: 15px; overflow-y: auto; color: #ddd; font-size: 0.9rem; word-wrap: break-word; word-break: break-all; max-width: 100%;';

        const sendMessage = async () => { 
            const message = inputField.value.trim();
            if (message === "") return;
            chatHistory.innerHTML += `<div style="text-align: right; color: #8b5cf6; margin-bottom: 10px; word-break: break-all;">User: ${message}</div>`;
            const loadingIndicator = document.createElement('div');
            loadingIndicator.id = 'ai-loading';
            loadingIndicator.style.cssText = 'text-align: left; color: #666; margin-bottom: 10px; font-style: italic;';
            loadingIndicator.innerHTML = 'AI: Typing response...';
            chatHistory.appendChild(loadingIndicator);
            inputField.value = '';
            inputField.disabled = true;
            sendBtn.disabled = true;
            chatHistory.scrollTop = chatHistory.scrollHeight;

            const handlerUrl = AI_HANDLER_URL; 
            try {
                const response = await fetch(handlerUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ question: message })
                });
                const data = await response.json();
                const aiAnswer = data.answer || "AI: Maaf karna, main server se jawab nahi laa paya.";
                const finalIndicator = document.getElementById('ai-loading');
                if (finalIndicator) {
                    finalIndicator.style.cssText = 'text-align: left; color: #ffffff; margin-bottom: 10px; display: block !important; max-width: 100% !important; word-break: break-all !important;';
                    finalIndicator.innerHTML = `AI: ${aiAnswer}`;
                    finalIndicator.removeAttribute('id');
                } else {
                     chatHistory.innerHTML += `<div style="text-align: left; color: #ffffff; display: block !important; max-width: 100% !important; word-break: break-all !important;">AI: ${aiAnswer}</div>`;
                }
            } catch (error) {
                const finalIndicator = document.getElementById('ai-loading');
                if (finalIndicator) {
                     finalIndicator.innerHTML = `<div style="text-align: left; color: #ff6666; display: block !important; max-width: 100% !important; word-break: break-all !important;">AI: Network Error: ${error.message}. Please check browser console for details.</div>`;
                     finalIndicator.removeAttribute('id');
                }
            } finally {
                inputField.disabled = false;
                sendBtn.disabled = false;
                chatHistory.scrollTop = chatHistory.scrollHeight;
                inputField.focus();
            }
        };
        if (sendBtn) {
            sendBtn.onclick = sendMessage;
        }
        if (inputField) {
            inputField.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !inputField.disabled) {
                    sendMessage();
                    e.preventDefault();
                }
            });
        }
    }
}
