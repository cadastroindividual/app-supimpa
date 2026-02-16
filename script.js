import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue, set, push, serverTimestamp, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

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
let currentChat = null;

// DEFINIÇÕES DE SELOS
const BADGES = {
    "lider-lendario": { t: "Líder de Líderes", d: "Mais de 3 anos de casa, uau! Não é para qualquer um.", c: "lendario" },
    "agilidade-raro": { t: "Agilidade em Pessoa", d: "Esse ADM é rápido no gatilho!", c: "raro" },
    "festa-comum": { t: "Festa da Firma", d: "Só vejo esse ADM em festas ou aniversários.", c: "comum" }
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
    } else alert("Usuário ou Senha inválidos.");
};

// 2. INICIALIZAÇÃO
function startApp() {
    document.getElementById('tela-login').classList.add('hidden');
    document.getElementById('main-header').classList.remove('hidden');
    document.getElementById('main-content').classList.remove('hidden');
    
    // UI Updates
    document.getElementById('nav-user-nome').innerText = currentUser.nome;
    document.getElementById('perfil-nome-completo').innerText = currentUser.nome;

    // Escuta Foto e Status do Usuário Logado
    onValue(ref(db, `users/${currentUser.nome.replace(/\s/g, '')}`), (s) => {
        const data = s.val() || {};
        document.getElementById('nav-user-img').src = data.foto || 'https://via.placeholder.com/100';
        document.getElementById('perfil-foto-grande').src = data.foto || 'https://via.placeholder.com/100';
        document.getElementById('nav-user-status').innerText = data.status || 'Online';
        renderizarBadges(data.badges || {});
    });

    ouvirEquipe();
    carregarFeed();
    prepararAdmin();
    lucide.createIcons();
}

// 3. MONITORAMENTO DA EQUIPE (HOME)
async function ouvirEquipe() {
    const res = await fetch('equipe.json');
    const equipeData = await res.json();
    
    onValue(ref(db, 'config'), (snapConfig) => {
        const config = snapConfig.val() || {};
        const lista = document.getElementById('lista-equipe');
        lista.innerHTML = '';

        onValue(ref(db, 'users'), (snapUsers) => {
            const allUsers = snapUsers.val() || {};
            lista.innerHTML = '';

            equipeData.forEach(adm => {
                const id = adm.nome.replace(/\s/g, '');
                const userDb = allUsers[id] || {};
                const isDestaque = adm.nome === config.funcionarioDoMes;
                const hasLendario = userDb.badges && userDb.badges['lider-lendario'];
                const temMensagem = userDb.chatWith === currentUser.nome.replace(/\s/g, '');

                lista.innerHTML += `
                    <div class="${isDestaque ? 'gold-card' : ''} ${temMensagem ? 'chat-unread' : ''}">
                        <div class="${isDestaque ? 'gold-inner' : 'glass-card p-4'} flex justify-between items-center">
                            <div class="flex items-center gap-3 cursor-pointer" onclick="verPerfilOutro('${adm.nome}')">
                                <img src="${userDb.foto || 'https://via.placeholder.com/50'}" class="w-10 h-10 rounded-full border-2 border-white object-cover">
                                <div>
                                    <p class="text-[11px] font-black text-blue-900">${adm.nome} ${hasLendario ? '<span class="badge-lendario"></span>' : ''}</p>
                                    <p class="text-[8px] font-bold text-blue-500 uppercase">${userDb.status || 'Offline'}</p>
                                </div>
                            </div>
                            <div class="flex gap-2">
                                <button onclick="iniciarChat('${adm.nome}', '${userDb.foto}')" class="text-blue-600"><i data-lucide="message-circle" class="w-4 h-4"></i></button>
                                <a href="https://wa.me/${adm.fone}" class="text-green-600"><i data-lucide="phone" class="w-4 h-4"></i></a>
                            </div>
                        </div>
                    </div>`;
            });
            lucide.createIcons();
        });
    });
}

// 4. CHAT EM TEMPO REAL
window.iniciarChat = (nome, foto) => {
    currentChat = nome.replace(/\s/g, '');
    document.getElementById('chat-header-nome').innerText = nome;
    document.getElementById('chat-header-img').src = foto || 'https://via.placeholder.com/50';
    abrirTela('tela-chat');
    
    const chatID = [currentUser.nome.replace(/\s/g, ''), currentChat].sort().join('_');
    onValue(ref(db, `chats/${chatID}`), (s) => {
        const msgs = document.getElementById('chat-mensagens');
        msgs.innerHTML = '';
        s.forEach(m => {
            const msg = m.val();
            const side = msg.de === currentUser.nome ? 'msg-me' : 'msg-them';
            msgs.innerHTML += `<div class="msg-bubble ${side}">${msg.txt}</div>`;
        });
        msgs.scrollTop = msgs.scrollHeight;
    });
};

window.enviarMensagem = () => {
    const txt = document.getElementById('chat-input').value;
    if(!txt) return;
    const chatID = [currentUser.nome.replace(/\s/g, ''), currentChat].sort().join('_');
    push(ref(db, `chats/${chatID}`), { de: currentUser.nome, txt, time: serverTimestamp() });
    document.getElementById('chat-input').value = '';
};

// 5. ADMIN E PERMISSÕES
window.tentarAcessoAdmin = () => {
    const nome = currentUser.nome;
    if(nome === "Narciso Silva" || nome === "Cleide Tavares") {
        document.getElementById('modal-admin').classList.remove('hidden');
    } else {
        alert("🚨 ACESSO RESTRITO: Apenas Narry (Futuro Presidente) e Cleide Tavares podem acessar.");
    }
};

window.darSelo = () => {
    const target = document.getElementById('sel-func').value;
    const badgeKey = document.getElementById('sel-badge').value;
    set(ref(db, `users/${target}/badges/${badgeKey}`), true);
    alert("Selo atribuído com sucesso!");
};

async function prepararAdmin() {
    const res = await fetch('equipe.json');
    const equipe = await res.json();
    const select = document.getElementById('sel-func');
    equipe.forEach(a => select.innerHTML += `<option value="${a.nome.replace(/\s/g, '')}">${a.nome}</option>`);
}

// 6. FEED E OUTROS
function carregarFeed() {
    onValue(ref(db, 'feed'), (s) => {
        const container = document.getElementById('feed-posts');
        container.innerHTML = '';
        const list = [];
        s.forEach(p => { list.unshift({id: p.key, ...p.val()}); });
        
        list.forEach(p => {
            const timeAgo = p.time ? calcularTempo(p.time) : 'Agora';
            container.innerHTML += `
                <div class="glass-card p-5 space-y-2">
                    <p class="text-[10px] font-black text-blue-900">${p.autor} • <span class="text-gray-400">${timeAgo}</span></p>
                    <p class="text-sm font-medium">${p.txt}</p>
                    ${p.img ? `<img src="${p.img}" class="rounded-xl w-full">` : ''}
                </div>`;
        });
    });
}

function calcularTempo(timestamp) {
    const diff = Math.floor((Date.now() - timestamp) / 60000);
    if(diff < 1) return 'Agora mesmo';
    if(diff < 60) return `Há ${diff} min`;
    const horas = Math.floor(diff/60);
    if(horas < 24) return `Há ${horas} horas`;
    return `Há ${Math.floor(horas/24)} dias`;
}

// AUXILIARES
window.abrirTela = (id) => {
    document.querySelectorAll('main > section').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    if(id === 'tela-menu') currentChat = null;
    lucide.createIcons();
};

window.mudarStatus = () => {
    const s = document.getElementById('status-select').value;
    set(ref(db, `users/${currentUser.nome.replace(/\s/g, '')}/status`), s);
};

window.uploadFoto = () => {
    const file = document.getElementById('up-foto').files[0];
    const reader = new FileReader();
    reader.onloadend = () => set(ref(db, `users/${currentUser.nome.replace(/\s/g, '')}/foto`), reader.result);
    if(file) reader.readAsDataURL(file);
};

function renderizarBadges(badges) {
    const container = document.getElementById('perfil-badges');
    container.innerHTML = '';
    Object.keys(badges).forEach(k => {
        const b = BADGES[k];
        container.innerHTML += `<div class="p-2 glass-card text-[9px] font-black ${b.c === 'lendario' ? 'border-yellow-400 text-yellow-700' : ''}">
            ${b.t.toUpperCase()}<br><span class="font-normal opacity-60">${b.d}</span>
        </div>`;
    });
}

window.salvarAdmin = () => set(ref(db, 'config/funcionarioDoMes'), document.getElementById('input-mes').value);
window.fecharAdmin = () => document.getElementById('modal-admin').classList.add('hidden');
window.logout = () => { localStorage.removeItem('supimpa_session'); location.reload(); };

// Check Sessão
const session = localStorage.getItem('supimpa_session');
if(session) { currentUser = JSON.parse(session); startApp(); }
