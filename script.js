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

// ✅ ISSUE 1 FIX: Mobile Landscape Force on Fullscreen
player.on('enterfullscreen', () => {
    try {
        if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('landscape').catch((e) => console.log("Orientation lock not supported"));
        }
    } catch (err) {
        console.log("Landscape mode error:", err);
    }
});

player.on('exitfullscreen', () => {
    if (screen.orientation && screen.orientation.unlock) {
        screen.orientation.unlock();
    }
});

/* ========================================= */
/* 2. INITIALIZATION & DATA LOADING          */
/* ========================================= */

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
/* 4. ROUTING & STRICT STOP LOGIC            */
/* ========================================= */

function updateURL(hash) { window.location.hash = hash; }

// ✅ ISSUE 2 & 3 FIX: Audio Kill Function
function stopVideoStrictly() {
    if (typeof player !== 'undefined') {
        player.pause();
        player.source = { type: 'video', sources: [] }; 
    }
    const videoTag = document.getElementById('active-player');
    if (videoTag) {
        videoTag.pause();
        videoTag.src = "";
        videoTag.load();
    }
    document.getElementById('video-player-modal').classList.add('hidden');
}

// Site Back Button Logic
document.getElementById('back-btn').onclick = () => {
    if (!document.getElementById('video-player-modal').classList.contains('hidden')) {
        stopVideoStrictly();
        updateURL(`/class/${appState.classId}/batch/${appState.batchIdx}`);
    } 
    else if (appState.view === 'chapters') {
        updateURL(`/class/${appState.classId}`);
    } 
    else if (appState.view === 'batches' && appState.classId.startsWith('allen-')) {
        updateURL('allen-menu');
    }
    else if (appState.view === 'allen-menu') {
        updateURL('/');
    }
    else {
        updateURL('/');
    }
};

// Hardware Back Button Fix
window.addEventListener('popstate', () => {
    stopVideoStrictly();
});

/* ========================================= */
/* 6. PLAYER LOGIC (REFRESH FIX)             */
/* ========================================= */

function openPlayer(channelId, vidId, title) {
    const modal = document.getElementById('video-player-modal');
    modal.classList.remove('hidden');
    document.getElementById('vp-sidebar').classList.remove('sidebar-open');
    document.getElementById('vp-lecture-name').innerText = title;

    const streamUrl = `${BASE_API}${channelId}/${vidId}`;

    // ✅ Refresh Fix: Har baar naya source force karein taaki play button kaam kare
    if (player) {
        player.source = {
            type: 'video',
            title: title,
            sources: [{ src: streamUrl, type: 'video/mp4' }]
        };
        player.play().catch(e => console.log("Auto-play blocked, interaction required"));
    }
    
    // Yahan agar aapka renderSidebarAttachments function hai toh use call karein
    if (typeof renderSidebarAttachments === 'function') {
        renderSidebarAttachments(channelId);
    } else {
        // Fallback agar function name different ho (Jo aapne pehle code bheja tha)
        renderResourcesInSidebar(channelId); 
    }
}

/* ========================================= */
/* SIDEBAR LOGIC (MERGED FROM YOUR OLD CODE) */
/* ========================================= */

function renderResourcesInSidebar(channelId) {
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
                        const noteEl = document.createElement('div');
                        noteEl.className = 'attachment-item';
                        noteEl.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #111;';
                        let icon = (type === 'DPPs' || type === 'Sheets') ? 'ri-test-tube-line' : 'ri-file-text-line';
                        
                        noteEl.innerHTML = `
                            <div class="res-left" style="gap:10px; display:flex; align-items:center;">
                                <i class="${icon}" style="color:var(--text-sub);"></i>
                                <div style="font-size:0.9rem; color:white;">${doc.title}</div>
                            </div>
                            <button class="btn-small" onclick="openPDF('${channelId}', '${doc.id}')" style="font-size:0.8rem; padding: 5px 10px;"><i class="ri-eye-line"></i> View</button>
                        `;
                        attachList.appendChild(noteEl);
                    });
                }
            });
        } else { attachList.innerHTML = '<div style="color:#666; text-align:center; margin-top: 20px;">No resources.</div>'; }
    }
}
document.getElementById('close-player').onclick = () => {
    if(typeof player !== 'undefined') {
        player.stop(); 
        player.source = { type: 'video', sources: [] }; 
    }
    document.getElementById('video-player-modal').classList.add('hidden');
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
// NOTE: Baaki ke helpers (getBatchStats, getSubjectIcon, handleRouting, initTheme, initDoubtSolver)
// aapke original code se as-it-is niche add kar lein.
