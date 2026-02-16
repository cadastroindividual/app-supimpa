import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue, set, push, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getStorage, ref as sRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

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
const storage = getStorage(app);
let currentUser = null;

const BADGES = {
    "lider": { t: "Líder de Líderes", d: "Veterano supremo.", c: "lendario" },
    "estrategista": { t: "Estrategista Hapvida", d: "Mestre das vendas.", c: "lendario" },
    "presidente": { t: "Futuro Presidente", d: "O herdeiro legítimo.", c: "lendario" },
    "agilidade": { t: "Agilidade em Pessoa", d: "Rápido no gatilho.", c: "raro" },
    "sniper": { t: "Sniper do PME", d: "Mira certeira.", c: "raro" },
    "cafeineiro": { t: "Cafeineiro Oficial", d: "Movido a café.", c: "comum" },
    "festa": { t: "Festa da Firma", d: "Sempre presente.", c: "comum" }
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
    } else alert("Usuário ou senha incorretos.");
};

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
        renderBadges(d.badges || {});
    });

    carregarEquipe();
    carregarFeed();
    prepararAdmin();
    lucide.createIcons();
}

window.postarFeed = async () => {
    const txt = document.getElementById('feed-text').value;
    const file = document.getElementById('feed-file').files[0];
    if(!txt && !file) return;

    let midiaUrl = null;
    let tipoMidia = null;

    if (file) {
        const fileRef = sRef(storage, `feed/${Date.now()}_${file.name}`);
        const snap = await uploadBytes(fileRef, file);
        midiaUrl = await getDownloadURL(snap.ref);
        tipoMidia = file.type.includes('video') ? 'video' : 'foto';
    }

    push(ref(db, 'feed'), {
        autor: currentUser.nome,
        txt,
        midia: midiaUrl,
        tipo: tipoMidia,
        time: serverTimestamp()
    });

    document.getElementById('feed-text').value = '';
    document.getElementById('feed-file').value = '';
};

function carregarFeed() {
    onValue(ref(db, 'feed'), (s) => {
        const container = document.getElementById('feed-posts');
        container.innerHTML = '';
        const list = [];
        s.forEach(p => list.unshift(p.val()));

        list.forEach(p => {
            const media = p.tipo === 'video' 
                ? `<video src="${p.midia}" controls class="feed-video"></video>`
                : (p.midia ? `<img src="${p.midia}" class="w-full mt-2 rounded-xl">` : '');
            
            container.innerHTML += `
                <div class="glass-card p-5 space-y-2">
                    <p class="text-[9px] font-black text-blue-900 uppercase italic">${p.autor}</p>
                    <p class="text-sm font-medium text-blue-800">${p.txt}</p>
                    ${media}
                </div>`;
        });
    });
}

function carregarEquipe() {
    onValue(ref(db, 'config'), (sc) => {
        const config = sc.val() || {};
        onValue(ref(db, 'users'), (su) => {
            const users = su.val() || {};
            const lista = document.getElementById('lista-equipe');
            lista.innerHTML = '';

            fetch('equipe.json').then(r => r.json()).then(eq => {
                eq.forEach(adm => {
                    const id = adm.nome.replace(/\s/g, '');
                    const dbData = users[id] || {};
                    const isMes = adm.nome === config.funcionarioDoMes;
                    
                    lista.innerHTML += `
                        <div class="${isMes ? 'gold-card' : 'glass-card p-4'}">
                            <div class="${isMes ? 'gold-inner' : 'flex items-center gap-3'}">
                                <img src="${dbData.foto || 'https://via.placeholder.com/50'}" class="w-10 h-10 rounded-full object-cover">
                                <div>
                                    <p class="text-[11px] font-black">${adm.nome} ${dbData.badges?.lider ? '<span class="badge-lendario"></span>' : ''}</p>
                                    <p class="text-[8px] font-bold text-blue-500 uppercase">${adm.cargo}</p>
                                </div>
                            </div>
                        </div>`;
                });
            });
        });
    });
}

window.tentarAcessoAdmin = () => {
    const n = currentUser.nome;
    if(n === "Narciso Silva" || n === "Cleide Tavares") document.getElementById('modal-admin').classList.remove('hidden');
    else alert("Acesso restrito à Gerência!");
};

window.darSelo = () => {
    const target = document.getElementById('adm-alvo').value;
    const badge = document.getElementById('adm-selo').value;
    set(ref(db, `users/${target}/badges/${badge}`), true);
    alert("Selo concedido!");
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

function renderBadges(badges) {
    const c = document.getElementById('perfil-badges');
    c.innerHTML = '';
    Object.keys(badges).forEach(k => {
        const b = BADGES[k];
        c.innerHTML += `<div class="p-2 glass-card text-[8px] font-black ${b.c === 'lendario' ? 'text-yellow-600 border-yellow-400' : 'text-blue-700'}">${b.t}</div>`;
    });
}

window.salvarAdmin = () => set(ref(db, 'config/funcionarioDoMes'), document.getElementById('input-mes').value);
window.logout = () => { localStorage.removeItem('supimpa_session'); location.reload(); };

const session = localStorage.getItem('supimpa_session');
if(session) { currentUser = JSON.parse(session); init(); }
