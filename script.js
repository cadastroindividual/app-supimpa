import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue, set, push, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyB69yq8gyn_hDn2Cbbhb1wwIpzvQp_dkwA",
    authDomain: "app-supimpa.firebaseapp.com",
    databaseURL: "https://app-supimpa-default-rtdb.firebaseio.com",
    projectId: "app-supimpa",
    storageBucket: "app-supimpa.firebasestorage.app",
    messagingSenderId: "865217946023",
    appId: "1:865217946023:web:da6b0ea582d863ecd4d682"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
let currentUser = null;
let currentChatID = null;

const BADGES = {
    "lider": { t: "Líder de Líderes", d: "Mais de 3 anos de casa.", c: "lendario" },
    "presidente": { t: "Futuro Presidente", d: "Herdeiro da Hapvida.", c: "lendario" },
    "sniper": { t: "Sniper do PME", d: "Não perde um contrato.", c: "raro" },
    "anjo": { t: "Anjo da Guarda", d: "Sempre ajudando a equipe.", c: "raro" },
    "cafe": { t: "Cafeineiro Oficial", d: "Movido a base de grãos.", c: "comum" },
    "festa": { t: "Festa da Firma", d: "O rei das comemorações.", c: "comum" }
};

// 1. LOGIN
window.realizarLogin = async () => {
    const user = document.getElementById('login-user').value.toLowerCase().trim();
    const pass = document.getElementById('login-pass').value;
    const res = await fetch('equipe.json');
    const equipe = await res.json();
    const find = equipe.find(f => f.nome.split(' ')[0].toLowerCase() === user && pass === "123");

    if (find) {
        currentUser = find;
        localStorage.setItem('supimpa_session', JSON.stringify(currentUser));
        location.reload();
    } else alert("Acesso Negado.");
};

// 2. BOOTSTRAP
function init() {
    document.getElementById('tela-login').classList.add('hidden');
    document.getElementById('main-header').classList.remove('hidden');
    document.getElementById('main-content').classList.remove('hidden');
    
    document.getElementById('nav-nome').innerText = currentUser.nome;
    document.getElementById('perfil-nome').innerText = currentUser.nome;

    onValue(ref(db, `users/${currentUser.nome.replace(/\s/g, '')}`), (s) => {
        const d = s.val() || {};
        document.getElementById('nav-img').src = d.foto || 'https://via.placeholder.com/80';
        document.getElementById('perfil-foto').src = d.foto || 'https://via.placeholder.com/80';
        document.getElementById('nav-status').innerText = d.status || 'Online';
        renderBadges(d.badges || {});
    });

    carregarEquipe();
    carregarFeed();
    prepararAdmin();
    lucide.createIcons();
}

// 3. FEED COM VÍDEO
window.postarFeed = () => {
    const txt = document.getElementById('feed-text').value;
    const file = document.getElementById('feed-file').files[0];
    if(!txt && !file) return;

    const postRef = push(ref(db, 'feed'));
    const data = { autor: currentUser.nome, txt, time: serverTimestamp() };

    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            data.midia = reader.result;
            data.tipo = file.type.includes('video') ? 'video' : 'foto';
            set(postRef, data);
            document.getElementById('feed-text').value = '';
        };
        reader.readAsDataURL(file);
    } else {
        set(postRef, data);
        document.getElementById('feed-text').value = '';
    }
};

function carregarFeed() {
    onValue(ref(db, 'feed'), (s) => {
        const container = document.getElementById('feed-posts');
        container.innerHTML = '';
        const list = [];
        s.forEach(p => list.unshift({id: p.key, ...p.val()}));

        list.forEach(p => {
            const mediaTag = p.tipo === 'video' 
                ? `<video src="${p.midia}" controls class="w-full mt-2"></video>`
                : (p.midia ? `<img src="${p.midia}" class="w-full mt-2 rounded-xl">` : '');
            
            container.innerHTML += `
                <div class="glass-card p-5 space-y-2">
                    <p class="text-[10px] font-black text-blue-900 uppercase">${p.autor}</p>
                    <p class="text-sm font-medium text-blue-800">${p.txt}</p>
                    ${mediaTag}
                </div>`;
        });
    });
}

// 4. CHAT E EQUIPE
function carregarEquipe() {
    onValue(ref(db, 'config'), (sc) => {
        const config = sc.val() || {};
        onValue(ref(db, 'users'), (su) => {
            const users = su.val() || {};
            const lista = document.getElementById('lista-equipe');
            lista.innerHTML = '';

            fetch('equipe.json').then(r => r.json()).then(equipe => {
                equipe.forEach(adm => {
                    const id = adm.nome.replace(/\s/g, '');
                    const dbData = users[id] || {};
                    const isMes = adm.nome === config.funcionarioDoMes;
                    
                    lista.innerHTML += `
                        <div class="${isMes ? 'gold-card' : 'glass-card p-4'}">
                            <div class="${isMes ? 'gold-inner' : 'flex justify-between items-center'}">
                                <div class="flex items-center gap-3 cursor-pointer" onclick="abrirChat('${adm.nome}', '${dbData.foto}')">
                                    <img src="${dbData.foto || 'https://via.placeholder.com/50'}" class="w-10 h-10 rounded-full object-cover">
                                    <div>
                                        <p class="text-[11px] font-black">${adm.nome} ${dbData.badges?.lider ? '<span class="badge-lendario"></span>' : ''}</p>
                                        <p class="text-[8px] font-bold text-blue-500 uppercase">${dbData.status || 'Offline'}</p>
                                    </div>
                                </div>
                                <button onclick="abrirChat('${adm.nome}', '${dbData.foto}')" class="text-blue-500"><i data-lucide="message-square" class="w-4 h-4"></i></button>
                            </div>
                        </div>`;
                });
                lucide.createIcons();
            });
        });
    });
}

window.abrirChat = (nome, foto) => {
    const meuId = currentUser.nome.replace(/\s/g, '');
    const outroId = nome.replace(/\s/g, '');
    currentChatID = [meuId, outroId].sort().join('_');
    document.getElementById('chat-nome').innerText = nome;
    document.getElementById('chat-img').src = foto || 'https://via.placeholder.com/50';
    abrirTela('tela-chat');

    onValue(ref(db, `chats/${currentChatID}`), (s) => {
        const box = document.getElementById('chat-box');
        box.innerHTML = '';
        s.forEach(m => {
            const msg = m.val();
            const isMe = msg.de === currentUser.nome;
            box.innerHTML += `<div class="p-3 rounded-2xl max-w-[80%] text-xs font-bold ${isMe ? 'bg-blue-600 text-white self-end' : 'bg-white text-gray-800 self-start shadow-sm'}">${msg.txt}</div>`;
        });
        box.scrollTop = box.scrollHeight;
    });
};

window.enviarMsg = () => {
    const txt = document.getElementById('chat-in').value;
    if(!txt) return;
    push(ref(db, `chats/${currentChatID}`), { de: currentUser.nome, txt, time: serverTimestamp() });
    document.getElementById('chat-in').value = '';
};

// 5. PERMISSÕES E ADMIN
window.tentarAcessoAdmin = () => {
    const n = currentUser.nome;
    if(n === "Narciso Silva" || n === "Cleide Tavares") document.getElementById('modal-admin').classList.remove('hidden');
    else alert("🚨 Acesso restrito à Gerência!");
};

window.darSelo = () => {
    const target = document.getElementById('adm-alvo').value;
    const badge = document.getElementById('adm-selo').value;
    set(ref(db, `users/${target}/badges/${badge}`), true);
    alert("Conquista desbloqueada!");
};

function prepararAdmin() {
    const s1 = document.getElementById('adm-alvo');
    const s2 = document.getElementById('adm-selo');
    fetch('equipe.json').then(r => r.json()).then(eq => {
        eq.forEach(a => s1.innerHTML += `<option value="${a.nome.replace(/\s/g,'')}">${a.nome}</option>`);
    });
    Object.keys(BADGES).forEach(k => s2.innerHTML += `<option value="${k}">${BADGES[k].t}</option>`);
}

// UTILITÁRIOS
window.abrirTela = (id) => {
    document.querySelectorAll('main > section').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    lucide.createIcons();
};

window.mudarStatus = () => set(ref(db, `users/${currentUser.nome.replace(/\s/g,'')}/status`), document.getElementById('status-select').value);

window.uploadFoto = () => {
    const file = document.getElementById('up-foto').files[0];
    const reader = new FileReader();
    reader.onloadend = () => set(ref(db, `users/${currentUser.nome.replace(/\s/g,'')}/foto`), reader.result);
    if(file) reader.readAsDataURL(file);
};

function renderBadges(badges) {
    const c = document.getElementById('perfil-badges');
    c.innerHTML = '';
    Object.keys(badges).forEach(k => {
        const b = BADGES[k];
        c.innerHTML += `<div class="p-2 glass-card text-[9px] font-black ${b.c === 'lendario' ? 'text-yellow-600 border-yellow-400' : ''}">${b.t}</div>`;
    });
}

window.salvarAdmin = () => set(ref(db, 'config/funcionarioDoMes'), document.getElementById('input-mes').value);
window.fecharAdmin = () => document.getElementById('modal-admin').classList.add('hidden');
window.logout = () => { localStorage.removeItem('supimpa_session'); location.reload(); };

const session = localStorage.getItem('supimpa_session');
if(session) { currentUser = JSON.parse(session); init(); }
