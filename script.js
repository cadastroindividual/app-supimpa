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

const BADGES = {
    "lider": { t: "Líder de Líderes", d: "Veterano supremo.", c: "lendario" },
    "presidente": { t: "Futuro Presidente", d: "O herdeiro legítimo.", c: "lendario" },
    "sniper": { t: "Sniper do PME", d: "Não perde um contrato.", c: "raro" },
    "cafe": { t: "Cafeineiro Oficial", d: "Movido a base de grãos.", c: "comum" },
    "festa": { t: "Festa da Firma", d: "O rei das comemorações.", c: "comum" }
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
    document.getElementById('nav-nome').innerText = currentUser.nome;
    
    onValue(ref(db, `users/${currentUser.nome.replace(/\s/g, '')}`), (s) => {
        const d = s.val() || {};
        document.getElementById('nav-img').src = d.foto || 'https://via.placeholder.com/80';
        document.getElementById('perfil-foto').src = d.foto || 'https://via.placeholder.com/80';
        document.getElementById('perfil-nome').innerText = currentUser.nome;
        renderBadges(d.badges || {});
    });

    carregarEquipe();
    carregarFeed();
    prepararAdmin();
    lucide.createIcons();
}

// POSTAR NO FEED (VERSÃO SEM STORAGE)
window.postarFeed = () => {
    const txt = document.getElementById('feed-text').value;
    const file = document.getElementById('feed-file').files[0];
    if(!txt && !file) return;

    const postRef = push(ref(db, 'feed'));
    const data = { autor: currentUser.nome, txt, time: serverTimestamp() };

    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            data.midia = reader.result; // O arquivo vira texto aqui
            data.tipo = file.type.includes('video') ? 'video' : 'foto';
            set(postRef, data);
            document.getElementById('feed-text').value = '';
            document.getElementById('feed-file').value = '';
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
        s.forEach(p => list.unshift(p.val()));

        list.forEach(p => {
            const mediaTag = p.tipo === 'video' 
                ? `<video src="${p.midia}" controls class="feed-video w-full mt-2 rounded-xl"></video>`
                : (p.midia ? `<img src="${p.midia}" class="w-full mt-2 rounded-xl shadow-md">` : '');
            
            container.innerHTML += `
                <div class="glass-card p-5 space-y-2">
                    <p class="text-[9px] font-black text-blue-900 uppercase italic">${p.autor}</p>
                    <p class="text-sm font-medium text-blue-800">${p.txt}</p>
                    ${mediaTag}
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
    else alert("Acesso restrito!");
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
        c.innerHTML += `<div class="p-2 glass-card text-[8px] font-black text-blue-700">${b.t}</div>`;
    });
}

window.salvarAdmin = () => set(ref(db, 'config/funcionarioDoMes'), document.getElementById('input-mes').value);
window.logout = () => { localStorage.removeItem('supimpa_session'); location.reload(); };

const session = localStorage.getItem('supimpa_session');
if(session) { currentUser = JSON.parse(session); init(); }
