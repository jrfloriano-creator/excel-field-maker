// src/lib/calculos.ts
// ✅ Service único de cálculo financeiro: toda a lógica centralizada em @/lib/financeiro
//    (fachada mantida para compatibilidade de imports em toda a base de código).

export {
  calcularTitulo,
  formatCurrency,
  formatDate,
  formatarData,
  hojeLocal,
  formatPhone,
  buildCobrancaMsg,
  getWhatsAppLink,
  buildPagamentoWhatsMsg,
  normalizarTelefoneWhatsapp,
  whatsLink,
  getMonthKey,
  formatMonthLabel,
  formatarMesAno,
} from './financeiro';
