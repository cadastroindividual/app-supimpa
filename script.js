import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// 1. CONFIGURAÇÃO FIREBASE
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
const destaqueRef = ref(db, 'config/funcionarioDoMes');
let funcionarioDoMesGlobal = "";

// 2. TABELAS DE PREÇOS (DADOS ORGANIZADOS)
const TABELA_PRECOS = {
    "INDIVIDUAL": {
        "NOSSO MÉDICO": {
            "PARCIAL": { "0-18": { enf: 294.37, apt: 439.62 }, "19-23": { enf: 387.34, apt: 579.07 }, "24-28": { enf: 444.86, apt: 665.35 }, "29-33": { enf: 497.78, apt: 744.73 }, "34-38": { enf: 522.48, apt: 781.77 }, "39-43": { enf: 589.90, apt: 882.90 }, "44-48": { enf: 718.83, apt: 1076.29 }, "49-53": { enf: 990.52, apt: 1483.82 }, "54-58": { enf: 1335.85, apt: 2001.81 }, "59+": { enf: 1735.45, apt: 2601.20 } },
            "TOTAL": { "0-18": { enf: 210.46, apt: 313.76 }, "19-23": { enf: 276.58, apt: 412.93 }, "24-28": { enf: 317.49, apt: 474.29 }, "29-33": { enf: 355.13, apt: 530.74 }, "34-38": { enf: 372.69, apt: 557.08 }, "39-43": { enf: 420.64, apt: 629.00 }, "44-48": { enf: 512.33, apt: 766.53 }, "49-53": { enf: 705.55, apt: 1056.35 }, "54-58": { enf: 951.15, apt: 1424.73 }, "59+": { enf: 1235.34, apt: 1850.99 } }
        },
        "NOSSO PLANO": {
            "PARCIAL": { "0-18": { amb: 218.13, enf: 326.65, apt: 488.04 }, "19-23": { amb: 287.34, enf: 429.95, apt: 642.98 }, "24-28": { amb: 327.60, enf: 493.87, apt: 738.85 }, "29-33": { amb: 365.48, enf: 552.67, apt: 827.05 }, "34-38": { amb: 384.65, enf: 580.11, apt: 868.21 }, "39-43": { amb: 431.87, enf: 655.02, apt: 980.58 }, "44-48": { amb: 528.17, enf: 798.28, apt: 1195.46 }, "49-53": { amb: 732.65, enf: 1100.16, apt: 1648.27 }, "54-58": { amb: 987.73, enf: 1483.87, apt: 2223.82 }, "59+": { amb: 1282.89, enf: 1927.88, apt: 2889.81 } },
            "TOTAL": { "0-18": { amb: 139.89, enf: 233.42, apt: 348.19 }, "19-23": { amb: 183.83, enf: 306.88, apt: 458.38 }, "24-28": { amb: 209.39, enf: 352.33, apt: 526.56 }, "29-33": { amb: 233.44, enf: 394.15, apt: 589.29 }, "34-38": { amb: 245.61, enf: 413.67, apt: 618.56 }, "39-43": { amb: 275.59, enf: 466.95, apt: 698.47 }, "44-48": { amb: 336.73, enf: 568.83, apt: 851.29 }, "49-53": { amb: 466.55, enf: 783.52, apt: 1173.32 }, "54-58": { amb: 628.50, enf: 1056.40, apt: 1582.63 }, "59+": { amb: 815.90, enf: 1372.17, apt: 2056.26 } }
        }
    },
    "PME": {
        "NOSSO MÉDICO": {
            "PARCIAL": { "0-18": { enf: 220.45, apt: 329.98 }, "19-23": { enf: 246.90, apt: 369.58 }, "24-28": { enf: 276.53, apt: 413.93 }, "29-33": { enf: 318.01, apt: 476.02 }, "34-38": { enf: 365.71, apt: 547.42 }, "39-43": { enf: 435.19, apt: 651.43 }, "44-48": { enf: 543.99, apt: 814.29 }, "49-53": { enf: 679.99, apt: 1017.86 }, "54-58": { enf: 1155.98, apt: 1730.36 }, "59+": { enf: 1294.70, apt: 1938.00 } },
            "TOTAL": { "0-18": { enf: 165.43, apt: 247.13 }, "19-23": { enf: 185.28, apt: 277.12 }, "24-28": { enf: 207.51, apt: 310.37 }, "29-33": { enf: 238.64, apt: 356.93 }, "34-38": { enf: 274.44, apt: 410.47 }, "39-43": { enf: 326.58, apt: 488.46 }, "44-48": { enf: 408.23, apt: 610.58 }, "49-53": { enf: 510.29, apt: 763.23 }, "54-58": { enf: 867.49, apt: 1297.49 }, "59+": { enf: 971.59, apt: 1453.19 } }
        },
        "NOSSO PLANO": {
            "PARCIAL": { "0-18": { amb: 177.51, enf: 244.77, apt: 366.48 }, "19-23": { amb: 198.81, enf: 274.14, apt: 410.46 }, "24-28": { amb: 222.67, enf: 307.04, apt: 459.72 }, "29-33": { amb: 256.07, enf: 353.10, apt: 528.68 }, "34-38": { amb: 294.48, enf: 406.07, apt: 607.98 }, "39-43": { amb: 350.43, enf: 483.22, apt: 723.50 }, "44-48": { amb: 438.04, enf: 604.03, apt: 904.38 }, "49-53": { amb: 547.55, enf: 755.04, apt: 1130.48 }, "54-58": { amb: 930.84, enf: 1283.57, apt: 1921.82 }, "59+": { amb: 1042.54, enf: 1437.60, apt: 2152.44 } },
            "TOTAL": { "0-18": { amb: 113.87, enf: 183.63, apt: 274.75 }, "19-23": { amb: 127.53, enf: 205.67, apt: 307.72 }, "24-28": { amb: 142.83, enf: 230.35, apt: 344.65 }, "29-33": { amb: 164.25, enf: 264.90, apt: 396.35 }, "34-38": { amb: 188.89, enf: 304.64, apt: 455.80 }, "39-43": { amb: 224.78, enf: 362.52, apt: 542.40 }, "44-48": { amb: 280.98, enf: 453.15, apt: 678.00 }, "49-53": { amb: 351.23, enf: 566.44, apt: 847.50 }, "54-58": { amb: 597.09, enf: 962.95, apt: 1440.75 }, "59+": { amb: 668.74, enf: 1078.50, apt: 1613.64 } }
        }
    }
};

// 3. LÓGICA DE COTAÇÃO
function getFaixa(idade) {
    idade = parseInt(idade);
    if (idade <= 18) return "0-18";
    if (idade <= 23) return "19-23";
    if (idade <= 28) return "24-28";
    if (idade <= 33) return "29-33";
    if (idade <= 38) return "34-38";
    if (idade <= 43) return "39-43";
    if (idade <= 48) return "44-48";
    if (idade <= 53) return "49-53";
    if (idade <= 58) return "54-58";
    return "59+";
}

const fmt = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

window.gerarOrcamento = () => {
    const tipoContrato = document.querySelector('input[name="tipoContrato"]:checked').value;
    const plano = document.getElementById('nomePlano').value;
    const copart = document.getElementById('copart').value;
    const idadesStr = document.getElementById('idadesInput').value;
    const idades = idadesStr.split(/[\s,]+/).filter(i => i.trim() !== "");

    if (idades.length === 0) return alert("Por favor, insira as idades!");

    let texto = `🔵 HAPVIDA - ${tipoContrato === 'PME' ? 'SUPER SIMPLES' : 'INDIVIDUAL'}\n`;
    texto += `📋 PLANO: ${plano} | COPART: ${copart}\n`;
    texto += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    let sAmb = 0, sEnf = 0, sApt = 0;
    let sAmbD = 0, sEnfD = 0, sAptD = 0;

    idades.forEach(idade => {
        const faixa = getFaixa(idade);
        const preco = TABELA_PRECOS[tipoContrato][plano][copart][faixa];
        texto += `📍 Idade: ${idade} anos (${faixa})\n`;

        if (document.getElementById('checkAmb').checked && preco.amb) {
            const desc = preco.amb * 0.85;
            texto += `• Amb: 3x ${fmt(desc)} -> dps ${fmt(preco.amb)}\n`;
            sAmb += preco.amb; sAmbD += desc;
        }
        if (document.getElementById('checkEnf').checked && preco.enf) {
            const desc = preco.enf * 0.85;
            texto += `• Enf: 3x ${fmt(desc)} -> dps ${fmt(preco.enf)}\n`;
            sEnf += preco.enf; sEnfD += desc;
        }
        if (document.getElementById('checkApt').checked && preco.apt) {
            const desc = preco.apt * 0.85;
            texto += `• Apt: 3x ${fmt(desc)} -> dps ${fmt(preco.apt)}\n`;
            sApt += preco.apt; sAptD += desc;
        }
        texto += `\n`;
    });

    texto += `━━━━━━━━━━━━━━━━━━━━\n`;
    texto += `👥 TOTAL (${idades.length} vidas):\n`;
    if (sAmb > 0) texto += `AMBULATORIAL: 3x ${fmt(sAmbD)} | Total: ${fmt(sAmb)}\n`;
    if (sEnf > 0) texto += `ENFERMARIA: 3x ${fmt(sEnfD)} | Total: ${fmt(sEnf)}\n`;
    if (sApt > 0) texto += `APARTAMENTO: 3x ${fmt(sAptD)} | Total: ${fmt(sApt)}\n`;

    document.getElementById('resultadoArea').value = texto;
};

// 4. MONITORAMENTO FIREBASE (Sincronização Online)
onValue(destaqueRef, (snapshot) => {
    funcionarioDoMesGlobal = snapshot.val() || "Equipe Hapvida";
    document.getElementById('lista-adms').innerHTML = `
        <div class="glass-card p-4 border-l-4 border-orange-500 bg-white/20">
            <span class="text-[9px] font-black text-orange-600 block uppercase">Destaque do Mês</span>
            <h4 class="text-xl font-black italic text-blue-900">${funcionarioDoMesGlobal}</h4>
        </div>
    `;
    carregarEquipe();
});

async function carregarEquipe() {
    try {
        const res = await fetch('equipe.json');
        const equipe = await res.json();
        const lista = document.getElementById('lista-adms');
        const agora = new Date();
        const horaAtual = agora.getHours() + agora.getMinutes() / 60;

        equipe.forEach(adm => {
            const estaOnline = horaAtual >= adm.hEntrada && horaAtual <= adm.hSaida;
            const noIntervalo = horaAtual >= adm.iInicio && horaAtual <= adm.iFim;
            let status = "OFFLINE", cor = "bg-gray-400";

            if (estaOnline) {
                if (noIntervalo) { status = "INTERVALO"; cor = "bg-orange-500"; }
                else { status = "ONLINE"; cor = "bg-green-500"; }
            }

            lista.innerHTML += `
                <div class="glass-card p-4 flex justify-between items-center border-white/40">
                    <div>
                        <p class="text-xs font-black text-blue-900">${adm.nome}</p>
                        <p class="text-[9px] font-bold text-blue-700/60 uppercase">${adm.cargo}</p>
                    </div>
                    <div class="flex items-center gap-3">
                        <span class="${cor} text-[8px] text-white px-2 py-1 rounded-full font-black">${status}</span>
                        <a href="https://wa.me/${adm.fone}" target="_blank" class="text-green-600"><i data-lucide="message-circle" class="w-5 h-5"></i></a>
                    </div>
                </div>`;
        });
        lucide.createIcons();
    } catch (e) { console.error("Erro ao carregar equipe:", e); }
}

// 5. FUNÇÕES DE NAVEGAÇÃO E UTILITÁRIOS
window.abrirTela = (id) => {
    document.querySelectorAll('main > section').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    lucide.createIcons();
};

window.contarVidas = () => {
    const val = document.getElementById('idadesInput').value;
    const n = val.split(/[\s,]+/).filter(i => i.trim() !== "").length;
    document.getElementById('contadorVidas').innerText = `${n} VIDAS`;
};

window.copiarTexto = () => {
    const area = document.getElementById("resultadoArea");
    navigator.clipboard.writeText(area.value);
    const btn = document.getElementById("btnCopiar");
    btn.innerText = "COPIADO!";
    setTimeout(() => btn.innerText = "COPIAR", 2000);
};

window.exportarPDF = () => {
    const content = document.getElementById('resultadoArea').value;
    if(!content) return alert("Gere uma cotação primeiro!");
    
    document.getElementById('pdf-nome-corretor').innerText = document.getElementById('nomeCorretor').value || "Consultor Hapvida";
    document.getElementById('pdf-tel-corretor').innerText = document.getElementById('telCorretor').value || "";
    document.getElementById('pdf-data-emissao').innerText = `Data: ${new Date().toLocaleDateString('pt-BR')}`;
    document.getElementById('pdf-corpo').innerText = content;

    html2canvas(document.getElementById('pdf-template'), { scale: 2 }).then(canvas => {
        const img = canvas.toDataURL('image/png');
        const pdf = new jspdf.jsPDF('p', 'mm', 'a4');
        pdf.addImage(img, 'PNG', 0, 0, 210, (canvas.height * 210) / canvas.width);
        pdf.save(`Cotacao_${new Date().getTime()}.pdf`);
    });
};

// 6. CÁLCULO DE CARÊNCIA E REPIQUE
window.calcularCarencia = () => {
    const data = new Date(document.getElementById('dataVigencia').value);
    if (isNaN(data)) return;
    const prazos = [
        { h: "Urgência/Emergência", d: 24, t: "horas" },
        { h: "Consultas/Exames Simples", d: 30, t: "dias" },
        { h: "Exames Complexos", d: 90, t: "dias" },
        { h: "Internação/Cirurgia", d: 180, t: "dias" },
        { h: "Parto", d: 300, t: "dias" }
    ];
    document.getElementById('resultadoCarencia').innerHTML = prazos.map(p => {
        let nova = new Date(data);
        if (p.t === "horas") nova.setHours(nova.getHours() + p.d);
        else nova.setDate(nova.getDate() + p.d);
        return `<div class="p-3 glass-card flex justify-between border-l-4 border-blue-500">
            <span class="text-[10px] font-black uppercase">${p.h}</span>
            <span class="text-xs font-black text-blue-700">${nova.toLocaleDateString('pt-BR')}</span>
        </div>`;
    }).join('');
};

window.calcularRepique = () => {
    const ad = new Date(document.getElementById('dataAdesao').value);
    const ca = new Date(document.getElementById('dataCancelamento').value);
    const inadm = document.getElementById('inadimplente').checked;
    const res = document.getElementById('resultadoRepique');
    if (isNaN(ad) || isNaN(ca)) return;

    const meses = (ca.getFullYear() - ad.getFullYear()) * 12 + (ca.getMonth() - ad.getMonth());
    res.classList.remove('hidden', 'bg-red-500', 'bg-green-500', 'text-white');

    if (meses < 6 || inadm) {
        res.innerHTML = "❌ REPIQUE: PROIBIDO VENDER";
        res.classList.add('bg-red-500', 'text-white');
    } else {
        res.innerHTML = "✅ LIBERADO: METE BRONCA MEU LINDO";
        res.classList.add('bg-green-500', 'text-white');
    }
    res.classList.remove('hidden');
};

// Funções Admin
window.abrirConfig = () => document.getElementById('modal-config').classList.remove('hidden');
window.fecharConfig = () => document.getElementById('modal-config').classList.add('hidden');
window.salvarConfig = () => {
    const senha = prompt("Senha:");
    if (senha === "supimpa123") {
        set(destaqueRef, document.getElementById('input-destaque').value);
        fecharConfig();
    } else alert("Erro!");
};

// Inicialização de Ícones
lucide.createIcons();
document.getElementById('idadesInput').addEventListener('input', window.contarVidas);
