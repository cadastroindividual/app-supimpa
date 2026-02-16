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
let currentMedia = null;

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
    let equipe = await res.json();
    
    // Adicionando você manualmente se não estiver no JSON
    if(!equipe.find(e => e.nome === "Narry")) {
        equipe.push({ "nome": "Narry", "cargo": "Futuro Presidente Hapvida", "fone": "92981190682" });
    }

    const find = equipe.find(f => f.nome.toLowerCase() === user && (pass === "123" || pass === "supimpa2024"));

    if (find) {
        currentUser = find;
        const id = find.nome.replace(/\s/g, '');
        await update(ref(db, `users/${id}`), { status: 'online' });
        localStorage.setItem('supimpa_session', JSON.stringify(currentUser));
        location.reload();
    } else alert("Acesso Negado.");
};

// --- GESTÃO DE FEED (REDIZIDO PARA O ESSENCIAL) ---
window.previewMedia = (el) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        currentMedia = e.target.result;
        document.getElementById('media-preview').classList.remove('hidden');
        document.getElementById('img-preview').src = currentMedia;
    };
    reader.readAsDataURL(el.files[0]);
};

window.removerMedia = () => { currentMedia = null; document.getElementById('media-preview').classList.add('hidden'); };

window.postarFeed = () => {
    const t = document.getElementById('feed-text').value;
    if(!t && !currentMedia) return;
    const postData = {
        autor: currentUser.nome,
        txt: t,
        img: currentMedia || null,
        time: serverTimestamp(),
        likes: 0, amei: 0, dislike: 0
    };
    push(ref(db, 'feed'), postData);
    ganharPontos('post');
    document.getElementById('feed-text').value = '';
    removerMedia();
};

window.reagir = (postId, tipo) => {
    const postRef = ref(db, `feed/${postId}/${tipo}`);
    get(postRef).then(snap => {
        set(postRef, (snap.val() || 0) + 1);
        ganharPontos('like');
    });
};

window.comentar = (postId) => {
    const txt = prompt("Seu comentário:");
    if(!txt) return;
    push(ref(db, `feed/${postId}/comments`), { u: currentUser.nome, t: txt });
    ganharPontos('comentario');
};

function carregarFeed() {
    onValue(ref(db, 'feed'), (s) => {
        const cont = document.getElementById('feed-posts'); cont.innerHTML = '';
        s.forEach(p => {
            const post = p.val();
            const id = p.key;
            let commentsHtml = '';
            if(post.comments) {
                Object.values(post.comments).forEach(c => {
                    commentsHtml += `<p class="text-[9px] bg-white/20 p-1 rounded mt-1"><b>${c.u}:</b> ${c.t}</p>`;
                });
            }

            cont.innerHTML += `
                <div class="glass-card p-4 space-y-3">
                    <p class="text-[10px] font-black uppercase text-blue-900">${post.autor}</p>
                    ${post.txt ? `<p class="text-xs font-medium">${post.txt}</p>` : ''}
                    ${post.img ? `<img src="${post.img}" class="w-full rounded-xl border border-white/40">` : ''}
                    <div class="flex gap-4 border-t border-white/20 pt-2">
                        <button onclick="reagir('${id}', 'likes')" class="text-[10px] font-bold">👍 ${post.likes || 0}</button>
                        <button onclick="reagir('${id}', 'amei')" class="text-[10px] font-bold">❤️ ${post.amei || 0}</button>
                        <button onclick="reagir('${id}', 'dislike')" class="text-[10px] font-bold">👎 ${post.dislike || 0}</button>
                        <button onclick="comentar('${id}')" class="text-[10px] font-bold ml-auto">💬 Comentar</button>
                    </div>
                    <div class="mt-2">${commentsHtml}</div>
                </div>`;
        });
        lucide.createIcons();
    });
}

// --- ADMIN E DESTAQUE ---
window.salvarAdmin = async () => {
    const fMes = document.getElementById('adm-f-mes').value;
    const alvo = document.getElementById('adm-alvo').value;
    const selo = document.getElementById('adm-selo').value;
    
    await set(ref(db, 'config/funcionarioMes'), fMes);
    if(alvo && selo) await update(ref(db, `users/${alvo}/badges`), { [selo]: true });
    alert("Alterado!");
};

function carregarEquipe() {
    onValue(ref(db, 'users'), (su) => {
        const users = su.val() || {};
        const fMesId = users.config?.funcionarioMes;
        const lista = document.getElementById('lista-equipe');
        lista.innerHTML = '';
        
        fetch('equipe.json').then(r => r.json()).then(eq => {
            // Garante que Narry está na lista
            if(!eq.find(e => e.nome === "Narry")) eq.push({ "nome": "Narry", "cargo": "Futuro Presidente Hapvida", "fone": "92981190682" });
            
            eq.forEach(adm => {
                const id = adm.nome.replace(/\s/g, '');
                const d = users[id] || {};
                const ehFMes = users.config?.funcionarioMes === id;

                lista.innerHTML += `
                    <div class="glass-card p-3 flex items-center gap-3 ${ehFMes ? 'card-f-mes' : ''}">
                        <img src="${d.foto || 'https://via.placeholder.com/80'}" class="w-10 h-10 rounded-full object-cover">
                        <div class="flex-1">
                            <p class="text-[10px] font-black">${adm.nome} ${ehFMes ? '⭐' : ''}</p>
                            <p class="text-[8px] font-bold text-blue-500">${d.xp || 0} XP - ${adm.cargo}</p>
                        </div>
                    </div>`;
            });
        });
    });
}

// --- COTAÇÃO INJETADA ---
window.abrirFerramentaCotação = () => {
    document.getElementById('modal-cotacao').classList.remove('hidden');
    // Injetando o HTML que você enviou
    fetch('ICONE DE COTAÇÃO.html').then(r => r.text()).then(html => {
        document.getElementById('conteudo-cotacao').innerHTML = html;
        ganharPontos('cotacao');
    });
};

// Funções de Inicialização e auxiliares
window.abrirFerramenta = (url, tipo) => { ganharPontos(tipo); window.open(url, '_blank'); };
window.abrirTela = (id) => { 
    document.querySelectorAll('main > section').forEach(s => s.classList.add('hidden')); 
    document.getElementById(id).classList.remove('hidden'); 
    if(id === 'tela-feed') carregarFeed();
};
window.ganharPontos = async (t) => { /* Mesma lógica anterior */ };
window.tentarAcessoAdmin = () => { if(["Narry", "Cleide Tavares"].includes(currentUser.nome)) document.getElementById('modal-admin').classList.remove('hidden'); else alert("Restrito!"); };

function init() {
    document.getElementById('tela-login').classList.add('hidden');
    document.getElementById('main-header').classList.remove('hidden');
    document.getElementById('main-content').classList.remove('hidden');
    document.getElementById('welcome-name').innerText = currentUser.nome;
    carregarEquipe();
    // Preencher selects do Admin
    const s1 = document.getElementById('adm-f-mes');
    const s2 = document.getElementById('adm-alvo');
    fetch('equipe.json').then(r => r.json()).then(eq => {
        eq.forEach(a => {
            const opt = `<option value="${a.nome.replace(/\s/g,'')}">${a.nome}</option>`;
            s1.innerHTML += opt; s2.innerHTML += opt;
        });
    });
    lucide.createIcons();
}

const sess = localStorage.getItem('supimpa_session');
if(sess) { currentUser = JSON.parse(sess); init(); }
