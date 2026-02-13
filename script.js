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
    const user = document.getElementById('login-usuario').value.trim().toLowerCase();
    const pass = document.getElementById('login-senha').value;
    const btn = document.getElementById('btn-entrar');
    if(!user || !pass) return alert("Preencha tudo!");
    btn.innerText = "VERIFICANDO...";
    signInWithEmailAndPassword(auth, `${user}@lider-saude.com`, pass)
        .catch(() => { alert("Acesso Negado!"); btn.innerText = "ENTRAR"; });
};

window.fazerLogout = function() { if(confirm("Deseja sair?")) signOut(auth); };

onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('tela-login').classList.add('hidden');
        document.getElementById('conteudo-app').classList.remove('hidden');
        onValue(destaqueRef, (s) => { funcionarioDoMesGlobal = s.val() || "Narry"; atualizarStatus(); });
    } else {
        document.getElementById('tela-login').classList.remove('hidden');
        document.getElementById('conteudo-app').classList.add('hidden');
    }
});

// --- TABELAS ---
const tabelaPrecos = {
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

// --- COTAÇÃO ---
function getFaixa(idade) {
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

window.contarVidas = () => {
    const ids = document.getElementById('idadesInput').value.split(/[\s,]+/).filter(i => i.trim() !== "");
    document.getElementById('contadorVidas').innerText = `${ids.length} vidas`;
};

const fmt = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

window.gerarOrcamento = function() {
    const corretor = document.getElementById('nomeCorretor').value;
    const tel = document.getElementById('telCorretor').value;
    const tipo = document.querySelector('input[name="tipoContrato"]:checked').value;
    const idadesStr = document.getElementById('idadesInput').value;
    const plano = document.getElementById('nomePlano').value;
    const copart = document.getElementById('copart').value;
    
    if(!idadesStr) return alert("Insira as idades!");
    const idades = idadesStr.split(/[\s,]+/).map(i => i.trim()).filter(i => i !== "");

    let texto = `HAPVIDA - ${tipo === 'PME' ? 'SUPER SIMPLES' : 'INDIVIDUAL'}\n`;
    texto += `PLANO: ${plano} | ${copart}\n`;
    if(corretor) texto += `CONSULTOR: ${corretor} ${tel ? '| ' + tel : ''}\n`;
    texto += `------------------------------------\n\n`;

    let sAmb = 0, sEnf = 0, sApt = 0;
    let sAmbD = 0, sEnfD = 0, sAptD = 0;

    idades.forEach(idade => {
        const info = getFaixa(idade);
        const p = tabelaPrecos[tipo][plano][copart][info.k];
        texto += `Idade: ${idade} anos (${info.t})\n`;
        if (document.getElementById('checkAmb').checked && p.amb) {
            texto += `• AMB: 3x ${fmt(p.amb*0.85)} -> dps ${fmt(p.amb)}\n`;
            sAmb += p.amb; sAmbD += p.amb*0.85;
        }
        if (document.getElementById('checkEnf').checked && p.enf) {
            texto += `• ENF: 3x ${fmt(p.enf*0.85)} -> dps ${fmt(p.enf)}\n`;
            sEnf += p.enf; sEnfD += p.enf*0.85;
        }
        if (document.getElementById('checkApt').checked && p.apt) {
            texto += `• APT: 3x ${fmt(p.apt*0.85)} -> dps ${fmt(p.apt)}\n`;
            sApt += p.apt; sAptD += p.apt*0.85;
        }
        texto += `\n`;
    });

    texto += `------------------------------------\nTOTAL GRUPO (${idades.length} vidas):\n`;
    if(sAmb > 0) texto += `AMB: 3x ${fmt(sAmbD)} | Final: ${fmt(sAmb)}\n`;
    if(sEnf > 0) texto += `ENF: 3x ${fmt(sEnfD)} | Final: ${fmt(sEnf)}\n`;
    if(sApt > 0) texto += `APT: 3x ${fmt(sAptD)} | Final: ${fmt(sApt)}\n`;

    document.getElementById('resultadoArea').value = texto;
    document.getElementById('areaResultado').classList.remove('hidden');
};

// --- FUNÇÃO PDF CORRIGIDA ---
window.exportarPDF = async function() {
    const btn = document.getElementById('btnPDF');
    const content = document.getElementById('resultadoArea').value;
    if(!content) return alert("Gere uma cotação primeiro!");

    btn.innerText = "GERANDO...";
    btn.disabled = true;

    try {
        const { jsPDF } = window.jspdf;
        
        // Preenche o template escondido
        document.getElementById('pdf-nome-corretor').innerText = document.getElementById('nomeCorretor').value || "Consultor Hapvida";
        document.getElementById('pdf-tel-corretor').innerText = document.getElementById('telCorretor').value || "";
        document.getElementById('pdf-data-emissao').innerText = `Emitido em: ${new Date().toLocaleDateString('pt-BR')}`;
        document.getElementById('pdf-corpo').innerText = content;

        const template = document.getElementById('pdf-template');
        
        const canvas = await html2canvas(template, { 
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: "#ffffff"
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Cotacao_Supimpa_${new Date().getTime()}.pdf`);

    } catch (err) {
        console.error(err);
        alert("Erro ao gerar PDF. Tente novamente.");
    } finally {
        btn.innerText = "BAIXAR PDF";
        btn.disabled = false;
    }
};

// --- OUTRAS FUNÇÕES ---
window.copiarTexto = () => {
    navigator.clipboard.writeText(document.getElementById('resultadoArea').value);
    const btn = document.getElementById('btnCopiar'); btn.innerText = "COPIADO!";
    setTimeout(() => btn.innerText = "COPIAR TEXTO", 2000);
};

window.calcularCarencia = function() {
    const data = document.getElementById('dataVigencia').value;
    if(!data) return;
    const vig = new Date(data + "T12:00:00");
    const prazos = [
        { l: "Urgência/Emergência", d: 0 },
        { l: "Consultas/Exames Simples", d: 30 },
        { l: "Exames Complexos", d: 90 },
        { l: "Internações/Cirurgias", d: 180 },
        { l: "Parto", d: 300 }
    ];
    document.getElementById('resultadoCarencia').innerHTML = prazos.map(p => {
        const dt = new Date(vig); dt.setDate(dt.getDate() + p.d);
        return `<div class="p-3 bg-gray-50 rounded-xl flex justify-between italic"><span>${p.l}</span><span class="text-blue-hapvida">${dt.toLocaleDateString('pt-BR')}</span></div>`;
    }).join('');
};

window.calcularRepique = function() {
    const ad = new Date(document.getElementById('dataAdesao').value);
    const ca = new Date(document.getElementById('dataCancelamento').value);
    const inad = document.getElementById('inadimplente').checked;
    const res = document.getElementById('resultadoRepique');
    const meses = (ca.getFullYear() - ad.getFullYear()) * 12 + (ca.getMonth() - ad.getMonth());
    res.classList.remove('hidden', 'repique-box', 'nao-repique-box');
    if (meses <= 12 || inad) {
        res.innerText = "⚠️ É REPIQUE"; res.classList.add('repique-box');
    } else {
        res.innerText = "✅ NÃO É REPIQUE"; res.classList.add('nao-repique-box');
    }
};

async function atualizarStatus() {
    try {
        const response = await fetch('equipe.json');
        const adms = await response.json();
        const agora = new Date();
        const hDec = agora.getHours() + (agora.getMinutes() / 60);
        const container = document.getElementById('lista-adms');
        container.innerHTML = '';
        adms.forEach(adm => {
            let status = "Offline", cor = "bg-gray-400";
            if (hDec >= adm.hEntrada && hDec <= adm.hSaida) {
                status = (hDec >= adm.iInicio && hDec <= adm.iFim) ? "Intervalo" : "Online";
                cor = (status === "Online") ? "bg-green-500" : "bg-yellow-500";
            }
            const ehD = adm.nome.trim() === funcionarioDoMesGlobal.trim();
            container.innerHTML += `
                <div class="flex items-center justify-between p-3 border rounded-2xl ${ehD ? 'border-gold border-2 bg-gold-light' : 'bg-white border-gray-100'}">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full ${ehD ? 'bg-yellow-200 text-gold' : 'bg-blue-100 text-blue-hapvida'} flex items-center justify-center font-black">${adm.nome.charAt(0)}</div>
                        <div><p class="text-sm font-bold ${ehD ? 'text-gold' : 'text-gray-800'}">${adm.nome}</p><p class="text-[9px] uppercase font-bold text-gray-400 italic">${adm.cargo}</p></div>
                    </div>
                    <div class="text-right">
                        <span class="flex items-center gap-1 text-[9px] font-black uppercase"><span class="w-2 h-2 rounded-full ${cor} animate-pulse"></span> ${status}</span>
                        <a href="https://wa.me/${adm.fone}" target="_blank" class="text-green-500"><i data-lucide="message-circle" class="w-4 h-4"></i></a>
                    </div>
                </div>`;
        });
        lucide.createIcons();
    } catch (e) { console.error(e); }
}

window.salvarConfig = () => {
    if(prompt("Senha Admin:") === "supimpa123") {
        const n = document.getElementById('input-destaque').value.trim();
        if(n) set(destaqueRef, n).then(() => { alert("Salvo!"); fecharConfig(); });
    } else alert("Senha incorreta!");
};

window.abrirTela = (id) => {
    document.querySelectorAll('main > section').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    window.scrollTo(0,0);
};
window.abrirConfig = () => {
    document.getElementById('input-destaque').value = funcionarioDoMesGlobal;
    document.getElementById('modal-config').classList.remove('hidden');
};
window.fecharConfig = () => document.getElementById('modal-config').classList.add('hidden');

setInterval(() => { if(auth.currentUser) atualizarStatus(); }, 60000);
