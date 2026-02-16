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

const PONTUACAO = {
    checkin: 10, post: 5, comentario: 2, like: 2, amei: 3, dislike: 2,
    criarEnquete: 5, votarEnquete: 3, anotacao: 5, cotacao: 5, repique: 5, carencia: 5,
    selo_comum: 10, selo_raro: 20, selo_lendario: 100
};

const BADGES = {
    // LENDÁRIOS
    "lider": { t: "Líder de Líderes", d: "Mais de 3 anos de casa. O veterano supremo.", c: "lendario", v: "selo_lendario" },
    "estrategista": { t: "Estrategista Hapvida", d: "Para quem desenha as melhores estratégias de vendas.", c: "lendario", v: "selo_lendario" },
    "presidente": { t: "Futuro Presidente", d: "A cadeira da presidência te espera.", c: "lendario", v: "selo_lendario" },
    
    // RAROS
    "agilidade": { t: "Agilidade em Pessoa", d: "O ADM mais rápido no gatilho do sistema.", c: "raro", v: "selo_raro" },
    "sniper": { t: "Sniper do PME", d: "Não perde um contrato de Pequenas e Médias Empresas.", c: "raro", v: "selo_raro" },
    "mestre": { t: "Mestre do Fechamento", d: "Consegue o 'sim' do cliente até nas situações impossíveis.", c: "raro", v: "selo_raro" },
    "anjo": { t: "Anjo da Guarda", d: "Aquele que sempre para o que está fazendo para ajudar um colega.", c: "raro", v: "selo_raro" },

    // COMUNS
    "festa": { t: "Festa da Firma", d: "O primeiro a confirmar presença em qualquer evento social.", c: "comum", v: "selo_comum" },
    "cafe": { t: "Cafeineiro Oficial", d: "Move-se a base de café. A xícara é parte do corpo.", c: "comum", v: "selo_comum" },
    "feed": { t: "Dono do Feed", d: "O rei da interatividade, posta e comenta em tudo.", c: "comum", v: "selo_comum" },
    "madrugador": { t: "Madrugador Supimpa", d: "O primeiro a dar 'Bom dia' no sistema todos os dias.", c: "comum", v: "selo_comum" },
    "inimigo": { t: "Inimigo da Pendência", d: "Aquele que não dorme enquanto tiver um processo parado.", c: "comum", v: "selo_comum" },
    "dj": { t: "DJ do Setor", d: "Responsável pela energia e animação do ambiente.", c: "comum", v: "selo_comum" },
    "perigo": { t: "Rindo do Perigo", d: "Mantém o bom humor mesmo no fechamento sob pressão.", c: "comum", v: "selo_comum" }
};

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

function init() {
    document.getElementById('tela-login').classList.add('hidden');
    document.getElementById('main-header').classList.remove('hidden');
    document.getElementById('main-content').classList.remove('hidden');
    
    ganharPontos('checkin'); // Check-in automático ao abrir

    onValue(ref(db, `users/${currentUser.nome.replace(/\s/g, '')}`), (s) => {
        const d = s.val() || {};
        document.getElementById('nav-img').src = d.foto || 'https://via.placeholder.com/80';
        document.getElementById('nav-nome').innerText = currentUser.nome;
        document.getElementById('nav-xp').innerText = `${d.xp || 0} XP`;
    });

    carregarEquipe();
    prepararAdmin();
    lucide.createIcons();
}

window.ganharPontos = async (tipo) => {
    const id = currentUser.nome.replace(/\s/g, '');
    const userRef = ref(db, `users/${id}`);
    const hoje = new Date().toLocaleDateString();
    
    const snap = await get(userRef);
    const data = snap.val() || {};
    let xp = data.xp || 0;
    let hist = data.historicoAcoes || {};

    const unicas = ['checkin', 'anotacao', 'cotacao', 'repique', 'carencia'];
    if (unicas.includes(tipo) && hist[tipo] === hoje) return;

    xp += PONTUACAO[tipo];
    if (unicas.includes(tipo)) hist[tipo] = hoje;

    update(userRef, { xp: xp, historicoAcoes: hist });
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
                const xp = d.xp || 0;
                const progresso = xp % 100;

                lista.innerHTML += `
                    <div class="glass-card p-4 flex items-center gap-3 cursor-pointer" onclick="verPerfil('${adm.nome}')">
                        <img src="${d.foto || 'https://via.placeholder.com/80'}" class="w-12 h-12 rounded-full object-cover border-2 border-white">
                        <div class="flex-1">
                            <p class="text-[11px] font-black">${adm.nome}</p>
                            <div class="w-full h-1.5 xp-bar-bg rounded-full mt-1 overflow-hidden">
                                <div class="h-full xp-bar-fill" style="width: ${progresso}%"></div>
                            </div>
                            <p class="text-[7px] font-bold text-blue-500 mt-1 uppercase">${xp} XP</p>
                        </div>
                    </div>`;
            });
        });
    });
}

window.verPerfil = async (nome) => {
    const id = nome.replace(/\s/g, '');
    const snap = await get(ref(db, `users/${id}`));
    const d = snap.val() || {};
    
    const res = await fetch('equipe.json');
    const eq = await res.json();
    const adm = eq.find(a => a.nome === nome);

    document.getElementById('perf-view-img').src = d.foto || 'https://via.placeholder.com/80';
    document.getElementById('perf-view-nome').innerText = nome;
    document.getElementById('perf-view-cargo').innerText = adm.cargo;
    document.getElementById('perf-view-xp-num').innerText = d.xp || 0;
    
    const badgCont = document.getElementById('perf-view-badges');
    badgCont.innerHTML = '';
    
    if(d.badges) {
        Object.keys(d.badges).forEach(key => {
            const info = BADGES[key];
            if(info) {
                badgCont.innerHTML += `
                    <div class="p-3 glass-card selo-${info.c}">
                        <p class="text-[9px] font-black uppercase">${info.t}</p>
                        <p class="text-[8px] font-medium text-blue-900/70">${info.d}</p>
                    </div>`;
            }
        });
    }

    document.getElementById('btn-logout').classList.toggle('hidden', nome !== currentUser.nome);
    abrirTela('tela-perfil');
};

window.verMeuPerfil = () => verPerfil(currentUser.nome);

window.abrirFerramenta = (t) => { ganharPontos(t); alert(`Ferramenta aberta! +5 XP`); };

window.reagir = (id, tipo) => {
    ganharPontos(tipo);
    alert(`Você deu ${tipo}!`);
};

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
            ganharPontos('post');
            document.getElementById('feed-text').value = '';
        };
        reader.readAsDataURL(file);
    } else {
        set(postRef, data);
        ganharPontos('post');
        document.getElementById('feed-text').value = '';
    }
};

function carregarFeed() {
    onValue(ref(db, 'feed'), (s) => {
        const cont = document.getElementById('feed-posts'); cont.innerHTML = '';
        const list = []; s.forEach(p => list.unshift({id: p.key, ...p.val()}));
        list.forEach(p => {
            const midia = p.tipo === 'video' ? `<video src="${p.midia}" controls class="feed-video"></video>` : (p.midia ? `<img src="${p.midia}" class="w-full mt-2 rounded-xl">` : '');
            cont.innerHTML += `
                <div class="glass-card p-5">
                    <p class="text-[9px] font-black text-blue-900 uppercase italic">${p.autor}</p>
                    <p class="text-sm font-medium text-blue-800">${p.txt}</p>
                    ${midia}
                    <div class="flex gap-4 mt-4 border-t border-white/20 pt-3">
                        <button onclick="reagir('${p.id}', 'like')" class="text-[10px] font-black text-blue-600">👍 LIKE (+2)</button>
                        <button onclick="reagir('${p.id}', 'amei')" class="text-[10px] font-black text-pink-600">❤️ AMEI (+3)</button>
                        <button onclick="reagir('${p.id}', 'dislike')" class="text-[10px] font-black text-gray-500">👎 DISLIKE (+2)</button>
                    </div>
                </div>`;
        });
    });
}

window.abrirFeed = () => { carregarFeed(); abrirTela('tela-feed'); };

window.darSelo = async () => {
    const alvo = document.getElementById('adm-alvo').value;
    const badgeKey = document.getElementById('adm-selo').value;
    const info = BADGES[badgeKey];
    await set(ref(db, `users/${alvo}/badges/${badgeKey}`), true);
    const snap = await get(ref(db, `users/${alvo}/xp`));
    let xp = (snap.val() || 0) + PONTUACAO[info.v];
    update(ref(db, `users/${alvo}`), { xp: xp });
    alert("Honraria concedida!");
};

window.tentarAcessoAdmin = () => {
    if(currentUser.nome === "Narciso Silva" || currentUser.nome === "Cleide Tavares") document.getElementById('modal-admin').classList.remove('hidden');
    else alert("Acesso restrito!");
};

function prepararAdmin() {
    const s1 = document.getElementById('adm-alvo');
    const s2 = document.getElementById('adm-selo');
    fetch('equipe.json').then(r => r.json()).then(eq => {
        eq.forEach(a => s1.innerHTML += `<option value="${a.nome.replace(/\s/g,'')}">${a.nome}</option>`);
    });
    Object.keys(BADGES).forEach(k => s2.innerHTML += `<option value="${k}">${BADGES[k].t}</option>`);
}

window.abrirTela = (id) => {
    document.querySelectorAll('main > section').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
};

window.logout = () => { localStorage.removeItem('supimpa_session'); location.reload(); };

const session = localStorage.getItem('supimpa_session');
if(session) { currentUser = JSON.parse(session); init(); }
