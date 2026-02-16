import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue, set, push, serverTimestamp, update, get, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

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
const auth = getAuth(app);

let currentUser = null;
let currentMedia = null;
let currentChatUser = null;
let equipeData = [];
let mensagensNaoLidas = {};

const ADMINS = ["Narry", "Cleide Tavares"];

const BADGES = {
    "lider": { t: "Líder de Líderes", d: "Mais de 3 anos de casa.", r: "lendario", icon: "👑", color: "#FFD700" },
    "estrategista": { t: "Estrategista Hapvida", d: "Melhores estratégias de vendas.", r: "lendario", icon: "🧠", color: "#9333EA" },
    "presidente": { t: "Futuro Presidente", d: "A cadeira te espera.", r: "lendario", icon: "🏆", color: "#DC2626" },
    "agilidade": { t: "Agilidade em Pessoa", d: "Mais rápido no sistema.", r: "raro", icon: "⚡", color: "#A855F7" },
    "sniper": { t: "Sniper do PME", d: "Não perde contrato.", r: "raro", icon: "🎯", color: "#EF4444" },
    "mestre": { t: "Mestre do Fechamento", d: "Consegue o sim impossível.", r: "raro", icon: "🔥", color: "#F97316" },
    "anjo": { t: "Anjo da Guarda", d: "Sempre ajuda colega.", r: "raro", icon: "😇", color: "#06B6D4" },
    "festa": { t: "Festa da Firma", d: "Primeiro em eventos.", r: "comum", icon: "🎉", color: "#EC4899" },
    "cafe": { t: "Cafeineiro Oficial", d: "Move-se a café.", r: "comum", icon: "☕", color: "#78350F" },
    "dono_feed": { t: "Dono do Feed", d: "Rei da interatividade.", r: "comum", icon: "📱", color: "#8B5CF6" },
    "madrugador": { t: "Madrugador Supimpa", d: "Primeiro bom dia.", r: "comum", icon: "🌅", color: "#F59E0B" },
    "inimigo_pendencia": { t: "Inimigo da Pendência", d: "Não dorme com processo parado.", r: "comum", icon: "⚔️", color: "#10B981" },
    "dj_setor": { t: "DJ do Setor", d: "Energia do ambiente.", r: "comum", icon: "🎵", color: "#6366F1" },
    "rindo_perigo": { t: "Rindo do Perigo", d: "Bom humor sob pressão.", r: "comum", icon: "😎", color: "#14B8A6" }
};

const STATUS_HUMOR = {
    "focado": { emoji: "🎯", texto: "Focado", classe: "status-focado" },
    "disponivel": { emoji: "😊", texto: "Disponível para Resenha", classe: "status-disponivel" },
    "sobrevivencia": { emoji: "😰", texto: "Modo Sobrevivência", classe: "status-sobrevivencia" },
    "18h": { emoji: "⏰", texto: "Esperando 18h", classe: "status-18h" }
};

const PONTOS = {
    checkin: 10, post: 5, comentario: 2, like: 2, love: 3, dislike: 2, haha: 2, sad: 2,
    enquete_criar: 5, enquete_votar: 3, anotacao: 5, cotacao: 5, repique: 5, carencia: 5,
    mensagem: 3, badge_comum: 10, badge_raro: 20, badge_lendario: 100
};

// LOGIN
async function carregarEquipe() {
    try {
        const r = await fetch('equipe.json');
        if (!r.ok) throw new Error('Falha');
        return await r.json();
    } catch (e) {
        mostrarToast('Erro ao carregar equipe', 'error');
        return [];
    }
}

async function buscarDadosUsuarioPorEmail(email) {
    const eq = await carregarEquipe();
    const user = email.split('@')[0];
    return eq.find(p => p.nome.toLowerCase().includes(user.toLowerCase()));
}

window.realizarLogin = async () => {
    let email = document.getElementById('login-user').value.trim();
    const senha = document.getElementById('login-pass').value;
    if (!email || !senha) return mostrarToast('Preencha os campos', 'warning');
    if (!email.includes('@')) email += '@lider-saude.com';
    
    try {
        const cred = await signInWithEmailAndPassword(auth, email, senha);
        const dados = await buscarDadosUsuarioPorEmail(cred.user.email);
        if (!dados) throw new Error('Usuário não encontrado');
        
        currentUser = { ...dados, email: cred.user.email, uid: cred.user.uid };
        const uid = currentUser.nome.replace(/\s/g, '');
        await update(ref(db, `users/${uid}`), { status: 'online', ultimoAcesso: serverTimestamp() });
        localStorage.setItem('supimpa_session', JSON.stringify(currentUser));
        init();
        verificarCheckin();
    } catch (e) {
        let msg = '❌ Usuário ou senha incorretos';
        if (e.code === 'auth/too-many-requests') msg = '⏱️ Muitas tentativas';
        mostrarToast(msg, 'error');
    }
};

window.realizarLogout = async () => {
    const uid = currentUser.nome.replace(/\s/g, '');
    await update(ref(db, `users/${uid}`), { status: 'offline' });
    await signOut(auth);
    localStorage.clear();
    location.reload();
};

window.esqueceuSenha = async () => {
    let email = prompt('Digite seu email:');
    if (!email) return;
    if (!email.includes('@')) email += '@lider-saude.com';
    try {
        await sendPasswordResetEmail(auth, email);
        mostrarToast('📧 Email enviado!', 'success');
    } catch { mostrarToast('❌ Email não encontrado', 'error'); }
};

// CHECK-IN
async function verificarCheckin() {
    const uid = currentUser.nome.replace(/\s/g, '');
    const hoje = new Date().toDateString();
    const snap = await get(ref(db, `users/${uid}/ultimoCheckin`));
    if (snap.val() !== hoje) document.getElementById('btn-checkin').classList.remove('hidden');
}

window.fazerCheckin = async () => {
    const uid = currentUser.nome.replace(/\s/g, '');
    await update(ref(db, `users/${uid}`), { ultimoCheckin: new Date().toDateString() });
    await ganharPontos('checkin');
    document.getElementById('btn-checkin').classList.add('hidden');
    mostrarToast('✅ Check-in! +10 XP', 'success');
    criarConfete();
};

function criarConfete() {
    for (let i = 0; i < 50; i++) {
        const c = document.createElement('div');
        c.style.cssText = `position:fixed;width:10px;height:10px;background:${['#f00','#0f0','#00f','#ff0','#f0f'][Math.floor(Math.random()*5)]};left:${Math.random()*100}%;top:-10px;animation:fall ${Math.random()*3+2}s linear;z-index:9999;`;
        document.body.appendChild(c);
        setTimeout(() => c.remove(), 5000);
    }
}

// NOTIFICAÇÕES
function criarNotificacao(tipo, dados) {
    const uid = dados.userId || currentUser.nome.replace(/\s/g, '');
    push(ref(db, `notifications/${uid}`), {
        tipo, de: dados.de || 'Sistema', mensagem: dados.mensagem,
        timestamp: serverTimestamp(), lida: false, link: dados.link || null
    });
}

function carregarNotificacoes() {
    const uid = currentUser.nome.replace(/\s/g, '');
    onValue(ref(db, `notifications/${uid}`), snap => {
        const notifs = [], naoLidas = [];
        snap.forEach(c => {
            const n = { id: c.key, ...c.val() };
            notifs.push(n);
            if (!n.lida) naoLidas.push(n);
        });
        
        const badge = document.getElementById('notif-badge');
        if (naoLidas.length) {
            badge.textContent = naoLidas.length;
            badge.classList.remove('hidden');
        } else badge.classList.add('hidden');
        
        renderizarNotificacoes(notifs);
    });
}

function renderizarNotificacoes(notifs) {
    let panel = document.getElementById('notif-panel');
    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'notif-panel';
        panel.className = 'hidden fixed top-[60px] right-4 w-80 max-h-[500px] glass-card p-4 z-50 overflow-y-auto no-scrollbar';
        document.body.appendChild(panel);
    }
    
    const icones = { like: '👍', comentario: '💬', mencao: '@', badge: '🏆', chat: '💌', desafio: '⚡' };
    let html = '<div class="flex justify-between items-center mb-4"><h3 class="font-black text-sm">Notificações</h3>';
    if (notifs.length) html += '<button onclick="marcarTodasLidas()" class="text-[9px] font-bold text-blue-600">Marcar lidas</button>';
    html += '</div><div class="space-y-2">';
    
    notifs.reverse().forEach(n => {
        html += `<div onclick="marcarComoLida('${n.id}')" class="p-3 rounded-lg cursor-pointer ${n.lida ? 'bg-white/20' : 'bg-blue-500/20 border border-blue-400'}">
            <div class="flex gap-2"><span class="text-lg">${icones[n.tipo] || '📢'}</span>
            <div class="flex-1"><p class="text-xs font-bold">${n.de}</p>
            <p class="text-xs opacity-80">${n.mensagem}</p>
            <p class="text-[9px] opacity-50 mt-1">${formatarTempo(n.timestamp)}</p></div></div></div>`;
    });
    
    panel.innerHTML = html || '<p class="text-xs text-center opacity-50 py-8">Nenhuma notificação</p>';
}

window.toggleNotificacoes = () => {
    const p = document.getElementById('notif-panel');
    if (p) p.classList.toggle('hidden');
};

window.marcarComoLida = async (id) => {
    const uid = currentUser.nome.replace(/\s/g, '');
    await update(ref(db, `notifications/${uid}/${id}`), { lida: true });
};

window.marcarTodasLidas = async () => {
    const uid = currentUser.nome.replace(/\s/g, '');
    const snap = await get(ref(db, `notifications/${uid}`));
    const upd = {};
    snap.forEach(c => upd[`notifications/${uid}/${c.key}/lida`] = true);
    await update(ref(db), upd);
    mostrarToast('Marcadas como lidas', 'success');
};

// CHAT
async function carregarListaUsuarios() {
    const eq = await carregarEquipe();
    equipeData = eq;
    
    let modal = document.getElementById('chat-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'chat-modal';
        modal.className = 'hidden fixed inset-0 bg-black/30 backdrop-blur-sm z-[90] flex items-center justify-center p-4';
        modal.innerHTML = `<div class="glass-card w-full max-w-4xl h-[600px] flex flex-col">
            <div class="p-4 border-b border-white/20 flex justify-between items-center">
                <h3 class="font-black text-lg flex items-center gap-2"><i data-lucide="message-circle"></i> Mensagens</h3>
                <button onclick="fecharChat()"><i data-lucide="x"></i></button>
            </div>
            <div class="flex-1 flex overflow-hidden">
                <div class="w-1/3 border-r border-white/20 overflow-y-auto no-scrollbar">
                    <div id="chat-list" class="p-2 space-y-1"></div>
                </div>
                <div class="flex-1 flex flex-col">
                    <div id="chat-messages" class="flex-1 p-4 overflow-y-auto no-scrollbar"></div>
                    <div id="chat-input-area" class="hidden p-4 border-t border-white/20">
                        <div class="flex gap-2">
                            <input type="text" id="chat-input" placeholder="Mensagem..." class="flex-1 p-3 rounded-xl glass-card outline-none">
                            <button onclick="enviarMensagem()" class="glossy bg-blue-600 text-white px-6 rounded-xl"><i data-lucide="send"></i></button>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
        document.body.appendChild(modal);
    }
    
    const list = document.getElementById('chat-list');
    list.innerHTML = '';
    eq.forEach(u => {
        if (u.nome === currentUser.nome) return;
        const div = document.createElement('div');
        div.className = 'p-3 rounded-lg hover:bg-white/20 cursor-pointer flex items-center gap-3';
        div.id = `chat-user-${u.nome.replace(/\s/g, '')}`;
        div.onclick = () => abrirConversaCom(u);
        
        onValue(ref(db, `users/${u.nome.replace(/\s/g, '')}`), s => {
            const ud = s.val() || {};
            verificarMensagensNaoLidas(u.nome);
            div.innerHTML = `<div class="relative"><img src="${ud.foto || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(u.nome)}" class="w-10 h-10 rounded-full">
                <div class="w-3 h-3 rounded-full border-2 border-white absolute bottom-0 right-0 ${ud.status === 'online' ? 'bg-green-400' : 'bg-gray-400'}"></div></div>
                <div class="flex-1"><p class="text-sm font-bold">${u.nome}</p><p class="text-xs opacity-60">${u.cargo}</p></div>
                ${mensagensNaoLidas[u.nome] ? '<div class="w-3 h-3 rounded-full bg-green-500"></div>' : ''}`;
        });
        list.appendChild(div);
    });
    lucide.createIcons();
}

async function verificarMensagensNaoLidas(nome) {
    const chatId = [currentUser.nome, nome].sort().join('_').replace(/\s/g, '');
    const snap = await get(ref(db, `chats/${chatId}`));
    let temNaoLida = false;
    snap.forEach(c => {
        const m = c.val();
        if (m.para === currentUser.nome && !m.lida) temNaoLida = true;
    });
    mensagensNaoLidas[nome] = temNaoLida;
    
    const cardId = `card-${nome.replace(/\s/g, '')}`;
    const card = document.getElementById(cardId);
    if (card && temNaoLida) card.classList.add('chat-unread');
    else if (card) card.classList.remove('chat-unread');
}

function abrirConversaCom(user) {
    currentChatUser = user;
    document.getElementById('chat-input-area').classList.remove('hidden');
    const chatId = [currentUser.nome, user.nome].sort().join('_').replace(/\s/g, '');
    
    onValue(ref(db, `chats/${chatId}`), async snap => {
        const msgs = [];
        snap.forEach(c => msgs.push({ id: c.key, ...c.val() }));
        for (const m of msgs) {
            if (m.para === currentUser.nome && !m.lida) {
                await update(ref(db, `chats/${chatId}/${m.id}`), { lida: true });
            }
        }
        renderizarMensagens(msgs);
    });
}

function renderizarMensagens(msgs) {
    const cont = document.getElementById('chat-messages');
    cont.innerHTML = '';
    if (!msgs.length) {
        cont.innerHTML = '<p class="text-center text-sm opacity-50 py-20">Nenhuma mensagem</p>';
        return;
    }
    msgs.forEach(m => {
        const ehMinha = m.de === currentUser.nome;
        const div = document.createElement('div');
        div.className = `flex ${ehMinha ? 'justify-end' : 'justify-start'}`;
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble p-3 rounded-2xl ${ehMinha ? 'bg-blue-500 text-white' : 'bg-white/30'}`;
        bubble.innerHTML = `${m.texto}<p class="text-[9px] opacity-60 mt-1">${formatarTempo(m.timestamp)}</p>`;
        div.appendChild(bubble);
        cont.appendChild(div);
    });
    cont.scrollTop = cont.scrollHeight;
}

window.enviarMensagem = async () => {
    const input = document.getElementById('chat-input');
    const texto = input.value.trim();
    if (!texto || !currentChatUser) return;
    
    const chatId = [currentUser.nome, currentChatUser.nome].sort().join('_').replace(/\s/g, '');
    await push(ref(db, `chats/${chatId}`), {
        de: currentUser.nome, para: currentChatUser.nome, texto,
        timestamp: serverTimestamp(), lida: false
    });
    
    criarNotificacao('chat', {
        de: currentUser.nome,
        mensagem: `${currentUser.nome}: "${texto.substring(0, 30)}..."`,
        userId: currentChatUser.nome.replace(/\s/g, '')
    });
    
    input.value = '';
    await ganharPontos('mensagem');
};

window.abrirChat = () => {
    document.getElementById('chat-modal').classList.remove('hidden');
    carregarListaUsuarios();
};

window.fecharChat = () => {
    document.getElementById('chat-modal').classList.add('hidden');
    currentChatUser = null;
};

// FEED
window.previewMedia = el => {
    if (!el.files?.[0]) return;
    const r = new FileReader();
    r.onload = e => {
        currentMedia = e.target.result;
        document.getElementById('media-preview').classList.remove('hidden');
        document.getElementById('img-preview').src = currentMedia;
    };
    r.readAsDataURL(el.files[0]);
};

window.removerMedia = () => {
    currentMedia = null;
    document.getElementById('media-preview').classList.add('hidden');
    document.getElementById('feed-media').value = '';
};

window.postarFeed = async () => {
    const texto = document.getElementById('feed-text').value.trim();
    if (!texto && !currentMedia) return mostrarToast('Escreva algo', 'warning');
    
    const postData = {
        autor: currentUser.nome, texto, imagem: currentMedia || null,
        timestamp: serverTimestamp(),
        reactions: { like: 0, love: 0, haha: 0, sad: 0 }, comentarios: {}
    };
    
    await push(ref(db, 'feed'), postData);
    await ganharPontos('post');
    document.getElementById('feed-text').value = '';
    removerMedia();
    mostrarToast('Post publicado! +5 XP', 'success');
    
    const icon = document.getElementById('icon-feed');
    icon.classList.add('feed-new-post');
    setTimeout(() => icon.classList.remove('feed-new-post'), 3000);
};

function carregarFeed() {
    onValue(ref(db, 'feed'), async snap => {
        const posts = [];
        snap.forEach(c => posts.push({ id: c.key, ...c.val() }));
        posts.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        
        const cont = document.getElementById('feed-posts');
        cont.innerHTML = '';
        for (const p of posts) {
            const el = await criarElementoPost(p);
            cont.appendChild(el);
        }
        lucide.createIcons();
    });
}

async function criarElementoPost(post) {
    const art = document.createElement('article');
    art.className = 'glass-card p-5 space-y-4';
    
    const uid = post.autor.replace(/\s/g, '');
    const uSnap = await get(ref(db, `users/${uid}`));
    const uData = uSnap.val() || {};
    
    const reacoes = post.reactions || { like: 0, love: 0, haha: 0, sad: 0 };
    
    art.innerHTML = `
        <div class="flex items-center gap-3">
            <img src="${uData.foto || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(post.autor)}" class="w-12 h-12 rounded-full border-2 border-white/50">
            <div class="flex-1">
                <p class="font-black text-sm">${post.autor}</p>
                <p class="text-xs opacity-60">${formatarTempo(post.timestamp)}</p>
            </div>
        </div>
        ${post.texto ? `<p class="text-sm">${post.texto.replace(/@(\w+(?:\s+\w+)*)/g, '<span class="text-blue-600 font-bold">@$1</span>')}</p>` : ''}
        ${post.imagem ? `<img src="${post.imagem}" class="w-full rounded-xl border border-white/40 cursor-pointer" onclick="window.open('${post.imagem}', '_blank')">` : ''}
        <div class="flex items-center justify-between border-t border-b border-white/20 py-3">
            <div class="flex gap-4">
                <button onclick="reagir('${post.id}', 'like')" class="reaction-btn flex items-center gap-1 hover:bg-white/20 px-3 py-1 rounded-lg">
                    <span class="text-lg">👍</span><span class="text-xs font-bold">${reacoes.like || 0}</span>
                </button>
                <button onclick="reagir('${post.id}', 'love')" class="reaction-btn flex items-center gap-1 hover:bg-white/20 px-3 py-1 rounded-lg">
                    <span class="text-lg">❤️</span><span class="text-xs font-bold">${reacoes.love || 0}</span>
                </button>
                <button onclick="reagir('${post.id}', 'haha')" class="reaction-btn flex items-center gap-1 hover:bg-white/20 px-3 py-1 rounded-lg">
                    <span class="text-lg">😂</span><span class="text-xs font-bold">${reacoes.haha || 0}</span>
                </button>
                <button onclick="reagir('${post.id}', 'sad')" class="reaction-btn flex items-center gap-1 hover:bg-white/20 px-3 py-1 rounded-lg">
                    <span class="text-lg">😢</span><span class="text-xs font-bold">${reacoes.sad || 0}</span>
                </button>
            </div>
            <button onclick="toggleComentarios('${post.id}')" class="text-xs font-bold hover:bg-white/20 px-3 py-1 rounded-lg">💬 Comentar</button>
        </div>
        <div id="comentarios-${post.id}" class="hidden space-y-3"></div>
    `;
    
    return art;
}

window.reagir = async (postId, tipo) => {
    const path = `feed/${postId}/reactions/${tipo}`;
    const snap = await get(ref(db, path));
    await set(ref(db, path), (snap.val() || 0) + 1);
    await ganharPontos(tipo);
};

window.toggleComentarios = (id) => {
    const sec = document.getElementById(`comentarios-${id}`);
    sec.classList.toggle('hidden');
};

window.abrirFeed = () => {
    abrirTela('tela-feed');
    carregarFeed();
};

// ANOTAÇÕES
window.abrirAnotacoes = () => {
    const modal = criarModal('Anotações', `
        <textarea id="nota-texto" class="w-full h-64 p-4 glass-card rounded-xl outline-none" placeholder="Suas anotações..."></textarea>
        <button onclick="salvarAnotacao()" class="w-full glossy bg-blue-600 text-white py-3 rounded-xl font-bold mt-4">💾 Salvar Anotação</button>
    `);
    
    const uid = currentUser.nome.replace(/\s/g, '');
    get(ref(db, `anotacoes/${uid}`)).then(snap => {
        if (snap.val()) document.getElementById('nota-texto').value = snap.val();
    });
};

window.salvarAnotacao = async () => {
    const texto = document.getElementById('nota-texto').value;
    const uid = currentUser.nome.replace(/\s/g, '');
    
    const hoje = new Date().toDateString();
    const ultimaAnotacao = await get(ref(db, `users/${uid}/ultimaAnotacao`));
    
    await set(ref(db, `anotacoes/${uid}`), texto);
    mostrarToast('✅ Anotação salva!', 'success');
    
    if (ultimaAnotacao.val() !== hoje) {
        await update(ref(db, `users/${uid}`), { ultimaAnotacao: hoje });
        await ganharPontos('anotacao');
        mostrarToast('Bônus! +5 XP', 'info');
    }
};

// SCRIPTS
window.abrirScripts = () => {
    const ehAdmin = ADMINS.includes(currentUser.nome);
    const modal = criarModal('Wiki de Scripts', `
        <div id="scripts-lista" class="space-y-3 mb-4"></div>
        ${ehAdmin ? '<button onclick="adicionarScript()" class="w-full glossy bg-green-600 text-white py-3 rounded-xl font-bold">➕ Adicionar Script</button>' : ''}
    `);
    carregarScripts();
};

async function carregarScripts() {
    const snap = await get(ref(db, 'scripts'));
    const lista = document.getElementById('scripts-lista');
    lista.innerHTML = '';
    
    snap.forEach(c => {
        const s = c.val();
        const div = document.createElement('div');
        div.className = 'glass-card p-4';
        div.innerHTML = `
            <h4 class="font-bold text-sm mb-2">${s.titulo}</h4>
            <p class="text-xs opacity-70 mb-2">${s.categoria}</p>
            <p class="text-sm bg-white/20 p-3 rounded">${s.conteudo}</p>
            ${ADMINS.includes(currentUser.nome) ? `<div class="mt-2 flex gap-2">
                <button onclick="editarScript('${c.key}')" class="text-xs bg-blue-500 text-white px-3 py-1 rounded">✏️ Editar</button>
                <button onclick="removerScript('${c.key}')" class="text-xs bg-red-500 text-white px-3 py-1 rounded">🗑️ Remover</button>
            </div>` : ''}
        `;
        lista.appendChild(div);
    });
}

window.adicionarScript = () => {
    const titulo = prompt('Título do script:');
    const categoria = prompt('Categoria (ex: Boas-vindas, Ligação, Cobrança):');
    const conteudo = prompt('Conteúdo do script:');
    
    if (titulo && categoria && conteudo) {
        push(ref(db, 'scripts'), { titulo, categoria, conteudo });
        mostrarToast('Script adicionado!', 'success');
        carregarScripts();
    }
};

// CALENDÁRIO
window.abrirCalendario = () => {
    const ehAdmin = ADMINS.includes(currentUser.nome);
    const modal = criarModal('Calendário de Eventos', `
        <div id="eventos-lista" class="space-y-3 mb-4"></div>
        ${ehAdmin ? '<button onclick="adicionarEvento()" class="w-full glossy bg-green-600 text-white py-3 rounded-xl font-bold">📅 Novo Evento</button>' : ''}
    `);
    carregarEventos();
};

async function carregarEventos() {
    const snap = await get(ref(db, 'eventos'));
    const lista = document.getElementById('eventos-lista');
    lista.innerHTML = '';
    
    snap.forEach(c => {
        const e = c.val();
        const div = document.createElement('div');
        div.className = 'glass-card p-4';
        div.innerHTML = `
            <div class="flex justify-between items-start">
                <div>
                    <h4 class="font-bold text-sm">${e.titulo}</h4>
                    <p class="text-xs opacity-70">📅 ${e.data} às ${e.hora}</p>
                    <p class="text-sm mt-2">${e.descricao}</p>
                </div>
                ${ADMINS.includes(currentUser.nome) ? `
                    <button onclick="removerEvento('${c.key}')" class="text-red-500 hover:text-red-700">🗑️</button>
                ` : ''}
            </div>
        `;
        lista.appendChild(div);
    });
}

window.adicionarEvento = () => {
    const titulo = prompt('Título do evento:');
    const data = prompt('Data (DD/MM/YYYY):');
    const hora = prompt('Horário:');
    const descricao = prompt('Descrição:');
    
    if (titulo && data) {
        push(ref(db, 'eventos'), { titulo, data, hora, descricao });
        mostrarToast('Evento criado!', 'success');
        carregarEventos();
        
        // Notificar todos
        carregarEquipe().then(eq => {
            eq.forEach(u => {
                criarNotificacao('desafio', {
                    de: 'Sistema',
                    mensagem: `📅 Novo evento: ${titulo} - ${data}`,
                    userId: u.nome.replace(/\s/g, '')
                });
            });
        });
    }
};

// CHATBOT
window.abrirChatbot = () => {
    const modal = criarModal('🤖 Assistente Virtual', `
        <div id="chatbot-messages" class="h-96 overflow-y-auto glass-card p-4 mb-4 space-y-2"></div>
        <div class="flex gap-2">
            <input type="text" id="chatbot-input" placeholder="Faça uma pergunta..." class="flex-1 p-3 rounded-xl glass-card outline-none">
            <button onclick="enviarChatbot()" class="glossy bg-blue-600 text-white px-6 rounded-xl font-bold">Enviar</button>
        </div>
    `);
    
    adicionarMensagemBot('Olá! Como posso ajudar?');
};

window.enviarChatbot = () => {
    const input = document.getElementById('chatbot-input');
    const texto = input.value.trim();
    if (!texto) return;
    
    adicionarMensagemUsuario(texto);
    input.value = '';
    
    setTimeout(() => {
        const resposta = gerarRespostaChatbot(texto.toLowerCase());
        adicionarMensagemBot(resposta);
    }, 500);
};

function gerarRespostaChatbot(texto) {
    if (texto.includes('carência')) return '📋 A carência varia por plano. Use a ferramenta de Carência no hub!';
    if (texto.includes('cotação')) return '💰 Use a calculadora de cotação no hub para simular valores!';
    if (texto.includes('pme')) return '🏢 PME significa Pequenas e Médias Empresas. Temos planos especiais!';
    if (texto.includes('oi') || texto.includes('olá')) return '😊 Oi! Como posso ajudar?';
    if (texto.includes('obrigad')) return '💙 Por nada! Estou aqui pra ajudar!';
    return '🤔 Desculpe, não entendi. Pergunte sobre carência, cotação ou PME!';
}

function adicionarMensagemBot(msg) {
    const div = document.createElement('div');
    div.className = 'flex justify-start';
    div.innerHTML = `<div class="bg-white/30 p-3 rounded-xl max-w-[70%]"><p class="text-sm">${msg}</p></div>`;
    document.getElementById('chatbot-messages').appendChild(div);
    document.getElementById('chatbot-messages').scrollTop = 999999;
}

function adicionarMensagemUsuario(msg) {
    const div = document.createElement('div');
    div.className = 'flex justify-end';
    div.innerHTML = `<div class="bg-blue-500 text-white p-3 rounded-xl max-w-[70%]"><p class="text-sm">${msg}</p></div>`;
    document.getElementById('chatbot-messages').appendChild(div);
    document.getElementById('chatbot-messages').scrollTop = 999999;
}

// FERRAMENTAS
window.abrirCotacao = async () => {
    const hoje = new Date().toDateString();
    const uid = currentUser.nome.replace(/\s/g, '');
    const ultima = await get(ref(db, `users/${uid}/ultimaCotacao`));
    
    mostrarToast('Ferramenta de cotação aberta', 'info');
    
    if (ultima.val() !== hoje) {
        await update(ref(db, `users/${uid}`), { ultimaCotacao: hoje });
        await ganharPontos('cotacao');
        mostrarToast('Bônus! +5 XP', 'success');
    }
};

window.abrirCarencia = async () => {
    const hoje = new Date().toDateString();
    const uid = currentUser.nome.replace(/\s/g, '');
    const ultima = await get(ref(db, `users/${uid}/ultimaCarencia`));
    
    window.open('https://www.hapvida.com.br/site/carencia', '_blank');
    
    if (ultima.val() !== hoje) {
        await update(ref(db, `users/${uid}`), { ultimaCarencia: hoje });
        await ganharPontos('carencia');
    }
};

window.abrirRepique = async () => {
    const hoje = new Date().toDateString();
    const uid = currentUser.nome.replace(/\s/g, '');
    const ultima = await get(ref(db, `users/${uid}/ultimoRepique`));
    
    window.open('https://www.hapvida.com.br/site/repique', '_blank');
    
    if (ultima.val() !== hoje) {
        await update(ref(db, `users/${uid}`), { ultimoRepique: hoje });
        await ganharPontos('repique');
    }
};

// BADGES
window.abrirBadges = () => {
    const modal = criarModal('🏆 Sistema de Badges', '<div id="badges-grid" class="grid grid-cols-2 md:grid-cols-3 gap-4"></div>');
    carregarBadgesInterativos();
};

async function carregarBadgesInterativos() {
    const uid = currentUser.nome.replace(/\s/g, '');
    const snap = await get(ref(db, `users/${uid}`));
    const userData = snap.val() || {};
    const userBadges = userData.badges || {};
    
    const grid = document.getElementById('badges-grid');
    grid.innerHTML = '';
    
    Object.entries(BADGES).forEach(([key, badge]) => {
        const possui = userBadges[key];
        const div = document.createElement('div');
        div.className = `badge-card glass-card p-5 text-center ${possui ? `badge-${badge.r}` : 'opacity-40 grayscale'}`;
        div.innerHTML = `
            <div class="text-4xl mb-2">${badge.icon}</div>
            <h4 class="font-black text-xs mb-1" style="color:${badge.color}">${badge.t}</h4>
            <p class="text-[10px] opacity-70">${badge.d}</p>
            <div class="mt-2 inline-block px-2 py-1 rounded-full text-[8px] font-bold uppercase ${
                badge.r === 'lendario' ? 'bg-yellow-500 text-white' :
                badge.r === 'raro' ? 'bg-purple-500 text-white' : 'bg-blue-500 text-white'
            }">${badge.r}</div>
            ${possui ? '<p class="text-xs font-bold text-green-600 mt-2">✓ Conquistado</p>' : ''}
        `;
        grid.appendChild(div);
    });
}

// PERFIL
window.verMeuPerfil = async () => {
    const uid = currentUser.nome.replace(/\s/g, '');
    const snap = await get(ref(db, `users/${uid}`));
    const userData = snap.val() || {};
    
    const modal = criarModal('Meu Perfil', `
        <div class="text-center space-y-4">
            <img src="${userData.foto || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(currentUser.nome)}" class="w-32 h-32 rounded-full mx-auto border-4 border-blue-400">
            <h3 class="text-xl font-black">${currentUser.nome}</h3>
            <p class="text-sm opacity-70">${currentUser.cargo}</p>
            <p class="text-lg font-bold text-blue-600">${userData.xp || 0} XP</p>
            
            <div class="space-y-2">
                <select id="status-humor" class="w-full p-3 glass-card rounded-xl font-bold">
                    <option value="">Escolher Status de Humor</option>
                    ${Object.entries(STATUS_HUMOR).map(([k, v]) => 
                        `<option value="${k}">${v.emoji} ${v.texto}</option>`
                    ).join('')}
                </select>
                <button onclick="salvarStatusHumor()" class="w-full glossy bg-blue-600 text-white py-3 rounded-xl font-bold">💭 Atualizar Humor</button>
            </div>
            
            <div class="grid grid-cols-3 gap-2">
                <div class="glass-card p-3 h-24 flex items-center justify-center text-xs opacity-50">Foto 1</div>
                <div class="glass-card p-3 h-24 flex items-center justify-center text-xs opacity-50">Foto 2</div>
                <div class="glass-card p-3 h-24 flex items-center justify-center text-xs opacity-50">Foto 3</div>
            </div>
            
            <button onclick="redefinirSenha()" class="w-full glossy bg-yellow-600 text-white py-3 rounded-xl font-bold">🔑 Redefinir Senha</button>
            <button onclick="realizarLogout()" class="w-full bg-red-500 text-white py-3 rounded-xl font-bold">🚪 Sair</button>
        </div>
    `);
};

window.salvarStatusHumor = async () => {
    const select = document.getElementById('status-humor');
    const status = select.value;
    if (!status) return;
    
    const uid = currentUser.nome.replace(/\s/g, '');
    await update(ref(db, `users/${uid}`), { statusHumor: status });
    mostrarToast('Status atualizado!', 'success');
};

// ADMIN
window.tentarAcessoAdmin = () => {
    if (!ADMINS.includes(currentUser.nome)) {
        return mostrarToast('❌ ACESSO NEGADO', 'error');
    }
    
    const modal = criarModal('⚙️ Painel Admin', `
        <div class="space-y-4">
            <div>
                <label class="text-xs font-bold">Funcionário do Mês</label>
                <select id="adm-f-mes" class="w-full p-3 glass-card rounded-xl mt-1"></select>
            </div>
            <div>
                <label class="text-xs font-bold">Conceder Badge</label>
                <div class="flex gap-2 mt-1">
                    <select id="adm-alvo" class="flex-1 p-3 glass-card rounded-xl"></select>
                    <select id="adm-selo" class="flex-1 p-3 glass-card rounded-xl"></select>
                </div>
            </div>
            <div>
                <label class="text-xs font-bold">Desafio Relâmpago</label>
                <input type="text" id="desafio-texto" placeholder="Ex: Primeira foto do café ganha 50 XP" class="w-full p-3 glass-card rounded-xl mt-1">
                <button onclick="criarDesafio()" class="w-full mt-2 glossy bg-purple-600 text-white py-3 rounded-xl font-bold">⚡ Criar Desafio</button>
            </div>
            <button onclick="salvarAdmin()" class="w-full glossy bg-blue-600 text-white py-3 rounded-xl font-bold">💾 Salvar Configurações</button>
        </div>
    `);
    
    preencherSelectsAdmin();
};

async function preencherSelectsAdmin() {
    const eq = await carregarEquipe();
    const s1 = document.getElementById('adm-f-mes');
    const s2 = document.getElementById('adm-alvo');
    const s3 = document.getElementById('adm-selo');
    
    eq.forEach(a => {
        const opt = `<option value="${a.nome.replace(/\s/g,'')}">${a.nome}</option>`;
        s1.innerHTML += opt;
        s2.innerHTML += opt;
    });
    
    Object.entries(BADGES).forEach(([k, b]) => {
        s3.innerHTML += `<option value="${k}">${b.icon} ${b.t}</option>`;
    });
}

window.salvarAdmin = async () => {
    const fMes = document.getElementById('adm-f-mes').value;
    const alvo = document.getElementById('adm-alvo').value;
    const selo = document.getElementById('adm-selo').value;
    
    if (fMes) await set(ref(db, 'config/funcionarioMes'), fMes);
    
    if (alvo && selo) {
        await update(ref(db, `users/${alvo}/badges`), { [selo]: true });
        const raridade = BADGES[selo].r;
        const pontos = raridade === 'lendario' ? 100 : raridade === 'raro' ? 20 : 10;
        const xpSnap = await get(ref(db, `users/${alvo}/xp`));
        await set(ref(db, `users/${alvo}/xp`), (xpSnap.val() || 0) + pontos);
    }
    
    mostrarToast('✅ Configurações salvas!', 'success');
};

window.criarDesafio = async () => {
    const texto = document.getElementById('desafio-texto').value;
    if (!texto) return;
    
    const eq = await carregarEquipe();
    eq.forEach(u => {
        criarNotificacao('desafio', {
            de: 'Desafio Relâmpago',
            mensagem: `⚡ ${texto}`,
            userId: u.nome.replace(/\s/g, '')
        });
    });
    
    mostrarToast('⚡ Desafio enviado para todos!', 'success');
    document.getElementById('desafio-texto').value = '';
};

// RANKING
async function carregarEquipeRanking() {
    onValue(ref(db, 'users'), async snap => {
        const users = snap.val() || {};
        const configSnap = await get(ref(db, 'config'));
        const config = configSnap.val() || {};
        const fMesId = config.funcionarioMes;
        
        const eq = await carregarEquipe();
        const lista = document.getElementById('lista-equipe');
        lista.innerHTML = '';
        
        const equipeComXp = eq.map(adm => {
            const id = adm.nome.replace(/\s/g, '');
            const ud = users[id] || {};
            return { ...adm, xp: ud.xp || 0, foto: ud.foto, status: ud.status, badges: ud.badges || {}, statusHumor: ud.statusHumor };
        });
        
        equipeComXp.sort((a, b) => b.xp - a.xp);
        
        equipeComXp.forEach((adm, idx) => {
            const id = adm.nome.replace(/\s/g, '');
            const ehFMes = fMesId === id;
            
            const card = document.createElement('div');
            card.id = `card-${id}`;
            card.className = `glass-card p-4 flex items-center gap-3 hover:scale-102 transition-all cursor-pointer ${ehFMes ? 'card-f-mes' : ''}`;
            
            const posIcon = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '';
            const maxXp = 1000;
            const progresso = Math.min((adm.xp / maxXp) * 100, 100);
            
            const humor = adm.statusHumor ? STATUS_HUMOR[adm.statusHumor] : null;
            
            card.innerHTML = `
                <div class="relative">
                    <img src="${adm.foto || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(adm.nome)}" 
                         class="w-16 h-16 rounded-full object-cover border-2 ${adm.status === 'online' ? 'border-green-400' : 'border-gray-400'}">
                    ${posIcon ? `<span class="absolute -top-1 -right-1 text-2xl">${posIcon}</span>` : ''}
                </div>
                <div class="flex-1">
                    <p class="text-sm font-black">${adm.nome}</p>
                    ${humor ? `<span class="status-humor ${humor.classe} text-[9px] mt-1">${humor.emoji} ${humor.texto}</span>` : ''}
                    <p class="text-xs font-bold text-blue-600 mt-1">${adm.xp} XP</p>
                    <div class="xp-bar mt-1">
                        <div class="xp-fill" style="width: ${progresso}%"></div>
                    </div>
                    <p class="text-[10px] opacity-60 mt-1">${adm.cargo}</p>
                    <div class="flex gap-1 mt-1">
                        ${Object.keys(adm.badges).slice(0, 3).map(k => 
                            `<span title="${BADGES[k]?.t || ''}">${BADGES[k]?.icon || '🏆'}</span>`
                        ).join('')}
                    </div>
                </div>
            `;
            
            lista.appendChild(card);
        });
    });
}

// GAMIFICAÇÃO
window.ganharPontos = async (acao) => {
    const pts = PONTOS[acao] || 0;
    if (!pts) return;
    
    const uid = currentUser.nome.replace(/\s/g, '');
    const xpSnap = await get(ref(db, `users/${uid}/xp`));
    const novoXp = (xpSnap.val() || 0) + pts;
    await set(ref(db, `users/${uid}/xp`), novoXp);
    document.getElementById('nav-xp').textContent = `${novoXp} XP`;
};

// TEMA
window.toggleTheme = () => {
    const html = document.documentElement;
    const curr = html.getAttribute('data-theme');
    const novo = curr === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', novo);
    localStorage.setItem('theme', novo);
    document.getElementById('theme-icon').setAttribute('data-lucide', novo === 'dark' ? 'moon' : 'sun');
    lucide.createIcons();
};

// UTILS
function formatarTempo(ts) {
    if (!ts) return 'Agora';
    const diff = Date.now() - ts;
    const min = Math.floor(diff / 60000);
    const hr = Math.floor(diff / 3600000);
    const dia = Math.floor(diff / 86400000);
    if (min < 1) return 'Agora';
    if (min < 60) return `${min}min`;
    if (hr < 24) return `${hr}h`;
    return `${dia}d`;
}

function mostrarToast(msg, tipo = 'info') {
    const cores = { success: 'bg-green-500', error: 'bg-red-500', warning: 'bg-yellow-500', info: 'bg-blue-500' };
    const toast = document.createElement('div');
    toast.className = `fixed bottom-4 right-4 ${cores[tipo]} text-white px-6 py-3 rounded-xl font-bold text-sm shadow-2xl z-[999]`;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function criarModal(titulo, conteudo) {
    let modal = document.getElementById('modal-generico');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-generico';
        modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4';
        modal.onclick = e => { if (e.target === modal) modal.remove(); };
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div class="glass-card max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-xl font-black">${titulo}</h3>
                <button onclick="this.closest('.fixed').remove()" class="hover:scale-110"><i data-lucide="x"></i></button>
            </div>
            <div>${conteudo}</div>
        </div>
    `;
    
    modal.classList.remove('hidden');
    lucide.createIcons();
    return modal;
}

window.abrirTela = id => {
    document.querySelectorAll('main > section').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    lucide.createIcons();
};

// INIT
async function init() {
    document.getElementById('tela-login').classList.add('hidden');
    document.getElementById('main-header').classList.remove('hidden');
    document.getElementById('main-content').classList.remove('hidden');
    document.getElementById('welcome-name').innerText = currentUser.nome;
    
    const theme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', theme);
    document.getElementById('theme-icon').setAttribute('data-lucide', theme === 'dark' ? 'moon' : 'sun');
    
    const uid = currentUser.nome.replace(/\s/g, '');
    const snap = await get(ref(db, `users/${uid}`));
    const ud = snap.val() || {};
    
    document.getElementById('nav-img').src = ud.foto || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(currentUser.nome);
    document.getElementById('nav-xp').textContent = `${ud.xp || 0} XP`;
    
    carregarEquipeRanking();
    carregarNotificacoes();
    lucide.createIcons();
}

auth.onAuthStateChanged(async u => {
    if (u) {
        const dados = await buscarDadosUsuarioPorEmail(u.email);
        if (dados) {
            currentUser = { ...dados, email: u.email, uid: u.uid };
            init();
        }
    }
});
