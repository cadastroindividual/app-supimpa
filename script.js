import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyB69yq8gyn_hDn2Cbbhb1wwIpzvQp_dkwA",
  authDomain: "app-supimpa.firebaseapp.com",
  databaseURL: "https://app-supimpa-default-rtdb.firebaseio.com",
  projectId: "app-supimpa",
  storageBucket: "app-supimpa.firebasestorage.app",
  messagingSenderId: "865217946023",
  appId: "1:865217946023:web:da6b0ea582d863ecd4d682",
  measurementId: "G-7344M8P8T6"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
const destaqueRef = ref(db, 'config/funcionarioDoMes');
let funcionarioDoMesGlobal = "";

// --- LOGIN ---
window.fazerLogin = function() {
    const usuario = document.getElementById('login-usuario').value.trim().toLowerCase();
    const senha = document.getElementById('login-senha').value;
    const btn = document.getElementById('btn-entrar');
    if(!usuario || !senha) return alert("Preencha os campos!");
    btn.innerText = "ENTRANDO...";
    signInWithEmailAndPassword(auth, `${usuario}@lider-saude.com`, senha)
        .catch(() => { alert("Erro no login!"); btn.innerText = "ENTRAR"; });
};

window.fazerLogout = function() { if(confirm("Sair?")) signOut(auth); };

onAuthStateChanged(auth, (user) => {
    const login = document.getElementById('tela-login');
    const appDiv = document.getElementById('conteudo-app');
    if (user) {
        login.classList.add('hidden'); appDiv.classList.remove('hidden');
        onValue(destaqueRef, (s) => { funcionarioDoMesGlobal = s.val() || "Narry"; atualizarStatus(); });
    } else {
        login.classList.remove('hidden'); appDiv.classList.add('hidden');
    }
});

// --- CÁLCULO DE CARÊNCIA ---
window.calcularCarencia = function() {
    const dataInput = document.getElementById('dataVigencia').value;
    if (!dataInput) return;
    const vigencia = new Date(dataInput + "T12:00:00");
    const prazos = [
        { label: "Acidentes Pessoais", dias: 0 },
        { label: "Consultas e Exames Simples", dias: 30 },
        { label: "Exames Complexos", dias: 90 },
        { label: "Internações e Cirurgias", dias: 180 },
        { label: "Parto", dias: 300 }
    ];
    const res = document.getElementById('resultadoCarencia');
    res.innerHTML = prazos.map(p => {
        const d = new Date(vigencia);
        d.setDate(d.getDate() + p.dias);
        return `<div class="p-3 bg-gray-50 rounded-xl flex justify-between">
                    <span class="text-xs uppercase">${p.label}</span>
                    <span class="text-blue-hapvida">${d.toLocaleDateString('pt-BR')}</span>
                </div>`;
    }).join('');
};

// --- CÁLCULO DE REPIQUE ---
window.calcularRepique = function() {
    const adesao = new Date(document.getElementById('dataAdesao').value);
    const cancel = new Date(document.getElementById('dataCancelamento').value);
    const inadimplente = document.getElementById('inadimplente').checked;
    const diffMeses = (cancel.getFullYear() - adesao.getFullYear()) * 12 + (cancel.getMonth() - adesao.getMonth());
    const res = document.getElementById('resultadoRepique');
    res.classList.remove('hidden', 'repique-box', 'nao-repique-box');
    
    if (diffMeses <= 12 || inadimplente) {
        res.innerText = "⚠️ É REPIQUE";
        res.classList.add('repique-box');
    } else {
        res.innerText = "✅ NÃO É REPIQUE";
        res.classList.add('nao-repique-box');
    }
};

// --- STATUS EQUIPE ---
async function atualizarStatus() {
    try {
        const response = await fetch('equipe.json');
        const adms = await response.json();
        const agora = new Date();
        const horaDecimal = agora.getHours() + (agora.getMinutes() / 60);
        const container = document.getElementById('lista-adms');
        container.innerHTML = '';
        adms.forEach(adm => {
            let status = "Offline", cor = "bg-gray-400";
            if (horaDecimal >= adm.hEntrada && horaDecimal <= adm.hSaida) {
                status = (horaDecimal >= adm.iInicio && horaDecimal <= adm.iFim) ? "Intervalo" : "Online";
                cor = (status === "Online") ? "bg-green-500" : "bg-yellow-500";
            }
            const ehDestaque = adm.nome.trim() === funcionarioDoMesGlobal.trim();
            container.innerHTML += `
                <div class="flex items-center justify-between p-3 border rounded-2xl ${ehDestaque ? 'border-gold border-2 bg-gold-light' : 'bg-white border-gray-100'}">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full ${ehDestaque ? 'bg-yellow-200 text-gold' : 'bg-blue-100 text-blue-hapvida'} flex items-center justify-center font-black">${adm.nome.charAt(0)}</div>
                        <div>
                            <p class="text-sm font-bold ${ehDestaque ? 'text-gold' : 'text-gray-800'}">${adm.nome}</p>
                            <p class="text-[10px] text-gray-400 uppercase font-bold italic">${adm.cargo}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <span class="flex items-center gap-1 text-[10px] font-black uppercase"><span class="w-2 h-2 rounded-full ${cor}"></span> ${status}</span>
                        <a href="https://wa.me/${adm.fone}" target="_blank" class="text-green-500"><i data-lucide="message-circle" class="w-5 h-5"></i></a>
                    </div>
                </div>`;
        });
        lucide.createIcons();
    } catch (e) { console.error(e); }
}

// --- ADMIN & NAV ---
window.salvarConfig = function() {
    if (prompt("Senha Admin:") === "supimpa123") {
        const novo = document.getElementById('input-destaque').value.trim();
        if (novo) set(destaqueRef, novo).then(() => { alert("Salvo!"); fecharConfig(); });
    } else alert("Erro!");
};
window.abrirTela = (id) => {
    document.querySelectorAll('main > section').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
};
window.abrirConfig = () => {
    document.getElementById('input-destaque').value = funcionarioDoMesGlobal;
    document.getElementById('modal-config').classList.remove('hidden');
};
window.fecharConfig = () => document.getElementById('modal-config').classList.add('hidden');

setInterval(() => { if(auth.currentUser) atualizarStatus(); }, 60000);
