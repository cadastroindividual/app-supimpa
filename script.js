import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue, set, push, serverTimestamp, update, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

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
let chatAtivoId = null;
let destaqueSlot = 1;

const BADGES = {
    "lider": { t: "Líder de Líderes", d: "Mais de 3 anos de casa. O veterano supremo.", c: "lendario" },
    "presidente": { t: "Futuro Presidente", d: "A cadeira da presidência te espera.", c: "lendario" },
    "sniper": { t: "Sniper do PME", d: "Não perde um contrato de PME.", c: "raro" },
    // ... Adicione os outros aqui seguindo este padrão
};

window.realizarLogin = async () => {
    const user = document.getElementById('login-user').value.toLowerCase().trim();
    const pass = document.getElementById('login-pass').value;
    const res = await fetch('equipe.json');
    const equipe = await res.json();
    const find = equipe.find(f => f.nome.split(' ')[0].toLowerCase() === user && pass === "123");

    if (find) {
        currentUser = find;
        const id = find.nome.replace(/\s/g, '');
        await update(ref(db, `users/${id}`), { status: 'online' });
        localStorage.setItem('supimpa_session', JSON.stringify(currentUser));
        location.reload();
    } else alert("Usuário não encontrado.");
};

function init() {
    document.getElementById('tela-login').classList.add('hidden');
    document.getElementById('main-header').classList.remove('hidden');
    document.getElementById('main-content').classList.remove('hidden');
    
    ganharPontos('checkin');
    ouvirNotificacoes();
    carregarEquipe();
    carregarStories();
    prepararAdmin();
    lucide.createIcons();
}

window.ganharPontos = async (tipo) => {
    const id = currentUser.nome.replace(/\s/g, '');
    const userRef = ref(db, `users/${id}`);
    const hoje = new Date().toLocaleDateString();
    const snap = await get(userRef);
    const data = snap.val() || {};
    
    if (data.historicoAcoes?.[tipo] === hoje) return; // Não mostra nada se já ganhou hoje

    let xp = (data.xp || 0) + 5;
    if(tipo === 'checkin') xp += 5;

    await update(userRef, { xp: xp, [`historicoAcoes/${tipo}`]: hoje });
    alert(`XP do dia em ${tipo} coletado! (+5 XP)`);
};

window.abrirFerramenta = (url, tipo) => {
    ganharPontos(tipo);
    window.open(url, '_blank');
};

function carregarEquipe() {
    onValue(ref(db, 'users'), (su) => {
        const users = su.val() || {};
        const lista = document.getElementById('lista-equipe');
        lista.innerHTML = '';

        fetch('equipe.json').then(r => r.json()).then(eq => {
            eq.sort((a, b) => (users[b.nome.replace(/\s/g,'')]?.xp || 0) - (users[a.nome.replace(/\s/g,'')]?.xp || 0));
            eq.forEach(adm => {
                const id = adm.nome.replace(/\s/g, '');
                const d = users[id] || {};
                const ehFMes = users.config?.funcionarioMes === id;
                const temMsg = d.mensagens?.[currentUser.nome.replace(/\s/g,'')]?.nova;

                lista.innerHTML += `
                    <div class="glass-card p-4 flex items-center gap-3 transition-all ${ehFMes ? 'card-f-mes' : ''} ${temMsg ? 'msg-alert' : ''}">
                        <div class="relative cursor-pointer" onclick="verPerfil('${adm.nome}')">
                            <img src="${d.foto || 'https://via.placeholder.com/80'}" class="w-14 h-14 rounded-full object-cover border-2 border-white">
                            <div class="status-dot absolute bottom-0 right-0 bg-${d.status || 'offline'}"></div>
                        </div>
                        <div class="flex-1 cursor-pointer" onclick="verPerfil('${adm.nome}')">
                            <p class="text-[11px] font-black">${adm.nome} ${d.badges?.lendario ? '🏆' : ''}</p>
                            <p class="text-[7px] font-bold text-blue-500 uppercase">${d.xp || 0} XP ACUMULADO</p>
                        </div>
                        <div class="flex gap-2">
                            <a href="https://wa.me/${adm.fone}" target="_blank" class="p-2 bg-green-500/20 text-green-600 rounded-lg"><i data-lucide="phone" class="w-4 h-4"></i></a>
                            <button onclick="abrirChat('${adm.nome}')" class="p-2 bg-blue-500/20 text-blue-600 rounded-lg"><i data-lucide="message-square" class="w-4 h-4"></i></button>
                        </div>
                    </div>`;
            });
            lucide.createIcons();
        });
    });
}

// LÓGICA DE CHAT INTERNO
window.abrirChat = (nomeAlvo) => {
    chatAtivoId = nomeAlvo.replace(/\s/g, '');
    const meuId = currentUser.nome.replace(/\s/g, '');
    
    // Limpar alerta de nova mensagem
    update(ref(db, `users/${meuId}/mensagens/${chatAtivoId}`), { nova: false });
    
    onValue(ref(db, `chats/${gerarChatId(meuId, chatAtivoId)}`), (s) => {
        const msgs = s.val() || {};
        const cont = document.getElementById('chat-mensagens');
        cont.innerHTML = '';
        Object.values(msgs).forEach(m => {
            const isMe = m.sender === meuId;
            cont.innerHTML += `<div class="flex ${isMe ? 'justify-end' : 'justify-start'}">
                <div class="${isMe ? 'bg-blue-600 text-white' : 'bg-white text-blue-900'} p-3 rounded-2xl max-w-[80%] text-sm font-medium shadow-sm">
                    ${m.txt}
                </div>
            </div>`;
        });
        cont.scrollTo(0, cont.scrollHeight);
    });
    
    document.getElementById('chat-alvo-nome').innerText = nomeAlvo;
    abrirTela('tela-chat');
};

function gerarChatId(id1, id2) { return [id1, id2].sort().join('_'); }

window.enviarMensagem = () => {
    const txt = document.getElementById('chat-input').value;
    if(!txt) return;
    const meuId = currentUser.nome.replace(/\s/g, '');
    
    push(ref(db, `chats/${gerarChatId(meuId, chatAtivoId)}`), { sender: meuId, txt: txt, time: serverTimestamp() });
    update(ref(db, `users/${chatAtivoId}/mensagens/${meuId}`), { nova: true });
    document.getElementById('chat-input').value = '';
};

// PERFIL & FOTOS
window.verPerfil = async (nome) => {
    const id = nome.replace(/\s/g, '');
    const snap = await get(ref(db, `users/${id}`));
    const d = snap.val() || {};
    const res = await fetch('equipe.json');
    const eq = await res.json();
    const adm = eq.find(a => a.nome === nome);

    document.getElementById('perf-view-img').src = d.foto || 'https://via.placeholder.com/80';
    document.getElementById('perf-view-nome').innerText = nome;
    document.getElementById('perf-view-status').innerText = d.status || 'offline';
    
    // Slots de Destaque
    for(let i=1; i<=3; i++) {
        document.getElementById(`destaque-${i}`).src = d.destaques?.[i] || 'https://via.placeholder.com/100';
    }

    // Mostrar botões de edição se for o dono
    const isMe = nome === currentUser.nome;
    document.getElementById('status-select').classList.toggle('hidden', !isMe);
    document.getElementById('btn-edit-photo').classList.toggle('hidden', !isMe);
    document.getElementById('btn-logout').classList.toggle('hidden', !isMe);

    abrirTela('tela-perfil');
};

window.triggerDestaque = (slot) => {
    if(document.getElementById('perf-view-nome').innerText !== currentUser.nome) return;
    destaqueSlot = slot;
    document.getElementById('file-destaque').click();
};

window.uploadFotoPerfil = (el) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        const id = currentUser.nome.replace(/\s/g, '');
        update(ref(db, `users/${id}`), { foto: e.target.result });
        document.getElementById('perf-view-img').src = e.target.result;
    };
    reader.readAsDataURL(el.files[0]);
};

window.uploadDestaque = (el) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        const id = currentUser.nome.replace(/\s/g, '');
        update(ref(db, `users/${id}/destaques`), { [destaqueSlot]: e.target.result });
        document.getElementById(`destaque-${destaqueSlot}`).src = e.target.result;
    };
    reader.readAsDataURL(el.files[0]);
};

window.mudarStatus = (val) => {
    const id = currentUser.nome.replace(/\s/g, '');
    update(ref(db, `users/${id}`), { status: val });
    document.getElementById('perf-view-status').innerText = val;
};

// ADMIN & RESET MENSAL
window.salvarAdmin = async () => {
    const fMes = document.getElementById('adm-f-mes').value;
    await update(ref(db, 'users/config'), { funcionarioMes: fMes });
    
    const alvo = document.getElementById('adm-alvo').value;
    const badge = document.getElementById('adm-selo').value;
    if(alvo && badge) {
        await update(ref(db, `users/${alvo}/badges`), { [badge]: true });
    }
    alert("Dados atualizados!");
};

window.tentarAcessoAdmin = () => {
    if(currentUser.nome === "Narry" || currentUser.nome === "Cleide Tavares") {
        document.getElementById('modal-admin').classList.remove('hidden');
    } else alert("Restrito ao Presidente e Gerência!");
};

window.logout = async () => {
    const id = currentUser.nome.replace(/\s/g, '');
    await update(ref(db, `users/${id}`), { status: 'offline' });
    localStorage.removeItem('supimpa_session');
    location.reload();
};

// Iniciar app
const sess = localStorage.getItem('supimpa_session');
if(sess) { currentUser = JSON.parse(sess); init(); }
