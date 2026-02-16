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
    } else alert("Acesso Negado!");
};

// 2. INICIALIZAÇÃO
function init() {
    document.getElementById('tela-login').classList.add('hidden');
    document.getElementById('main-header').classList.remove('hidden');
    document.getElementById('main-content').classList.remove('hidden');
    
    document.getElementById('nav-user-nome').innerText = currentUser.nome;
    document.getElementById('nav-user-cargo').innerText = currentUser.cargo;
    document.getElementById('perfil-nome').innerText = currentUser.nome;
    document.getElementById('perfil-cargo').innerText = currentUser.cargo;

    // Escuta Foto do Perfil Global
    onValue(ref(db, `users/${currentUser.nome.replace(/\s/g, '')}/foto`), (s) => {
        const url = s.val() || 'https://via.placeholder.com/150';
        document.getElementById('nav-user-img').src = url;
        document.getElementById('perfil-foto-view').src = url;
    });

    // Escuta Notas Privadas
    const notas = localStorage.getItem(`notas_${currentUser.nome}`);
    if(notas) document.getElementById('bloco-notas').value = notas;

    carregarFeed();
    ouvirEquipeEDestaque();
    lucide.createIcons();
}

// 3. FOTO GLOBAL
window.atualizarFotoGlobal = () => {
    const file = document.getElementById('perfil-upload').files[0];
    const reader = new FileReader();
    reader.onloadend = () => {
        set(ref(db, `users/${currentUser.nome.replace(/\s/g, '')}/foto`), reader.result);
    };
    if(file) reader.readAsDataURL(file);
};

// 4. SISTEMA DE FEED (MINI REDE SOCIAL)
window.postarNoFeed = () => {
    const texto = document.getElementById('feed-input').value;
    const file = document.getElementById('feed-img-input').files[0];
    if(!texto && !file) return;

    const postRef = push(ref(db, 'feed'));
    const postData = {
        autor: currentUser.nome,
        setor: currentUser.cargo,
        texto: texto,
        timestamp: serverTimestamp(),
        likes: 0
    };

    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            postData.imagem = reader.result;
            set(postRef, postData);
            document.getElementById('feed-input').value = '';
        };
        reader.readAsDataURL(file);
    } else {
        set(postRef, postData);
        document.getElementById('feed-input').value = '';
    }
};

function carregarFeed() {
    onValue(ref(db, 'feed'), (snapshot) => {
        const container = document.getElementById('feed-container');
        container.innerHTML = '';
        const posts = [];
        snapshot.forEach(child => { posts.unshift({ id: child.key, ...child.val() }); });

        posts.forEach(p => {
            const date = p.timestamp ? new Date(p.timestamp).toLocaleString() : 'Agora';
            container.innerHTML += `
                <div class="glass-card p-5 space-y-3">
                    <div class="flex items-center gap-3">
                        <div class="text-left">
                            <p class="text-xs font-black text-blue-900">${p.autor} <span class="font-bold text-blue-400 opacity-60">• ${p.setor}</span></p>
                            <p class="text-[9px] font-bold text-gray-400">${date}</p>
                        </div>
                    </div>
                    <p class="text-sm text-blue-900 font-medium">${p.texto}</p>
                    ${p.imagem ? `<img src="${p.imagem}" class="post-img shadow-lg">` : ''}
                    <div class="flex gap-4 pt-2 border-t border-white/20">
                        <button class="flex items-center gap-1 text-[10px] font-black text-blue-600"><i data-lucide="thumbs-up" class="w-3 h-3"></i> LIKE</button>
                        <button class="flex items-center gap-1 text-[10px] font-black text-red-600"><i data-lucide="heart" class="w-3 h-3"></i> AMEI</button>
                        <button class="flex items-center gap-1 text-[10px] font-black text-gray-600"><i data-lucide="message-square" class="w-3 h-3"></i> COMENTAR</button>
                    </div>
                </div>`;
        });
        lucide.createIcons();
    });
}

// 5. EQUIPE E DESTAQUE DOURADO
function ouvirEquipeEDestaque() {
    onValue(ref(db, 'config/funcionarioDoMes'), (snap) => {
        const destaque = snap.val();
        renderizarEquipe(destaque);
    });
}

async function renderizarEquipe(destaqueNome) {
    const res = await fetch('equipe.json');
    const equipe = await res.json();
    const lista = document.getElementById('lista-equipe');
    lista.innerHTML = '';

    equipe.forEach(adm => {
        const isDestaque = adm.nome.toLowerCase() === destaqueNome?.toLowerCase();
        
        lista.innerHTML += `
            <div class="${isDestaque ? 'gold-card' : 'glass-card p-4'}">
                <div class="${isDestaque ? 'gold-card-inner' : 'flex justify-between items-center'}">
                    <div class="flex items-center gap-3">
                        <div>
                            <p class="text-xs font-black text-blue-900">${adm.nome} ${isDestaque ? '🏆' : ''}</p>
                            <p class="text-[9px] font-bold text-blue-500 uppercase">${isDestaque ? 'Funcionário do Mês' : adm.cargo}</p>
                        </div>
                    </div>
                    <a href="https://wa.me/${adm.fone}" class="text-green-600 ml-auto"><i data-lucide="phone" class="w-4 h-4"></i></a>
                </div>
            </div>`;
    });
    lucide.createIcons();
}

// NAVEGAÇÃO E AUXILIARES
window.abrirTela = (id) => {
    document.querySelectorAll('main > section').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    lucide.createIcons();
};
window.salvarNotas = () => localStorage.setItem(`notas_${currentUser.nome}`, document.getElementById('bloco-notas').value);
window.abrirConfig = () => document.getElementById('modal-config').classList.remove('hidden');
window.fecharConfig = () => document.getElementById('modal-config').classList.add('hidden');
window.salvarConfig = () => {
    if(prompt("Senha Admin:") === "supimpa123") set(ref(db, 'config/funcionarioDoMes'), document.getElementById('input-destaque').value);
    fecharConfig();
};
window.logout = () => { localStorage.removeItem('supimpa_session'); location.reload(); };

// Check Sessão
const session = localStorage.getItem('supimpa_session');
if(session) { currentUser = JSON.parse(session); init(); }
