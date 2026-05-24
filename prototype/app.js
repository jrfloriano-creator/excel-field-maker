/* ==============================================================
   app.js — Protótipo Controle Financeiro ZOOM
   Pure Vanilla JS, sem build. Navegável no browser diretamente.
   ============================================================== */

'use strict';

/* ------- HELPERS ------- */
const $ = id => document.getElementById(id);
const fmt = v => new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(v || 0);
const fmtDate = d => { if (!d) return '—'; const [y,m,dd]=d.split('-'); return `${dd}/${m}/${y}`; };
const today = () => new Date().toISOString().split('T')[0];
const genId = () => Math.random().toString(36).slice(2,10);
const clamp = (v,min,max) => Math.max(min, Math.min(max, v));

/* ------- APP STATE ------- */
const S = {
  loggedIn: false,
  currentUser: null,
  activeTab: 'dashboard',
  dashboardMonth: null,  // null = todos
  titulosMonth: null,
  titulosFilter: 'all',
  editingTituloId: null,
  editingClienteId: null,
  pagandoTituloId: null,
  vendaFormVisible: false,
  configSubTab: 'cadastro',
  vencidosPanelOpen: false,

  // idle timer
  idleActive: false,
  idleMinutes: 5,
  idleTimer: null,
  idleCountdownTimer: null,
  idleSecondsLeft: 0,

  // Config data
  usuarios: [
    { id:'u1', nome:'Roberto', nivel:'MASTER', master:true, pin:'1111', perms:{titulos:true,clientes:true,vendas:true,relat:true,config:true,pagar:true,excluir:true,valores:true} },
    { id:'u2', nome:'Fernanda', nivel:'GERENCIAL', pin:'2222', perms:{titulos:true,clientes:true,vendas:true,relat:true,config:false,pagar:true,excluir:false,valores:true} },
    { id:'u3', nome:'Operador', nivel:'USUARIO', pin:'3333', perms:{titulos:true,clientes:false,vendas:false,relat:false,config:false,pagar:false,excluir:false,valores:false} },
  ],
  funcionarios: [
    { id:'f1', nome:'Marcos Lima', cargo:'Cobrador' },
    { id:'f2', nome:'Sônia Alves', cargo:'Caixa' },
  ],
  maquininhas: [
    { id:'m1', nome:'Cielo' },
    { id:'m2', nome:'Stone' },
    { id:'m3', nome:'PagSeguro' },
  ],
  proprietarios: [
    { id:'p1', nome:'Roberto Silva', cor:'#4facfe' },
    { id:'p2', nome:'Empresa ZOOM', cor:'#43e97b' },
  ],
  formasPagamento: ['Dinheiro', 'Cartão de Crédito', 'Cartão de Débito', 'PIX', 'Boleto', 'Promissória'],
  chavesPix: [
    { id:'pix1', nome:'Roberto Pessoal', chave:'11999999999' },
  ],
  taxa: 0.015,
  telefonesAlerta: [
    { numero:'11991234567', ativo:true },
    { numero:'', ativo:false },
  ],
  credor: { nome:'Roberto Silva', cpfCnpj:'123.456.789-00', cidadeEstado:'São Paulo/SP' },
  caminhoSalvarDados: 'C:\\Documentos\\ZOOM\\PDFs',

  // Business data
  clientes: [
    { id:'c1', nome:'ANA COSTA', apelido:'Ana', telefone:'11987654321', email:'ana@email.com', dataNascimento:'1990-03-15', cpfCnpj:'111.222.333-44', cep:'01310-100', logradouro:'Av. Paulista', numero:'1000', bairro:'Bela Vista', cidade:'São Paulo', estado:'SP', dataCadastro:'2024-01-10', indicacao:'' },
    { id:'c2', nome:'JOÃO SOUZA', apelido:'João', telefone:'11991234567', email:'', dataNascimento:'', cpfCnpj:'222.333.444-55', cep:'', logradouro:'', numero:'', bairro:'', cidade:'São Paulo', estado:'SP', dataCadastro:'2024-02-20', indicacao:'Ana Costa' },
    { id:'c3', nome:'MARIA LIMA', apelido:'Maria', telefone:'21998765432', email:'maria@email.com', dataNascimento:'1985-07-22', cpfCnpj:'333.444.555-66', cep:'20040-020', logradouro:'Av. Rio Branco', numero:'150', bairro:'Centro', cidade:'Rio de Janeiro', estado:'RJ', dataCadastro:'2024-03-05', indicacao:'João Souza' },
    { id:'c4', nome:'CARLOS MELO', apelido:'Carlos', telefone:'31976543210', email:'carlos@email.com', dataNascimento:'1978-12-01', cpfCnpj:'444.555.666-77', cep:'', logradouro:'Rua dos Andradas', numero:'200', bairro:'Centro', cidade:'Belo Horizonte', estado:'MG', dataCadastro:'2024-04-15', indicacao:'' },
    { id:'c5', nome:'FERNANDA RIOS', apelido:'Fê', telefone:'41987650123', email:'', dataNascimento:'1995-05-10', cpfCnpj:'555.666.777-88', cep:'', logradouro:'', numero:'', bairro:'', cidade:'Curitiba', estado:'PR', dataCadastro:'2024-05-01', indicacao:'Maria Lima' },
    { id:'c6', nome:'RAFAEL SANTOS', apelido:'Rafa', telefone:'51965432109', email:'rafael@email.com', dataNascimento:'1982-09-30', cpfCnpj:'666.777.888-99', cep:'', logradouro:'', numero:'', bairro:'', cidade:'Porto Alegre', estado:'RS', dataCadastro:'2024-06-20', indicacao:'' },
  ],

  titulos: [
    { id:'t1', numero:89, tipo:'Duplicata', cliente:'ANA COSTA', clienteId:'c1', telefone:'11987654321', dataEmissao:'2024-10-10', vencimento:'2025-01-10', valor:1200, proprietario:'p1', obs:'' },
    { id:'t2', numero:91, tipo:'Caderno', cliente:'MARIA LIMA', clienteId:'c3', telefone:'21998765432', dataEmissao:'2024-11-15', vencimento:'2025-02-15', valor:500, proprietario:'p1', obs:'' },
    { id:'t3', numero:95, tipo:'Cheque', cliente:'RAFAEL SANTOS', clienteId:'c6', telefone:'51965432109', dataEmissao:'2025-01-30', vencimento:'2025-03-10', valor:750, proprietario:'p2', obs:'' },
    { id:'t4', numero:97, tipo:'Boleto', cliente:'ANA COSTA', clienteId:'c1', telefone:'11987654321', dataEmissao:'2025-02-05', vencimento:'2025-04-05', valor:2100, proprietario:'p1', obs:'' },
    { id:'t5', numero:88, tipo:'Duplicata', cliente:'FERNANDA RIOS', clienteId:'c5', telefone:'41987650123', dataEmissao:'2025-01-19', vencimento:'2025-01-19', valor:750, proprietario:'p2', dataPagamento:'2025-01-19', valorPago:750, recebidoPor:'Roberto', formaPagamento:'PIX', obs:'' },
    { id:'t6', numero:85, tipo:'Caderno', cliente:'CARLOS MELO', clienteId:'c4', telefone:'31976543210', dataEmissao:'2025-01-20', vencimento:'2025-02-20', valor:2300, proprietario:'p1', dataPagamento:'2025-02-22', valorPago:2300, recebidoPor:'Roberto', formaPagamento:'Dinheiro', obs:'' },
    { id:'t7', numero:100, tipo:'Outros', cliente:'ANA COSTA', clienteId:'c1', telefone:'11987654321', dataEmissao:'2025-03-01', vencimento:'2025-07-01', valor:800, proprietario:'p2', obs:'' },
    { id:'t8', numero:101, tipo:'Cheque', cliente:'RAFAEL SANTOS', clienteId:'c6', telefone:'51965432109', dataEmissao:'2025-03-15', vencimento:'2025-05-01', valor:300, proprietario:'p1', dataPagamento:'2025-05-01', valorPago:315, recebidoPor:'Fernanda', formaPagamento:'Cheque', obs:'' },
    { id:'t9', numero:105, tipo:'Duplicata', cliente:'JOÃO SOUZA', clienteId:'c2', telefone:'11991234567', dataEmissao:'2025-04-01', vencimento:'2025-05-15', valor:980, proprietario:'p1', obs:'' },
    { id:'t10', numero:106, tipo:'Boleto', cliente:'MARIA LIMA', clienteId:'c3', telefone:'21998765432', dataEmissao:'2025-04-10', vencimento:'2025-06-10', valor:1500, proprietario:'p2', obs:'' },
  ],

  vendas: [
    { id:'v1', clienteId:'c1', clienteNome:'ANA COSTA', valor:1200, desconto:50, descontoTipo:'R$', valorFinal:1150, forma:'PIX', parcelas:1, maquininha:'', obs:'', data:today() },
    { id:'v2', clienteId:'c2', clienteNome:'JOÃO SOUZA', valor:750, desconto:5, descontoTipo:'%', valorFinal:712.50, forma:'Cartão de Crédito', parcelas:3, maquininha:'Stone', obs:'', data:today() },
    { id:'v3', clienteId:'c3', clienteNome:'MARIA LIMA', valor:430, desconto:0, descontoTipo:'R$', valorFinal:430, forma:'Dinheiro', parcelas:1, maquininha:'', obs:'Material', data:today() },
  ],

  promissorias: [
    { id:'pr1', clienteId:'c4', clienteNome:'CARLOS MELO', valor:1500, vencimento:'2025-06-30', motivo:'Empréstimo pessoal', cidade:'Belo Horizonte/MG', emissao:'2025-01-30', numero:1 },
    { id:'pr2', clienteId:'c2', clienteNome:'JOÃO SOUZA', valor:800, vencimento:'2025-07-15', motivo:'Compra de materiais', cidade:'São Paulo/SP', emissao:'2025-02-15', numero:2 },
  ],
};

/* ------- PERMISSION CHECK ------- */
function can(perm) {
  if (!S.currentUser) return false;
  if (S.currentUser.master || S.currentUser.nivel === 'MASTER') return true;
  return !!(S.currentUser.perms && S.currentUser.perms[perm]);
}

/* ================================================================
   LOGIN
   ================================================================ */
function initLoginSelect() {
  const sel = $('login-user');
  sel.innerHTML = '';
  S.usuarios.forEach(u => {
    const opt = document.createElement('option');
    opt.value = u.id;
    opt.textContent = `${u.nome} (${u.nivel})`;
    sel.appendChild(opt);
  });
}

function doLogin() {
  const userId = $('login-user').value;
  const pin = $('login-pin').value;
  const err = $('login-error');
  const user = S.usuarios.find(u => u.id === userId);
  if (!user || user.pin !== pin) {
    err.classList.add('show');
    $('login-pin').value = '';
    return;
  }
  err.classList.remove('show');
  S.loggedIn = true;
  S.currentUser = user;
  $('login-screen').classList.add('hidden');
  updateUserUI();
  setTab('dashboard');
  initIdleTimer();
}

document.addEventListener('keydown', e => {
  if (!S.loggedIn && e.key === 'Enter') doLogin();
});

function doLogout() {
  S.loggedIn = false;
  S.currentUser = null;
  $('login-screen').classList.remove('hidden');
  $('login-pin').value = '';
  $('login-error').classList.remove('show');
  initLoginSelect();
  stopIdleTimer();
}

function updateUserUI() {
  const u = S.currentUser;
  if (!u) return;
  $('sidebar-uname').textContent = u.nome;
  $('sidebar-urole').textContent = u.nivel;
  const ini = u.nome.charAt(0).toUpperCase();
  $('sidebar-avatar').textContent = ini;
}

/* ================================================================
   IDLE TIMER
   ================================================================ */
function initIdleTimer() {
  if (!S.idleActive) return;
  resetIdle();
  ['click','keydown','mousemove','touchstart','scroll'].forEach(evt =>
    document.addEventListener(evt, resetIdle, { passive:true })
  );
}

function stopIdleTimer() {
  clearTimeout(S.idleTimer);
  clearInterval(S.idleCountdownTimer);
  $('idle-indicator').style.display = 'none';
}

function toggleIdleTimer() {
  S.idleActive = $('idle-toggle').checked;
  $('idle-time-group').style.opacity = S.idleActive ? '1' : '0.45';
  if (S.idleActive && S.loggedIn) {
    initIdleTimer();
  } else {
    stopIdleTimer();
  }
}

function updateIdleTimeout() {
  S.idleMinutes = parseInt($('idle-minutes').value) || 5;
  if (S.idleActive && S.loggedIn) resetIdle();
}

function resetIdle() {
  clearTimeout(S.idleTimer);
  clearInterval(S.idleCountdownTimer);
  const ind = $('idle-indicator');
  ind.style.display = 'none';
  ind.classList.remove('warning');
  S.idleTimer = setTimeout(() => {
    // Show countdown 30s before logout
    S.idleSecondsLeft = 30;
    ind.style.display = 'block';
    ind.classList.add('warning');
    ind.textContent = `Logout automático em ${S.idleSecondsLeft}s`;
    S.idleCountdownTimer = setInterval(() => {
      S.idleSecondsLeft--;
      ind.textContent = `Logout automático em ${S.idleSecondsLeft}s`;
      if (S.idleSecondsLeft <= 0) {
        clearInterval(S.idleCountdownTimer);
        doLogout();
      }
    }, 1000);
  }, S.idleMinutes * 60 * 1000 - 30000);
}

/* ================================================================
   NAVIGATION
   ================================================================ */
function setTab(tab) {
  S.activeTab = tab;
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
  const content = $(`tab-${tab}`);
  if (content) content.classList.add('active');
  const btn = document.querySelector(`.nav-btn[data-tab="${tab}"]`);
  if (btn) btn.classList.add('active');
  const subtitles = { dashboard:'Dashboard', titulos:'Títulos', vendas:'Vendas', clientes:'Clientes', promissorias:'Promissórias', relatorios:'Relatórios', config:'Configurações' };
  $('tab-subtitle').textContent = `• ${subtitles[tab] || tab}`;

  // Month bar: visível em dashboard e títulos
  const monthBar = $('month-bar');
  if (tab === 'dashboard') {
    monthBar.classList.add('visible');
    buildDashboardMonthBar();
    // Defer chart rendering so DOM has time to repaint after tab becomes visible
    setTimeout(renderDashboard, 50);
  } else if (tab === 'titulos') {
    monthBar.classList.add('visible');
    buildTitulosMonthBar();
    renderTitulos();
  } else {
    monthBar.classList.remove('visible');
  }

  if (tab === 'vendas') { populateVendasSelects(); renderVendas(); }
  if (tab === 'clientes') { initClienteForm(); renderClientes(); }
  if (tab === 'relatorios') { buildRelatorioSelects(); renderRelatorios(); }
  if (tab === 'config') { renderConfig(); }
  if (tab === 'promissorias') { renderPromissorias(); }

  // Map tab to navAtual for avatar context
  const tabToNav = { dashboard:'dashboard', titulos:'titulos', vendas:'vendas', clientes:'clientes', relatorios:'relatorios', config:'configuracoes', promissorias:'titulos' };
  S.navAtual = tabToNav[tab] || tab;
  fecharAvatarTooltip && fecharAvatarTooltip();

  closeSidebar();
}

/* ================================================================
   CLOCK
   ================================================================ */
function updateClock() {
  const now = new Date();
  const days = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  $('clock-date').textContent = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
  $('clock-time').textContent = now.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });
}
setInterval(updateClock, 1000);
updateClock();

/* ================================================================
   MONTH BAR LOGIC
   ================================================================ */
const MONTHS_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function getMonthKey(dateStr) {
  if (!dateStr) return '';
  return dateStr.substring(0,7); // YYYY-MM
}

function formatMonthLabel(key) {
  if (!key) return '';
  const [y,m] = key.split('-');
  return `${MONTHS_PT[parseInt(m)-1]} ${y}`;
}

function buildDashboardMonthBar() {
  const container = $('month-btns');
  // All months in dataset
  const keys = new Set();
  S.titulos.forEach(t => {
    if (t.dataPagamento) keys.add(getMonthKey(t.dataPagamento));
    keys.add(getMonthKey(t.vencimento));
  });
  S.vendas.forEach(v => keys.add(getMonthKey(v.data)));
  const sorted = [...keys].filter(Boolean).sort();
  container.innerHTML = '';
  const btnTodos = document.createElement('button');
  btnTodos.className = 'month-btn' + (!S.dashboardMonth ? ' active' : '');
  btnTodos.textContent = 'Todos';
  btnTodos.onclick = () => { S.dashboardMonth = null; buildDashboardMonthBar(); renderDashboard(); };
  container.appendChild(btnTodos);
  sorted.forEach(mk => {
    const btn = document.createElement('button');
    btn.className = 'month-btn' + (S.dashboardMonth === mk ? ' active' : '');
    btn.textContent = formatMonthLabel(mk);
    btn.onclick = () => { S.dashboardMonth = mk; buildDashboardMonthBar(); renderDashboard(); };
    container.appendChild(btn);
  });
}

function buildTitulosMonthBar() {
  const container = $('month-btns');
  const keys = new Set();
  S.titulos.forEach(t => keys.add(getMonthKey(t.vencimento)));
  const sorted = [...keys].filter(Boolean).sort();
  container.innerHTML = '';
  const btnTodos = document.createElement('button');
  btnTodos.className = 'month-btn' + (!S.titulosMonth ? ' active' : '');
  btnTodos.textContent = 'Todos';
  btnTodos.onclick = () => { S.titulosMonth = null; buildTitulosMonthBar(); renderTitulos(); };
  container.appendChild(btnTodos);
  sorted.forEach(mk => {
    const btn = document.createElement('button');
    btn.className = 'month-btn' + (S.titulosMonth === mk ? ' active' : '');
    btn.textContent = formatMonthLabel(mk);
    btn.onclick = () => { S.titulosMonth = mk; buildTitulosMonthBar(); renderTitulos(); };
    container.appendChild(btn);
  });
}

/* ================================================================
   TÍTULO UTILS
   ================================================================ */
function calcTitulo(t) {
  const td = today();
  const isPago = !!t.dataPagamento;
  let situacao = 'NO PRAZO';
  let diasAVencer = 0;
  let valorJuros = 0;
  let valorCorrigido = t.valor;
  if (isPago) {
    situacao = 'PAGO';
  } else if (t.vencimento < td) {
    situacao = 'VENCIDO';
    const vDate = new Date(t.vencimento + 'T00:00:00');
    const tDate = new Date(td + 'T00:00:00');
    diasAVencer = -Math.floor((tDate - vDate) / (1000*60*60*24));
    const mesesAtraso = Math.abs(diasAVencer) / 30;
    valorJuros = t.valor * S.taxa * mesesAtraso;
    valorCorrigido = t.valor + valorJuros;
  } else {
    const vDate = new Date(t.vencimento + 'T00:00:00');
    const tDate = new Date(td + 'T00:00:00');
    diasAVencer = Math.floor((vDate - tDate) / (1000*60*60*24));
  }
  return { ...t, situacao, diasAVencer, valorJuros, valorCorrigido };
}

function tipoNorm(tipo) {
  const up = tipo.toUpperCase();
  if (up.includes('DUPLIC')) return 'Duplicata';
  if (up.includes('CADERNO')) return 'Caderno';
  if (up.includes('CHEQUE')) return 'Cheque';
  if (up.includes('BOLETO')) return 'Boleto';
  return 'Outros';
}

function getPropName(id) {
  const p = S.proprietarios.find(x => x.id === id);
  return p ? p.nome : '—';
}

function filterTitulosByMonth(titulos, monthKey) {
  if (!monthKey) return titulos;
  return titulos.filter(t => getMonthKey(t.vencimento) === monthKey);
}

/* ================================================================
   DASHBOARD
   ================================================================ */
let chartBar = null;
let chartTipos = null;

function renderDashboard() {
  const td = today();
  let titulosFiltered = S.dashboardMonth
    ? filterTitulosByMonth(S.titulos, S.dashboardMonth)
    : S.titulos;

  // For vendas
  let vendasFiltered = S.dashboardMonth
    ? S.vendas.filter(v => getMonthKey(v.data) === S.dashboardMonth)
    : S.vendas;

  const calcs = titulosFiltered.map(calcTitulo);
  const vencidos = calcs.filter(t => t.situacao === 'VENCIDO');
  const noPrazo = calcs.filter(t => t.situacao === 'NO PRAZO');
  const pagos = calcs.filter(t => t.situacao === 'PAGO');

  // Period label
  $('dash-period-label').textContent = S.dashboardMonth
    ? `Mês: ${formatMonthLabel(S.dashboardMonth)}`
    : 'Visão geral do sistema';

  // KPI Vencidos
  $('kv-vencidos').textContent = vencidos.length;

  // Permission: USUARIO sem privilégio só vê vencidos + gráfico tipos
  const hasValues = can('valores');
  document.querySelectorAll('.perm-kpi').forEach(el => {
    el.classList.toggle('hidden', !hasValues);
  });

  if (hasValues) {
    $('kv-total').textContent = calcs.length;
    $('kv-total-sub').textContent = `${vencidos.length} vencido(s)`;

    const aReceber = noPrazo.reduce((s,t) => s + t.valor, 0) + vencidos.reduce((s,t) => s + t.valorCorrigido, 0);
    $('kv-a-receber').textContent = fmt(aReceber);
    $('kv-ar-sub').textContent = `${(noPrazo.length + vencidos.length)} título(s) em aberto`;

    const totalVendas = vendasFiltered.reduce((s,v) => s + v.valorFinal, 0);
    $('kv-vendas').textContent = fmt(totalVendas);
    $('kv-vendas-sub').textContent = `${vendasFiltered.length} venda(s)`;
  }

  // Vencidos panel
  renderVencidosPanelContent(vencidos);

  // Charts
  renderBarChart(calcs);
  renderTiposChart(calcs);

  // Recent table
  const sorted = [...calcs].sort((a,b) => b.vencimento.localeCompare(a.vencimento)).slice(0,10);
  const tbody = $('dash-recent-body');
  tbody.innerHTML = '';
  sorted.forEach(t => {
    const c = t.situacao === 'VENCIDO' ? 'overdue' : t.situacao === 'PAGO' ? 'paid' : 'pending';
    const label = t.situacao === 'VENCIDO' ? 'Vencido' : t.situacao === 'PAGO' ? 'Pago' : 'No Prazo';
    tbody.innerHTML += `<tr>
      <td>${t.numero}</td>
      <td>${t.cliente}</td>
      <td><span class="badge-tag gray">${t.tipo}</span></td>
      <td>${fmtDate(t.vencimento)}</td>
      <td class="${t.situacao === 'VENCIDO' ? 'val-neg' : ''}">${fmt(t.valor)}</td>
      <td><span class="status-badge ${c}">${label}</span></td>
    </tr>`;
  });
  $('dash-recent-count').textContent = `${sorted.length} registros`;
}

function renderVencidosPanelContent(vencidos) {
  const el = $('vencidos-list-panel');
  if (!vencidos.length) { el.innerHTML = '<p style="font-size:13px;color:#718096;padding:8px 0">Nenhum título vencido! 🎉</p>'; return; }
  el.innerHTML = vencidos.map(t => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #feb2b2;">
      <div>
        <strong style="font-size:13px">${t.cliente}</strong>
        <span style="font-size:11px;color:#718096;margin-left:8px">${t.tipo} • Nº ${t.numero} • ${fmtDate(t.vencimento)}</span>
      </div>
      <div style="text-align:right">
        <strong style="color:#e53e3e">${fmt(t.valorCorrigido)}</strong>
        <span style="font-size:11px;color:#718096;display:block">${Math.abs(t.diasAVencer)}d atraso</span>
      </div>
    </div>`).join('');
}

function toggleVencidosPanel() {
  S.vencidosPanelOpen = !S.vencidosPanelOpen;
  $('vencidos-panel').classList.toggle('open', S.vencidosPanelOpen);
}

function renderBarChart(calcs) {
  // Group by month
  const monthMap = {};
  calcs.forEach(t => {
    const mk = getMonthKey(t.vencimento);
    if (!monthMap[mk]) monthMap[mk] = { recebido:0, vencido:0, ontime:0 };
    if (t.situacao === 'PAGO') monthMap[mk].recebido += t.valorPago || t.valor;
    else if (t.situacao === 'VENCIDO') monthMap[mk].vencido += t.valorCorrigido;
    else monthMap[mk].ontime += t.valor;
  });
  const labels = Object.keys(monthMap).sort().map(formatMonthLabel);
  const recs = Object.keys(monthMap).sort().map(k => monthMap[k].recebido);
  const vencs = Object.keys(monthMap).sort().map(k => monthMap[k].vencido);
  const ontimes = Object.keys(monthMap).sort().map(k => monthMap[k].ontime);

  const ctx = $('chartBar').getContext('2d');
  if (chartBar) chartBar.destroy();
  chartBar = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label:'Recebido', data:recs, backgroundColor:'rgba(79,172,254,.75)', borderRadius:4 },
        { label:'Vencido', data:vencs, backgroundColor:'rgba(252,129,129,.75)', borderRadius:4 },
        { label:'No Prazo', data:ontimes, backgroundColor:'rgba(104,211,145,.75)', borderRadius:4 },
      ]
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      plugins: { legend:{ position:'top', labels:{ font:{ family:'Poppins', size:11 } } } },
      scales: {
        x: { grid:{ display:false }, ticks:{ font:{ family:'Poppins', size:10 } } },
        y: { grid:{ color:'#f0f4f8' }, ticks:{ font:{ family:'Poppins', size:10 }, callback: v => `R$ ${(v/1000).toFixed(1)}k` } }
      }
    }
  });
}

function renderTiposChart(calcs) {
  const tipos = ['Duplicata','Caderno','Cheque','Boleto','Outros'];
  const cores = ['#4facfe','#43e97b','#fa709a','#a18cd1','#fda085'];
  const counts = tipos.map(tipo => calcs.filter(t => tipoNorm(t.tipo) === tipo).length);

  const ctx = $('chartTipos').getContext('2d');
  if (chartTipos) chartTipos.destroy();
  chartTipos = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: tipos,
      datasets: [{ data:counts, backgroundColor:cores, borderWidth:2, borderColor:'#fff', hoverOffset:6 }]
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      plugins: { legend:{ display:false }, tooltip:{ callbacks:{ label: ctx => ` ${ctx.label}: ${ctx.parsed}` } } },
      cutout:'62%'
    }
  });

  const legend = $('tipos-legend');
  legend.innerHTML = tipos.map((t,i) => `
    <span><i style="background:${cores[i]}"></i>${t}: <strong>${counts[i]}</strong></span>`).join('');
}

/* ================================================================
   TÍTULOS
   ================================================================ */
function setTitulosFilter(filter) {
  S.titulosFilter = filter;
  document.querySelectorAll('#titulos-filter-tabs .filter-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });
  renderTitulos();
}

function renderTitulos() {
  let calcs = S.titulos.map(calcTitulo);
  if (S.titulosMonth) calcs = calcs.filter(t => getMonthKey(t.vencimento) === S.titulosMonth);

  const all = calcs;
  const venc = calcs.filter(t => t.situacao === 'VENCIDO');
  const ontime = calcs.filter(t => t.situacao === 'NO PRAZO');
  const pagos = calcs.filter(t => t.situacao === 'PAGO');

  $('cnt-all').textContent = all.length;
  $('cnt-vencido').textContent = venc.length;
  $('cnt-ontime').textContent = ontime.length;
  $('cnt-pago').textContent = pagos.length;

  let list = S.titulosFilter === 'vencido' ? venc
    : S.titulosFilter === 'ontime' ? ontime
    : S.titulosFilter === 'pago' ? pagos
    : all;

  list = list.sort((a,b) => a.vencimento.localeCompare(b.vencimento));

  const grid = $('titulos-grid');
  if (!list.length) {
    grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:#718096;padding:32px">Nenhum título encontrado.</p>`;
    return;
  }
  grid.innerHTML = list.map(t => {
    const cls = t.situacao === 'VENCIDO' ? 'overdue' : t.situacao === 'PAGO' ? 'paid' : 'ontime';
    const badge = t.situacao === 'VENCIDO'
      ? `<span class="status-badge overdue">⚠️ ${Math.abs(t.diasAVencer)}d atraso</span>`
      : t.situacao === 'PAGO'
      ? `<span class="status-badge paid">✅ Pago</span>`
      : `<span class="status-badge pending">⏳ ${t.diasAVencer}d p/ vencer</span>`;
    const propName = getPropName(t.proprietario);
    return `<div class="titulo-card ${cls}">
      <div class="titulo-header">
        <span class="titulo-num">Nº ${t.numero}</span>
        ${badge}
      </div>
      <div class="titulo-client">${t.cliente}</div>
      <div class="titulo-tipo">${t.tipo}</div>
      <div class="titulo-prop">📁 ${propName}</div>
      <div class="titulo-details">
        <span>📅 ${fmtDate(t.vencimento)}</span>
        ${t.telefone ? `<span>📱 ${t.telefone}</span>` : ''}
      </div>
      <div class="titulo-value">${fmt(t.situacao === 'VENCIDO' ? t.valorCorrigido : t.valor)}</div>
      ${t.situacao === 'VENCIDO' ? `<div style="font-size:11px;color:#e53e3e;margin-bottom:8px">Juros: ${fmt(t.valorJuros)} | Original: ${fmt(t.valor)}</div>` : ''}
      <div class="titulo-actions">
        <button class="btn-sm edit" onclick="editTitulo('${t.id}')">✏️ Editar</button>
        ${t.situacao !== 'PAGO' ? `<button class="btn-sm pay" onclick="openPagar('${t.id}')">💰 Pagar</button>` : ''}
        ${t.telefone ? `<button class="btn-sm charge" onclick="cobrarWA('${t.id}')">📲 Cobrar</button>` : ''}
      </div>
    </div>`;
  }).join('');
}

function openModalTitulo() {
  S.editingTituloId = null;
  $('modal-titulo-title').textContent = '➕ Novo Título';
  // Fill defaults
  $('mt-emissao').value = today();
  $('mt-vencimento').value = '';
  $('mt-valor').value = '';
  $('mt-numero').value = Math.max(0, ...S.titulos.map(t => t.numero)) + 1;
  $('mt-obs').value = '';
  // Fill selects
  fillTituloSelects();
  $('modal-titulo').classList.add('open');
}

function editTitulo(id) {
  // Require PIN verification before editing
  S._pendingEditId = id;
  const pinInput = $('edit-pin-input');
  if (pinInput) pinInput.value = '';
  const errDiv = $('pin-edit-error');
  if (errDiv) errDiv.style.display = 'none';
  $('modal-pin-edit').classList.add('open');
  setTimeout(() => { if (pinInput) pinInput.focus(); }, 100);
}
function _doEditTitulo(id) {
  const t = S.titulos.find(x => x.id === id);
  if (!t) return;
  S.editingTituloId = id;
  $('modal-titulo-title').textContent = '✏️ Editar Título';
  fillTituloSelects();
  $('mt-numero').value = t.numero;
  $('mt-tipo').value = t.tipo;
  $('mt-cliente').value = t.clienteId;
  $('mt-telefone').value = t.telefone;
  $('mt-emissao').value = t.dataEmissao;
  $('mt-vencimento').value = t.vencimento;
  $('mt-valor').value = t.valor;
  $('mt-proprietario').value = t.proprietario;
  $('mt-obs').value = t.obs || '';
  $('modal-titulo').classList.add('open');
}

function fillTituloSelects() {
  const cSel = $('mt-cliente');
  cSel.innerHTML = '<option value="">Selecione o cliente</option>';
  S.clientes.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.nome;
    cSel.appendChild(opt);
  });
  const pSel = $('mt-proprietario');
  pSel.innerHTML = '';
  S.proprietarios.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.nome;
    pSel.appendChild(opt);
  });
}

function fillTituloPhone() {
  const cId = $('mt-cliente').value;
  const c = S.clientes.find(x => x.id === cId);
  if (c) $('mt-telefone').value = c.telefone || '';
}

function closeModalTitulo() { $('modal-titulo').classList.remove('open'); }

function salvarTitulo() {
  const cId = $('mt-cliente').value;
  const cliente = S.clientes.find(x => x.id === cId);
  const venc = $('mt-vencimento').value;
  const valor = parseFloat($('mt-valor').value);
  if (!cId || !venc || isNaN(valor) || valor <= 0) {
    alert('Preencha: Cliente, Vencimento e Valor.'); return;
  }
  const data = {
    numero: parseInt($('mt-numero').value) || (Math.max(0, ...S.titulos.map(t=>t.numero)) + 1),
    tipo: $('mt-tipo').value,
    cliente: cliente ? cliente.nome : '',
    clienteId: cId,
    telefone: $('mt-telefone').value,
    dataEmissao: $('mt-emissao').value || today(),
    vencimento: venc,
    valor,
    proprietario: $('mt-proprietario').value || (S.proprietarios[0]?.id || ''),
    obs: $('mt-obs').value,
  };
  if (S.editingTituloId) {
    const idx = S.titulos.findIndex(x => x.id === S.editingTituloId);
    S.titulos[idx] = { ...S.titulos[idx], ...data };
  } else {
    S.titulos.push({ id: genId(), ...data });
  }
  closeModalTitulo();
  renderTitulos();
  buildDashboardMonthBar();
  buildTitulosMonthBar();
}

function openPagar(id) {
  S.pagandoTituloId = id;
  const t = S.titulos.find(x => x.id === id);
  if (!t) return;
  const tc = calcTitulo(t);
  $('pg-valor').value = tc.valorCorrigido.toFixed(2);
  $('pg-data').value = today();
  // Fill forma pagamento select
  const fSel = $('pg-forma');
  fSel.innerHTML = '';
  S.formasPagamento.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f; opt.textContent = f;
    fSel.appendChild(opt);
  });
  // Fill recebido por
  const rSel = $('pg-recebido-por');
  rSel.innerHTML = '';
  S.usuarios.forEach(u => {
    const opt = document.createElement('option');
    opt.value = u.nome; opt.textContent = u.nome;
    rSel.appendChild(opt);
  });
  if (S.currentUser) rSel.value = S.currentUser.nome;
  $('modal-pagar').classList.add('open');
}

function closeModalPagar() { $('modal-pagar').classList.remove('open'); }

function confirmarPagamento() {
  const id = S.pagandoTituloId;
  if (!id) return;
  const idx = S.titulos.findIndex(x => x.id === id);
  if (idx === -1) return;
  S.titulos[idx].dataPagamento = $('pg-data').value || today();
  S.titulos[idx].valorPago = parseFloat($('pg-valor').value) || S.titulos[idx].valor;
  S.titulos[idx].recebidoPor = $('pg-recebido-por').value;
  S.titulos[idx].formaPagamento = $('pg-forma').value;
  closeModalPagar();
  renderTitulos();
  renderDashboard();
}

function cobrarWA(id) {
  const t = S.titulos.find(x => x.id === id);
  if (!t) return;
  const tc = calcTitulo(t);
  const pix = S.chavesPix[0];
  const msg = `Olá${t.cliente ? ', ' + t.cliente.split(' ')[0] : ''}! 😊\n\nInformamos que existe um título em aberto:\n\n📋 Tipo: ${t.tipo}\n💰 Valor: ${fmt(tc.valorCorrigido)}${tc.valorJuros>0?' (inclui juros)':''}\n📅 Vencimento: ${fmtDate(t.vencimento)}\n${pix?`\nPIX para pagamento:\n🔑 ${pix.nome}: ${pix.chave}`:''}\n\nQualquer dúvida, estamos à disposição!`;
  window.open(`https://wa.me/55${t.telefone.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`, '_blank');
}

/* ================================================================
   VENDAS
   ================================================================ */
function populateVendasSelects() {
  const cSel = $('venda-cliente-select');
  cSel.innerHTML = '<option value="">Selecione o cliente</option>';
  S.clientes.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.nome;
    cSel.appendChild(opt);
  });
  const fSel = $('venda-forma');
  fSel.innerHTML = '';
  S.formasPagamento.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f; opt.textContent = f;
    fSel.appendChild(opt);
  });
  const mSel = $('venda-maquininha');
  mSel.innerHTML = '<option value="">Selecione</option>';
  S.maquininhas.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.nome; opt.textContent = m.nome;
    mSel.appendChild(opt);
  });
  calcVendaFinal();
  toggleParcelasVenda();
}

function toggleNovoClienteVenda() {
  const isNovo = $('venda-novo-cliente').checked;
  $('venda-cliente-select').style.display = isNovo ? 'none' : 'block';
  $('venda-cliente-nome').style.display = isNovo ? 'block' : 'none';
}

function toggleParcelasVenda() {
  const forma = $('venda-forma').value.toLowerCase();
  const isCartao = forma.includes('cartão') || forma.includes('credito') || forma.includes('débito');
  $('venda-parcelas-group').style.display = isCartao ? 'block' : 'none';
  $('venda-maquininha-group').style.display = isCartao ? 'block' : 'none';
}

function calcVendaFinal() {
  const valor = parseFloat($('venda-valor').value) || 0;
  const desc = parseFloat($('venda-desconto').value) || 0;
  const tipo = $('venda-desc-tipo').value;
  let final = tipo === '%' ? valor * (1 - desc/100) : valor - desc;
  final = Math.max(0, final);
  $('venda-valor-final').textContent = fmt(final);
}

function salvarVenda() {
  const isNovo = $('venda-novo-cliente').checked;
  const valor = parseFloat($('venda-valor').value);
  if (isNaN(valor) || valor <= 0) { alert('Informe o valor da venda.'); return; }
  const desc = parseFloat($('venda-desconto').value) || 0;
  const tipo = $('venda-desc-tipo').value;
  let final = tipo === '%' ? valor * (1 - desc/100) : valor - desc;
  final = Math.max(0, final);
  const cId = isNovo ? null : $('venda-cliente-select').value;
  const cNome = isNovo ? $('venda-cliente-nome').value.toUpperCase() : (S.clientes.find(x => x.id === cId)?.nome || '');
  if (!cNome) { alert('Informe o cliente.'); return; }
  S.vendas.unshift({
    id: genId(), clienteId: cId, clienteNome: cNome,
    valor, desconto: desc, descontoTipo: tipo,
    valorFinal: final,
    forma: $('venda-forma').value,
    parcelas: parseInt($('venda-parcelas').value) || 1,
    maquininha: $('venda-maquininha').value,
    obs: $('venda-obs').value,
    data: today(),
  });
  limparVenda();
  renderVendas();
  renderDashboard();
}

function limparVenda() {
  $('venda-valor').value = '';
  $('venda-desconto').value = '';
  $('venda-obs').value = '';
  $('venda-novo-cliente').checked = false;
  toggleNovoClienteVenda();
  calcVendaFinal();
}

function toggleVendasDia() {
  const card = $('vendas-dia-card');
  const showing = card.style.display !== 'none';
  card.style.display = showing ? 'none' : 'block';
  if (!showing) renderVendasDia();
}

function renderVendasDia() {
  const td = today();
  const [y,m,d] = td.split('-');
  $('vendas-dia-date').textContent = `${d}/${m}/${y}`;
  const dia = S.vendas.filter(v => v.data === td);
  $('ds-count').textContent = dia.length;
  $('ds-bruto').textContent = fmt(dia.reduce((s,v) => s + v.valor, 0));
  $('ds-desconto').textContent = fmt(dia.reduce((s,v) => s + (v.valor - v.valorFinal), 0));
  $('ds-liquido').textContent = fmt(dia.reduce((s,v) => s + v.valorFinal, 0));
  const list = $('vendas-dia-list');
  if (!dia.length) { list.innerHTML = '<p style="padding:16px;text-align:center;color:#718096;font-size:12px">Nenhuma venda hoje.</p>'; return; }
  list.innerHTML = dia.map(v => `
    <div class="sale-item">
      <span class="sale-client">${v.clienteNome}</span>
      <span class="sale-desc">${v.forma}${v.parcelas > 1 ? ` (${v.parcelas}x)` : ''} ${v.obs ? '• '+v.obs : ''}</span>
      <span class="sale-val">${fmt(v.valorFinal)}</span>
    </div>`).join('');
}

function renderVendas() {
  const list = $('vendas-list');
  const count = $('vendas-count-badge');
  if (!S.vendas.length) {
    list.innerHTML = '<p style="padding:20px;text-align:center;color:#718096;font-size:13px">Nenhuma venda registrada.</p>';
    count.textContent = '0 vendas';
    return;
  }
  count.textContent = `${S.vendas.length} venda(s)`;
  list.innerHTML = S.vendas.slice(0,20).map(v => `
    <div class="sale-item">
      <div style="display:flex;flex-direction:column;gap:1px;flex:1">
        <span class="sale-client">${v.clienteNome}</span>
        <span style="font-size:11px;color:#718096">${fmtDate(v.data)} • ${v.forma}${v.parcelas>1?' ('+v.parcelas+'x)':''}</span>
      </div>
      <div style="text-align:right">
        <span class="sale-val">${fmt(v.valorFinal)}</span>
        ${v.desconto>0?`<span style="font-size:10px;color:#38a169;display:block">-${v.descontoTipo==='%'?v.desconto+'%':fmt(v.desconto)}</span>`:''}
      </div>
    </div>`).join('');
}

/* ================================================================
   CLIENTES
   ================================================================ */
function initClienteForm() {
  $('cf-data-cad').value = today();
  renderClientes();
}

function openClienteForm() {
  S.editingClienteId = null;
  $('cliente-form-title').textContent = '➕ Novo Cliente';
  $('btn-cancel-cliente').style.display = 'none';
  limparClienteForm();
}

function closeClienteForm() {
  S.editingClienteId = null;
  $('cliente-form-title').textContent = '➕ Novo Cliente';
  $('btn-cancel-cliente').style.display = 'none';
  limparClienteForm();
}

function limparClienteForm() {
  ['cf-nome','cf-apelido','cf-email','cf-cpf','cf-logradouro','cf-numero-end','cf-bairro','cf-cidade','cf-indicacao'].forEach(id => { if ($(id)) $(id).value = ''; });
  $('cf-telefone').value = '';
  $('cf-nasc').value = '';
  $('cf-cep').value = '';
  $('cf-estado').value = 'SP';
  $('cf-data-cad').value = today();
}

function salvarCliente() {
  const nome = $('cf-nome').value.trim().toUpperCase();
  if (!nome) { alert('Informe o nome do cliente.'); return; }
  const data = {
    nome,
    apelido: $('cf-apelido').value.trim(),
    telefone: $('cf-telefone').value.replace(/\D/g,''),
    email: $('cf-email').value.trim(),
    dataNascimento: $('cf-nasc').value,
    cpfCnpj: $('cf-cpf').value.trim(),
    cep: $('cf-cep').value.trim(),
    logradouro: $('cf-logradouro').value.trim(),
    numero: $('cf-numero-end').value.trim(),
    bairro: $('cf-bairro').value.trim(),
    cidade: $('cf-cidade').value.trim(),
    estado: $('cf-estado').value,
    dataCadastro: $('cf-data-cad').value || today(),
    indicacao: $('cf-indicacao').value.trim(),
  };
  if (S.editingClienteId) {
    const idx = S.clientes.findIndex(x => x.id === S.editingClienteId);
    S.clientes[idx] = { ...S.clientes[idx], ...data };
    S.editingClienteId = null;
    $('cliente-form-title').textContent = '➕ Novo Cliente';
    $('btn-cancel-cliente').style.display = 'none';
  } else {
    S.clientes.push({ id: genId(), ...data });
  }
  limparClienteForm();
  renderClientes();
}

function editCliente(id) {
  const c = S.clientes.find(x => x.id === id);
  if (!c) return;
  S.editingClienteId = id;
  $('cliente-form-title').textContent = '✏️ Editar Cliente';
  $('btn-cancel-cliente').style.display = 'inline-block';
  $('cf-nome').value = c.nome;
  $('cf-apelido').value = c.apelido;
  $('cf-telefone').value = c.telefone;
  $('cf-email').value = c.email;
  $('cf-nasc').value = c.dataNascimento;
  $('cf-cpf').value = c.cpfCnpj;
  $('cf-cep').value = c.cep;
  $('cf-logradouro').value = c.logradouro;
  $('cf-numero-end').value = c.numero;
  $('cf-bairro').value = c.bairro;
  $('cf-cidade').value = c.cidade;
  $('cf-estado').value = c.estado;
  $('cf-data-cad').value = c.dataCadastro;
  $('cf-indicacao').value = c.indicacao;
  document.querySelector('#tab-clientes').scrollIntoView({ behavior:'smooth', block:'start' });
}

function excluirCliente(id) {
  if (!confirm('Remover este cliente?')) return;
  S.clientes = S.clientes.filter(x => x.id !== id);
  renderClientes();
}

function enviarTitulosWA(id) {
  const c = S.clientes.find(x => x.id === id);
  if (!c || !c.telefone) { alert('Cliente sem telefone cadastrado.'); return; }
  const titsCli = S.titulos.filter(t => t.clienteId === id).map(calcTitulo);
  const abertos = titsCli.filter(t => t.situacao !== 'PAGO');
  if (!abertos.length) { alert('Cliente sem títulos em aberto.'); return; }
  const pix = S.chavesPix[0];
  const total = abertos.reduce((s,t) => s + t.valorCorrigido, 0);
  const lista = abertos.map(t => `  • ${t.tipo} Nº${t.numero} — ${fmtDate(t.vencimento)} — ${fmt(t.valorCorrigido)}${t.situacao==='VENCIDO'?' ⚠️':''}`).join('\n');
  const msg = `Olá, ${c.apelido || c.nome.split(' ')[0]}! 😊\n\nSeguem seus títulos em aberto:\n\n${lista}\n\n💰 Total: ${fmt(total)}${pix?`\n\nPIX: ${pix.nome} — ${pix.chave}`:''}\n\nQualquer dúvida, estamos à disposição!`;
  window.open(`https://wa.me/55${c.telefone.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`, '_blank');
}

function renderClientes() {
  const q = ($('clientes-search')?.value || '').toLowerCase();
  const filtered = q
    ? S.clientes.filter(c => c.nome.toLowerCase().includes(q) || (c.apelido||'').toLowerCase().includes(q) || c.telefone.includes(q))
    : S.clientes;
  const tbody = $('clientes-body');
  tbody.innerHTML = '';
  filtered.forEach(c => {
    tbody.innerHTML += `<tr>
      <td><strong>${c.nome}</strong>${c.apelido?`<br><span style="font-size:11px;color:#718096">${c.apelido}</span>`:''}</td>
      <td>${c.telefone || '—'}</td>
      <td>${c.cidade ? c.cidade + (c.estado?'/'+c.estado:'') : '—'}</td>
      <td>${fmtDate(c.dataCadastro)}</td>
      <td>
        <div class="actions-cell">
          <button class="btn-action edit" title="Editar" onclick="editCliente('${c.id}')">✏️</button>
          ${c.telefone ? `<button class="btn-action whatsapp" title="WhatsApp" onclick="enviarTitulosWA('${c.id}')">📲</button>` : ''}
          <button class="btn-action del" title="Excluir" onclick="excluirCliente('${c.id}')">🗑️</button>
        </div>
      </td>
    </tr>`;
  });
  $('clientes-count').textContent = `${filtered.length} cliente(s)`;
}

function maskPhone(el) {
  let v = el.value.replace(/\D/g,'').slice(0,11);
  if (v.length > 10) v = v.replace(/^(\d{2})(\d{5})(\d{4}).*/,'($1) $2-$3');
  else if (v.length > 6) v = v.replace(/^(\d{2})(\d{4})(\d*).*/,'($1) $2-$3');
  else if (v.length > 2) v = v.replace(/^(\d{2})(\d*).*/,'($1) $2');
  el.value = v;
}

function maskCep(el) {
  let v = el.value.replace(/\D/g,'').slice(0,8);
  if (v.length > 5) v = v.replace(/^(\d{5})(\d*)/,'$1-$2');
  el.value = v;
}

function buscarCep() {
  const cep = $('cf-cep').value.replace(/\D/g,'');
  if (cep.length !== 8) { alert('CEP inválido.'); return; }
  fetch(`https://viacep.com.br/ws/${cep}/json/`)
    .then(r => r.json())
    .then(d => {
      if (d.erro) { alert('CEP não encontrado.'); return; }
      $('cf-logradouro').value = d.logradouro || '';
      $('cf-bairro').value = d.bairro || '';
      $('cf-cidade').value = d.localidade || '';
      $('cf-estado').value = d.uf || '';
    })
    .catch(() => alert('Erro ao buscar CEP. Verifique sua conexão.'));
}

/* ================================================================
   PROMISSÓRIAS
   ================================================================ */
function renderPromissorias() {
  const cSel = $('prom-cliente');
  cSel.innerHTML = '<option value="">Selecione o cliente</option>';
  S.clientes.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id; opt.textContent = c.nome;
    cSel.appendChild(opt);
  });
  $('prom-emissao').value = today();
  const list = $('prom-list');
  $('prom-count').textContent = S.promissorias.length;
  if (!S.promissorias.length) {
    list.innerHTML = '<p style="padding:20px;text-align:center;color:#718096;font-size:13px">Nenhuma promissória emitida.</p>';
    return;
  }
  list.innerHTML = S.promissorias.map(p => `
    <div class="prom-item">
      <div style="display:flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:10px;background:rgba(79,172,254,.1);flex-shrink:0">
        <span style="font-size:16px">📜</span>
      </div>
      <div class="prom-info">
        <span class="prom-num">Nº ${p.numero}</span>
        <span class="prom-name">${p.clienteNome}</span>
        <span style="font-size:11px;color:#718096">${p.motivo || ''}</span>
      </div>
      <div class="prom-details">
        <span>${fmt(p.valor)}</span>
        <span class="status-badge pending" style="font-size:10px">Venc: ${fmtDate(p.vencimento)}</span>
      </div>
      <div class="prom-acts">
        <button class="btn-sm" onclick="imprimirPromissoria('${p.id}')">🖨️</button>
        <button class="btn-action del" onclick="excluirPromissoria('${p.id}')">🗑️</button>
      </div>
    </div>`).join('');
}

function emitirPromissoria() {
  const cId = $('prom-cliente').value;
  const valor = parseFloat($('prom-valor').value);
  const venc = $('prom-vencimento').value;
  if (!cId || isNaN(valor) || valor <= 0 || !venc) { alert('Preencha: Cliente, Valor e Vencimento.'); return; }
  const cliente = S.clientes.find(x => x.id === cId);
  S.promissorias.unshift({
    id: genId(),
    numero: (S.promissorias.length + 1),
    clienteId: cId,
    clienteNome: cliente?.nome || '',
    valor,
    vencimento: venc,
    motivo: $('prom-motivo').value,
    cidade: $('prom-cidade').value,
    emissao: $('prom-emissao').value || today(),
  });
  limparPromissoria();
  renderPromissorias();
}

function limparPromissoria() {
  $('prom-valor').value = '';
  $('prom-vencimento').value = '';
  $('prom-motivo').value = '';
}

function imprimirPromissoria(id) {
  const p = S.promissorias.find(x => x.id === id);
  if (!p) return;
  const win = window.open('', '_blank', 'width=800,height=600');
  const cliente = S.clientes.find(c => c.id === p.clienteId);
  const valorExt = p.valor.toFixed(2).replace('.',',');
  win.document.write(`<!DOCTYPE html><html><head><title>Promissória Nº ${p.numero}</title>
<style>
  body { font-family: 'Times New Roman', serif; padding: 30px; font-size:14px; }
  h2 { text-align:center; font-size:22px; border-bottom: 2px solid #000; padding-bottom:10px; }
  .field { margin: 12px 0; }
  .line { border-bottom:1px solid #000; display:inline-block; min-width:200px; }
  .footer { margin-top:40px; display:flex; justify-content:space-between; }
  .assinatura { border-top:1px solid #000; padding-top:5px; text-align:center; width:220px; }
</style>
</head><body>
<h2>NOTA PROMISSÓRIA Nº ${p.numero}</h2>
<div class="field"><strong>Valor: R$ ${valorExt}</strong></div>
<div class="field">Vencimento: ${fmtDate(p.vencimento)}</div>
<div class="field">Ao(s) <span class="line">${fmtDate(p.vencimento)}</span> pagamos por esta única via de NOTA PROMISSÓRIA a</div>
<div class="field">Credor: <span class="line">${S.credor.nome || '_______________'}</span> CPF/CNPJ: ${S.credor.cpfCnpj || '___________'}</div>
<div class="field">a importância de <strong>R$ ${valorExt}</strong></div>
<div class="field">Devedor: <span class="line">${p.clienteNome}</span></div>
${cliente ? `<div class="field">CPF/CNPJ: ${cliente.cpfCnpj || '___________'}</div>
<div class="field">Endereço: ${[cliente.logradouro, cliente.numero, cliente.bairro, cliente.cidade, cliente.estado].filter(Boolean).join(', ') || '___________'}</div>` : ''}
<div class="field">Emissão: ${fmtDate(p.emissao)} — ${p.cidade || S.credor.cidadeEstado || '___'}</div>
${p.motivo ? `<div class="field">Motivo: ${p.motivo}</div>` : ''}
<div class="footer">
  <div class="assinatura"><br>Devedor<br>${p.clienteNome}</div>
  <div class="assinatura"><br>Credor<br>${S.credor.nome || '_______________'}</div>
</div>
</body></html>`);
  win.document.close();
  win.print();
}

function excluirPromissoria(id) {
  if (!confirm('Excluir esta promissória?')) return;
  S.promissorias = S.promissorias.filter(x => x.id !== id);
  renderPromissorias();
}

/* ================================================================
   RELATÓRIOS
   ================================================================ */
function buildRelatorioSelects() {
  const pSel = $('rf-proprietario');
  const opts = pSel.querySelector('option[value=""]');
  pSel.innerHTML = '';
  if (opts) pSel.appendChild(opts);
  else { const o = document.createElement('option'); o.value=''; o.textContent='Todos'; pSel.appendChild(o); }
  S.proprietarios.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id; opt.textContent = p.nome;
    pSel.appendChild(opt);
  });

  const cSel = $('rf-cliente');
  cSel.innerHTML = '<option value="">Todos</option>';
  S.clientes.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.nome; opt.textContent = c.nome;
    cSel.appendChild(opt);
  });
}

function limparFiltrosRelat() {
  $('rf-proprietario').value = '';
  $('rf-tipo').value = '';
  $('rf-data-ini').value = '';
  $('rf-data-fim').value = '';
  $('rf-cliente').value = '';
  renderRelatorios();
}

function renderRelatorios() {
  const fProp = $('rf-proprietario').value;
  const fTipo = $('rf-tipo').value;
  const fIni = $('rf-data-ini').value;
  const fFim = $('rf-data-fim').value;
  const fCli = $('rf-cliente').value;

  const calcs = S.titulos.map(calcTitulo).filter(t => {
    if (fProp && t.proprietario !== fProp) return false;
    if (fTipo && tipoNorm(t.tipo) !== fTipo) return false;
    if (fCli && t.cliente !== fCli) return false;
    const dateRef = t.dataPagamento || t.vencimento;
    if (fIni && dateRef < fIni) return false;
    if (fFim && dateRef > fFim) return false;
    return true;
  });

  const vencidos = calcs.filter(t => t.situacao === 'VENCIDO');
  const ontime = calcs.filter(t => t.situacao === 'NO PRAZO');
  const pagos = calcs.filter(t => t.situacao === 'PAGO');

  $('rl-vencidos').textContent = vencidos.length;
  $('rl-ontime').textContent = ontime.length;
  $('rl-pagos').textContent = pagos.length;
  $('rl-total-val').textContent = fmt(calcs.reduce((s,t) => s + t.valor, 0));
  $('rl-total-pago').textContent = fmt(pagos.reduce((s,t) => s + (t.valorPago || 0), 0));

  // Group by cliente
  const groups = {};
  calcs.forEach(t => {
    (groups[t.cliente] = groups[t.cliente] || []).push(t);
  });
  const sortedClients = Object.keys(groups).sort();

  const body = $('relatorios-body');
  if (!calcs.length) {
    body.innerHTML = `<div style="text-align:center;padding:32px;color:#718096">Nenhum título encontrado com os filtros aplicados.</div>`;
    return;
  }

  body.innerHTML = sortedClients.map(cli => {
    const items = groups[cli];
    const totalCli = items.reduce((s,t) => s + t.valor, 0);
    const rows = items.map(t => {
      const c = t.situacao === 'VENCIDO' ? 'val-neg' : t.situacao === 'PAGO' ? 'val-pos' : '';
      const badge = t.situacao === 'VENCIDO' ? '<span class="status-badge overdue">Vencido</span>'
        : t.situacao === 'PAGO' ? '<span class="status-badge paid">Pago</span>'
        : '<span class="status-badge pending">No Prazo</span>';
      const waBtn = t.telefone
        ? `<button class="btn-sm whatsapp-btn" onclick="cobrarWA('${t.id}')">📲 WA</button>`
        : '';
      return `<tr>
        <td>Nº ${t.numero}</td>
        <td><span class="badge-tag gray">${t.tipo}</span></td>
        <td>${getPropName(t.proprietario)}</td>
        <td>${fmtDate(t.vencimento)}</td>
        <td class="${c}">${fmt(t.situacao === 'VENCIDO' ? t.valorCorrigido : t.valor)}</td>
        <td>${badge}</td>
        <td>${waBtn}</td>
      </tr>`;
    }).join('');
    return `<div class="client-group">
      <div class="client-group-header">
        <h4>${cli}</h4>
        <span class="cg-meta">${items.length} título(s) • Total: ${fmt(totalCli)}</span>
      </div>
      <div class="client-group-body">
        <table class="data-table">
          <thead><tr><th>Nº</th><th>Tipo</th><th>Proprietário</th><th>Vencimento</th><th>Valor</th><th>Situação</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
  }).join('');
}

function gerarPDF() {
  alert('Em uma versão real, o PDF seria gerado com jsPDF/autoTable com os filtros aplicados.\n\nEste protótipo não inclui geração de PDF real — funcionalidade completa no sistema React + Tauri.');
}

/* ================================================================
   CONFIGURAÇÕES
   ================================================================ */
function setConfigSub(sub) {
  S.configSubTab = sub;
  document.querySelectorAll('#tab-config .sub-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.sub === sub);
  });
  document.querySelectorAll('#tab-config .sub-content').forEach(el => {
    el.classList.toggle('active', el.id === `sub-${sub}`);
  });
  renderConfigSub(sub);
  // Update avatar context for sub-tab
  fecharAvatarTooltip && fecharAvatarTooltip();
}

function renderConfig() {
  renderConfigSub(S.configSubTab);
  // Load credor
  $('credor-nome').value = S.credor.nome;
  $('credor-cpf').value = S.credor.cpfCnpj;
  $('credor-cidade').value = S.credor.cidadeEstado;
  $('fin-taxa').value = (S.taxa * 100).toFixed(1);
  $('sis-pasta').value = S.caminhoSalvarDados;
  $('idle-minutes').value = S.idleMinutes;
  $('idle-toggle').checked = S.idleActive;
  $('idle-time-group').style.opacity = S.idleActive ? '1' : '0.45';
  renderAlertaPhones();
}

function renderConfigSub(sub) {
  if (sub === 'cadastro') { renderUsuarios(); renderFuncionarios(); renderMaquininhas(); renderProprietarios(); renderPermNivel(); }
  if (sub === 'financeiro') { renderPix(); renderFormas(); }
  if (sub === 'sistema') { renderLog(); }
  // Load gmail config if saved
  if (sub === 'alertas' && S.gmailConfig) {
    const g = S.gmailConfig;
    setTimeout(() => {
      if ($('gmail-endereco')) $('gmail-endereco').value = g.endereco || '';
      if ($('gmail-assunto')) $('gmail-assunto').value = g.assunto || '';
      if ($('gmail-corpo')) $('gmail-corpo').value = g.corpo || '';
    }, 50);
  }
}

/* Usuários */
function renderUsuarios() {
  const el = $('usuarios-list');
  el.innerHTML = S.usuarios.map(u => `
    <div class="config-list-item">
      <div class="item-info">
        <div class="item-name">${u.nome}</div>
        <div class="item-meta">${u.nivel} ${u.master ? '• Master' : ''}</div>
      </div>
      ${!u.master ? `<div class="item-actions">
        <button class="btn-sm edit" onclick="editUsuario('${u.id}')">✏️</button>
        <button class="btn-action del" onclick="removerUsuario('${u.id}')">🗑️</button>
      </div>` : '<span class="badge-tag blue">Master</span>'}
    </div>`).join('');
}

function addUsuario() {
  const form = $('usuario-form');
  form.style.display = form.style.display === 'none' ? 'block' : 'none';
  $('uf-nome').value = '';
  $('uf-pin').value = '';
  $('uf-nivel').value = 'USUARIO';
}
function cancelarUsuario() { $('usuario-form').style.display = 'none'; }
function salvarUsuario() {
  const nome = $('uf-nome').value.trim();
  const pin = $('uf-pin').value;
  const nivel = $('uf-nivel').value;
  if (!nome || pin.length !== 4) { alert('Nome e PIN (4 dígitos) são obrigatórios.'); return; }
  S.usuarios.push({
    id: genId(), nome, nivel, pin, master: nivel === 'MASTER',
    perms: {
      titulos: $('p-titulos').checked, clientes: $('p-clientes').checked,
      vendas: $('p-vendas').checked, relat: $('p-relat').checked,
      config: $('p-config').checked, pagar: $('p-pagar').checked,
      excluir: $('p-excluir').checked, valores: $('p-valores').checked,
    }
  });
  $('usuario-form').style.display = 'none';
  renderUsuarios();
  initLoginSelect();
}
function editUsuario(id) { /* simplified - just open form */ addUsuario(); $('uf-nome').value = S.usuarios.find(u=>u.id===id)?.nome||''; }
function removerUsuario(id) {
  if (S.usuarios.find(u=>u.id===id)?.master) { alert('Não é possível remover o usuário Master.'); return; }
  if (!confirm('Remover usuário?')) return;
  S.usuarios = S.usuarios.filter(u => u.id !== id);
  renderUsuarios();
}

/* Funcionários */
function renderFuncionarios() {
  const el = $('funcionarios-list');
  el.innerHTML = S.funcionarios.length ? S.funcionarios.map(f => `
    <div class="config-list-item">
      <div class="item-info">
        <div class="item-name">${f.nome}</div>
        <div class="item-meta">${f.cargo}</div>
      </div>
      <button class="btn-action del" onclick="removerFuncionario('${f.id}')">🗑️</button>
    </div>`).join('')
    : '<p style="padding:12px 16px;font-size:12px;color:#718096">Nenhum funcionário cadastrado.</p>';
}
function addFuncionario() { const f=$('func-form'); f.style.display=f.style.display==='none'?'block':'none'; $('ff-nome').value=''; $('ff-cargo').value=''; }
function cancelarFuncionario() { $('func-form').style.display='none'; }
function salvarFuncionario() {
  const nome=$('ff-nome').value.trim(); const cargo=$('ff-cargo').value.trim();
  if (!nome) { alert('Nome obrigatório.'); return; }
  S.funcionarios.push({id:genId(), nome, cargo});
  $('func-form').style.display='none'; renderFuncionarios();
}
function removerFuncionario(id) { if(!confirm('Remover?')) return; S.funcionarios=S.funcionarios.filter(f=>f.id!==id); renderFuncionarios(); }

/* Maquininhas */
function renderMaquininhas() {
  const el = $('maquininhas-list');
  el.innerHTML = S.maquininhas.length ? S.maquininhas.map(m => `
    <div class="config-list-item">
      <div class="item-info"><div class="item-name">💳 ${m.nome}</div></div>
      <button class="btn-action del" onclick="removerMaquininha('${m.id}')">🗑️</button>
    </div>`).join('')
    : '<p style="padding:12px 16px;font-size:12px;color:#718096">Nenhuma maquininha.</p>';
}
function addMaquininha() { const f=$('maq-form'); f.style.display=f.style.display==='none'?'block':'none'; $('mf-nome').value=''; }
function cancelarMaquininha() { $('maq-form').style.display='none'; }
function salvarMaquininha() {
  const nome=$('mf-nome').value.trim();
  if (!nome) { alert('Nome obrigatório.'); return; }
  S.maquininhas.push({id:genId(), nome});
  $('maq-form').style.display='none'; renderMaquininhas();
}
function removerMaquininha(id) { if(!confirm('Remover?')) return; S.maquininhas=S.maquininhas.filter(m=>m.id!==id); renderMaquininhas(); }

/* Proprietários */
function renderProprietarios() {
  const el = $('proprietarios-list');
  el.innerHTML = S.proprietarios.map(p => `
    <div class="config-list-item">
      <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${p.cor};flex-shrink:0"></span>
      <div class="item-info" style="margin-left:4px">
        <div class="item-name">${p.nome}</div>
      </div>
      <button class="btn-action del" onclick="removerProprietario('${p.id}')">🗑️</button>
    </div>`).join('');
}
function addProprietario() { const f=$('prop-form'); f.style.display=f.style.display==='none'?'block':'none'; $('pf-nome').value=''; }
function cancelarProprietario() { $('prop-form').style.display='none'; }
function salvarProprietario() {
  const nome=$('pf-nome').value.trim();
  if (!nome) { alert('Nome obrigatório.'); return; }
  S.proprietarios.push({id:genId(), nome, cor:$('pf-cor').value});
  $('prop-form').style.display='none'; renderProprietarios(); buildRelatorioSelects();
}
function removerProprietario(id) {
  if (S.proprietarios.length <= 1) { alert('Deve haver ao menos 1 proprietário.'); return; }
  if (!confirm('Remover proprietário?')) return;
  S.proprietarios = S.proprietarios.filter(p => p.id !== id); renderProprietarios();
}

function salvarCredor() {
  S.credor = { nome:$('credor-nome').value, cpfCnpj:$('credor-cpf').value, cidadeEstado:$('credor-cidade').value };
  alert('Credor salvo!');
}

/* Financeiro */
function renderPix() {
  const el = $('pix-list');
  $('pix-count').textContent = `(${S.chavesPix.length}/5)`;
  el.innerHTML = S.chavesPix.length ? S.chavesPix.map(p => `
    <div class="config-list-item">
      <div class="item-info">
        <div class="item-name">${p.nome}</div>
        <div class="item-meta">${p.chave}</div>
      </div>
      <button class="btn-action del" onclick="removerPix('${p.id}')">🗑️</button>
    </div>`).join('')
    : '<p style="padding:12px 16px;font-size:12px;color:#718096">Nenhuma chave PIX cadastrada.</p>';
}
function addPix() {
  if (S.chavesPix.length >= 5) { alert('Máximo de 5 chaves PIX.'); return; }
  const f=$('pix-form'); f.style.display=f.style.display==='none'?'block':'none'; $('pixf-nome').value=''; $('pixf-chave').value='';
}
function cancelarPix() { $('pix-form').style.display='none'; }
function salvarPix() {
  const nome=$('pixf-nome').value.trim(); const chave=$('pixf-chave').value.trim();
  if (!nome || !chave) { alert('Nome e chave obrigatórios.'); return; }
  S.chavesPix.push({id:genId(), nome, chave});
  $('pix-form').style.display='none'; renderPix();
}
function removerPix(id) { if(!confirm('Remover chave PIX?')) return; S.chavesPix=S.chavesPix.filter(p=>p.id!==id); renderPix(); }

function renderFormas() {
  const el = $('formas-list');
  $('formas-count').textContent = `(${S.formasPagamento.length})`;
  el.innerHTML = S.formasPagamento.length ? S.formasPagamento.map((f,i) => `
    <div class="config-list-item">
      <div class="item-info"><div class="item-name">${f}</div></div>
      <button class="btn-action del" onclick="removerForma(${i})">🗑️</button>
    </div>`).join('')
    : '<p style="padding:12px 16px;font-size:12px;color:#718096">Nenhuma forma.</p>';
}
function addForma() { const f=$('formas-form'); f.style.display=f.style.display==='none'?'block':'none'; $('ff-forma').value=''; }
function cancelarForma() { $('formas-form').style.display='none'; }
function salvarForma() {
  const nome=$('ff-forma').value.trim();
  if (!nome) { alert('Nome obrigatório.'); return; }
  if (S.formasPagamento.includes(nome)) { alert('Já cadastrada.'); return; }
  S.formasPagamento.push(nome);
  $('formas-form').style.display='none'; renderFormas();
}
function removerForma(i) { if(!confirm('Remover?')) return; S.formasPagamento.splice(i,1); renderFormas(); }

function salvarFinanceiro() { S.taxa = (parseFloat($('fin-taxa').value) || 0) / 100; alert('Taxa salva!'); }

/* Alertas */
function renderAlertaPhones() {
  const el = $('alertas-phones-list');
  el.innerHTML = S.telefonesAlerta.map((t,i) => `
    <div style="display:flex;align-items:center;gap:10px">
      <input type="tel" class="form-control" value="${t.numero}" placeholder="Telefone com DDD"
        oninput="S.telefonesAlerta[${i}].numero=this.value.replace(/\\D/g,'')" style="flex:1"/>
      <label class="toggle" title="${t.ativo?'Ativo':'Inativo'}">
        <input type="checkbox" ${t.ativo?'checked':''} onchange="S.telefonesAlerta[${i}].ativo=this.checked" />
        <span class="slider"></span>
      </label>
      ${S.telefonesAlerta.length > 1 ? `<button class="btn-action del" onclick="removeAlertPhone(${i})">🗑️</button>` : ''}
    </div>`).join('');
}
function addAlertPhone() {
  if (S.telefonesAlerta.length >= 5) { alert('Máximo 5 telefones.'); return; }
  S.telefonesAlerta.push({numero:'',ativo:true}); renderAlertaPhones();
}
function removeAlertPhone(i) { S.telefonesAlerta.splice(i,1); renderAlertaPhones(); }
function salvarAlertaEmail() { alert('Configurações de e-mail salvas!'); }

function enviarAlertas() {
  const td = today();
  const amanha = new Date(); amanha.setDate(amanha.getDate()+1);
  const amanhaStr = amanha.toISOString().split('T')[0];
  const titulosAmanha = S.titulos.filter(t => t.vencimento === amanhaStr && !t.dataPagamento);
  if (!titulosAmanha.length) { alert('Nenhum título vence amanhã.'); return; }
  const ativos = S.telefonesAlerta.filter(t => t.ativo && t.numero);
  if (!ativos.length) { alert('Nenhum telefone de alerta ativo.'); return; }
  titulosAmanha.forEach(t => {
    ativos.forEach(tel => {
      const msg = `⚠️ Alerta de Vencimento\n\nCliente: ${t.cliente}\nValor: ${fmt(t.valor)}\nVencimento: ${fmtDate(t.vencimento)} (amanhã)`;
      window.open(`https://wa.me/55${tel.numero.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`, '_blank');
    });
  });
  alert(`${titulosAmanha.length} alerta(s) disparados.`);
}

/* Aparência */
function toggleDarkMode() {
  document.body.style.filter = $('theme-dark').checked ? 'invert(1) hue-rotate(180deg)' : '';
}
function setColor(color, el) {
  document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
  el.classList.add('active');
  document.documentElement.style.setProperty('--grad-main', `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`);
}
function handleLogoUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const box = $('logo-preview-box');
    box.innerHTML = `<img src="${ev.target.result}" style="max-width:100%;max-height:70px;border-radius:6px;object-fit:contain" />`;
    $('sidebar-logo').innerHTML = `<img src="${ev.target.result}" style="width:38px;height:38px;border-radius:8px;object-fit:contain" />`;
  };
  reader.readAsDataURL(file);
}
function removerLogo() {
  $('logo-preview-box').innerHTML = '<div class="logo-placeholder-big">📷<br><small>Clique para enviar</small></div>';
  $('sidebar-logo').textContent = 'ZOOM';
  $('logo-input').value = '';
}

/* Sistema */
function salvarPasta() { S.caminhoSalvarDados = $('sis-pasta').value; alert('Caminho salvo!'); }
function exportarBackup() {
  const data = JSON.stringify({ titulos: S.titulos, clientes: S.clientes, vendas: S.vendas, promissorias: S.promissorias, config: { taxa: S.taxa, proprietarios: S.proprietarios, formasPagamento: S.formasPagamento, chavesPix: S.chavesPix } }, null, 2);
  const blob = new Blob([data], { type:'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `zoom-backup-${today()}.json`;
  a.click(); URL.revokeObjectURL(url);
}
function importarBackup(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const d = JSON.parse(ev.target.result);
      if (d.titulos) S.titulos = d.titulos;
      if (d.clientes) S.clientes = d.clientes;
      if (d.vendas) S.vendas = d.vendas;
      if (d.promissorias) S.promissorias = d.promissorias;
      if (d.config?.taxa) S.taxa = d.config.taxa;
      alert('Backup importado com sucesso!');
      renderDashboard();
    } catch { alert('Arquivo inválido.'); }
  };
  reader.readAsText(file);
}

/* ================================================================
   SIDEBAR TOGGLE (mobile)
   ================================================================ */
function toggleSidebar() {
  const sb = $('sidebar');
  const hb = $('hamburger');
  const ov = $('overlay');
  sb.classList.toggle('open');
  hb.classList.toggle('open');
  ov.classList.toggle('active');
}
function closeSidebar() {
  $('sidebar').classList.remove('open');
  $('hamburger').classList.remove('open');
  $('overlay').classList.remove('active');
}

/* Close modals on overlay click */
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    $('modal-titulo').classList.remove('open');
    $('modal-pagar').classList.remove('open');
    if ($('modal-pin-edit')) $('modal-pin-edit').classList.remove('open');
  }
});

/* ================================================================
   INIT
   ================================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initLoginSelect();
  // Pre-fill login pin on Enter
  $('login-pin').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  // PIN edit on Enter
  const pinEditInput = $('edit-pin-input');
  if (pinEditInput) pinEditInput.addEventListener('keydown', e => { if (e.key === 'Enter') confirmarPinEdit(); });
  // Init avatar
  updateAvatar();
  // Init log with sample entries
  addLog('Sistema', 'INFO', 'Aplicação iniciada');
  renderPermNivel();
});

/* ================================================================
   PIN MODAL PARA EDIÇÃO DE TÍTULOS
   ================================================================ */
function closePinModal() {
  $('modal-pin-edit').classList.remove('open');
  S._pendingEditId = null;
}
function confirmarPinEdit() {
  const pin = $('edit-pin-input').value.trim();
  const errDiv = $('pin-edit-error');

  // Check user permission level
  const userNivel = S.currentUser?.nivel || '';
  const permiteEditar = ['MASTER', 'ADMIN', 'GERENTE'].includes(userNivel.toUpperCase());
  if (!permiteEditar) {
    errDiv.textContent = '⛔ Sem permissão para esta ação.';
    errDiv.style.display = 'block';
    return;
  }
  // Validate PIN against user's PIN
  const userPin = S.currentUser?.pin || '';
  if (pin !== userPin) {
    errDiv.textContent = '❌ PIN incorreto.';
    errDiv.style.display = 'block';
    $('edit-pin-input').value = '';
    $('edit-pin-input').focus();
    return;
  }
  // PIN ok — proceed
  closePinModal();
  addLog(S.currentUser?.nome || 'Usuário', 'EDIÇÃO', `Editar título ID ${S._pendingEditId}`);
  _doEditTitulo(S._pendingEditId);
}

/* ================================================================
   SISTEMA: LOG
   ================================================================ */
S.sysLog = S.sysLog || [];
function addLog(usuario, acao, descricao) {
  const now = new Date();
  const data = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
  S.sysLog.unshift({ data, usuario, acao, descricao });
  if (S.sysLog.length > 200) S.sysLog.pop();
  const body = $('log-body');
  if (body) renderLog();
}
function renderLog() {
  const body = $('log-body');
  if (!body) return;
  if (!S.sysLog.length) {
    body.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#718096;padding:20px">Nenhum registro.</td></tr>';
    return;
  }
  body.innerHTML = S.sysLog.slice(0, 50).map(r =>
    `<tr>
      <td style="white-space:nowrap;font-size:11px">${r.data}</td>
      <td>${r.usuario}</td>
      <td><span class="badge-tag ${r.acao==='EDIÇÃO'?'blue':r.acao==='INFO'?'green':'orange'}" style="font-size:10px">${r.acao}</span></td>
      <td style="font-size:12px">${r.descricao}</td>
    </tr>`
  ).join('');
}
function exportarLog() {
  if (!S.sysLog.length) { alert('Nenhum log para exportar.'); return; }
  const lines = ['Data/Hora;Usuário;Ação;Descrição', ...S.sysLog.map(r => `${r.data};${r.usuario};${r.acao};${r.descricao}`)];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `log_sistema_${new Date().toISOString().slice(0,10)}.csv`; a.click();
}
function limparLog() {
  if (!confirm('Limpar todos os registros de log?')) return;
  S.sysLog = [];
  renderLog();
  addLog(S.currentUser?.nome || 'Sistema', 'INFO', 'Log limpo manualmente');
}

/* ================================================================
   SISTEMA: CHAVE DE LICENÇA
   ================================================================ */
S.licencaAtiva = S.licencaAtiva || false;
function ativarLicenca() {
  const chave = $('chave-licenca').value.trim();
  const statusEl = $('licenca-status');
  // Funcionalidade futura - simula validação
  if (chave.length < 8) {
    alert('Insira uma chave válida (mínimo 8 caracteres).');
    return;
  }
  // Simulated validation - always returns "em breve"
  statusEl.textContent = 'Funcionalidade em breve';
  statusEl.className = 'status-badge inactive';
  statusEl.style.background = '#ed8936';
  statusEl.style.color = 'white';
  statusEl.style.padding = '3px 10px';
  statusEl.style.borderRadius = '20px';
  statusEl.style.fontSize = '11px';
  addLog(S.currentUser?.nome || 'Sistema', 'INFO', 'Tentativa de ativar licença');
}

/* ================================================================
   GMAIL CONFIG
   ================================================================ */
function salvarConfigGmail() {
  const end = $('gmail-endereco').value.trim();
  const assunto = $('gmail-assunto').value.trim();
  const corpo = $('gmail-corpo').value.trim();
  if (!end) { alert('Informe o endereço Gmail.'); return; }
  S.gmailConfig = { endereco: end, assunto, corpo };
  const s = $('gmail-status');
  s.innerHTML = '<div class="toast-success" style="padding:10px 14px;border-radius:8px;background:#f0fff4;border:1px solid #9ae6b4;color:#276749;font-size:12px">✅ Configurações salvas com sucesso!</div>';
  s.style.display = 'block';
  setTimeout(() => { s.style.display = 'none'; }, 3000);
  addLog(S.currentUser?.nome || 'Sistema', 'CONFIG', 'Gmail configurado');
}
function testarEmailGmail() {
  const end = $('gmail-endereco').value.trim();
  const dest = $('gmail-teste-dest').value.trim();
  const s = $('gmail-status');
  if (!end || !dest) {
    s.innerHTML = '<div style="padding:10px 14px;border-radius:8px;background:#fff5f5;border:1px solid #feb2b2;color:#c53030;font-size:12px">❌ Preencha o endereço Gmail e o destinatário de teste.</div>';
    s.style.display = 'block'; return;
  }
  // Prototype simulation - open mailto link
  const assunto = encodeURIComponent($('gmail-assunto').value || 'Teste de envio');
  const corpo = encodeURIComponent($('gmail-corpo').value || 'Mensagem de teste do sistema Controle ZOOM.');
  window.open(`mailto:${dest}?subject=${assunto}&body=${corpo}`, '_blank');
  s.innerHTML = '<div style="padding:10px 14px;border-radius:8px;background:#ebf8ff;border:1px solid #90cdf4;color:#2b6cb0;font-size:12px">📧 Cliente de e-mail aberto para envio de teste. No sistema real, o Gmail API realizará o envio automático.</div>';
  s.style.display = 'block';
  addLog(S.currentUser?.nome || 'Sistema', 'INFO', `Teste de e-mail para ${dest}`);
}

/* ================================================================
   PERMISSÕES POR NÍVEL
   ================================================================ */
const PERMISSOES_GRUPOS = [
  {
    grupo: 'Títulos',
    perms: [
      { id: 'ver_titulos', label: 'Visualizar Títulos' },
      { id: 'criar_titulo', label: 'Criar Título' },
      { id: 'editar_titulo', label: 'Editar Título' },
      { id: 'excluir_titulo', label: 'Excluir Título' },
      { id: 'baixar_titulo', label: 'Dar Baixa em Título' },
      { id: 'imprimir_titulo', label: 'Imprimir Título' },
    ]
  },
  {
    grupo: 'Clientes',
    perms: [
      { id: 'ver_clientes', label: 'Visualizar Clientes' },
      { id: 'criar_cliente', label: 'Criar Cliente' },
      { id: 'editar_cliente', label: 'Editar Cliente' },
      { id: 'excluir_cliente', label: 'Excluir Cliente' },
    ]
  },
  {
    grupo: 'Vendas',
    perms: [
      { id: 'ver_vendas', label: 'Visualizar Vendas' },
      { id: 'criar_venda', label: 'Registrar Venda' },
      { id: 'cancelar_venda', label: 'Cancelar Venda' },
    ]
  },
  {
    grupo: 'Relatórios',
    perms: [
      { id: 'ver_relatorios', label: 'Visualizar Relatórios' },
      { id: 'exportar_relatorios', label: 'Exportar Relatórios' },
    ]
  },
  {
    grupo: 'Configurações',
    perms: [
      { id: 'ver_config', label: 'Ver Configurações' },
      { id: 'editar_config', label: 'Editar Configurações' },
      { id: 'gerenciar_usuarios', label: 'Gerenciar Usuários' },
      { id: 'gerenciar_permissoes', label: 'Gerenciar Permissões' },
    ]
  },
  {
    grupo: 'Sistema',
    perms: [
      { id: 'ver_log', label: 'Ver LOG do Sistema' },
      { id: 'limpar_log', label: 'Limpar LOG' },
      { id: 'backup', label: 'Backup / Exportar Dados' },
      { id: 'enviar_alertas', label: 'Enviar Alertas/E-mails' },
    ]
  }
];

// Default permissions matrix
const PERM_MATRIX = {
  MASTER:      { all: true },
  ADMIN:       { all: false, allow: ['ver_titulos','criar_titulo','editar_titulo','excluir_titulo','baixar_titulo','imprimir_titulo','ver_clientes','criar_cliente','editar_cliente','excluir_cliente','ver_vendas','criar_venda','cancelar_venda','ver_relatorios','exportar_relatorios','ver_config','editar_config','gerenciar_usuarios','ver_log','limpar_log','backup','enviar_alertas'] },
  GERENTE:     { all: false, allow: ['ver_titulos','criar_titulo','editar_titulo','baixar_titulo','imprimir_titulo','ver_clientes','criar_cliente','editar_cliente','ver_vendas','criar_venda','ver_relatorios','exportar_relatorios','ver_config','ver_log','enviar_alertas'] },
  FUNCIONARIO: { all: false, allow: ['ver_titulos','criar_titulo','baixar_titulo','imprimir_titulo','ver_clientes','criar_cliente','ver_vendas','criar_venda','ver_relatorios'] }
};

function hasPermNivel(nivel, permId) {
  const m = PERM_MATRIX[nivel.toUpperCase()];
  if (!m) return false;
  return m.all || (m.allow && m.allow.includes(permId));
}

function renderPermNivel() {
  const body = $('perm-nivel-body');
  if (!body) return;
  const niveis = ['MASTER', 'ADMIN', 'GERENTE', 'FUNCIONARIO'];
  let html = '';
  PERMISSOES_GRUPOS.forEach(g => {
    html += `<tr class="perm-group-header"><td colspan="5">${g.grupo}</td></tr>`;
    g.perms.forEach(p => {
      html += `<tr>
        <td style="padding-left:20px">${p.label}</td>
        ${niveis.map(n => `<td style="text-align:center">${hasPermNivel(n, p.id) ? '✅' : '☐'}</td>`).join('')}
      </tr>`;
    });
  });
  body.innerHTML = html;
}

/* ================================================================
   AVATAR DE AJUDA CONTEXTUAL
   ================================================================ */
const AVATAR_DICAS = {
  dashboard: {
    titulo: 'Dashboard',
    dicas: [
      'Visualize os KPIs do dia: total a receber, vencidos e em dia.',
      'Clique nos cards para filtrar títulos por status.',
      'Use os gráficos para analisar tendências mensais.',
      'Vencimentos próximos aparecem em destaque no rodapé do painel.'
    ]
  },
  titulos: {
    titulo: 'Gestão de Títulos',
    dicas: [
      'Clique em "+ Novo Título" para lançar um novo título.',
      'Use a busca para filtrar por cliente, número ou status.',
      'Ao editar, será solicitado seu PIN de segurança.',
      'Títulos vencidos aparecem em vermelho — envie um alerta com um clique.'
    ]
  },
  clientes: {
    titulo: 'Cadastro de Clientes',
    dicas: [
      'Cadastre clientes com CPF/CNPJ para geração de documentos.',
      'O endereço completo é necessário para emissão de promissórias.',
      'Associe um cliente a um título pelo campo "Cliente" no formulário.',
      'Pesquise clientes pelo nome ou CPF na barra de busca.'
    ]
  },
  vendas: {
    titulo: 'Controle de Vendas',
    dicas: [
      'Registre vendas e vincule ao cliente para histórico completo.',
      'Use os filtros por data para ver o desempenho do dia/mês.',
      'Vendas canceladas ficam marcadas mas não são excluídas.',
      'Exporte relatório de vendas em CSV para análise externa.'
    ]
  },
  relatorios: {
    titulo: 'Relatórios',
    dicas: [
      'Filtre relatórios por período, cliente ou proprietário.',
      'Exporte para PDF ou Excel para compartilhar com a equipe.',
      'O relatório de inadimplência lista todos os títulos vencidos.',
      'Use o resumo executivo para reuniões de análise.'
    ]
  },
  configuracoes: {
    titulo: 'Configurações',
    dicas: [
      'Configure alertas de WhatsApp e e-mail na aba Alertas.',
      'Gerencie usuários e permissões na aba Cadastro.',
      'Faça backup regular dos dados na aba Sistema.',
      'Personalize a aparência do sistema na aba Aparência.'
    ]
  },
  'config-alertas': {
    titulo: 'Configurações › Alertas',
    dicas: [
      'Configure o número de dias de antecedência para alertas automáticos.',
      'Informe o número de WhatsApp no formato: 5511999999999.',
      'A configuração do Gmail requer uma conta Google ativa.',
      'Teste o envio antes de ativar os alertas automáticos.'
    ]
  },
  'config-sistema': {
    titulo: 'Configurações › Sistema',
    dicas: [
      'Faça backups frequentes para evitar perda de dados.',
      'O LOG registra todas as ações realizadas no sistema.',
      'A chave de licença estará disponível na versão comercial.',
      'Exporte o log para CSV para auditoria externa.'
    ]
  },
  'config-cadastro': {
    titulo: 'Configurações › Cadastro',
    dicas: [
      'MASTER tem acesso total e irrestrito ao sistema.',
      'Configure as permissões de cada nível conforme a necessidade da empresa.',
      'Altere o credor das promissórias nas configurações de emissão.',
      'Adicione novos usuários com nível adequado ao cargo.'
    ]
  },
  'config-aparencia': {
    titulo: 'Configurações › Aparência',
    dicas: [
      'Faça upload do logo da empresa para personalizar o sistema.',
      'O avatar de ajuda pode ser ativado ou desativado aqui.',
      'O tema escuro/claro afeta toda a interface do sistema.',
      'Escolha a cor de destaque para combinar com sua marca.'
    ]
  }
};

function getAvatarContext() {
  const nav = S.navAtual || 'dashboard';
  if (nav === 'configuracoes') {
    const sub = document.querySelector('.sub-tab.active');
    const subId = sub ? sub.dataset.sub : '';
    if (subId) return `config-${subId}`;
    return 'configuracoes';
  }
  return nav;
}

function updateAvatar() {
  const tooltip = $('avatar-tooltip');
  if (!tooltip) return;
  const ctx = getAvatarContext();
  const dica = AVATAR_DICAS[ctx] || AVATAR_DICAS['dashboard'];
  $('avatar-dica-titulo').textContent = `💡 ${dica.titulo}`;
  const ul = $('avatar-dica-itens');
  ul.innerHTML = dica.dicas.map(d => `<li>${d}</li>`).join('');
}

function toggleAvatarTooltip() {
  const tooltip = $('avatar-tooltip');
  updateAvatar();
  tooltip.classList.toggle('open');
}
function fecharAvatarTooltip() {
  $('avatar-tooltip').classList.remove('open');
}
