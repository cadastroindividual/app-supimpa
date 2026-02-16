// 1. IMPORTAÇÃO DO FIREBASE (Via CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// 2. CONFIGURAÇÕES
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

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const destaqueRef = ref(db, 'config/funcionarioDoMes');

let funcionarioDoMesGlobal = "";

// 3. ESCUTA EM TEMPO REAL DO FUNCIONÁRIO DO MÊS
onValue(destaqueRef, (snapshot) => {
    funcionarioDoMesGlobal = snapshot.val() || "Narry";
    atualizarStatus(); // Recarrega a lista quando o destaque mudar
});

// 4. LÓGICA DE MONITORAMENTO (ESTILO FRUTIGER AERO)
async function atualizarStatus() {
    try {
        const response = await fetch('equipe.json');
        const adms = await response.json();
        const agora = new Date();
        const horaDecimal = agora.getHours() + (agora.getMinutes() / 60);
        const container = document.getElementById('lista-adms');
        
        container.innerHTML = '';
        
        adms.forEach(adm => {
            let status = "Offline", corGradiente = "from-gray-400 to-gray-600";
            
            if (horaDecimal >= adm.hEntrada && horaDecimal <= adm.hSaida) {
                if (horaDecimal >= adm.iInicio && horaDecimal <= adm.iFim) {
                    status = "Intervalo"; 
                    corGradiente = "from-yellow-300 to-orange-500";
                } else {
                    status = "Online"; 
                    corGradiente = "from-green-400 to-green-600";
                }
            }

            const ehDestaque = adm.nome.trim() === funcionarioDoMesGlobal.trim();
            
            // Template do Card com estética Frutiger Aero
            container.innerHTML += `
                <div class="flex items-center justify-between p-4 glass-card ${ehDestaque ? 'border-yellow-400 border-2 bg-white/60 shadow-xl scale-[1.02]' : ''} transition-all duration-500">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-full glossy ${ehDestaque ? 'bg-yellow-400 text-yellow-900 border-yellow-200' : 'bg-blue-500 text-white border-blue-300'} flex items-center justify-center font-black text-lg shadow-lg">
                            ${adm.nome.charAt(0)}
                        </div>
                        <div>
                            ${ehDestaque ? '<p class="text-[9px] font-black text-yellow-700 uppercase mb-0.5 tracking-tighter">🏆 Funcionário do Mês</p>' : ''}
                            <p class="text-sm font-black ${ehDestaque ? 'text-yellow-900' : 'text-blue-900'}">${adm.nome} ${ehDestaque ? '💎' : ''}</p>
                            <p class="text-[10px] text-blue-800/60 uppercase font-black italic tracking-wide">${adm.cargo}</p>
                        </div>
                    </div>
                    <div class="flex flex-col items-end gap-2">
                        <span class="status-bubble px-3 py-1 rounded-full text-[9px] font-black uppercase text-white bg-gradient-to-b ${corGradiente} shadow-md">
                            ${status}
                        </span>
                        <a href="https://wa.me/${adm.fone}" target="_blank" class="p-2 glass-card bg-green-500/20 text-green-700 hover:scale-110 transition-transform shadow-sm">
                            <i data-lucide="message-circle" class="w-5 h-5"></i>
                        </a>
                    </div>
                </div>`;
        });
        lucide.createIcons();
    } catch (e) { 
        console.error("Erro ao carregar equipe:", e); 
    }
}

// 5. FUNÇÕES GLOBAIS
window.salvarConfig = function() {
    const senha = prompt("Senha de Administrador:");
    if (senha === "supimpa123") {
        const novoDestaque = document.getElementById('input-destaque').value.trim();
        if (novoDestaque) {
            set(destaqueRef, novoDestaque)
                .then(() => {
                    alert("Destaque atualizado na nuvem! 🚀");
                    fecharConfig();
                })
                .catch((error) => alert("Erro ao salvar: " + error));
        }
    } else {
        alert("Acesso negado!");
    }
}

window.abrirTela = (id) => {
    document.querySelectorAll('main > section').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
};

window.abrirConfig = () => {
    document.getElementById('input-destaque').value = funcionarioDoMesGlobal;
    document.getElementById('modal-config').classList.remove('hidden');
};

window.fecharConfig = () => {
    document.getElementById('modal-config').classList.add('hidden');
};

// 6. CALCULADORAS (Lógica original preservada)
window.calcularCarencia = () => {
    const dataInput = document.getElementById('dataVigencia').value;
    if (!dataInput) return;
    
    const data = new Date(dataInput);
    const prazos = [
        { d: 24, h: "Urgência e Emergência", t: "horas" },
        { d: 30, h: "Consultas e Exames Simples", t: "dias" },
        { d: 90, h: "Exames Complexos I", t: "dias" },
        { d: 180, h: "Exames Complexos II / Internações", t: "dias" },
        { d: 300, h: "Parto a termo", t: "dias" },
        { d: 730, h: "CPT (Doenças Preexistentes)", t: "dias" }
    ];

    const res = document.getElementById('resultadoCarencia');
    res.innerHTML = prazos.map(p => {
        const novaData = new Date(data);
        if (p.t === "horas") novaData.setHours(novaData.getHours() + p.d);
        else novaData.setDate(novaData.getDate() + p.d);
        
        return `
            <div class="p-3 glass-card flex justify-between items-center border-l-4 border-blue-500">
                <span class="text-[10px] font-bold text-blue-900 uppercase w-1/2">${p.h}</span>
                <span class="text-xs font-black text-blue-700">${novaData.toLocaleDateString('pt-BR')}</span>
            </div>`;
    }).join('');
};

window.calcularRepique = () => {
    const adesao = new Date(document.getElementById('dataAdesao').value);
    const cancel = new Date(document.getElementById('dataCancelamento').value);
    const inadimplente = document.getElementById('inadimplente').checked;
    const res = document.getElementById('resultadoRepique');

    if (isNaN(adesao) || isNaN(cancel)) return;

    const diffMeses = (cancel.getFullYear() - adesao.getFullYear()) * 12 + (cancel.getMonth() - adesao.getMonth());
    res.classList.remove('hidden', 'bg-red-500', 'bg-green-500', 'text-white');

    if (diffMeses < 6 || inadimplente) {
        res.innerHTML = "❌ REPIQUE CONFIRMADO";
        res.classList.add('bg-red-500/80', 'text-white', 'status-bubble');
    } else {
        res.innerHTML = "✅ SEM REPIQUE";
        res.classList.add('bg-green-500/80', 'text-white', 'status-bubble');
    }
};

// Iniciar
setInterval(atualizarStatus, 60000);
lucide.createIcons();