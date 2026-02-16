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

// Estado Global
let currentUser = null;
let currentMedia = null;
let currentChatUser = null;
let equipeData = [];

// Sistema de Badges Expandido
const BADGES = {
    "lider": { 
        t: "Líder de Líderes", 
        d: "Mais de 3 anos de casa. O veterano supremo.", 
        r: "lendario",
        icon: "👑",
        color: "#FFD700"
    },
    "estrategista": { 
        t: "Estrategista Hapvida", 
        d: "Desenha as melhores estratégias de vendas.", 
        r: "lendario",
        icon: "🧠",
        color: "#9333EA"
    },
    "presidente": { 
        t: "Futuro Presidente Hapvida", 
        d: "A cadeira da presidência te espera.", 
        r: "lendario",
        icon: "🏆",
        color: "#DC2626"
    },
    "agilidade": { 
        t: "Agilidade em Pessoa", 
        d: "O ADM mais rápido no gatilho do sistema.", 
        r: "raro",
        icon: "⚡",
        color: "#FACC15"
    },
    "sniper": { 
        t: "Sniper do PME", 
        d: "Não perde um contrato de PME.", 
        r: "raro",
        icon: "🎯",
        color: "#EF4444"
    },
    "mestre": { 
        t: "Mestre do Fechamento", 
        d: "Consegue o 'sim' em situações impossíveis.", 
        r: "raro",
        icon: "🔥",
        color: "#F97316"
    },
    "anjo": { 
        t: "Anjo da Guarda", 
        d: "Sempre para tudo para ajudar um colega.", 
        r: "raro",
        icon: "😇",
        color: "#06B6D4"
    },
    "festa": { 
        t: "Festa da Firma", 
        d: "O primeiro a confirmar em qualquer evento.", 
        r: "comum",
        icon: "🎉",
        color: "#EC4899"
    },
    "cafe": { 
        t: "Cafeineiro Oficial", 
        d: "Move-se a base de café.", 
        r: "comum",
        icon: "☕",
        color: "#78350F"
    },
    "social": {
        t: "Influencer Interno",
        d: "Mais de 100 reações no feed.",
        r: "raro",
        icon: "📱",
        color: "#8B5CF6"
    },
    "comunicador": {
        t: "Super Comunicador",
        d: "Mais de 50 mensagens no chat.",
        r: "comum",
        icon: "💬",
        color: "#3B82F6"
    }
};

// ==================== SISTEMA DE LOGIN COM FIREBASE AUTH ====================
async function carregarEquipe() {
    try {
        const response = await fetch('equipe-v3.json');
        if (!response.ok) throw new Error('Falha ao carregar equipe');
        return await response.json();
    } catch (erro) {
        console.error('Erro ao carregar equipe:', erro);
        mostrarToast('Erro ao carregar dados da equipe', 'error');
        return [];
    }
}

function extrairNomeDoEmail(email) {
    // email: "cleide@lider-saude.com" -> retorna "cleide"
    return email.split('@')[0];
}

async function buscarDadosUsuarioPorEmail(email) {
    const equipe = await carregarEquipe();
    const username = extrairNomeDoEmail(email);
    
    // Buscar por nome (case insensitive)
    return equipe.find(pessoa => 
        pessoa.nome.toLowerCase().includes(username.toLowerCase())
    );
}

window.realizarLogin = async () => {
    const emailInput = document.getElementById('login-user');
    const senhaInput = document.getElementById('login-pass');
    
    let email = emailInput.value.trim();
    const senha = senhaInput.value;
    
    // Validações
    if (!email || !senha) {
        mostrarToast('Preencha email e senha', 'warning');
        return;
    }
    
    // Se não tiver @, adicionar domínio padrão
    if (!email.includes('@')) {
        email = email + '@lider-saude.com';
    }
    
    // Mostrar loading
    const btnLogin = event.target;
    const textoOriginal = btnLogin.textContent;
    btnLogin.textContent = 'ENTRANDO...';
    btnLogin.disabled = true;
    
    try {
        // Autenticar com Firebase
        const userCredential = await signInWithEmailAndPassword(auth, email, senha);
        const firebaseUser = userCredential.user;
        
        // Buscar dados do usuário no JSON
        const dadosUsuario = await buscarDadosUsuarioPorEmail(firebaseUser.email);
        
        if (!dadosUsuario) {
            throw new Error('Usuário não encontrado na equipe');
        }
        
        currentUser = {
            ...dadosUsuario,
            email: firebaseUser.email,
            uid: firebaseUser.uid
        };
        
        // Atualizar status online
        const userId = currentUser.nome.replace(/\s/g, '');
        await update(ref(db, `users/${userId}`), { 
            status: 'online',
            ultimoAcesso: serverTimestamp(),
            email: firebaseUser.email,
            uid: firebaseUser.uid
        });
        
        // Salvar sessão
        localStorage.setItem('supimpa_session', JSON.stringify(currentUser));
        localStorage.setItem('supimpa_email', firebaseUser.email);
        
        // Inicializar app
        init();
        mostrarToast(`Bem-vindo(a), ${currentUser.nome}!`, 'success');
        
    } catch (erro) {
        console.error('Erro no login:', erro);
        
        // Mensagens de erro específicas
        let mensagem = 'Erro ao fazer login';
        
        if (erro.code === 'auth/invalid-credential' || erro.code === 'auth/wrong-password') {
            mensagem = '❌ Usuário ou senha incorretos';
        } else if (erro.code === 'auth/user-not-found') {
            mensagem = '❌ Usuário não encontrado';
        } else if (erro.code === 'auth/invalid-email') {
            mensagem = '❌ Email inválido';
        } else if (erro.code === 'auth/too-many-requests') {
            mensagem = '⏱️ Muitas tentativas. Tente novamente mais tarde';
        } else if (erro.message.includes('não encontrado')) {
            mensagem = '❌ Este email não está cadastrado na equipe';
        }
        
        mostrarToast(mensagem, 'error');
        
        // Resetar botão
        btnLogin.textContent = textoOriginal;
        btnLogin.disabled = false;
    }
};

// Logout
window.realizarLogout = async () => {
    try {
        // Atualizar status offline
        const userId = currentUser.nome.replace(/\s/g, '');
        await update(ref(db, `users/${userId}`), { 
            status: 'offline',
            ultimoAcesso: serverTimestamp()
        });
        
        await signOut(auth);
        localStorage.removeItem('supimpa_session');
        localStorage.removeItem('supimpa_email');
        
        location.reload();
    } catch (erro) {
        console.error('Erro ao fazer logout:', erro);
        mostrarToast('Erro ao sair', 'error');
    }
};

// Redefinir senha
window.redefinirSenha = async () => {
    const email = currentUser?.email || prompt('Digite seu email:');
    
    if (!email) {
        mostrarToast('Email é obrigatório', 'warning');
        return;
    }
    
    try {
        await sendPasswordResetEmail(auth, email);
        mostrarToast('📧 Email de redefinição enviado! Verifique sua caixa de entrada', 'success');
    } catch (erro) {
        console.error('Erro ao enviar email:', erro);
        
        if (erro.code === 'auth/user-not-found') {
            mostrarToast('❌ Email não encontrado', 'error');
        } else {
            mostrarToast('Erro ao enviar email de redefinição', 'error');
        }
    }
};

// Esqueceu senha (na tela de login)
window.esqueceuSenha = async () => {
    let email = prompt('Digite seu email para redefinir a senha:');
    
    if (!email) return;
    
    // Se não tiver @, adicionar domínio
    if (!email.includes('@')) {
        email = email + '@lider-saude.com';
    }
    
    try {
        await sendPasswordResetEmail(auth, email);
        mostrarToast('📧 Email de redefinição enviado! Verifique sua caixa de entrada', 'success');
    } catch (erro) {
        console.error('Erro:', erro);
        
        if (erro.code === 'auth/user-not-found') {
            mostrarToast('❌ Email não encontrado', 'error');
        } else if (erro.code === 'auth/invalid-email') {
            mostrarToast('❌ Email inválido', 'error');
        } else {
            mostrarToast('Erro ao enviar email. Tente novamente', 'error');
        }
    }
};

// ==================== SISTEMA DE NOTIFICAÇÕES ====================
function criarNotificacao(tipo, dados) {
    const userId = currentUser.nome.replace(/\s/g, '');
    const notifRef = push(ref(db, `notifications/${userId}`));
    
    set(notifRef, {
        tipo: tipo,
        de: dados.de || 'Sistema',
        mensagem: dados.mensagem,
        timestamp: serverTimestamp(),
        lida: false,
        link: dados.link || null
    });
}

function carregarNotificacoes() {
    const userId = currentUser.nome.replace(/\s/g, '');
    
    onValue(ref(db, `notifications/${userId}`), (snapshot) => {
        const notifs = [];
        const naoLidas = [];
        
        snapshot.forEach(child => {
            const notif = { id: child.key, ...child.val() };
            notifs.push(notif);
            if (!notif.lida) naoLidas.push(notif);
        });
        
        // Atualizar badge
        const badge = document.getElementById('notif-badge');
        if (naoLidas.length > 0) {
            badge.textContent = naoLidas.length;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
        
        // Renderizar lista
        renderizarNotificacoes(notifs);
    });
}

function renderizarNotificacoes(notifs) {
    const lista = document.getElementById('notif-list');
    
    if (notifs.length === 0) {
        lista.innerHTML = '<p class="text-xs text-center opacity-50 py-8">Nenhuma notificação</p>';
        return;
    }
    
    lista.innerHTML = '';
    notifs.reverse().forEach(notif => {
        const div = document.createElement('div');
        div.className = `p-3 rounded-lg cursor-pointer transition-all ${notif.lida ? 'bg-white/20' : 'bg-blue-500/20 border border-blue-400'}`;
        div.onclick = () => marcarComoLida(notif.id);
        
        const icones = {
            'like': '👍',
            'comentario': '💬',
            'mencao': '@',
            'badge': '🏆',
            'chat': '💌'
        };
        
        div.innerHTML = `
            <div class="flex gap-2">
                <span class="text-lg">${icones[notif.tipo] || '📢'}</span>
                <div class="flex-1">
                    <p class="text-xs font-bold">${notif.de}</p>
                    <p class="text-xs opacity-80">${notif.mensagem}</p>
                    <p class="text-[9px] opacity-50 mt-1">${formatarTempo(notif.timestamp)}</p>
                </div>
            </div>
        `;
        
        lista.appendChild(div);
    });
}

window.toggleNotificacoes = () => {
    const panel = document.getElementById('notif-panel');
    panel.classList.toggle('hidden');
};

window.marcarComoLida = async (notifId) => {
    const userId = currentUser.nome.replace(/\s/g, '');
    await update(ref(db, `notifications/${userId}/${notifId}`), { lida: true });
};

window.marcarTodasLidas = async () => {
    const userId = currentUser.nome.replace(/\s/g, '');
    const snapshot = await get(ref(db, `notifications/${userId}`));
    
    const updates = {};
    snapshot.forEach(child => {
        updates[`notifications/${userId}/${child.key}/lida`] = true;
    });
    
    await update(ref(db), updates);
    mostrarToast('Todas notificações marcadas como lidas', 'success');
};

// ==================== SISTEMA DE CHAT ====================
async function carregarListaUsuarios() {
    const equipe = await carregarEquipe();
    equipeData = equipe;
    
    const chatList = document.getElementById('chat-list');
    chatList.innerHTML = '';
    
    equipe.forEach(user => {
        if (user.nome === currentUser.nome) return;
        
        const div = document.createElement('div');
        div.className = 'p-3 rounded-lg hover:bg-white/20 cursor-pointer transition-all flex items-center gap-3';
        div.onclick = () => abrirConversaCom(user);
        
        const userSnapshot = ref(db, `users/${user.nome.replace(/\s/g, '')}`);
        onValue(userSnapshot, (snapshot) => {
            const userData = snapshot.val() || {};
            div.innerHTML = `
                <div class="relative">
                    <img src="${userData.foto || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.nome)}" 
                         class="w-10 h-10 rounded-full object-cover">
                    <div class="w-3 h-3 rounded-full border-2 border-white absolute bottom-0 right-0 ${userData.status === 'online' ? 'bg-green-400' : 'bg-gray-400'}"></div>
                </div>
                <div class="flex-1">
                    <p class="text-sm font-bold">${user.nome}</p>
                    <p class="text-xs opacity-60">${user.cargo}</p>
                </div>
            `;
        });
        
        chatList.appendChild(div);
    });
}

function abrirConversaCom(user) {
    currentChatUser = user;
    
    document.getElementById('chat-input-area').classList.remove('hidden');
    document.getElementById('chat-messages').innerHTML = '';
    
    // Criar ID único da conversa (ordem alfabética para consistência)
    const usuarios = [currentUser.nome, user.nome].sort();
    const chatId = usuarios.join('_').replace(/\s/g, '');
    
    // Escutar mensagens
    onValue(ref(db, `chats/${chatId}`), (snapshot) => {
        const mensagens = [];
        snapshot.forEach(child => {
            mensagens.push({ id: child.key, ...child.val() });
        });
        
        renderizarMensagens(mensagens);
    });
}

function renderizarMensagens(mensagens) {
    const container = document.getElementById('chat-messages');
    container.innerHTML = '';
    
    if (mensagens.length === 0) {
        container.innerHTML = '<p class="text-center text-sm opacity-50 py-20">Nenhuma mensagem ainda. Seja o primeiro!</p>';
        return;
    }
    
    mensagens.forEach(msg => {
        const ehMinha = msg.de === currentUser.nome;
        
        const div = document.createElement('div');
        div.className = `flex ${ehMinha ? 'justify-end' : 'justify-start'}`;
        
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble p-3 rounded-2xl ${ehMinha ? 'bg-blue-500 text-white' : 'bg-white/30'}`;
        bubble.textContent = msg.texto;
        
        const time = document.createElement('p');
        time.className = 'text-[9px] opacity-60 mt-1';
        time.textContent = formatarTempo(msg.timestamp);
        
        bubble.appendChild(time);
        div.appendChild(bubble);
        container.appendChild(div);
    });
    
    // Scroll para última mensagem
    container.scrollTop = container.scrollHeight;
}

window.enviarMensagem = async () => {
    const input = document.getElementById('chat-input');
    const texto = input.value.trim();
    
    if (!texto || !currentChatUser) return;
    
    const usuarios = [currentUser.nome, currentChatUser.nome].sort();
    const chatId = usuarios.join('_').replace(/\s/g, '');
    
    const mensagemRef = push(ref(db, `chats/${chatId}`));
    await set(mensagemRef, {
        de: currentUser.nome,
        para: currentChatUser.nome,
        texto: texto,
        timestamp: serverTimestamp()
    });
    
    // Criar notificação para destinatário
    criarNotificacao('chat', {
        de: currentUser.nome,
        mensagem: `${currentUser.nome} enviou: "${texto.substring(0, 30)}..."`,
        userId: currentChatUser.nome.replace(/\s/g, '')
    });
    
    input.value = '';
    ganharPontos('mensagem');
};

window.abrirChat = () => {
    document.getElementById('chat-modal').classList.remove('hidden');
    carregarListaUsuarios();
};

window.fecharChat = () => {
    document.getElementById('chat-modal').classList.add('hidden');
    currentChatUser = null;
};

// ==================== SISTEMA DE FEED SOCIAL ====================
window.previewMedia = (el) => {
    if (!el.files || !el.files[0]) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        currentMedia = e.target.result;
        document.getElementById('media-preview').classList.remove('hidden');
        document.getElementById('img-preview').src = currentMedia;
        lucide.createIcons();
    };
    reader.readAsDataURL(el.files[0]);
};

window.removerMedia = () => {
    currentMedia = null;
    document.getElementById('media-preview').classList.add('hidden');
    document.getElementById('feed-media').value = '';
};

window.postarFeed = async () => {
    const textarea = document.getElementById('feed-text');
    const texto = textarea.value.trim();
    
    if (!texto && !currentMedia) {
        mostrarToast('Escreva algo ou adicione uma imagem', 'warning');
        return;
    }
    
    // Detectar menções
    const mencoes = detectarMencoes(texto);
    
    const postData = {
        autor: currentUser.nome,
        texto: texto,
        imagem: currentMedia || null,
        timestamp: serverTimestamp(),
        reactions: {
            like: 0,
            love: 0,
            haha: 0,
            sad: 0
        },
        comentarios: {}
    };
    
    const postRef = await push(ref(db, 'feed'), postData);
    
    // Notificar mencionados
    mencoes.forEach(usuario => {
        criarNotificacao('mencao', {
            de: currentUser.nome,
            mensagem: `${currentUser.nome} mencionou você em um post`,
            link: postRef.key,
            userId: usuario.replace(/\s/g, '')
        });
    });
    
    ganharPontos('post');
    textarea.value = '';
    removerMedia();
    mostrarToast('Post publicado!', 'success');
};

function detectarMencoes(texto) {
    const regex = /@(\w+(?:\s+\w+)*)/g;
    const mencoes = [];
    let match;
    
    while ((match = regex.exec(texto)) !== null) {
        mencoes.push(match[1]);
    }
    
    return mencoes;
}

function carregarFeed() {
    onValue(ref(db, 'feed'), async (snapshot) => {
        const posts = [];
        snapshot.forEach(child => {
            posts.push({ id: child.key, ...child.val() });
        });
        
        // Ordenar por timestamp (mais recente primeiro)
        posts.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        
        const container = document.getElementById('feed-posts');
        container.innerHTML = '';
        
        for (const post of posts) {
            const postElement = await criarElementoPost(post);
            container.appendChild(postElement);
        }
        
        lucide.createIcons();
    });
}

async function criarElementoPost(post) {
    const article = document.createElement('article');
    article.className = 'glass-card p-5 space-y-4';
    
    // Header do post
    const header = document.createElement('div');
    header.className = 'flex items-center gap-3';
    
    // Buscar foto do usuário
    const userId = post.autor.replace(/\s/g, '');
    const userSnapshot = await get(ref(db, `users/${userId}`));
    const userData = userSnapshot.val() || {};
    
    header.innerHTML = `
        <img src="${userData.foto || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(post.autor)}" 
             class="w-12 h-12 rounded-full object-cover border-2 border-white/50">
        <div class="flex-1">
            <p class="font-black text-sm">${post.autor}</p>
            <p class="text-xs opacity-60">${formatarTempo(post.timestamp)}</p>
        </div>
    `;
    
    // Texto do post (com menções destacadas)
    const textoElement = document.createElement('div');
    if (post.texto) {
        const textoComMencoes = post.texto.replace(/@(\w+(?:\s+\w+)*)/g, '<span class="text-blue-600 font-bold">@$1</span>');
        textoElement.innerHTML = `<p class="text-sm leading-relaxed">${textoComMencoes}</p>`;
    }
    
    // Imagem
    const imagemElement = document.createElement('div');
    if (post.imagem) {
        imagemElement.innerHTML = `<img src="${post.imagem}" class="w-full rounded-xl border border-white/40 cursor-pointer hover:opacity-90 transition-all" onclick="window.open('${post.imagem}', '_blank')">`;
    }
    
    // Reações
    const reacoes = post.reactions || { like: 0, love: 0, haha: 0, sad: 0 };
    
    const reactionsBar = document.createElement('div');
    reactionsBar.className = 'flex items-center justify-between border-t border-b border-white/20 py-3';
    reactionsBar.innerHTML = `
        <div class="flex gap-4">
            <button onclick="reagir('${post.id}', 'like')" class="reaction-btn flex items-center gap-1 hover:bg-white/20 px-3 py-1 rounded-lg transition-all">
                <span class="text-lg">👍</span>
                <span class="text-xs font-bold">${reacoes.like || 0}</span>
            </button>
            <button onclick="reagir('${post.id}', 'love')" class="reaction-btn flex items-center gap-1 hover:bg-white/20 px-3 py-1 rounded-lg transition-all">
                <span class="text-lg">❤️</span>
                <span class="text-xs font-bold">${reacoes.love || 0}</span>
            </button>
            <button onclick="reagir('${post.id}', 'haha')" class="reaction-btn flex items-center gap-1 hover:bg-white/20 px-3 py-1 rounded-lg transition-all">
                <span class="text-lg">😂</span>
                <span class="text-xs font-bold">${reacoes.haha || 0}</span>
            </button>
            <button onclick="reagir('${post.id}', 'sad')" class="reaction-btn flex items-center gap-1 hover:bg-white/20 px-3 py-1 rounded-lg transition-all">
                <span class="text-lg">😢</span>
                <span class="text-xs font-bold">${reacoes.sad || 0}</span>
            </button>
        </div>
        <button onclick="toggleComentarios('${post.id}')" class="text-xs font-bold hover:bg-white/20 px-3 py-1 rounded-lg transition-all">
            💬 Comentar
        </button>
    `;
    
    // Seção de comentários
    const comentariosSection = document.createElement('div');
    comentariosSection.id = `comentarios-${post.id}`;
    comentariosSection.className = 'hidden space-y-3';
    
    const comentariosLista = document.createElement('div');
    comentariosLista.className = 'space-y-2';
    
    if (post.comentarios) {
        Object.entries(post.comentarios).forEach(([key, comentario]) => {
            const comentDiv = document.createElement('div');
            comentDiv.className = 'bg-white/20 p-3 rounded-lg';
            comentDiv.innerHTML = `
                <p class="text-xs font-bold">${comentario.usuario}</p>
                <p class="text-sm">${comentario.texto}</p>
                <p class="text-[9px] opacity-50 mt-1">${formatarTempo(comentario.timestamp)}</p>
            `;
            comentariosLista.appendChild(comentDiv);
        });
    }
    
    const comentarForm = document.createElement('div');
    comentarForm.className = 'flex gap-2';
    comentarForm.innerHTML = `
        <input type="text" id="input-comentario-${post.id}" placeholder="Escreva um comentário..." class="flex-1 p-2 rounded-lg glass-card text-sm outline-none">
        <button onclick="comentar('${post.id}')" class="glossy bg-blue-600 text-white px-4 rounded-lg font-bold text-xs hover:scale-105 transition-all">Enviar</button>
    `;
    
    comentariosSection.appendChild(comentariosLista);
    comentariosSection.appendChild(comentarForm);
    
    // Montar post completo
    article.appendChild(header);
    if (post.texto) article.appendChild(textoElement);
    if (post.imagem) article.appendChild(imagemElement);
    article.appendChild(reactionsBar);
    article.appendChild(comentariosSection);
    
    return article;
}

window.reagir = async (postId, tipo) => {
    const reactionPath = `feed/${postId}/reactions/${tipo}`;
    const snapshot = await get(ref(db, reactionPath));
    const valorAtual = snapshot.val() || 0;
    
    await set(ref(db, reactionPath), valorAtual + 1);
    
    // Notificar autor do post
    const postSnapshot = await get(ref(db, `feed/${postId}`));
    const post = postSnapshot.val();
    
    if (post.autor !== currentUser.nome) {
        criarNotificacao('like', {
            de: currentUser.nome,
            mensagem: `${currentUser.nome} reagiu ao seu post`,
            userId: post.autor.replace(/\s/g, '')
        });
    }
    
    ganharPontos('reacao');
    
    // Animação
    event.target.closest('.reaction-btn').classList.add('active');
    setTimeout(() => {
        event.target.closest('.reaction-btn').classList.remove('active');
    }, 500);
};

window.toggleComentarios = (postId) => {
    const section = document.getElementById(`comentarios-${postId}`);
    section.classList.toggle('hidden');
};

window.comentar = async (postId) => {
    const input = document.getElementById(`input-comentario-${postId}`);
    const texto = input.value.trim();
    
    if (!texto) return;
    
    const comentarioRef = push(ref(db, `feed/${postId}/comentarios`));
    await set(comentarioRef, {
        usuario: currentUser.nome,
        texto: texto,
        timestamp: serverTimestamp()
    });
    
    // Notificar autor do post
    const postSnapshot = await get(ref(db, `feed/${postId}`));
    const post = postSnapshot.val();
    
    if (post.autor !== currentUser.nome) {
        criarNotificacao('comentario', {
            de: currentUser.nome,
            mensagem: `${currentUser.nome} comentou: "${texto.substring(0, 30)}..."`,
            userId: post.autor.replace(/\s/g, '')
        });
    }
    
    input.value = '';
    ganharPontos('comentario');
};

window.abrirFeed = () => {
    abrirTela('tela-feed');
    carregarFeed();
    
    // Configurar foto do usuário no input
    const userId = currentUser.nome.replace(/\s/g, '');
    get(ref(db, `users/${userId}`)).then(snapshot => {
        const userData = snapshot.val() || {};
        document.getElementById('post-user-img').src = userData.foto || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(currentUser.nome);
    });
};

// ==================== SISTEMA DE BADGES ====================
window.abrirBadges = () => {
    abrirTela('tela-badges');
    carregarBadgesInterativos();
};

async function carregarBadgesInterativos() {
    const grid = document.getElementById('badges-grid');
    grid.innerHTML = '';
    
    const userId = currentUser.nome.replace(/\s/g, '');
    const userSnapshot = await get(ref(db, `users/${userId}`));
    const userData = userSnapshot.val() || {};
    const userBadges = userData.badges || {};
    
    Object.entries(BADGES).forEach(([key, badge]) => {
        const possuiBadge = userBadges[key] === true;
        
        const card = document.createElement('div');
        card.className = `badge-card glass-card p-5 text-center ${possuiBadge ? '' : 'opacity-40 grayscale'}`;
        
        card.innerHTML = `
            <div class="text-5xl mb-3">${badge.icon}</div>
            <h4 class="font-black text-sm mb-2" style="color: ${badge.color}">${badge.t}</h4>
            <p class="text-xs opacity-70 mb-3">${badge.d}</p>
            <div class="inline-block px-3 py-1 rounded-full text-[9px] font-bold uppercase ${
                badge.r === 'lendario' ? 'bg-yellow-500 text-white' :
                badge.r === 'raro' ? 'bg-purple-500 text-white' :
                'bg-blue-500 text-white'
            }">
                ${badge.r}
            </div>
            ${possuiBadge ? '<p class="text-xs font-bold text-green-600 mt-3">✓ Conquistado</p>' : ''}
        `;
        
        grid.appendChild(card);
    });
}

// ==================== SISTEMA DE GAMIFICAÇÃO ====================
window.ganharPontos = async (acao) => {
    const pontosAcoes = {
        'post': 15,
        'reacao': 2,
        'comentario': 5,
        'mensagem': 3,
        'cotacao': 10,
        'carencia': 5,
        'repique': 5
    };
    
    const pontos = pontosAcoes[acao] || 0;
    if (pontos === 0) return;
    
    const userId = currentUser.nome.replace(/\s/g, '');
    const xpRef = ref(db, `users/${userId}/xp`);
    
    const snapshot = await get(xpRef);
    const xpAtual = snapshot.val() || 0;
    const novoXp = xpAtual + pontos;
    
    await set(xpRef, novoXp);
    
    // Atualizar UI
    document.getElementById('nav-xp').textContent = `${novoXp} XP`;
    
    // Verificar conquistas
    verificarConquistas(novoXp);
};

async function verificarConquistas(xp) {
    const userId = currentUser.nome.replace(/\s/g, '');
    const badgesRef = ref(db, `users/${userId}/badges`);
    
    // Badge social (100+ reações)
    const feedSnapshot = await get(ref(db, 'feed'));
    let totalReacoes = 0;
    feedSnapshot.forEach(post => {
        const p = post.val();
        if (p.autor === currentUser.nome && p.reactions) {
            totalReacoes += Object.values(p.reactions).reduce((a, b) => a + b, 0);
        }
    });
    
    if (totalReacoes >= 100) {
        await update(badgesRef, { social: true });
    }
    
    // Badge comunicador (50+ mensagens)
    const chatsSnapshot = await get(ref(db, 'chats'));
    let totalMensagens = 0;
    chatsSnapshot.forEach(chat => {
        chat.forEach(msg => {
            if (msg.val().de === currentUser.nome) totalMensagens++;
        });
    });
    
    if (totalMensagens >= 50) {
        await update(badgesRef, { comunicador: true });
    }
}

// ==================== RANKING E EQUIPE ====================
async function carregarEquipeRanking() {
    onValue(ref(db, 'users'), async (snapshot) => {
        const users = snapshot.val() || {};
        const configSnapshot = await get(ref(db, 'config'));
        const config = configSnapshot.val() || {};
        const fMesId = config.funcionarioMes;
        
        const equipe = await carregarEquipe();
        const lista = document.getElementById('lista-equipe');
        lista.innerHTML = '';
        
        // Criar array com dados combinados e ordenar por XP
        const equipeComXp = equipe.map(adm => {
            const id = adm.nome.replace(/\s/g, '');
            const userData = users[id] || {};
            return {
                ...adm,
                xp: userData.xp || 0,
                foto: userData.foto,
                status: userData.status,
                badges: userData.badges || {}
            };
        });
        
        equipeComXp.sort((a, b) => b.xp - a.xp);
        
        equipeComXp.forEach((adm, index) => {
            const id = adm.nome.replace(/\s/g, '');
            const ehFMes = fMesId === id;
            
            const card = document.createElement('div');
            card.className = `glass-card p-4 flex items-center gap-3 hover:scale-102 transition-all cursor-pointer ${ehFMes ? 'card-f-mes' : ''}`;
            
            // Troféus de posição
            const posicaoIcon = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
            
            card.innerHTML = `
                <div class="relative">
                    <img src="${adm.foto || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(adm.nome)}" 
                         class="w-14 h-14 rounded-full object-cover border-2 ${adm.status === 'online' ? 'border-green-400' : 'border-gray-400'}">
                    ${posicaoIcon ? `<span class="absolute -top-1 -right-1 text-xl">${posicaoIcon}</span>` : ''}
                </div>
                <div class="flex-1">
                    <p class="text-sm font-black">${adm.nome} ${ehFMes ? '⭐' : ''}</p>
                    <p class="text-xs font-bold text-blue-600">${adm.xp} XP</p>
                    <p class="text-[10px] opacity-60">${adm.cargo}</p>
                    <div class="flex gap-1 mt-1">
                        ${Object.keys(adm.badges).slice(0, 3).map(badgeKey => 
                            `<span title="${BADGES[badgeKey]?.t || ''}">${BADGES[badgeKey]?.icon || '🏆'}</span>`
                        ).join('')}
                    </div>
                </div>
            `;
            
            lista.appendChild(card);
        });
    });
}

// ==================== TEMA ESCURO ====================
window.toggleTheme = () => {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    const icon = document.getElementById('theme-icon');
    icon.setAttribute('data-lucide', newTheme === 'dark' ? 'moon' : 'sun');
    lucide.createIcons();
    
    mostrarToast(`Tema ${newTheme === 'dark' ? 'escuro' : 'claro'} ativado`, 'success');
};

// ==================== PERFIL DO USUÁRIO ====================
window.verMeuPerfil = () => {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4';
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
    
    modal.innerHTML = `
        <div class="glass-card max-w-md w-full p-6 space-y-4">
            <div class="flex justify-between items-center">
                <h3 class="text-xl font-black">Meu Perfil</h3>
                <button onclick="this.closest('.fixed').remove()" class="hover:scale-110 transition-all">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>
            
            <div class="text-center space-y-3">
                <img src="${document.getElementById('nav-img').src}" class="w-24 h-24 rounded-full mx-auto border-4 border-blue-400">
                <h4 class="text-lg font-black">${currentUser.nome}</h4>
                <p class="text-sm opacity-70">${currentUser.cargo}</p>
                <p class="text-sm font-bold text-blue-600">${document.getElementById('nav-xp').textContent}</p>
                <p class="text-xs opacity-50">${currentUser.email}</p>
            </div>
            
            <div class="space-y-2">
                <button onclick="redefinirSenha()" class="w-full glossy bg-blue-600 text-white py-3 rounded-xl font-bold hover:scale-105 transition-all">
                    🔑 Redefinir Senha
                </button>
                <button onclick="realizarLogout()" class="w-full bg-red-500/80 text-white py-3 rounded-xl font-bold hover:scale-105 transition-all">
                    🚪 Sair
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    lucide.createIcons();
};

// ==================== UTILIDADES ====================
function formatarTempo(timestamp) {
    if (!timestamp) return 'Agora';
    
    const agora = Date.now();
    const diff = agora - timestamp;
    
    const minutos = Math.floor(diff / 60000);
    const horas = Math.floor(diff / 3600000);
    const dias = Math.floor(diff / 86400000);
    
    if (minutos < 1) return 'Agora';
    if (minutos < 60) return `${minutos}min atrás`;
    if (horas < 24) return `${horas}h atrás`;
    return `${dias}d atrás`;
}

function mostrarToast(mensagem, tipo = 'info') {
    const cores = {
        'success': 'bg-green-500',
        'error': 'bg-red-500',
        'warning': 'bg-yellow-500',
        'info': 'bg-blue-500'
    };
    
    const toast = document.createElement('div');
    toast.className = `fixed bottom-4 right-4 ${cores[tipo]} text-white px-6 py-3 rounded-xl font-bold text-sm shadow-2xl z-[999]`;
    toast.style.animation = 'slideIn 0.3s ease';
    toast.textContent = mensagem;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

window.abrirTela = (telaId) => {
    document.querySelectorAll('main > section').forEach(s => s.classList.add('hidden'));
    document.getElementById(telaId).classList.remove('hidden');
    lucide.createIcons();
};

window.abrirFerramenta = (url, tipo) => {
    ganharPontos(tipo);
    window.open(url, '_blank');
};

window.abrirFerramentaCotacao = () => {
    document.getElementById('modal-cotacao').classList.remove('hidden');
    ganharPontos('cotacao');
};

window.tentarAcessoAdmin = () => {
    if (["Narry", "Cleide Tavares"].includes(currentUser.nome)) {
        document.getElementById('modal-admin').classList.remove('hidden');
    } else {
        mostrarToast('Acesso restrito a administradores', 'error');
    }
};

window.salvarAdmin = async () => {
    const fMes = document.getElementById('adm-f-mes').value;
    const alvo = document.getElementById('adm-alvo').value;
    const selo = document.getElementById('adm-selo').value;
    
    await set(ref(db, 'config/funcionarioMes'), fMes);
    
    if (alvo && selo) {
        await update(ref(db, `users/${alvo}/badges`), { [selo]: true });
        mostrarToast('Badge concedido com sucesso!', 'success');
    }
    
    document.getElementById('modal-admin').classList.add('hidden');
};

// ==================== INICIALIZAÇÃO ====================
async function init() {
    document.getElementById('tela-login').classList.add('hidden');
    document.getElementById('main-header').classList.remove('hidden');
    document.getElementById('main-content').classList.remove('hidden');
    
    document.getElementById('welcome-name').innerText = currentUser.nome;
    
    // Carregar tema salvo
    const themeSalvo = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', themeSalvo);
    document.getElementById('theme-icon').setAttribute('data-lucide', themeSalvo === 'dark' ? 'moon' : 'sun');
    
    // Carregar dados do usuário
    const userId = currentUser.nome.replace(/\s/g, '');
    const userSnapshot = await get(ref(db, `users/${userId}`));
    const userData = userSnapshot.val() || {};
    
    document.getElementById('nav-img').src = userData.foto || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(currentUser.nome);
    document.getElementById('nav-xp').textContent = `${userData.xp || 0} XP`;
    
    // Iniciar sistemas
    carregarEquipeRanking();
    carregarNotificacoes();
    
    // Preencher selects do Admin
    const equipe = await carregarEquipe();
    const s1 = document.getElementById('adm-f-mes');
    const s2 = document.getElementById('adm-alvo');
    const s3 = document.getElementById('adm-selo');
    
    equipe.forEach(a => {
        const opt = `<option value="${a.nome.replace(/\s/g,'')}">${a.nome}</option>`;
        s1.innerHTML += opt;
        s2.innerHTML += opt;
    });
    
    Object.entries(BADGES).forEach(([key, badge]) => {
        s3.innerHTML += `<option value="${key}">${badge.icon} ${badge.t}</option>`;
    });
    
    lucide.createIcons();
}

// Verificar sessão ao carregar
auth.onAuthStateChanged(async (firebaseUser) => {
    if (firebaseUser) {
        const dadosUsuario = await buscarDadosUsuarioPorEmail(firebaseUser.email);
        
        if (dadosUsuario) {
            currentUser = {
                ...dadosUsuario,
                email: firebaseUser.email,
                uid: firebaseUser.uid
            };
            init();
        }
    } else {
        // Não está logado, mostrar tela de login
        document.getElementById('tela-login').classList.remove('hidden');
        document.getElementById('main-header').classList.add('hidden');
        document.getElementById('main-content').classList.add('hidden');
    }
});
