import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue, set, push, serverTimestamp, update, get, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

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
const storage = getStorage(app);

let currentUser = null;
let currentMedia = null;
let currentChatUser = null;
let equipeData = [];
let mensagensNaoLidas = {};
let reacoesUsuario = {};

window.resetarXP = async () => {
    if (!confirm("Tem certeza que deseja zerar o XP de TODOS os funcionários?")) return;

    try {
        const snap = await get(ref(db, 'users'));
        const updates = {};

        snap.forEach(child => {
            updates[`users/${child.key}/xp`] = 0;
        });

        await update(ref(db), updates);

        // Atualiza XP do admin logado na navbar
        const navXp = document.getElementById('nav-xp');
        if (navXp) navXp.textContent = `0 XP`;

        mostrarToast("🔥 Ranking resetado com sucesso!", "success");

    } catch (e) {
        console.error(e);
        mostrarToast("Erro ao resetar ranking", "error");
    }
};



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
    "só falta jogar areia": { emoji: "😰", texto: "Sentindo morto por dentro", classe: "status-sobrevivencia" },
    "18h": { emoji: "⏰", texto: "Esperando 18h", classe: "status-18h" }
};

const PONTOS = {
    checkin: 10, post: 5, comentario: 2, like: 2, love: 3, dislike: 2, haha: 2, sad: 2,
    enquete_criar: 5, enquete_votar: 3, anotacao: 5, cotacao: 5, repique: 5, carencia: 5,
    mensagem: 3, badge_comum: 10, badge_raro: 20, badge_lendario: 100
};
function isAdmin() {
    if (!currentUser || !currentUser.nome) return false;

    return ADMINS
        .map(a => a.toLowerCase().trim())
        .includes(currentUser.nome.toLowerCase().trim());
}

// ==================== LOGIN ====================

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

// agora busca pelo EMAIL (100% confiável)
async function buscarDadosUsuarioPorEmail(email) {
    const eq = await carregarEquipe();
    return eq.find(p => p.email && p.email.toLowerCase() === email.toLowerCase());
}

window.realizarLogin = async () => {

    let email = document.getElementById('login-user').value.trim().toLowerCase();
    const senha = document.getElementById('login-pass').value;

    if (!email || !senha)
        return mostrarToast('Preencha os campos', 'warning');

    // permite digitar só o nome
    if (!email.includes('@'))
        email += '@lider-saude.com';

    try {

        // 🔐 autentica no firebase
        const cred = await signInWithEmailAndPassword(auth, email, senha);

        // 🔎 pega dados no equipe.json
        const dados = await buscarDadosUsuarioPorEmail(cred.user.email);

        if (!dados) {
            await signOut(auth);
            return mostrarToast('Usuário não está cadastrado na equipe.json', 'error');
        }

        // ✔ cria usuário logado corretamente
        currentUser = {
            ...dados,
            email: cred.user.email,
            uid: cred.user.uid
        };

        const uid = currentUser.nome.replace(/\s/g, '');

        await update(ref(db, `users/${uid}`), {
            status: 'online',
            ultimoAcesso: serverTimestamp()
        });

        localStorage.setItem('supimpa_session', JSON.stringify(currentUser));

        // entra no sistema
        document.getElementById('tela-login').classList.add('hidden');
        document.getElementById('main-header').classList.remove('hidden');

        init();
        verificarCheckin();

    } catch (e) {

        let msg = '❌ Usuário ou senha incorretos';

        if (e.code === 'auth/user-not-found')
            msg = 'Usuário não existe no Firebase';

        if (e.code === 'auth/wrong-password')
            msg = 'Senha incorreta';

        if (e.code === 'auth/too-many-requests')
            msg = '⏱️ Muitas tentativas, aguarde';

        mostrarToast(msg, 'error');
    }
};

// ==================== CHECK-IN ====================
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

// ==================== NOTIFICAÇÕES ====================
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

// ==================== CHAT MESSENGER STYLE ====================
window.abrirListaChat = () => {
    criarModalChat();
    carregarConversasRecentes();
};

function criarModalChat() {
    let modal = document.getElementById('chat-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'chat-modal';
        modal.className = 'fixed inset-0 bg-black/30 backdrop-blur-sm z-[90] flex items-end sm:items-center justify-center';
        modal.onclick = e => { if (e.target === modal) fecharChat(); };
        modal.innerHTML = `
            <div class="glass-card w-full sm:max-w-4xl h-[90vh] sm:h-[600px] flex flex-col rounded-t-3xl sm:rounded-3xl">
                <div class="p-4 border-b border-white/20 flex justify-between items-center">
                    <h3 class="font-black text-lg flex items-center gap-2"><i data-lucide="message-circle"></i> Mensagens</h3>
                    <button onclick="fecharChat()"><i data-lucide="x"></i></button>
                </div>
                
                <div id="chat-view-lista" class="flex-1 overflow-y-auto p-2">
                    <div class="mb-4">
                        <button onclick="iniciarNovaConversa()" class="w-full glossy bg-blue-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2">
                            <i data-lucide="plus-circle" class="w-5 h-5"></i> Nova Conversa
                        </button>
                    </div>
                    <div id="conversas-recentes" class="space-y-2"></div>
                </div>
                
                <div id="chat-view-conversa" class="hidden flex-1 flex flex-col">
                    <div class="p-3 border-b border-white/20 flex items-center gap-3">
                        <button onclick="voltarListaChat()" class="hover:scale-110"><i data-lucide="arrow-left"></i></button>
                        <img id="chat-user-foto" class="w-10 h-10 rounded-full">
                        <div class="flex-1">
                            <p id="chat-user-nome" class="font-bold text-sm"></p>
                            <p id="chat-user-setor" class="text-xs opacity-60"></p>
                        </div>
                    </div>
                    
                    <div id="chat-messages" class="flex-1 p-4 overflow-y-auto no-scrollbar space-y-2"></div>
                    
                    <div class="p-4 border-t border-white/20">
                        <div class="flex gap-2 items-end">
                            <input type="file" id="chat-file" class="hidden" accept="image/*,application/pdf" onchange="enviarArquivoChat(this)">
                            <button onclick="document.getElementById('chat-file').click()" class="p-2 glass-card rounded-lg hover:scale-105">
                                <i data-lucide="paperclip" class="w-5 h-5"></i>
                            </button>
                            <textarea id="chat-input" placeholder="Mensagem..." rows="1" class="flex-1 p-3 rounded-xl glass-card outline-none text-sm resize-none"></textarea>
                            <button onclick="enviarMensagemChat()" class="glossy bg-blue-600 text-white px-4 py-3 rounded-xl font-bold hover:scale-105">
                                <i data-lucide="send" class="w-5 h-5"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    modal.classList.remove('hidden');
    lucide.createIcons();
}

async function carregarConversasRecentes() {
    const eq = await carregarEquipe();
    const container = document.getElementById('conversas-recentes');
    container.innerHTML = '';
    
    for (const user of eq) {
        if (user.nome === currentUser.nome) continue;
        
        const chatId = [currentUser.nome, user.nome].sort().join('_').replace(/\s/g, '');
        const snap = await get(ref(db, `chats/${chatId}`));
        
        if (!snap.exists()) continue;
        
        let ultimaMsg = null;
        let temNaoLida = false;
        snap.forEach(c => {
            const msg = c.val();
            if (!ultimaMsg || msg.timestamp > ultimaMsg.timestamp) ultimaMsg = msg;
            if (msg.para === currentUser.nome && !msg.lida) temNaoLida = true;
        });
        
        const userSnap = await get(ref(db, `users/${user.nome.replace(/\s/g, '')}`));
        const userData = userSnap.val() || {};
        
        const div = document.createElement('div');
        div.className = `glass-card p-3 flex items-center gap-3 cursor-pointer hover:scale-102 transition-all ${temNaoLida ? 'border-2 border-green-500' : ''}`;
        div.onclick = () => abrirConversaCom(user);
        div.innerHTML = `
            <img src="${userData.foto || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.nome)}" class="w-12 h-12 rounded-full">
            <div class="flex-1 min-w-0">
                <p class="font-bold text-sm truncate">${user.nome}</p>
                <p class="text-xs opacity-60 truncate">${ultimaMsg ? (ultimaMsg.arquivo ? '📎 Arquivo' : ultimaMsg.texto.substring(0, 30)) : 'Nenhuma mensagem'}</p>
            </div>
            ${temNaoLida ? '<div class="w-3 h-3 rounded-full bg-green-500"></div>' : ''}
        `;
        container.appendChild(div);
    }
}

async function iniciarNovaConversa() {
    const eq = await carregarEquipe();
    const opcoes = eq.filter(u => u.nome !== currentUser.nome).map(u => u.nome).join('\n');
    const escolha = prompt(`Escolha um funcionário:\n\n${opcoes}`);
    if (!escolha) return;
    
    const user = eq.find(u => u.nome.toLowerCase().includes(escolha.toLowerCase()));
    if (user) abrirConversaCom(user);
    else mostrarToast('Funcionário não encontrado', 'error');
}

function abrirConversaCom(user) {
    currentChatUser = user;
    document.getElementById('chat-view-lista').classList.add('hidden');
    document.getElementById('chat-view-conversa').classList.remove('hidden');
    
    get(ref(db, `users/${user.nome.replace(/\s/g, '')}`)).then(snap => {
        const ud = snap.val() || {};
        document.getElementById('chat-user-foto').src = ud.foto || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.nome);
        document.getElementById('chat-user-nome').textContent = user.nome;
        document.getElementById('chat-user-setor').textContent = user.cargo;
    });
    
    const chatId = [currentUser.nome, user.nome].sort().join('_').replace(/\s/g, '');
    
    onValue(ref(db, `chats/${chatId}`), async snap => {
        const msgs = [];
        snap.forEach(c => msgs.push({ id: c.key, ...c.val() }));
        
        for (const m of msgs) {
            if (m.para === currentUser.nome && !m.lida) {
                await update(ref(db, `chats/${chatId}/${m.id}`), { lida: true });
            }
        }
        
        renderizarMensagensChat(msgs);
    });
    
    lucide.createIcons();
}

function renderizarMensagensChat(msgs) {
    const cont = document.getElementById('chat-messages');
    cont.innerHTML = '';
    
    if (!msgs.length) {
        cont.innerHTML = '<p class="text-center text-sm opacity-50 py-20">Nenhuma mensagem ainda</p>';
        return;
    }
    
    msgs.forEach(m => {
        const ehMinha = m.de === currentUser.nome;
        const div = document.createElement('div');
        div.className = `flex ${ehMinha ? 'justify-end' : 'justify-start'}`;
        
        let conteudo = '';
        if (m.arquivo) {
            const isImage = m.arquivoTipo?.startsWith('image/');
            conteudo = isImage ? 
                `<img src="${m.arquivo}" class="max-w-xs rounded-lg cursor-pointer" onclick="window.open('${m.arquivo}','_blank')">` :
                `<a href="${m.arquivo}" target="_blank" class="flex items-center gap-2 text-blue-400 underline"><i data-lucide="paperclip"></i> Arquivo</a>`;
        } else {
            conteudo = `<p class="text-sm">${m.texto}</p>`;
        }
        
        div.innerHTML = `
            <div class="chat-bubble p-3 rounded-2xl ${ehMinha ? 'bg-blue-500 text-white' : 'bg-white/30'}">
                ${conteudo}
                <p class="text-[9px] opacity-60 mt-1">${formatarTempo(m.timestamp)}</p>
            </div>
        `;
        cont.appendChild(div);
    });
    
    cont.scrollTop = cont.scrollHeight;
    lucide.createIcons();
}

window.enviarMensagemChat = async () => {
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

async function enviarArquivoChat(input) {
    if (!input.files[0] || !currentChatUser) return;
    
    mostrarToast('Enviando arquivo...', 'info');
    const file = input.files[0];
    const fileName = `chat/${Date.now()}_${file.name}`;
    const fileRef = storageRef(storage, fileName);
    
    try {
        await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);
        
        const chatId = [currentUser.nome, currentChatUser.nome].sort().join('_').replace(/\s/g, '');
        await push(ref(db, `chats/${chatId}`), {
            de: currentUser.nome, para: currentChatUser.nome,
            arquivo: url, arquivoTipo: file.type,
            timestamp: serverTimestamp(), lida: false
        });
        
        criarNotificacao('chat', {
            de: currentUser.nome,
            mensagem: `${currentUser.nome} enviou um arquivo`,
            userId: currentChatUser.nome.replace(/\s/g, '')
        });
        
        input.value = '';
        mostrarToast('Arquivo enviado!', 'success');
    } catch (e) {
        mostrarToast('Erro ao enviar arquivo', 'error');
    }
}

window.voltarListaChat = () => {
    document.getElementById('chat-view-conversa').classList.add('hidden');
    document.getElementById('chat-view-lista').classList.remove('hidden');
    currentChatUser = null;
    carregarConversasRecentes();
};

window.fecharChat = () => {
    document.getElementById('chat-modal')?.classList.add('hidden');
    currentChatUser = null;
};

// ==================== FEED SOCIAL CORRIGIDO ====================
window.previewMedia = el => {
    if (!el.files?.[0]) return;
    const r = new FileReader();
    r.onload = e => {
        currentMedia = e.target.result;
        document.getElementById('media-preview').classList.remove('hidden');
        document.getElementById('img-preview').src = currentMedia;
        lucide.createIcons();
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
    if (!texto && !currentMedia) return mostrarToast('Escreva algo ou adicione uma imagem', 'warning');
    
    const postData = {
        autor: currentUser.nome,
        setor: currentUser.cargo,
        texto, 
        imagem: currentMedia || null,
        timestamp: serverTimestamp(),
        reactions: {},
        comentarios: {}
    };
    
    try {
        await push(ref(db, 'feed'), postData);
        await ganharPontos('post');
        document.getElementById('feed-text').value = '';
        removerMedia();
        mostrarToast('✅ Post publicado! +5 XP', 'success');
    } catch (e) {
        console.error('Erro ao postar:', e);
        mostrarToast('Erro ao publicar', 'error');
    }
};

function carregarFeed() {
    onValue(ref(db, 'feed'), async snap => {
        const posts = [];
        snap.forEach(c => posts.push({ id: c.key, ...c.val() }));
        posts.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        
        const cont = document.getElementById('feed-posts');
        cont.innerHTML = '';
        
        if (posts.length === 0) {
            cont.innerHTML = '<p class="text-center text-sm opacity-50 py-20">Nenhum post ainda. Seja o primeiro!</p>';
            return;
        }
        
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
    
    const reacoesPost = post.reactions || {};
    const totalReacoes = Object.values(reacoesPost).length;
    
    const userReaction = reacoesPost[currentUser.nome.replace(/\s/g, '')];
    
    art.innerHTML = `
        <div class="flex items-center gap-3">
            <img src="${uData.foto || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(post.autor)}" class="w-12 h-12 rounded-full border-2 border-white/50">
            <div class="flex-1">
                <p class="font-black text-sm">${post.autor}</p>
                <p class="text-xs"><span class="setor-badge">${post.setor || 'Sem setor'}</span></p>
                <p class="text-xs opacity-60 mt-1">${formatarTempoCompleto(post.timestamp)}</p>
            </div>
        </div>
        ${post.texto ? `<p class="text-sm whitespace-pre-wrap">${post.texto.replace(/@(\w+(?:\s+\w+)*)/g, '<span class="text-blue-600 font-bold">@$1</span>')}</p>` : ''}
        ${post.imagem ? `<img src="${post.imagem}" class="w-full rounded-xl border border-white/40 cursor-pointer" onclick="window.open('${post.imagem}', '_blank')">` : ''}
        ${post.enquete ? criarHTMLEnquete(post.id, post.enquete) : ''}
        <div class="flex items-center justify-between border-t border-b border-white/20 py-3">
            <div class="flex gap-3">
                <button onclick="reagirPost('${post.id}', 'like')" class="reaction-btn flex items-center gap-1 hover:bg-white/20 px-3 py-1 rounded-lg ${userReaction === 'like' ? 'bg-blue-500/30' : ''}">
                    <span class="text-lg">👍</span>
                </button>
                <button onclick="reagirPost('${post.id}', 'love')" class="reaction-btn flex items-center gap-1 hover:bg-white/20 px-3 py-1 rounded-lg ${userReaction === 'love' ? 'bg-red-500/30' : ''}">
                    <span class="text-lg">❤️</span>
                </button>
                <button onclick="reagirPost('${post.id}', 'haha')" class="reaction-btn flex items-center gap-1 hover:bg-white/20 px-3 py-1 rounded-lg ${userReaction === 'haha' ? 'bg-yellow-500/30' : ''}">
                    <span class="text-lg">😂</span>
                </button>
                <button onclick="reagirPost('${post.id}', 'sad')" class="reaction-btn flex items-center gap-1 hover:bg-white/20 px-3 py-1 rounded-lg ${userReaction === 'sad' ? 'bg-gray-500/30' : ''}">
                    <span class="text-lg">😢</span>
                </button>
            </div>
            <div class="flex items-center gap-3">
                ${totalReacoes > 0 ? `<span class="text-xs font-bold">${totalReacoes} ${totalReacoes === 1 ? 'reação' : 'reações'}</span>` : ''}
                <button onclick="toggleComentarios('${post.id}')" class="text-xs font-bold hover:bg-white/20 px-3 py-1 rounded-lg">💬 Comentar</button>
            </div>
        </div>
        <div id="comentarios-${post.id}" class="hidden space-y-3">
            ${renderizarComentarios(post.comentarios || {})}
            <div class="flex gap-2">
                <input type="text" id="input-comment-${post.id}" placeholder="Escreva um comentário..." class="flex-1 p-2 rounded-lg glass-card text-sm outline-none">
                <button onclick="comentarPost('${post.id}')" class="glossy bg-blue-600 text-white px-4 rounded-lg font-bold text-xs">Enviar</button>
            </div>
        </div>
    `;
    
    return art;
}

function renderizarComentarios(comentarios) {
    let html = '';
    Object.values(comentarios || {}).forEach(c => {
        html += `<div class="bg-white/20 p-3 rounded-lg">
            <p class="text-xs font-bold">${c.usuario}</p>
            <p class="text-sm">${c.texto}</p>
            <p class="text-[9px] opacity-50 mt-1">${formatarTempo(c.timestamp)}</p>
        </div>`;
    });
    return html;
}

window.reagirPost = async (postId, tipo) => {
    const userId = currentUser.nome.replace(/\s/g, '');
    const reactionPath = `feed/${postId}/reactions/${userId}`;
    
    const snap = await get(ref(db, reactionPath));
    const reacaoAtual = snap.val();
    
    if (reacaoAtual === tipo) {
        await remove(ref(db, reactionPath));
    } else {
        await set(ref(db, reactionPath), tipo);
        await ganharPontos(tipo);
    }
};

window.toggleComentarios = (id) => {
    document.getElementById(`comentarios-${id}`)?.classList.toggle('hidden');
};

window.comentarPost = async (postId) => {
    const input = document.getElementById(`input-comment-${postId}`);
    const texto = input.value.trim();
    if (!texto) return;
    
    await push(ref(db, `feed/${postId}/comentarios`), {
        usuario: currentUser.nome,
        texto, timestamp: serverTimestamp()
    });
    
    input.value = '';
    await ganharPontos('comentario');
};

// ==================== ENQUETES ====================
window.criarEnquete = () => {
    const pergunta = prompt('Pergunta da enquete:');
    if (!pergunta) return;
    
    const opcoes = [];
    for (let i = 1; i <= 4; i++) {
        const op = prompt(`Opção ${i} (deixe vazio para parar):`);
        if (!op) break;
        opcoes.push(op);
    }
    
    if (opcoes.length < 2) return mostrarToast('Mínimo 2 opções', 'warning');
    
    const enqueteData = {
        autor: currentUser.nome,
        setor: currentUser.cargo,
        timestamp: serverTimestamp(),
        enquete: {
            pergunta,
            opcoes: opcoes.map(o => ({ texto: o, votos: 0 })),
            votantes: {},
            encerrada: false
        }
    };
    
    push(ref(db, 'feed'), enqueteData);
    ganharPontos('enquete_criar');
    mostrarToast('Enquete criada! +5 XP', 'success');
};

function criarHTMLEnquete(postId, enquete) {
    const userId = currentUser.nome.replace(/\s/g, '');
    const jaVotou = enquete.votantes?.[userId];
    const totalVotos = Object.values(enquete.votantes || {}).length;
    
    let html = `<div class="bg-white/10 p-4 rounded-xl"><h4 class="font-bold mb-3">${enquete.pergunta}</h4><div class="space-y-2">`;
    
    enquete.opcoes.forEach((op, idx) => {
        const porcentagem = totalVotos > 0 ? Math.round((op.votos / totalVotos) * 100) : 0;
        html += `<div class="relative">
            <button onclick="votarEnquete('${postId}', ${idx})" 
                    class="w-full text-left p-3 rounded-lg glass-card hover:scale-102 transition-all ${jaVotou ? 'cursor-default' : ''}"
                    ${enquete.encerrada || jaVotou ? 'disabled' : ''}>
                <div class="flex justify-between items-center">
                    <span class="text-sm font-bold">${op.texto}</span>
                    ${jaVotou || enquete.encerrada ? `<span class="text-xs font-bold">${porcentagem}%</span>` : ''}
                </div>
                ${jaVotou || enquete.encerrada ? `<div class="h-2 bg-blue-500 rounded mt-2" style="width:${porcentagem}%"></div>` : ''}
            </button>
        </div>`;
    });
    
    html += `</div><p class="text-xs opacity-60 mt-3">${totalVotos} ${totalVotos === 1 ? 'voto' : 'votos'}</p>`;
    
    if (enquete.autor === currentUser.nome && !enquete.encerrada) {
        html += `<button onclick="encerrarEnquete('${postId}')" class="mt-3 text-xs bg-red-500 text-white px-4 py-2 rounded-lg font-bold">Encerrar Enquete</button>`;
    }
    
    if (enquete.encerrada) {
        html += `<p class="text-xs text-red-500 font-bold mt-3">⚠️ Enquete encerrada</p>`;
    }
    
    html += '</div>';
    return html;
}

window.votarEnquete = async (postId, opcaoIdx) => {
    const snap = await get(ref(db, `feed/${postId}/enquete`));
    const enquete = snap.val();
    
    if (enquete.encerrada) return mostrarToast('Enquete encerrada', 'warning');
    
    const userId = currentUser.nome.replace(/\s/g, '');
    if (enquete.votantes?.[userId]) return mostrarToast('Você já votou', 'warning');
    
    await update(ref(db, `feed/${postId}/enquete/opcoes/${opcaoIdx}`), {
        votos: (enquete.opcoes[opcaoIdx].votos || 0) + 1
    });
    
    await update(ref(db, `feed/${postId}/enquete/votantes/${userId}`), true);
    await ganharPontos('enquete_votar');
    mostrarToast('Voto registrado! +3 XP', 'success');
};

window.encerrarEnquete = async (postId) => {
    await update(ref(db, `feed/${postId}/enquete`), { encerrada: true });
    mostrarToast('Enquete encerrada', 'success');
};

window.abrirFeed = () => {
    abrirTela('tela-feed');
    carregarFeed();
    
    const uid = currentUser.nome.replace(/\s/g, '');
    get(ref(db, `users/${uid}`)).then(snap => {
        const userData = snap.val() || {};
        document.getElementById('post-user-img').src = userData.foto || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(currentUser.nome);
    });
};


// ==================== ANOTAÇÕES COM CARDS ====================
window.abrirAnotacoes = async () => {
    const modal = criarModal('📝 Anotações', `
        <div class="mb-4">
            <button onclick="criarCardAnotacao()" class="w-full glossy bg-green-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2">
                <i data-lucide="plus-circle" class="w-5 h-5"></i> Novo Card
            </button>
        </div>
        <div id="anotacoes-cards" class="space-y-3"></div>
    `);
    
    carregarAnotacoes();
};

async function carregarAnotacoes() {
    const uid = currentUser.nome.replace(/\s/g, '');
    const snap = await get(ref(db, `anotacoes/${uid}`));
    const container = document.getElementById('anotacoes-cards');
    container.innerHTML = '';
    
    snap.forEach(c => {
        const card = c.val();
        const div = document.createElement('div');
        div.className = 'glass-card p-4';
        div.innerHTML = `
            <div class="flex justify-between items-center mb-2">
                <h4 class="font-bold text-sm">${card.titulo}</h4>
                <button onclick="removerCardAnotacao('${c.key}')" class="text-red-500 hover:text-red-700"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </div>
            <textarea onchange="salvarAnotacao('${c.key}', this.value)" class="w-full h-32 p-3 glass-card rounded-xl outline-none text-sm resize-none">${card.conteudo || ''}</textarea>
        `;
        container.appendChild(div);
    });
    
    lucide.createIcons();
}

window.criarCardAnotacao = async () => {
    const titulo = prompt('Título do card:');
    if (!titulo) return;
    
    const uid = currentUser.nome.replace(/\s/g, '');
    await push(ref(db, `anotacoes/${uid}`), { titulo, conteudo: '' });
    carregarAnotacoes();
    
    const hoje = new Date().toDateString();
    const ultima = await get(ref(db, `users/${uid}/ultimaAnotacao`));
    if (ultima.val() !== hoje) {
        await update(ref(db, `users/${uid}`), { ultimaAnotacao: hoje });
        await ganharPontos('anotacao');
        mostrarToast('+5 XP', 'success');
    }
};

window.salvarAnotacao = async (cardId, conteudo) => {
    const uid = currentUser.nome.replace(/\s/g, '');
    await update(ref(db, `anotacoes/${uid}/${cardId}`), { conteudo });
    mostrarToast('✅ Salvo', 'success');
};

window.removerCardAnotacao = async (cardId) => {
    if (!confirm('Remover este card?')) return;
    const uid = currentUser.nome.replace(/\s/g, '');
    await remove(ref(db, `anotacoes/${uid}/${cardId}`));
    carregarAnotacoes();
};

// ==================== SCRIPTS COM CARDS ====================
window.abrirScripts = () => {
    const ehAdmin = isAdmin());
    const modal = criarModal('📚 Wiki de Scripts', `
        ${ehAdmin ? '<button onclick="criarCardScript()" class="w-full glossy bg-green-600 text-white py-3 rounded-xl font-bold mb-4">➕ Novo Script</button>' : ''}
        <div id="scripts-cards" class="space-y-3"></div>
    `);
    carregarScripts();
};

async function carregarScripts() {
    const snap = await get(ref(db, 'scripts'));
    const container = document.getElementById('scripts-cards');
    container.innerHTML = '';
    
    snap.forEach(c => {
        const s = c.val();
        const div = document.createElement('div');
        div.className = 'glass-card p-4';
        div.innerHTML = `
            <div class="flex justify-between items-center mb-2">
                <div>
                    <h4 class="font-bold text-sm">${s.titulo}</h4>
                    <p class="text-xs opacity-60">${s.categoria}</p>
                </div>
                ${isAdmin()) ? `
                    <div class="flex gap-2">
                        <button onclick="editarScript('${c.key}')" class="text-blue-500"><i data-lucide="edit" class="w-4 h-4"></i></button>
                        <button onclick="removerScript('${c.key}')" class="text-red-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                    </div>
                ` : ''}
            </div>
            <pre class="text-sm bg-white/20 p-3 rounded whitespace-pre-wrap">${s.conteudo}</pre>
        `;
        container.appendChild(div);
    });
    
    lucide.createIcons();
}

window.criarCardScript = async () => {
    const titulo = prompt('Título:');
    const categoria = prompt('Categoria (ex: Boas-vindas, Ligação):');
    const conteudo = prompt('Conteúdo (use Enter para quebrar linha):');
    
    if (titulo && categoria && conteudo) {
        await push(ref(db, 'scripts'), { titulo, categoria, conteudo });
        carregarScripts();
        mostrarToast('Script criado!', 'success');
    }
};

window.editarScript = async (id) => {
    const snap = await get(ref(db, `scripts/${id}`));
    const s = snap.val();
    
    const novoConteudo = prompt('Editar conteúdo:', s.conteudo);
    if (novoConteudo !== null) {
        await update(ref(db, `scripts/${id}`), { conteudo: novoConteudo });
        carregarScripts();
    }
};

window.removerScript = async (id) => {
    if (!confirm('Remover script?')) return;
    await remove(ref(db, `scripts/${id}`));
    carregarScripts();
};

// ==================== CALENDÁRIO ====================
window.abrirCalendario = () => {
    const ehAdmin = ADMINS
    .map(a => a.toLowerCase())
    .includes(currentUser.nome.toLowerCase());
    const modal = criarModal('📅 Calendário', `
        ${ehAdmin ? `
            <button onclick="criarEvento()" 
                class="w-full glossy bg-green-600 text-white py-3 rounded-xl font-bold mb-3">
                📅 Novo Evento
            </button>

        ` : ''}

        <div id="eventos-lista" class="space-y-3"></div>
    `);

    carregarEventos();
};
async function carregarEventos() {
    const ehAdmin = ADMINS
        .map(a => a.toLowerCase())
        .includes(currentUser.nome.toLowerCase());

    const snap = await get(ref(db, 'eventos'));
    const lista = document.getElementById('eventos-lista');
    lista.innerHTML = '';
    
    snap.forEach(c => {
        const e = c.val();
        const div = document.createElement('div');
        div.className = 'glass-card p-4';
        div.innerHTML = `
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    <h4 class="font-bold text-sm">${e.titulo}</h4>
                    <p class="text-xs opacity-70">📅 ${e.data} às ${e.hora}</p>
                    <p class="text-sm mt-2">${e.descricao}</p>
                </div>
                ${ehAdmin ? `
                    <button onclick="removerEvento('${c.key}')" class="text-red-500">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                ` : ''}
            </div>
        `;
        lista.appendChild(div);
    });
    
    lucide.createIcons();
}

window.criarEvento = async () => {
    const titulo = prompt('Título:');
    const data = prompt('Data (DD/MM/YYYY):');
    const hora = prompt('Horário:');
    const descricao = prompt('Descrição:');
    
    if (titulo && data) {
        await push(ref(db, 'eventos'), { titulo, data, hora, descricao });
        carregarEventos();
        mostrarToast('Evento criado!', 'success');
        
        const eq = await carregarEquipe();
        eq.forEach(u => {
            criarNotificacao('desafio', {
                de: 'Sistema',
                mensagem: `📅 Novo evento: ${titulo} - ${data}`,
                userId: u.nome.replace(/\s/g, '')
            });
        });
    }
};

window.removerEvento = async (id) => {
    if (!confirm('Remover evento?')) return;
    await remove(ref(db, `eventos/${id}`));
    carregarEventos();
};

// ==================== CHATBOT ====================
window.abrirChatbot = () => {
    const modal = criarModal('🤖 Assistente', `
        <div id="chatbot-msgs" class="h-96 overflow-y-auto glass-card p-4 mb-4 space-y-2"></div>
        <div class="flex gap-2">
            <input type="text" id="chatbot-input" placeholder="Pergunte algo..." class="flex-1 p-3 rounded-xl glass-card outline-none">
            <button onclick="enviarChatbot()" class="glossy bg-blue-600 text-white px-6 rounded-xl font-bold">Enviar</button>
        </div>
    `);
    adicionarMsgBot('Olá! Como posso ajudar?');
};

window.enviarChatbot = () => {
    const input = document.getElementById('chatbot-input');
    const texto = input.value.trim();
    if (!texto) return;
    
    adicionarMsgUsuario(texto);
    input.value = '';
    
    setTimeout(() => {
        const resp = gerarRespBot(texto.toLowerCase());
        adicionarMsgBot(resp);
    }, 500);
};

function gerarRespBot(texto) {
    if (texto.includes('carência')) return '📋 A carência varia por plano. Use a ferramenta!';
    if (texto.includes('cotação')) return '💰 Use a calculadora de cotação!';
    if (texto.includes('pme')) return '🏢 PME = Pequenas e Médias Empresas!';
    if (texto.includes('oi') || texto.includes('olá')) return '😊 Oi! Como posso ajudar?';
    return '🤔 Não entendi. Pergunte sobre carência, cotação ou PME!';
}

function adicionarMsgBot(msg) {
    const div = document.createElement('div');
    div.className = 'flex justify-start';
    div.innerHTML = `<div class="bg-white/30 p-3 rounded-xl max-w-[70%]"><p class="text-sm">${msg}</p></div>`;
    document.getElementById('chatbot-msgs').appendChild(div);
    document.getElementById('chatbot-msgs').scrollTop = 999999;
}

function adicionarMsgUsuario(msg) {
    const div = document.createElement('div');
    div.className = 'flex justify-end';
    div.innerHTML = `<div class="bg-blue-500 text-white p-3 rounded-xl max-w-[70%]"><p class="text-sm">${msg}</p></div>`;
    document.getElementById('chatbot-msgs').appendChild(div);
    document.getElementById('chatbot-msgs').scrollTop = 999999;
}

// ==================== FERRAMENTAS ====================
window.abrirCotacao = async () => {
const tabelaPrecosCotacao = {
    "PME": {
        "NOSSO MÉDICO": {
            "PARCIAL": { "0-18": { enf: 220.62, apt: 330.06 }, "19-23": { enf: 246.96, apt: 369.56 }, "24-28": { enf: 276.59, apt: 413.83 }, "29-33": { enf: 318.08, apt: 475.89 }, "34-38": { enf: 365.79, apt: 547.32 }, "39-43": { enf: 435.42, apt: 651.13 }, "44-48": { enf: 544.27, apt: 813.91 }, "49-53": { enf: 680.34, apt: 1017.51 }, "54-58": { enf: 1156.65, apt: 1730.32 }, "59+": { enf: 1295.44, apt: 1938.37 } },
            "TOTAL": { "0-18": { enf: 165.43, apt: 247.13 }, "19-23": { enf: 185.28, apt: 277.12 }, "24-28": { enf: 207.51, apt: 310.37 }, "29-33": { enf: 238.64, apt: 356.93 }, "34-38": { enf: 274.44, apt: 410.47 }, "39-43": { enf: 326.58, apt: 488.46 }, "44-48": { enf: 408.23, apt: 610.58 }, "49-53": { enf: 510.29, apt: 763.23 }, "54-58": { enf: 867.49, apt: 1297.49 }, "59+": { enf: 971.59, apt: 1453.19 } }
        },
        "NOSSO PLANO": {
            "PARCIAL": { "0-18": { amb: 177.51, enf: 244.77, apt: 366.48 }, "19-23": { amb: 198.81, enf: 274.14, apt: 410.46 }, "24-28": { amb: 222.67, enf: 307.04, apt: 459.72 }, "29-33": { amb: 256.07, enf: 353.10, apt: 528.68 }, "34-38": { amb: 294.48, enf: 406.07, apt: 607.98 }, "39-43": { amb: 350.43, enf: 483.22, apt: 723.50 }, "44-48": { amb: 438.04, enf: 604.03, apt: 904.38 }, "49-53": { amb: 547.55, enf: 755.04, apt: 1130.48 }, "54-58": { amb: 930.84, enf: 1283.57, apt: 1921.82 }, "59+": { amb: 1042.54, enf: 1437.60, apt: 2152.44 } },
            "TOTAL": { "0-18": { amb: 113.87, enf: 183.63, apt: 274.75 }, "19-23": { amb: 127.53, enf: 205.67, apt: 307.72 }, "24-28": { amb: 142.83, enf: 230.35, apt: 344.65 }, "29-33": { amb: 164.25, enf: 264.90, apt: 396.35 }, "34-38": { amb: 188.89, enf: 304.64, apt: 455.80 }, "39-43": { amb: 224.78, enf: 362.52, apt: 542.40 }, "44-48": { amb: 280.98, enf: 453.15, apt: 678.00 }, "49-53": { amb: 351.23, enf: 566.44, apt: 847.50 }, "54-58": { amb: 597.09, enf: 962.95, apt: 1440.75 }, "59+": { amb: 668.74, enf: 1078.50, apt: 1613.64 } }
        }
    },
    "INDIVIDUAL": {
        "NOSSO MÉDICO": {
            "PARCIAL": { "0-18": { enf: 220.62, apt: 330.06 }, "19-23": { enf: 246.96, apt: 369.56 }, "24-28": { enf: 276.59, apt: 413.83 }, "29-33": { enf: 318.08, apt: 475.89 }, "34-38": { enf: 365.79, apt: 547.32 }, "39-43": { enf: 435.42, apt: 651.13 }, "44-48": { enf: 544.27, apt: 813.91 }, "49-53": { enf: 680.34, apt: 1017.51 }, "54-58": { enf: 1156.65, apt: 1730.32 }, "59+": { enf: 1295.44, apt: 1938.37 } },
            "TOTAL": { "0-18": { enf: 165.43, apt: 247.13 }, "19-23": { enf: 185.28, apt: 277.12 }, "24-28": { enf: 207.51, apt: 310.37 }, "29-33": { enf: 238.64, apt: 356.93 }, "34-38": { enf: 274.44, apt: 410.47 }, "39-43": { enf: 326.58, apt: 488.46 }, "44-48": { enf: 408.23, apt: 610.58 }, "49-53": { enf: 510.29, apt: 763.23 }, "54-58": { enf: 867.49, apt: 1297.49 }, "59+": { enf: 971.59, apt: 1453.19 } }
        },
        "NOSSO PLANO": {
            "PARCIAL": { "0-18": { amb: 177.51, enf: 244.77, apt: 366.48 }, "19-23": { amb: 198.81, enf: 274.14, apt: 410.46 }, "24-28": { amb: 222.67, enf: 307.04, apt: 459.72 }, "29-33": { amb: 256.07, enf: 353.10, apt: 528.68 }, "34-38": { amb: 294.48, enf: 406.07, apt: 607.98 }, "39-43": { amb: 350.43, enf: 483.22, apt: 723.50 }, "44-48": { amb: 438.04, enf: 604.03, apt: 904.38 }, "49-53": { amb: 547.55, enf: 755.04, apt: 1130.48 }, "54-58": { amb: 930.84, enf: 1283.57, apt: 1921.82 }, "59+": { amb: 1042.54, enf: 1437.60, apt: 2152.44 } },
            "TOTAL": { "0-18": { amb: 113.87, enf: 183.63, apt: 274.75 }, "19-23": { amb: 127.53, enf: 205.67, apt: 307.72 }, "24-28": { amb: 142.83, enf: 230.35, apt: 344.65 }, "29-33": { amb: 164.25, enf: 264.90, apt: 396.35 }, "34-38": { amb: 188.89, enf: 304.64, apt: 455.80 }, "39-43": { amb: 224.78, enf: 362.52, apt: 542.40 }, "44-48": { amb: 280.98, enf: 453.15, apt: 678.00 }, "49-53": { amb: 351.23, enf: 566.44, apt: 847.50 }, "54-58": { amb: 597.09, enf: 962.95, apt: 1440.75 }, "59+": { amb: 668.74, enf: 1078.50, apt: 1613.64 } }
        }
    }
};

function getFaixaCotacao(idade) {
    idade = parseInt(idade);
    if (idade <= 18) return { t: "00-18", k: "0-18" };
    if (idade <= 23) return { t: "19-23", k: "19-23" };
    if (idade <= 28) return { t: "24-28", k: "24-28" };
    if (idade <= 33) return { t: "29-33", k: "29-33" };
    if (idade <= 38) return { t: "34-38", k: "34-38" };
    if (idade <= 43) return { t: "39-43", k: "39-43" };
    if (idade <= 48) return { t: "44-48", k: "44-48" };
    if (idade <= 53) return { t: "49-53", k: "49-53" };
    if (idade <= 58) return { t: "54-58", k: "54-58" };
    return { t: "59+", k: "59+" };
}

window.contarVidasCotacao = () => {
    const val = document.getElementById('idadesInput').value;
    const idades = val.split(/[\s,]+/).filter(i => i.trim() !== "");
    document.getElementById('contadorVidas').innerText = `${idades.length} vidas`;
};

const fmtCotacao = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

window.gerarOrcamentoCotacao = () => {
    const nomeCorretor = document.getElementById('nomeCorretor').value;
    const telCorretor = document.getElementById('telCorretor').value;
    const tipoContrato = document.querySelector('input[name="tipoContrato"]:checked').value;
    const idadesStr = document.getElementById('idadesInput').value;
    const plano = document.getElementById('nomePlano').value;
    const copart = document.getElementById('copart').value;
    
    const querAmb = document.getElementById('checkAmb').checked;
    const querEnf = document.getElementById('checkEnf').checked;
    const querApt = document.getElementById('checkApt').checked;

    if (!idadesStr) { mostrarToast('Informe as idades', 'warning'); return; }
    const idades = idadesStr.split(/[\s,]+/).map(i => i.trim()).filter(i => i !== "");

    let texto = `HAPVIDA - ${tipoContrato === 'PME' ? 'SUPER SIMPLES' : 'INDIVIDUAL'}\n`;
    texto += `PLANO: ${plano} | COPART: ${copart}\n`;
    if(nomeCorretor) texto += `CORRETOR: ${nomeCorretor} ${telCorretor ? '| ' + telCorretor : ''}\n`;
    texto += `------------------------------------\n\n`;

    let sAmb = 0, sEnf = 0, sApt = 0;
    let sAmbD = 0, sEnfD = 0, sAptD = 0;

    idades.forEach(idade => {
        const info = getFaixaCotacao(idade);
        const precos = tabelaPrecosCotacao[tipoContrato][plano][copart][info.k];
        texto += `Idade: ${idade} anos (${info.t})\n`;

        if (querAmb && precos.amb) {
            const desc = precos.amb * 0.85;
            texto += `• Amb: 3x de ${fmtCotacao(desc)} -> dps ${fmtCotacao(precos.amb)}\n`;
            sAmb += precos.amb; sAmbD += desc;
        }
        if (querEnf && precos.enf) {
            const desc = precos.enf * 0.85;
            texto += `• Enf: 3x de ${fmtCotacao(desc)} -> dps ${fmtCotacao(precos.enf)}\n`;
            sEnf += precos.enf; sEnfD += desc;
        }
        if (querApt && precos.apt) {
            const desc = precos.apt * 0.85;
            texto += `• Apt: 3x de ${fmtCotacao(desc)} -> dps ${fmtCotacao(precos.apt)}\n`;
            sApt += precos.apt; sAptD += desc;
        }
        texto += `\n`;
    });

    texto += `------------------------------------\n`;
    texto += `RESUMO DO GRUPO (${idades.length} vidas):\n\n`;
    if (querAmb && sAmb > 0) texto += `TOTAL AMBULATORIAL:\n3 Meses: ${fmtCotacao(sAmbD)} | Total: ${fmtCotacao(sAmb)}\n\n`;
    if (querEnf && sEnf > 0) texto += `TOTAL ENFERMARIA:\n3 Meses: ${fmtCotacao(sEnfD)} | Total: ${fmtCotacao(sEnf)}\n\n`;
    if (querApt && sApt > 0) texto += `TOTAL APARTAMENTO:\n3 Meses: ${fmtCotacao(sAptD)} | Total: ${fmtCotacao(sApt)}\n`;
    
    document.getElementById('resultadoArea').value = texto.trim();
};

window.copiarTextoCotacao = () => {
    const area = document.getElementById("resultadoArea");
    if (!area.value) return;
    navigator.clipboard.writeText(area.value).then(() => {
        const btn = document.getElementById("btnCopiar");
        btn.innerText = "COPIADO!";
        setTimeout(() => btn.innerText = "COPIAR", 2000);
    });
};
    const hoje = new Date().toDateString();
    const uid = currentUser.nome.replace(/\s/g, '');
    const ultima = await get(ref(db, `users/${uid}/ultimaCotacao`));
    
    const modal = criarModal('💰 Cotação Hapvida', `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- FORMULÁRIO -->
            <div class="glass-card p-6 space-y-5">
                <div class="grid grid-cols-2 gap-4 border-b border-white/20 pb-4">
                    <div>
                        <label class="block text-xs font-bold opacity-60 uppercase mb-1">Seu Nome</label>
                        <input type="text" id="nomeCorretor" placeholder="Nome do Corretor" 
                               class="w-full p-2 glass-card rounded-xl text-sm outline-none">
                    </div>
                    <div>
                        <label class="block text-xs font-bold opacity-60 uppercase mb-1">Telefone</label>
                        <input type="text" id="telCorretor" placeholder="(00) 00000-0000" 
                               class="w-full p-2 glass-card rounded-xl text-sm outline-none">
                    </div>
                </div>

                <div>
                    <label class="block text-sm font-bold mb-2">Tipo de Contrato</label>
                    <div class="flex gap-4">
                        <label class="flex-1 flex items-center justify-center gap-2 p-3 glass-card rounded-xl cursor-pointer hover:scale-105 transition-all has-[:checked]:bg-blue-500/30 has-[:checked]:border-2 has-[:checked]:border-blue-500">
                            <input type="radio" name="tipoContrato" value="INDIVIDUAL" checked class="w-4 h-4">
                            <span class="text-sm font-bold">Individual (CPF)</span>
                        </label>
                        <label class="flex-1 flex items-center justify-center gap-2 p-3 glass-card rounded-xl cursor-pointer hover:scale-105 transition-all has-[:checked]:bg-blue-500/30 has-[:checked]:border-2 has-[:checked]:border-blue-500">
                            <input type="radio" name="tipoContrato" value="PME" class="w-4 h-4">
                            <span class="text-sm font-bold">Super Simples</span>
                        </label>
                    </div>
                </div>

                <div>
                    <div class="flex justify-between items-center mb-2">
                        <label class="block text-sm font-bold">Idades (separadas por vírgula)</label>
                        <span id="contadorVidas" class="text-xs bg-orange-500 text-white px-3 py-1 rounded-full font-bold">0 vidas</span>
                    </div>
                    <input type="text" id="idadesInput" oninput="contarVidasCotacao()" placeholder="Ex: 5, 28, 42" 
                           class="w-full p-3 glass-card rounded-xl outline-none">
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-bold mb-2">Linha do Plano</label>
                        <select id="nomePlano" class="w-full p-3 glass-card rounded-xl outline-none">
                            <option value="NOSSO PLANO">NOSSO PLANO</option>
                            <option value="NOSSO MÉDICO">NOSSO MÉDICO</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-bold mb-2">Coparticipação</label>
                        <select id="copart" class="w-full p-3 glass-card rounded-xl outline-none">
                            <option value="PARCIAL">PARCIAL</option>
                            <option value="TOTAL">TOTAL</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label class="block text-sm font-bold mb-3">Acomodações</label>
                    <div class="flex flex-wrap gap-3">
                        <label class="flex items-center gap-2 cursor-pointer glass-card px-4 py-2 rounded-xl hover:scale-105 transition-all">
                            <input type="checkbox" id="checkAmb" class="w-4 h-4" checked>
                            <span class="text-sm font-bold">Ambulatorial</span>
                        </label>
                        <label class="flex items-center gap-2 cursor-pointer glass-card px-4 py-2 rounded-xl hover:scale-105 transition-all">
                            <input type="checkbox" id="checkEnf" class="w-4 h-4" checked>
                            <span class="text-sm font-bold">Enfermaria</span>
                        </label>
                        <label class="flex items-center gap-2 cursor-pointer glass-card px-4 py-2 rounded-xl hover:scale-105 transition-all">
                            <input type="checkbox" id="checkApt" class="w-4 h-4">
                            <span class="text-sm font-bold">Apartamento</span>
                        </label>
                    </div>
                </div>

                <button onclick="gerarOrcamentoCotacao()" class="w-full glossy bg-blue-600 text-white font-black py-4 rounded-xl hover:scale-105 transition-all shadow-lg uppercase">
                    Gerar Orçamento
                </button>
            </div>

            <!-- RESULTADO -->
            <div class="glass-card flex flex-col">
                <div class="p-4 bg-white/10 border-b border-white/20 flex justify-between items-center">
                    <span class="font-bold uppercase text-xs">Visualização da Cotação</span>
                    <div class="flex gap-2">
                        <button onclick="copiarTextoCotacao()" id="btnCopiar" class="glass-card text-xs px-4 py-2 rounded-xl font-bold hover:scale-105 transition-all">
                            COPIAR
                        </button>
                    </div>
                </div>
                <textarea id="resultadoArea" readonly 
                          class="flex-1 p-4 bg-white/5 resize-none outline-none font-mono text-sm"
                          placeholder="O resultado aparecerá aqui..."></textarea>
            </div>
        </div>
    `);
    
    lucide.createIcons();
    
    if (ultima.val() !== hoje) {
        await update(ref(db, `users/${uid}`), { ultimaCotacao: hoje });
        await ganharPontos('cotacao');
        mostrarToast('+5 XP', 'success');
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

// ==================== BADGES ====================
window.abrirBadges = () => {
    const modal = criarModal('🏆 Badges', '<div id="badges-grid" class="grid grid-cols-2 md:grid-cols-3 gap-4"></div>');
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
        div.className = `glass-card p-4 text-center ${possui ? `badge-${badge.r}` : 'opacity-40 grayscale'}`;
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

// ==================== PERFIL COM UPLOAD ====================
window.verMeuPerfil = async () => {
    const uid = currentUser.nome.replace(/\s/g, '');
    const snap = await get(ref(db, `users/${uid}`));
    const userData = snap.val() || {};
    
    const modal = criarModal('👤 Meu Perfil', `
        <div class="text-center space-y-4">
            <div class="relative inline-block">
                <img id="perfil-foto" src="${userData.foto || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(currentUser.nome)}" class="w-32 h-32 rounded-full mx-auto border-4 border-blue-400">
                <input type="file" id="upload-foto-perfil" class="hidden" accept="image/*" onchange="uploadFotoPerfil(this)">
                <button onclick="document.getElementById('upload-foto-perfil').click()" class="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full hover:scale-110">
                    <i data-lucide="camera" class="w-5 h-5"></i>
                </button>
            </div>
            
            <h3 class="text-xl font-black">${currentUser.nome}</h3>
            <p class="text-sm"><span class="setor-badge">${currentUser.cargo}</span></p>
            <p class="text-lg font-bold text-blue-600">${userData.xp || 0} XP</p>
            
            <div>
                <label class="text-xs font-bold block mb-2">Email</label>
                <input type="email" id="perfil-email" value="${userData.email || ''}" class="w-full p-3 glass-card rounded-xl outline-none text-sm">
            </div>
            
            <div>
                <label class="text-xs font-bold block mb-2">Telefone</label>
                <input type="tel" id="perfil-tel" value="${userData.telefone || ''}" class="w-full p-3 glass-card rounded-xl outline-none text-sm">
            </div>
            
            <div>
                <label class="text-xs font-bold block mb-2">Status de Humor</label>
                <select id="perfil-humor" class="w-full p-3 glass-card rounded-xl font-bold">
                    <option value="">Nenhum</option>
                    ${Object.entries(STATUS_HUMOR).map(([k, v]) => 
                        `<option value="${k}" ${userData.statusHumor === k ? 'selected' : ''}>${v.emoji} ${v.texto}</option>`
                    ).join('')}
                </select>
                <input type="text" id="perfil-humor-custom" placeholder="Ou digite um humor personalizado..." class="w-full p-3 glass-card rounded-xl outline-none text-sm mt-2">
            </div>
            
            <div>
                <label class="text-xs font-bold block mb-2">Fotos Destaque</label>
                <div class="grid grid-cols-3 gap-2">
                    ${[1,2,3].map(i => `
                        <div class="relative">
                            <div class="glass-card h-24 flex items-center justify-center rounded-xl overflow-hidden">
                                <img id="destaque-${i}" src="${userData[`destaque${i}`] || ''}" class="w-full h-full object-cover ${userData[`destaque${i}`] ? '' : 'hidden'}">
                                <p class="text-xs opacity-50 ${userData[`destaque${i}`] ? 'hidden' : ''}">Foto ${i}</p>
                            </div>
                            <input type="file" id="upload-destaque-${i}" class="hidden" accept="image/*" onchange="uploadFotoDestaque(${i}, this)">
                            <button onclick="document.getElementById('upload-destaque-${i}').click()" class="absolute bottom-2 right-2 bg-blue-600 text-white p-1 rounded-full hover:scale-110">
                                <i data-lucide="camera" class="w-3 h-3"></i>
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <button onclick="salvarPerfil()" class="w-full glossy bg-blue-600 text-white py-3 rounded-xl font-bold">💾 Salvar Perfil</button>
            <button onclick="redefinirSenha()" class="w-full glossy bg-yellow-600 text-white py-3 rounded-xl font-bold">🔑 Redefinir Senha</button>
            <button onclick="realizarLogout()" class="w-full bg-red-500 text-white py-3 rounded-xl font-bold">🚪 Sair</button>
        </div>
    `);
    
    lucide.createIcons();
};

window.uploadFotoPerfil = async (input) => {
    if (!input.files[0]) return;
    mostrarToast('Enviando...', 'info');
    
    const file = input.files[0];
    const fileName = `perfil/${currentUser.nome.replace(/\s/g, '')}_${Date.now()}`;
    const fileRef = storageRef(storage, fileName);
    
    try {
        await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);
        
        const uid = currentUser.nome.replace(/\s/g, '');
        await update(ref(db, `users/${uid}`), { foto: url });
        
        document.getElementById('perfil-foto').src = url;
        document.getElementById('nav-img').src = url;
        mostrarToast('✅ Foto atualizada!', 'success');
    } catch (e) {
        mostrarToast('Erro ao enviar foto', 'error');
    }
};

window.uploadFotoDestaque = async (numero, input) => {
    if (!input.files[0]) return;
    mostrarToast('Enviando...', 'info');
    
    const file = input.files[0];
    const fileName = `destaque/${currentUser.nome.replace(/\s/g, '')}_${numero}_${Date.now()}`;
    const fileRef = storageRef(storage, fileName);
    
    try {
        await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);
        
        const uid = currentUser.nome.replace(/\s/g, '');
        await update(ref(db, `users/${uid}`), { [`destaque${numero}`]: url });
        
        const img = document.getElementById(`destaque-${numero}`);
        img.src = url;
        img.classList.remove('hidden');
        img.previousElementSibling?.classList.add('hidden');
        
        mostrarToast('✅ Foto adicionada!', 'success');
    } catch (e) {
        mostrarToast('Erro ao enviar', 'error');
    }
};

window.salvarPerfil = async () => {
    const uid = currentUser.nome.replace(/\s/g, '');
    const email = document.getElementById('perfil-email').value;
    const tel = document.getElementById('perfil-tel').value;
    const humor = document.getElementById('perfil-humor').value;
    const humorCustom = document.getElementById('perfil-humor-custom').value.trim();
    
    await update(ref(db, `users/${uid}`), {
        email, telefone: tel,
        statusHumor: humorCustom || humor,
        statusHumorCustom: humorCustom || null
    });
    
    mostrarToast('✅ Perfil salvo!', 'success');
};

window.redefinirSenha = async () => {
    const email = currentUser?.email;
    if (!email) return mostrarToast('Email não encontrado', 'error');
    
    try {
        await sendPasswordResetEmail(auth, email);
        mostrarToast('📧 Email enviado!', 'success');
    } catch { mostrarToast('Erro ao enviar', 'error'); }
};

// Continua na próxima parte...


// ==================== VER PERFIL DE OUTRO USUÁRIO ====================
async function verPerfilUsuario(usuario) {
    const uid = usuario.nome.replace(/\s/g, '');
    const snap = await get(ref(db, `users/${uid}`));
    const userData = snap.val() || {};
    
    const vezesFunc = userData.vezesFunc || 0;
    
    const modal = criarModal(`👤 ${usuario.nome}`, `
        <div class="text-center space-y-4">
            <img src="${userData.foto || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(usuario.nome)}" class="w-32 h-32 rounded-full mx-auto border-4 border-blue-400">
            
            <h3 class="text-xl font-black">${usuario.nome}</h3>
            <p class="text-sm"><span class="setor-badge">${usuario.cargo}</span></p>
            <p class="text-lg font-bold text-blue-600">${userData.xp || 0} XP</p>
            
            ${vezesFunc > 0 ? `<p class="text-sm font-bold text-yellow-600">⭐ Funcionário do Mês ${vezesFunc}x</p>` : ''}
            
            <div class="text-left space-y-2 bg-white/10 p-4 rounded-xl">
                <p class="text-sm"><strong>Email:</strong> ${userData.email || 'Não informado'}</p>
                <p class="text-sm"><strong>Telefone:</strong> ${userData.telefone || 'Não informado'}</p>
            </div>
            
            ${userData.statusHumorCustom || userData.statusHumor ? `
                <div class="inline-block">
                    <span class="${STATUS_HUMOR[userData.statusHumor]?.classe || 'status-focado'}">
                        ${userData.statusHumorCustom || (STATUS_HUMOR[userData.statusHumor]?.emoji + ' ' + STATUS_HUMOR[userData.statusHumor]?.texto)}
                    </span>
                </div>
            ` : ''}
            
            <div>
                <p class="font-bold text-sm mb-2">Fotos Destaque</p>
                <div class="grid grid-cols-3 gap-2">
                    ${[1,2,3].map(i => `
                        <div class="glass-card h-24 flex items-center justify-center rounded-xl overflow-hidden">
                            ${userData[`destaque${i}`] ? 
                                `<img src="${userData[`destaque${i}`]}" class="w-full h-full object-cover cursor-pointer" onclick="window.open('${userData[`destaque${i}`]}', '_blank')">` :
                                '<p class="text-xs opacity-50">-</p>'
                            }
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div>
                <p class="font-bold text-sm mb-2">Badges Conquistados</p>
                <div class="flex flex-wrap gap-2 justify-center">
                    ${Object.keys(userData.badges || {}).map(badgeKey => 
                        `<span class="text-2xl" title="${BADGES[badgeKey]?.t || ''}">${BADGES[badgeKey]?.icon || '🏆'}</span>`
                    ).join('')}
                    ${Object.keys(userData.badges || {}).length === 0 ? '<p class="text-xs opacity-50">Nenhum badge ainda</p>' : ''}
                </div>
            </div>
            
            <div class="flex gap-2">
                <button onclick="abrirConversaComPerfil('${usuario.nome}')" class="flex-1 glossy bg-blue-600 text-white py-3 rounded-xl font-bold">
                    💬 Chat
                </button>
                <button onclick="window.open('https://wa.me/55${usuario.fone}', '_blank')" class="flex-1 glossy bg-green-600 text-white py-3 rounded-xl font-bold">
                    📱 WhatsApp
                </button>
            </div>
        </div>
    `);
}

window.abrirConversaComPerfil = async (nome) => {
    const eq = await carregarEquipe();
    const user = eq.find(u => u.nome === nome);
    if (user) {
        document.getElementById('modal-generico')?.remove();
        abrirListaChat();
        setTimeout(() => abrirConversaCom(user), 300);
    }
};

// ==================== ADMIN COMPLETO ====================
window.tentarAcessoAdmin = () => {
    if (!isAdmin()) {
        return mostrarToast('❌ ACESSO NEGADO', 'error');
    }
    
    const modal = criarModal('⚙️ Painel Admin', `
        <div class="space-y-4">
            <div>
                <label class="text-xs font-bold block mb-1">Funcionário do Mês</label>
                <select id="adm-f-mes" class="w-full p-3 glass-card rounded-xl"></select>
            </div>
            
            <div>
                <label class="text-xs font-bold block mb-1">Alterar Setor</label>
                <div class="flex gap-2">
                    <select id="adm-user-setor" class="flex-1 p-3 glass-card rounded-xl"></select>
                    <input type="text" id="adm-novo-setor" placeholder="Novo setor..." class="flex-1 p-3 glass-card rounded-xl outline-none">
                </div>
                <button onclick="alterarSetor()" class="w-full mt-2 glossy bg-blue-600 text-white py-2 rounded-xl font-bold">Salvar Setor</button>
            </div>
            
            <div>
                <label class="text-xs font-bold block mb-1">Conceder Badge</label>
                <div class="flex gap-2">
                    <select id="adm-alvo" class="flex-1 p-3 glass-card rounded-xl"></select>
                    <select id="adm-selo" class="flex-1 p-3 glass-card rounded-xl"></select>
                </div>
            </div>
            
            <div>
                <label class="text-xs font-bold block mb-1">Desafio Relâmpago</label>
                <input type="text" id="desafio-texto" placeholder="Ex: Poste foto do café e ganhe 15 XP!" class="w-full p-3 glass-card rounded-xl outline-none mb-2">
                <input type="number" id="desafio-xp" placeholder="XP do desafio" class="w-full p-3 glass-card rounded-xl outline-none mb-2">
                <input type="text" id="desafio-hashtags" placeholder="Hashtags (separadas por espaço)" class="w-full p-3 glass-card rounded-xl outline-none mb-2">
                <input type="date" id="desafio-prazo" class="w-full p-3 glass-card rounded-xl outline-none mb-2">
                <button onclick="criarDesafio()" class="w-full glossy bg-purple-600 text-white py-3 rounded-xl font-bold">⚡ Criar Desafio</button>
            </div>
            
            <div>
                <label class="text-xs font-bold block mb-1">Desafios Ativos</label>
                <div id="desafios-lista" class="space-y-2 max-h-40 overflow-y-auto"></div>
            </div>
              <button onclick="resetarXP()" 
                class="w-full glossy bg-red-600 text-white py-3 rounded-xl font-bold mb-4">
                🔥 Resetar Ranking Geral
            </button>
            <button onclick="salvarAdmin()" class="w-full glossy bg-blue-600 text-white py-3 rounded-xl font-bold">💾 Salvar Configurações</button>
        </div>
    `);
    
    preencherSelectsAdmin();
    carregarDesafiosAtivos();
};

async function preencherSelectsAdmin() {
    const eq = await carregarEquipe();
    const s1 = document.getElementById('adm-f-mes');
    const s2 = document.getElementById('adm-alvo');
    const s3 = document.getElementById('adm-selo');
    const s4 = document.getElementById('adm-user-setor');
    
    eq.forEach(a => {
        const opt = `<option value="${a.nome.replace(/\s/g,'')}">${a.nome}</option>`;
        s1.innerHTML += opt;
        s2.innerHTML += opt;
        s4.innerHTML += opt;
    });
    
    Object.entries(BADGES).forEach(([k, b]) => {
        s3.innerHTML += `<option value="${k}">${b.icon} ${b.t}</option>`;
    });
}

window.alterarSetor = async () => {
    const userId = document.getElementById('adm-user-setor').value;
    const novoSetor = document.getElementById('adm-novo-setor').value.trim();
    
    if (!userId || !novoSetor) return mostrarToast('Preencha os campos', 'warning');
    
    const eq = await carregarEquipe();
    const usuario = equipe.find(u => u.email === user.email);
    if (!usuario) return;
    
    // Atualizar no equipe.json seria necessário backend
    // Por enquanto, atualizar só no Firebase
    await update(ref(db, `users/${userId}`), { setor: novoSetor });
    
    mostrarToast('✅ Setor atualizado!', 'success');
    document.getElementById('adm-novo-setor').value = '';
};

window.salvarAdmin = async () => {
    const fMes = document.getElementById('adm-f-mes').value;
    const alvo = document.getElementById('adm-alvo').value;
    const selo = document.getElementById('adm-selo').value;
    
    if (fMes) {
        const configSnap = await get(ref(db, 'config/funcionarioMes'));
        const anterior = configSnap.val();
        
        await set(ref(db, 'config/funcionarioMes'), fMes);
        
        if (anterior && anterior !== fMes) {
            const vezesSnap = await get(ref(db, `users/${anterior}/vezesFunc`));
            await update(ref(db, `users/${anterior}`), { vezesFunc: (vezesSnap.val() || 0) });
        }
        
        const vezesSnap = await get(ref(db, `users/${fMes}/vezesFunc`));
        await update(ref(db, `users/${fMes}`), { vezesFunc: (vezesSnap.val() || 0) + 1 });
    }
    
    if (alvo && selo) {
        await update(ref(db, `users/${alvo}/badges`), { [selo]: true });
        const raridade = BADGES[selo].r;
        const pontos = raridade === 'lendario' ? 100 : raridade === 'raro' ? 20 : 10;
        const xpSnap = await get(ref(db, `users/${alvo}/xp`));
        await set(ref(db, `users/${alvo}/xp`), (xpSnap.val() || 0) + pontos);
        
        criarNotificacao('badge', {
            de: 'Admin',
            mensagem: `Você ganhou o badge ${BADGES[selo].t}! +${pontos} XP`,
            userId: alvo
        });
    }
    
    mostrarToast('✅ Salvo!', 'success');
};

window.criarDesafio = async () => {
    const texto = document.getElementById('desafio-texto').value.trim();
    const xp = parseInt(document.getElementById('desafio-xp').value);
    const hashtags = document.getElementById('desafio-hashtags').value.trim().split(' ').filter(h => h);
    const prazo = document.getElementById('desafio-prazo').value;
    
    if (!texto || !xp || hashtags.length === 0) {
        return mostrarToast('Preencha todos os campos', 'warning');
    }
    
    const desafioData = {
        texto, xp, hashtags, prazo: prazo || null,
        criador: currentUser.nome,
        criado: serverTimestamp(),
        completados: {}
    };
    
    await push(ref(db, 'desafios'), desafioData);
    
    const eq = await carregarEquipe();
    eq.forEach(u => {
        criarNotificacao('desafio', {
            de: 'Desafio Relâmpago',
            mensagem: `⚡ ${texto} | Use: ${hashtags.join(' ')}`,
            userId: u.nome.replace(/\s/g, '')
        });
    });
    
    mostrarToast('⚡ Desafio criado!', 'success');
    document.getElementById('desafio-texto').value = '';
    document.getElementById('desafio-xp').value = '';
    document.getElementById('desafio-hashtags').value = '';
    document.getElementById('desafio-prazo').value = '';
    
    carregarDesafiosAtivos();
};

async function carregarDesafiosAtivos() {
    const snap = await get(ref(db, 'desafios'));
    const lista = document.getElementById('desafios-lista');
    if (!lista) return;
    
    lista.innerHTML = '';
    
    snap.forEach(c => {
        const d = c.val();
        const div = document.createElement('div');
        div.className = 'glass-card p-2 text-xs';
        div.innerHTML = `
            <p class="font-bold">${d.texto}</p>
            <p class="opacity-60">${d.xp} XP | ${d.hashtags.join(' ')}</p>
            ${isAdmin()) ? `
                <button onclick="removerDesafio('${c.key}')" class="text-red-500 text-xs mt-1">Remover</button>
            ` : ''}
        `;
        lista.appendChild(div);
    });
}

window.removerDesafio = async (id) => {
    if (!confirm('Remover desafio?')) return;
    await remove(ref(db, `desafios/${id}`));
    carregarDesafiosAtivos();
};

// Verificar hashtags em posts
async function verificarDesafios(texto) {
    const snap = await get(ref(db, 'desafios'));
    const userId = currentUser.nome.replace(/\s/g, '');
    
    snap.forEach(async (c) => {
        const desafio = c.val();
        if (desafio.completados?.[userId]) return;
        
        const temTodasHashtags = desafio.hashtags.every(tag => texto.includes(tag));
        
        if (temTodasHashtags) {
            await update(ref(db, `desafios/${c.key}/completados/${userId}`), true);
            const xpSnap = await get(ref(db, `users/${userId}/xp`));
            await set(ref(db, `users/${userId}/xp`), (xpSnap.val() || 0) + desafio.xp);
            
            mostrarToast(`🎉 Desafio completado! +${desafio.xp} XP`, 'success');
            criarConfete();
        }
    });
}

// ==================== RANKING ====================
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
            return { 
                ...adm, 
                xp: ud.xp || 0, 
                foto: ud.foto, 
                status: ud.status, 
                badges: ud.badges || {}, 
                statusHumor: ud.statusHumorCustom || ud.statusHumor,
                setor: ud.setor || adm.cargo
            };
        });
        
        equipeComXp.sort((a, b) => b.xp - a.xp);
        
        equipeComXp.forEach((adm, idx) => {
            const id = adm.nome.replace(/\s/g, '');
            const ehFMes = fMesId === id;
            
            // Verificar mensagens não lidas
            verificarMensagensNaoLidasRanking(adm.nome, id);
            
            const card = document.createElement('div');
            card.id = `card-${id}`;
            card.className = `glass-card p-4 flex items-center gap-3 hover:scale-102 transition-all cursor-pointer ${ehFMes ? 'card-f-mes' : ''}`;
            card.onclick = () => verPerfilUsuario(adm);
            
            const posIcon = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '';
            const maxXp = 1000;
            const progresso = Math.min((adm.xp / maxXp) * 100, 100);
            
            const humor = adm.statusHumor && STATUS_HUMOR[adm.statusHumor] ? STATUS_HUMOR[adm.statusHumor] : null;
            
            card.innerHTML = `
                <div class="relative">
                    <img src="${adm.foto || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(adm.nome)}" 
                         class="w-16 h-16 rounded-full object-cover border-2 ${adm.status === 'online' ? 'border-green-400' : 'border-gray-400'}">
                    ${posIcon ? `<span class="absolute -top-1 -right-1 text-2xl">${posIcon}</span>` : ''}
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-black truncate">${adm.nome}</p>
                    ${humor ? `<span class="status-humor ${humor.classe} text-[9px] mt-1">${humor.emoji} ${humor.texto}</span>` : 
                        adm.statusHumor ? `<span class="status-humor status-focado text-[9px] mt-1">${adm.statusHumor}</span>` : ''}
                    <p class="text-xs font-bold text-blue-600 mt-1">${adm.xp} XP</p>
                    <div class="xp-bar mt-1">
                        <div class="xp-fill" style="width: ${progresso}%"></div>
                    </div>
                    <p class="text-[10px] opacity-60 mt-1">${adm.setor}</p>
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

async function verificarMensagensNaoLidasRanking(nome, userId) {
    const chatId = [currentUser.nome, nome].sort().join('_').replace(/\s/g, '');
    const snap = await get(ref(db, `chats/${chatId}`));
    
    let temNaoLida = false;
    snap.forEach(c => {
        const m = c.val();
        if (m.para === currentUser.nome && !m.lida) temNaoLida = true;
    });
    
    const card = document.getElementById(`card-${userId}`);
    if (card && temNaoLida) card.classList.add('chat-unread');
    else if (card) card.classList.remove('chat-unread');
}

// ==================== GAMIFICAÇÃO ====================
window.ganharPontos = async (acao) => {
    const pts = PONTOS[acao] || 0;
    if (!pts) return;
    
    const uid = currentUser.nome.replace(/\s/g, '');
    const xpSnap = await get(ref(db, `users/${uid}/xp`));
    const novoXp = (xpSnap.val() || 0) + pts;
    await set(ref(db, `users/${uid}/xp`), novoXp);
    document.getElementById('nav-xp').textContent = `${novoXp} XP`;
};

// ==================== TEMA ====================
window.toggleTheme = () => {
    const html = document.documentElement;
    const curr = html.getAttribute('data-theme');
    const novo = curr === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', novo);
    localStorage.setItem('theme', novo);
    document.getElementById('theme-icon').setAttribute('data-lucide', novo === 'dark' ? 'moon' : 'sun');
    lucide.createIcons();
};

// ==================== UTILS ====================
function formatarTempo(ts) {
    if (!ts) return 'Agora';
    const diff = Date.now() - ts;
    const min = Math.floor(diff / 60000);
    const hr = Math.floor(diff / 3600000);
    const dia = Math.floor(diff / 86400000);
    if (min < 1) return 'Agora';
    if (min < 60) return `há ${min}min`;
    if (hr < 24) return `há ${hr}h`;
    return `há ${dia}d`;
}

function formatarTempoCompleto(ts) {
    if (!ts) return 'Agora';
    const diff = Date.now() - ts;
    const min = Math.floor(diff / 60000);
    const hr = Math.floor(diff / 3600000);
    
    if (min < 1) return 'Agora';
    if (min < 60) return `há ${min} minuto${min > 1 ? 's' : ''}`;
    if (hr < 24) return `há ${hr} hora${hr > 1 ? 's' : ''}`;
    
    const data = new Date(ts);
    const hoje = new Date();
    const ontem = new Date(hoje);
    ontem.setDate(ontem.getDate() - 1);
    
    if (data.toDateString() === ontem.toDateString()) {
        return `ontem às ${data.getHours()}:${String(data.getMinutes()).padStart(2, '0')}`;
    }
    
    return `${String(data.getDate()).padStart(2, '0')}/${String(data.getMonth() + 1).padStart(2, '0')}/${data.getFullYear()}`;
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

// ==================== INIT ====================
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











