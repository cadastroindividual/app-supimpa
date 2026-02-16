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
let chatAlvoId = null;
let slotDestaqueAtivo = 1;

// DEFINIÇÕES DE SELOS
const BADGES = {
    "lider": { t: "Líder de Líderes", d: "Mais de 3 anos de casa. O veterano supremo.", r: "lendario" },
    "estrategista": { t: "Estrategista Hapvida", d: "Desenha as melhores estratégias de vendas.", r: "lendario" },
    "presidente": { t: "Futuro Presidente", d: "A cadeira da presidência te espera.", r: "lendario" },
    "agilidade": { t: "Agilidade em Pessoa", d: "O ADM mais rápido no gatilho do sistema.", r: "raro" },
    "sniper": { t: "Sniper do PME", d: "Não perde um contrato de PME.", r: "raro" },
    "mestre": { t: "Mestre do Fechamento", d: "Consegue o 'sim' em situações impossíveis.", r: "raro" },
    "anjo": { t: "Anjo da Guarda", d: "Sempre para tudo para ajudar um colega.", r: "raro" },
    "festa": { t: "Festa da Firma", d: "O primeiro a confirmar em qualquer evento.", r: "comum" },
    "cafe": { t: "Cafeineiro Oficial", d: "Move-se a base de café.", r: "comum" }
};

window.realizarLogin = async () => {
    const user = document.getElementById('login-user').value.toLowerCase().trim();
    const pass = document.getElementById('login-pass').value;
    const res = await fetch('equipe.json');
    const equipe = await res.json();
    const find = equipe.find(f => f.nome.split(' ')[0].toLowerCase() === user && (pass === "123" || pass === "supimpa2024"));

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
    
    verificarResetMensal();
    ganharPontos('checkin');
    ouvirFeed();
    carregarEquipe();
    prepararAdmin();
    lucide.createIcons();
}

// LOGICA DE XP E RESET
async function verificarResetMensal() {
    const hoje = new Date();
    const mesAno = `${hoje.getMonth() + 1}-${hoje.getFullYear()}`;
    const snap = await get(ref(db, 'config/ultimoReset'));
    
    if (hoje.getDate() === 1 && snap.val() !== mesAno) {
        const usersSnap = await get(ref(db, 'users'));
        const users = usersSnap.val();
        for (let id in users) {
            if (id !== 'config') await update(ref(db, `users/${id}`), { xp: 0 });
        }
        await set(ref(db, 'config/ultimoReset'), mesAno);
        console.log("XP Resetado para novo mês!");
    }
}

window.ganharPontos = async (tipo) => {
    const id = currentUser.nome.replace(/\s/g, '');
    const userRef = ref(db, `users/${id}`);
    const hoje = new Date().toLocaleDateString();
    const snap = await get(userRef);
    const data = snap.val() || {};
    
    if (data.historico?.[tipo] === hoje) return;

    let pontos = 5;
    if (tipo === 'checkin') pontos = 10;
    if (tipo === 'seloLendario') pontos = 100;

    await update(userRef, { 
        xp: (data.xp || 0) + pontos,
        [`historico/${tipo}`]: hoje
    });
};

// RANKING E CARDS
function carregarEquipe() {
    onValue(ref(db, 'users'), (su) => {
        const users = su.val() || {};
        const fMesId = users.config?.funcionarioMes;
        const lista = document.getElementById('lista-equipe');
        lista.innerHTML = '';

        fetch('equipe.json').then(r => r.json()).then(eq => {
            eq.sort((a, b) => (users[b.nome.replace(/\s/g,'')]?.xp || 0) - (users[a.nome.replace(/\s/g,'')]?.xp || 0));
            eq.forEach(adm => {
                const id = adm.nome.replace(/\s/g, '');
                const d = users[id] || {};
                const ehFMes = fMesId === id;
                const temMsg = d.chats?.[currentUser.nome.replace(/\s/g,'')]?.nova;

                lista.innerHTML += `
                    <div class="glass-card p-4 flex items-center gap-3 ${ehFMes ? 'card-f-mes' : ''} ${temMsg ? 'msg-alert' : ''}">
                        <div class="relative cursor-pointer" onclick="verPerfil('${adm.nome}')">
                            <img src="${d.foto || 'https://via.placeholder.com/80'}" class="w-14 h-14 rounded-full object-cover border-2 border-white">
                            <div class="status-dot bg-${d.status || 'offline'}"></div>
                        </div>
                        <div class="flex-1 cursor-pointer" onclick="verPerfil('${adm.nome}')">
                            <p class="text-[11px] font-black">${adm.nome} ${d.badges?.lendario ? '🏆' : ''}</p>
                            <div class="w-full h-1.5 xp-bar-bg rounded-full mt-1 overflow-hidden">
                                <div class="h-full xp-bar-fill" style="width: ${(d.xp || 0) % 100}%"></div>
                            </div>
                        </div>
                        <div class="flex gap-2">
                            <a href="https://wa.me/${adm.fone}" target="_blank" class="p-2 bg-green-500/10 text-green-600 rounded-lg"><i data-lucide="phone" class="w-4 h-4"></i></a>
                            <button onclick="abrirChat('${adm.nome}')" class="p-2 bg-blue-500/10 text-blue-600 rounded-lg"><i data-lucide="message-circle" class="w-4 h-4"></i></button>
                        </div>
                    </div>`;
            });
            lucide.createIcons();
        });
    });
}

// PERFIL E FOTOS
window.verPerfil = async (nome) => {
    const id = nome.replace(/\s/g, '');
    const snap = await get(ref(db, `users/${id}`));
    const d = snap.val() || {};
    const res = await fetch('equipe.json');
    const adm = (await res.json()).find(a => a.nome === nome);

    document.getElementById('perf-view-img').src = d.foto || 'https://via.placeholder.com/80';
    document.getElementById('perf-view-nome').innerText = nome;
    document.getElementById('perf-view-status-tag').innerText = d.status || 'offline';
    
    for(let i=1; i<=3; i++) document.getElementById(`destaque-${i}`).src = d.destaques?.[i] || 'https://via.placeholder.com/100';

    const isMe = nome === currentUser.nome;
    document.getElementById('label-edit-photo').classList.toggle('hidden', !isMe);
    document.getElementById('status-select').classList.toggle('hidden', !isMe);
    document.getElementById('btn-logout').classList.toggle('hidden', !isMe);

    const bCont = document.getElementById('perf-view-badges');
    bCont.innerHTML = '';
    if(d.badges) {
        Object.keys(d.badges).forEach(k => {
            const b = BADGES[k];
            if(b) bCont.innerHTML += `<div class="p-3 glass-card border-l-4 ${b.r === 'lendario' ? 'border-yellow-400 bg-yellow-400/10' : 'border-blue-400 bg-blue-400/10'}"><p class="text-[10px] font-black uppercase">${b.t}</p><p class="text-[8px] font-medium text-blue-900/60">${b.d}</p></div>`;
        });
    }
    abrirTela('tela-perfil');
};

window.mudarStatus = (v) => {
    const id = currentUser.nome.replace(/\s/g, '');
    update(ref(db, `users/${id}`), { status: v });
    document.getElementById('perf-view-status-tag').innerText = v;
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

window.triggerDestaque = (s) => {
    if(document.getElementById('perf-view-nome').innerText !== currentUser.nome) return;
    slotDestaqueAtivo = s;
    document.getElementById('file-destaque').click();
};

window.uploadDestaque = (el) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        const id = currentUser.nome.replace(/\s/g, '');
        update(ref(db, `users/${id}/destaques`), { [slotDestaqueAtivo]: e.target.result });
        document.getElementById(`destaque-${slotDestaqueAtivo}`).src = e.target.result;
    };
    reader.readAsDataURL(el.files[0]);
};

// CHAT E FEED
window.abrirChat = async (nome) => {
    chatAlvoId = nome.replace(/\s/g, '');
    const meuId = currentUser.nome.replace(/\s/g, '');
    const chatId = [meuId, chatAlvoId].sort().join('_');

    const snap = await get(ref(db, `users/${chatAlvoId}`));
    document.getElementById('chat-header-img').src = snap.val()?.foto || 'https://via.placeholder.com/80';
    document.getElementById('chat-header-nome').innerText = nome;

    onValue(ref(db, `chats/${chatId}`), (s) => {
        const cont = document.getElementById('chat-mensagens');
        cont.innerHTML = '';
        s.forEach(m => {
            const data = m.val();
            const isMe = data.u === meuId;
            cont.innerHTML += `<div class="flex ${isMe ? 'justify-end' : 'justify-start'}"><div class="p-3 rounded-2xl max-w-[80%] text-xs font-bold ${isMe ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-blue-900 shadow-sm'}">${data.t}</div></div>`;
        });
        cont.scrollTo(0, cont.scrollHeight);
    });
    abrirTela('tela-chat');
};

window.enviarMensagem = () => {
    const t = document.getElementById('chat-input').value;
    if(!t) return;
    const meuId = currentUser.nome.replace(/\s/g, '');
    const chatId = [meuId, chatAlvoId].sort().join('_');
    push(ref(db, `chats/${chatId}`), { u: meuId, t: t, time: serverTimestamp() });
    update(ref(db, `users/${chatAlvoId}/chats/${meuId}`), { nova: true });
    document.getElementById('chat-input').value = '';
};

function ouvirFeed() {
    onValue(ref(db, 'feed'), (s) => {
        if(document.getElementById('tela-feed').classList.contains('hidden')) {
            document.getElementById('notif-feed-icon').classList.add('feed-alert');
            document.getElementById('menu-feed-icon').classList.add('feed-alert');
        }
    });
}

window.abrirFeed = () => {
    document.getElementById('notif-feed-icon').classList.remove('feed-alert');
    document.getElementById('menu-feed-icon').classList.remove('feed-alert');
    onValue(ref(db, 'feed'), (s) => {
        const cont = document.getElementById('feed-posts'); cont.innerHTML = '';
        const posts = []; s.forEach(p => posts.unshift(p.val()));
        posts.forEach(p => {
            cont.innerHTML += `<div class="glass-card p-5"><p class="text-[9px] font-black uppercase italic text-blue-900">${p.autor}</p><p class="text-sm font-medium text-blue-800">${p.txt}</p></div>`;
        });
    });
    abrirTela('tela-feed');
};

window.postarFeed = () => {
    const t = document.getElementById('feed-text').value;
    if(!t) return;
    push(ref(db, 'feed'), { autor: currentUser.nome, txt: t, time: serverTimestamp() });
    ganharPontos('post');
    document.getElementById('feed-text').value = '';
};

// ADMIN
window.salvarAdmin = async () => {
    const fMes = document.getElementById('adm-f-mes').value;
    const alvo = document.getElementById('adm-alvo').value;
    const selo = document.getElementById('adm-selo').value;
    
    await update(ref(db, 'users/config'), { funcionarioMes: fMes });
    if(alvo && selo) await update(ref(db, `users/${alvo}/badges`), { [selo]: true });
    alert("Configurações Salvas!");
};

window.tentarAcessoAdmin = () => {
    if(["Narry", "Cleide Tavares"].includes(currentUser.nome)) document.getElementById('modal-admin').classList.remove('hidden');
    else alert("Acesso Restrito!");
};

function prepararAdmin() {
    const s1 = document.getElementById('adm-f-mes');
    const s2 = document.getElementById('adm-alvo');
    const s3 = document.getElementById('adm-selo');
    fetch('equipe.json').then(r => r.json()).then(eq => {
        eq.forEach(a => {
            const opt = `<option value="${a.nome.replace(/\s/g,'')}">${a.nome}</option>`;
            s1.innerHTML += opt; s2.innerHTML += opt;
        });
    });
    Object.keys(BADGES).forEach(k => s3.innerHTML += `<option value="${k}">${BADGES[k].t}</option>`);
}

window.abrirFerramenta = (url, tipo) => { ganharPontos(tipo); window.open(url, '_blank'); };
window.abrirTela = (id) => { document.querySelectorAll('main > section').forEach(s => s.classList.add('hidden')); document.getElementById(id).classList.remove('hidden'); };
window.logout = () => { localStorage.removeItem('supimpa_session'); location.reload(); };
window.verMeuPerfil = () => verPerfil(currentUser.nome);

const sess = localStorage.getItem('supimpa_session');
if(sess) { currentUser = JSON.parse(sess); init(); }
