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

// Plyr Setup with Fixes
const player = new Plyr('#player', {
    controls: ['play-large', 'rewind', 'play', 'fast-forward', 'progress', 'current-time', 'duration', 'mute', 'volume', 'settings', 'fullscreen'],
    seekTime: 10,
    keyboard: { focused: true, global: true }
});

// ✅ ISSUE 1 FIX: Landscape Force on Fullscreen
player.on('enterfullscreen', () => {
    try {
        if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('landscape').catch((e) => console.log("Orientation lock failed"));
        }
    } catch (err) { console.log(err); }
});

player.on('exitfullscreen', () => {
    if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock();
});

/* ========================================= */
/* 2. INITIALIZATION & DATA LOADING          */
/* ========================================= */
window.onload = function() {
    if(typeof particlesJS !== 'undefined') {
        particlesJS("particles-js", {"particles":{"number":{"value":40,"density":{"enable":true,"value_area":800}},"color":{"value":"#ffffff"},"opacity":0.1,"line_linked":{"enable":true,"distance":150,"color":"#ffffff","opacity":0.1}}});
    }

    // Safely load your data
    const d11 = (typeof class11Data !== 'undefined') ? class11Data : ((typeof batch11 !== 'undefined') ? batch11 : (typeof dataClass11 !== 'undefined' ? dataClass11 : []));
    const d12 = (typeof class12Data !== 'undefined') ? class12Data : ((typeof batch12 !== 'undefined') ? batch12 : (typeof dataClass12 !== 'undefined' ? dataClass12 : []));
    const d13 = (typeof class13Data !== 'undefined') ? class13Data : ((typeof batch13 !== 'undefined') ? batch13 : (typeof dataClass13 !== 'undefined' ? dataClass13 : []));
    const allen11 = (typeof allenClass11Data !== 'undefined') ? allenClass11Data : [];
    const allen12 = (typeof allenClass12Data !== 'undefined') ? allenClass12Data : [];
    const allenMore = (typeof allenMoreData !== 'undefined') ? allenMoreData : [];

    DB = {
        '11': { name: 'Class 11th', batches: d11 },
        '12': { name: 'Class 12th', batches: d12 },
        '13': { name: 'Eduniti 2025', batches: d13 },
        'allen-11': { name: 'Allen Class 11th', batches: allen11 },
        'allen-12': { name: 'Allen Class 12th', batches: allen12 },
        'allen-more': { name: 'Allen More Videos', batches: allenMore }
    };

    initTheme();
    initSearchListener();
    handleRouting();
    window.addEventListener('hashchange', handleRouting);
    setupPlayerModalControls(); 
    setTimeout(initDoubtSolver, 500);
    initKeepAlive();
};

/* ========================================= */
/* 3. HELPERS & UTILS                        */
/* ========================================= */
function updateURL(hash) { window.location.hash = hash; }

function getCompletedLectures() {
    const data = localStorage.getItem('completed_lectures');
    return data ? JSON.parse(data) : [];
}

function toggleLectureComplete(lecId) {
    if(!lecId) return;
    let completed = getCompletedLectures();
    if(completed.includes(lecId)) completed = completed.filter(id => id !== lecId);
    else completed.push(lecId);
    localStorage.setItem('completed_lectures', JSON.stringify(completed));
    if(appState.view === 'player') renderResources(DB[appState.classId].batches[appState.batchIdx].chapters[appState.chapterIdx]);
}

function getBatchStats(batch) {
    let total = 0, done = 0;
    const completed = getCompletedLectures();
    if (batch.chapters) {
        batch.chapters.forEach(ch => {
            if (ch.lectures) {
                total += ch.lectures.length;
                ch.lectures.forEach(l => { if(l.video_id && completed.includes(l.video_id.toString())) done++; });
            }
        });
    }
    return { chapters: batch.chapters?.length || 0, lectures: total, completed: done, percent: total > 0 ? Math.round((done/total)*100) : 0 };
}

function getSubjectIcon(name) {
    name = name.toLowerCase();
    if(name.includes('physics')) return { text: 'PHY', color: '#3b82f6' };
    if(name.includes('botany')) return { text: 'BOT', color: '#10b981' };
    if(name.includes('zoology')) return { text: 'ZOO', color: '#8b5cf6' };
    if(name.includes('chemistry')) return { text: 'CHM', color: '#f59e0b' };
    return { text: 'OT', color: '#10b981' };
}

/* ========================================= */
/* 4. ROUTING & NAVIGATION                   */
/* ========================================= */
function stopVideoStrictly() {
    if (typeof player !== 'undefined') {
        player.pause();
        player.source = { type: 'video', sources: [] }; 
    }
    const vTag = document.getElementById('active-player');
    if(vTag) { vTag.pause(); vTag.src = ""; vTag.load(); }
    document.getElementById('video-player-modal').classList.add('hidden');
}

document.getElementById('back-btn').onclick = () => {
    if (!document.getElementById('video-player-modal').classList.contains('hidden')) {
        stopVideoStrictly();
        updateURL(`/class/${appState.classId}/batch/${appState.batchIdx}`);
    } else if (appState.view === 'chapters') {
        updateURL(`/class/${appState.classId}`);
    } else if (appState.view === 'batches' && appState.classId.startsWith('allen-')) {
        updateURL('allen-menu');
    } else {
        updateURL('/');
    }
};

window.addEventListener('popstate', stopVideoStrictly);

function handleRouting() {
    const hash = window.location.hash.slice(1); 
    const parts = hash.split('/'); 
    const sBox = document.getElementById('global-search');
    if(document.activeElement !== sBox) { sBox.value = ''; appState.searchTerm = ''; }

    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
    document.getElementById('video-player-modal').classList.add('hidden'); 
    document.getElementById('nav-controls').classList.remove('hidden');

    if (hash === 'allen-menu') { renderAllenMenu(); return; }
    if (!hash || hash === '/') { renderHome(); return; }

    if (parts[1] === 'class' && !parts[3]) {
        appState.classId = parts[2];
        appState.view = 'batches';
        renderBatches(); return;
    }
    if (parts[1] === 'class' && parts[3] === 'batch' && !parts[5]) {
        appState.classId = parts[2];
        appState.batchIdx = parseInt(parts[4]);
        appState.view = 'chapters';
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
/* 5. RENDERERS                              */
/* ========================================= */
function renderHome() {
    appState.view = 'home';
    document.getElementById('nav-controls').classList.add('hidden');
    const main = document.getElementById('main-content');
    main.innerHTML = `
        <div class="grid-layout" style="justify-content:center; margin-top:50px;">
            <div class="card class-card" onclick="updateURL('/class/11')">
                <div class="card-img" style="background:#1e293b; display:flex; align-items:center; justify-content:center; height:160px;">
                    <i class="ri-stack-line" style="font-size:4rem; color:#8b5cf6;"></i>
                </div>
                <div class="card-body"><div class="card-title">Class 11th</div></div>
            </div>
            <div class="card class-card" onclick="updateURL('/class/12')">
                <div class="card-img" style="background:#1e293b; display:flex; align-items:center; justify-content:center; height:160px;">
                    <i class="ri-graduation-cap-line" style="font-size:4rem; color:#22c55e;"></i>
                </div>
                <div class="card-body"><div class="card-title">Class 12th</div></div>
            </div>
            <div class="card class-card" onclick="updateURL('allen-menu')" style="border: 2px solid #00ff88;">
                <div class="card-img" style="height:160px; background:linear-gradient(135deg, #11998e 0%, #38ef7d 100%); display:flex; flex-direction:column; align-items:center; justify-content:center;">
                     <h1 style="color:white; margin:0; letter-spacing:2px; font-weight:900; font-size:2.2rem;">ALLEN</h1>
                </div>
                <div class="card-body"><div class="card-title">Enter Classroom</div></div>
            </div>
        </div>
    `;
}

function renderAllenMenu() {
    appState.view = 'allen-menu';
    document.getElementById('current-path').innerText = "Allen Classroom";
    const main = document.getElementById('main-content');
    main.innerHTML = `
        <h2 style="text-align:center; color:#00ff88;">Select Your Class</h2>
        <div class="grid-layout" style="justify-content:center;">
            <div class="card class-card" onclick="updateURL('/class/allen-11')">
                <div class="card-img" style="height:160px; background:linear-gradient(135deg, #00c6ff 0%, #0072ff 100%); display:flex; align-items:center; justify-content:center;">
                    <h1 style="color:white; font-size:3rem; font-weight:800;">11TH</h1>
                </div>
                <div class="card-body"><div class="card-title">Class 11th NEET</div></div>
            </div>
            <div class="card class-card" onclick="updateURL('/class/allen-12')">
                <div class="card-img" style="height:160px; background:linear-gradient(135deg, #00c6ff 0%, #0072ff 100%); display:flex; align-items:center; justify-content:center;">
                    <h1 style="color:white; font-size:3rem; font-weight:800;">12TH</h1>
                </div>
                <div class="card-body"><div class="card-title">Class 12th NEET</div></div>
            </div>
        </div>
    `;
}

function renderBatches() {
    const main = document.getElementById('main-content');
    if (!DB[appState.classId]) return;
    const currentClass = DB[appState.classId];
    document.getElementById('current-path').innerText = currentClass.name;
    
    let html = `<div class="batch-tabs">
        <button class="batch-tab active" onclick="switchBatchTab('subjects')">Subjects</button>
        <button class="batch-tab" onclick="switchBatchTab('resources')">Resources</button>
    </div><div id="batch-container">`;

    currentClass.batches.forEach((batch, idx) => {
        const stats = getBatchStats(batch);
        const style = getSubjectIcon(batch.batch_name);
        html += `
            <div class="subject-card-list" onclick="updateURL('/class/${appState.classId}/batch/${idx}')">
                <div class="sub-icon-box" style="color:${style.color}; border:1px solid ${style.color}40;">${style.text}</div>
                <div class="sub-info">
                    <div class="sub-title">${batch.batch_name}</div>
                    <div class="sub-meta">${stats.chapters} Chapters • ${stats.completed}/${stats.lectures} Lectures</div>
                </div>
                <div class="sub-progress">
                    <span class="prog-text" style="color:${style.color}">${stats.percent}%</span>
                    <div class="prog-bg"><div class="prog-fill" style="width:${stats.percent}%; background:${style.color};"></div></div>
                </div>
            </div>`;
    });
    main.innerHTML = html + `</div>`;
}

function renderChapters() {
    const main = document.getElementById('main-content');
    const batch = DB[appState.classId].batches[appState.batchIdx];
    document.getElementById('current-path').innerText = batch.batch_name;
    const completedList = getCompletedLectures();

    let html = `<div class="grid-layout">`;
    (batch.chapters || []).forEach((chap, idx) => {
        let done = 0;
        chap.lectures?.forEach(l => { if(completedList.includes(l.video_id?.toString())) done++; });
        html += `
            <div class="card chapter-card" onclick="updateURL('/class/${appState.classId}/batch/${appState.batchIdx}/chapter/${idx}')">
                <div class="card-body">
                    <div class="chapter-tag">CH - ${String(idx+1).padStart(2, '0')}</div>
                    <div class="card-title">${chap.chapter_name}</div>
                    <div class="lecture-status">
                        <span><i class="ri-play-circle-line"></i> ${chap.lectures?.length || 0} Lectures</span>
                        <span style="color:var(--accent)">${done}/${chap.lectures?.length || 0} Done</span>
                    </div>
                </div>
            </div>`;
    });
    main.innerHTML = html + `</div>`;
}

function renderPlayerView() {
    const main = document.getElementById('main-content');
    const batch = DB[appState.classId].batches[appState.batchIdx];
    const chapter = batch.chapters[appState.chapterIdx];
    document.getElementById('current-path').innerText = chapter.chapter_name;

    main.innerHTML = `
        <div class="chapter-container">
            <div class="chapter-sidebar">
                <div class="sidebar-header">Unit List</div>
                <div class="sidebar-list">
                    ${batch.chapters.map((c, i) => `<div class="chapter-list-item ${i === appState.chapterIdx ? 'active' : ''}" onclick="updateURL('/class/${appState.classId}/batch/${appState.batchIdx}/chapter/${i}')">${i+1}. ${c.chapter_name}</div>`).join('')}
                </div>
            </div>
            <div class="chapter-content-area">
                <div class="tabs">
                    <div class="tab active" onclick="setTab('videos')">Videos</div>
                    <div class="tab" onclick="setTab('notes')">Notes</div>
                </div>
                <div id="content-list-container"></div>
            </div>
        </div>
    `;
    renderResources(chapter);
}

function renderResources(chapter) {
    const container = document.getElementById('content-list-container');
    container.innerHTML = '';
    const batch = DB[appState.classId].batches[appState.batchIdx];
    const cid = batch.channel_id || "-1003345907635";
    const completed = getCompletedLectures();

    (chapter.lectures || []).forEach(item => {
        const isDone = completed.includes(item.video_id?.toString());
        const row = document.createElement('div');
        row.className = 'resource-item';
        row.innerHTML = `
            <div class="res-left">
                <div onclick="toggleLectureComplete('${item.video_id}')" style="cursor:pointer; color:${isDone ? '#22c55e' : '#666'}; font-size:1.5rem;">
                    <i class="${isDone ? 'ri-checkbox-circle-fill' : 'ri-checkbox-blank-circle-line'}"></i>
                </div>
                <div class="res-info">
                    <div style="font-weight:600;">${item.title}</div>
                    <div style="font-size:0.8rem; color:var(--text-sub);">Video Lecture</div>
                </div>
            </div>
            <div class="res-buttons">
                <button class="btn-small play-btn" onclick="openPlayer('${cid}', '${item.video_id}', '${item.title}')">Play</button>
            </div>`;
        container.appendChild(row);
    });
}

/* ========================================= */
/* 6. PLAYER LOGIC & SIDEBAR FIXES           */
/* ========================================= */
function openPlayer(channelId, vidId, title) {
    const modal = document.getElementById('video-player-modal');
    modal.classList.remove('hidden');
    document.getElementById('vp-lecture-name').innerText = title;

    const streamUrl = `${BASE_API}${channelId}/${vidId}`;

    // ✅ Refresh Fix: Force Fresh Source
    if (player) {
        player.source = { type: 'video', title: title, sources: [{ src: streamUrl, type: 'video/mp4' }] };
        player.play().catch(e => console.log("Interaction needed"));
    }
    
    renderResourcesInSidebar(channelId);
}

function renderResourcesInSidebar(channelId) {
    const attachList = document.getElementById('vp-attachments-list');
    if(!attachList) return;
    attachList.innerHTML = ''; 
    const chapter = DB[appState.classId].batches[appState.batchIdx].chapters[appState.chapterIdx];
    
    if (chapter.lectures) {
        chapter.lectures.forEach(l => {
            if (l.notes_id) {
                const div = document.createElement('div');
                div.className = 'attachment-item';
                div.style = 'display:flex; justify-content:space-between; padding:8px; border-bottom:1px solid #111;';
                div.innerHTML = `<span style="color:white;">${l.title} (Notes)</span>
                                 <button class="btn-small" onclick="openPDF('${channelId}', '${l.notes_id}')">View</button>`;
                attachList.appendChild(div);
            }
        });
    }
}

document.getElementById('close-player').onclick = stopVideoStrictly;

function openPDF(channelId, id) { 
    if(!id) return alert("PDF not available");
    window.open(`pdf.html?id=${id}&cid=${channelId || "-1003345907635"}`, '_blank');
}

/* ========================================= */
/* 7. OTHER INITIALIZERS (THEME, SEARCH, AI) */
/* ========================================= */
function initTheme() {
    const btn = document.getElementById('theme-toggle');
    if(localStorage.getItem('theme') === 'light') document.body.setAttribute('data-theme', 'light');
    btn.onclick = () => {
        const isLight = document.body.hasAttribute('data-theme');
        if(isLight) { document.body.removeAttribute('data-theme'); localStorage.setItem('theme', 'dark'); }
        else { document.body.setAttribute('data-theme', 'light'); localStorage.setItem('theme', 'light'); }
    };
}

function initSearchListener() {
    document.getElementById('global-search').addEventListener('input', (e) => {
        appState.searchTerm = e.target.value.toLowerCase();
        if (appState.view === 'batches') renderBatches();
        if (appState.view === 'chapters') renderChapters();
    });
}

function setupPlayerModalControls() {
    const notesBtn = document.getElementById('vp-menu-btn');
    const sidebar = document.getElementById('vp-sidebar');
    if (notesBtn && sidebar) notesBtn.onclick = () => sidebar.classList.toggle('sidebar-open');
    document.getElementById('close-sidebar').onclick = () => sidebar.classList.remove('sidebar-open');
}

function initKeepAlive() { setInterval(() => fetch(BASE_API + 'ping', { method: 'HEAD', mode: 'no-cors' }), 300000); }

// AI Doubt Solver logic as it was
function initDoubtSolver() {
    const btn = document.getElementById('doubt-btn');
    const modal = document.getElementById('doubt-modal');
    if(btn) btn.onclick = () => modal.classList.toggle('hidden');
    document.getElementById('close-doubt').onclick = () => modal.classList.add('hidden');
    // ... (rest of AI logic from your previous code)
}
