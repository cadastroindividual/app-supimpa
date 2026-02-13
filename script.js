// 1. IMPORTAÇÃO DO FIREBASE (Via CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// 2. SUAS CONFIGURAÇÕES (Substitua pelos dados que você copiou no Passo 2)
cconst firebaseConfig = {
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

let funcionarioDoMesGlobal = "Narry"; // Valor padrão inicial

// 3. ESCUTA EM TEMPO REAL
// Sempre que você mudar no banco, todos os apps atualizam na hora
onValue(destaqueRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
        funcionarioDoMesGlobal = data;
        atualizarStatus(); // Recarrega a lista com o novo brilho
    }
});

// 4. ATUALIZAR STATUS DA EQUIPE
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
                if (horaDecimal >= adm.iInicio && horaDecimal <= adm.iFim) {
                    status = "Intervalo"; cor = "bg-yellow-500";
                } else {
                    status = "Online"; cor = "bg-green-500";
                }
            }

            const ehDestaque = adm.nome.trim() === funcionarioDoMesGlobal.trim();
            
            container.innerHTML += `
                <div class="flex items-center justify-between p-3 border rounded-2xl ${ehDestaque ? 'border-gold border-2 bg-gold-light shadow-md' : 'bg-white border-gray-100'} transition-all">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full ${ehDestaque ? 'bg-yellow-200 text-gold' : 'bg-blue-100 text-blue-hapvida'} flex items-center justify-center font-black text-sm uppercase">
                            ${adm.nome.charAt(0)}
                        </div>
                        <div>
                            ${ehDestaque ? '<p class="text-[9px] font-black text-gold uppercase mb-1">🏆 Destaque do Mês</p>' : ''}
                            <p class="text-sm font-bold ${ehDestaque ? 'text-gold' : 'text-gray-800'}">${adm.nome} ${ehDestaque ? '💎' : ''}</p>
                            <p class="text-[10px] text-gray-400 uppercase font-bold italic">${adm.cargo}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <span class="flex items-center gap-1 text-[10px] font-black uppercase">
                            <span class="w-2 h-2 rounded-full ${cor} animate-pulse"></span> ${status}
                        </span>
                        <a href="https://wa.me/${adm.fone}" target="_blank" class="text-green-500"><i data-lucide="message-circle" class="w-5 h-5"></i></a>
                    </div>
                </div>`;
        });
        lucide.createIcons();
    } catch (e) { console.error("Erro ao carregar equipe:", e); }
}

// 5. FUNÇÃO DE SALVAR (RESTRITA COM SENHA)
window.salvarConfig = function() {
    const senha = prompt("Senha de Administrador:");
    if (senha === "supimpa123") {
        const novoDestaque = document.getElementById('input-destaque').value.trim();
        if (novoDestaque) {
            set(destaqueRef, novoDestaque) // Envia para a nuvem!
                .then(() => {
                    alert("Destaque atualizado para toda a equipe! 🚀");
                    fecharConfig();
                })
                .catch((error) => alert("Erro ao salvar: " + error));
        }
    } else {
        alert("Acesso negado!");
    }
}

// Funções de navegação e UI continuam iguais...
window.abrirTela = (id) => {
    document.querySelectorAll('main > section').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
};
window.abrirConfig = () => {
    document.getElementById('input-destaque').value = funcionarioDoMesGlobal;
    document.getElementById('modal-config').classList.remove('hidden');
    lucide.createIcons();
};
window.fecharConfig = () => document.getElementById('modal-config').classList.add('hidden');

// Inicialização
atualizarStatus();
setInterval(atualizarStatus, 60000);