import { useEffect, useState } from 'react';
import { X, HelpCircle } from 'lucide-react';

interface Props {
  ativo: boolean;
  tab: string;
}

type Dica = { titulo: string; itens: string[] };

const DICAS: Record<string, Dica> = {
  lista: {
    titulo: '📋 Aba Títulos',
    itens: [
      'Use as abas de meses no topo para filtrar por período.',
      'Filtros: Todos / Vencidos / No Prazo / Pagos.',
      'Toque no botão + para cadastrar um novo título.',
      'Cada cartão tem borda colorida pelo proprietário; status indica Pago/Vencido/No Prazo.',
      'Botão "Cobrar" abre WhatsApp do cliente (PIX opcional, em atraso).',
      'Botão "Receber" abre o card Registrar Recebimento.',
      'No Registrar Recebimento: selecione Forma de Pagamento, Maquininha (obrigatória exceto PIX), o usuário que recebeu e digite a senha dele de 4 dígitos.',
      'Botão "Reimprimir" gera novamente o PDF/Promissória do título (não duplica no banco).',
    ],
  },
  clientes: {
    titulo: '👥 Aba Clientes',
    itens: [
      'Cadastre Nome, Apelido, Telefone, E-mail, CPF/CNPJ e Aniversário.',
      'Digite o CEP e clique na lupa para preencher o endereço automaticamente.',
      'Clientes incompletos exibem o aviso ⚠ Incompleto.',
      'Botão "Enviar títulos" abre o WhatsApp com a relação completa do cliente (cabeçalho Controle Financeiro ZOOM).',
      'Toque no cliente para abrir detalhes.',
    ],
  },
  aniversariantes: {
    titulo: '🎂 Aba Aniversariantes',
    itens: [
      'Veja clientes que fazem aniversário hoje e no mês.',
      'Envie mensagem personalizada via WhatsApp.',
      'Configure o texto padrão em Config › Alertas › Mensagem de Aniversário.',
    ],
  },
  dashboard: {
    titulo: '📊 Aba Dashboard',
    itens: [
      'Selecione o mês para visualizar o gráfico do período.',
      'Use "Todos" para ver o total geral.',
      'Card "Total de Títulos por Tipo" mostra a quantidade por categoria.',
      'Clique em "Vencidos" para abrir a lista filtrada.',
    ],
  },
  relatorios: {
    titulo: '📑 Aba Relatórios',
    itens: [
      'Filtre por Proprietário, Tipo (Duplicata/Caderno/Cheque/Boleto/Outros).',
      'Use Data Início/Fim para filtrar por intervalo (desativa o filtro Mês).',
      'Selecionar um cliente mostra o histórico completo desse cliente.',
      'Botão PDF gera o relatório com cabeçalho "Controle Financeiro ZOOM".',
      'Botão "Cobrar via WhatsApp" envia cobrança para títulos em atraso, incluindo PIX se cadastrado.',
    ],
  },
  vendas: {
    titulo: '🛒 Aba Vendas à Vista',
    itens: [
      'Registre vendas rápidas sem gerar título/promissória.',
      'Selecione o cliente cadastrado ou marque "Cliente Novo".',
      'Informe o valor, desconto (em R$ ou %) e observações.',
      'Escolha a forma de pagamento (cadastrada em Config › Financeiro).',
      'Para cartão, informe parcelas e a maquininha usada.',
      'Botão "Vendas do Dia" abre a lista com totalizador, opções de PDF, Imprimir e WhatsApp.',
      'O envio por WhatsApp usa o telefone ativo em Config › Alertas › Telefones para Alerta Diário.',
    ],
  },
  promissoria: {
    titulo: '📄 Promissórias / Caderno',
    itens: [
      'Use as sub-abas para escolher Promissória ou Lançamento Caderno.',
      'Botão "Imprimir" abre o diálogo de impressão (Windows no app desktop, navegador na web).',
      'Reimprimir o mesmo lote não duplica os títulos no banco.',
    ],
  },
};

const SUB_DICAS: Record<string, Record<string, Dica>> = {
  promissoria: {
    promissoria: {
      titulo: '📄 Promissória',
      itens: [
        'Selecione um cliente cadastrado completo como devedor.',
        'Informe quantidade de notas, valor total e 1º vencimento.',
        'As parcelas seguintes vencem 30 em 30 dias.',
        'Botão "Criar PDF" salva o arquivo no caminho configurado (Config › Sistema).',
        'Botão "Imprimir" abre o diálogo nativo do Windows para escolher a impressora (no app desktop).',
        'O lote é salvo no Banco de Títulos apenas UMA vez, mesmo imprimindo várias vezes.',
        'Configure o Credor antes em Config › Cadastros.',
      ],
    },
    caderno: {
      titulo: '📓 Lançamento Caderno',
      itens: [
        'Use para registrar vendas em caderno sem gerar promissória.',
        'Escolha o Proprietário e o Cliente cadastrado.',
        'Quantidade de parcelas divide o Valor Total automaticamente.',
        '1º vencimento sugere +30 dias da emissão (pode alterar).',
        'O botão vermelho salva direto no Banco de Títulos.',
      ],
    },
  },
  config: {
    cadastros: {
      titulo: '👥 Config › Cadastros',
      itens: [
        'Usuários: cada um tem nível (USUÁRIO/GERENCIAL/MASTER) e senha de 4 dígitos.',
        'A senha do usuário é exigida ao Registrar Recebimento de títulos.',
        'Proprietários: usados na cor/identificação dos títulos.',
        'Credor: nome, CPF/CNPJ e Cidade/Estado usados nas Promissórias.',
        'Motivos de Alteração: lista usada ao editar/excluir títulos e clientes.',
      ],
    },
    financeiro: {
      titulo: '💰 Config › Financeiro',
      itens: [
        'Taxa de Juros Mensal aplicada nos títulos vencidos.',
        'Cadastre Descontos pré-definidos (R$ ou %) para reusar nas promissórias.',
        'Cadastre até 5 Chaves PIX (aparecem na cobrança WhatsApp).',
        'Formas de Pagamento aparecem ao Registrar Recebimento (Dinheiro, PIX, Cartão...).',
        'Maquininhas: usadas em pagamentos de cartão (obrigatória exceto PIX).',
      ],
    },
    alertas: {
      titulo: '🔔 Config › Alertas',
      itens: [
        'Cadastre telefones para receber alerta diário (vencem amanhã).',
        'Esses telefones também recebem o resumo de Vendas do Dia.',
        'Configure a mensagem de aniversário enviada aos clientes.',
        'Painel de E-mail envia cobranças/textos livres via Gmail Web.',
      ],
    },
    aparencia: {
      titulo: '🎨 Config › Aparência',
      itens: [
        'Modo Escuro alterna o tema do app.',
        'Avatar de Ajuda: ative/desative este mascote.',
        'Logo da Empresa: faça upload do logotipo para impressões e tela de login.',
      ],
    },
    sistema: {
      titulo: '⚙️ Config › Sistema',
      itens: [
        'Pasta para Salvar Dados: caminho no PC onde os PDFs/Promissórias serão salvos.',
        'Backup gera um único arquivo JSON com títulos + configurações.',
        'Importação restaura tudo (substitui dados atuais).',
        'Timer de Ociosidade: bloqueia o app após inatividade.',
        'LOG do Sistema: registra todas as operações (inclui Vendas à Vista por usuário).',
      ],
    },
  },
};

const SUB_DICAS: Record<string, Record<string, Dica>> = {
  promissoria: {
    promissoria: {
      titulo: '📄 Promissória',
      itens: [
        'Selecione um cliente cadastrado como devedor (cadastro completo).',
        'Informe quantidade de notas, valor total e 1º vencimento.',
        'As parcelas seguintes vencem 30 em 30 dias.',
        'Ao clicar em Criar PDF ou Imprimir, os títulos são salvos automaticamente.',
        'Configure o Credor antes em Config › Cadastros.',
      ],
    },
    caderno: {
      titulo: '📓 Lançamento Caderno',
      itens: [
        'Use para registrar vendas em caderno sem gerar promissória.',
        'Escolha o Proprietário e o Cliente cadastrado.',
        'Quantidade de parcelas divide o Valor Total automaticamente.',
        '1º vencimento sugere +30 dias da emissão (pode alterar).',
        'O botão vermelho salva direto no Banco de Títulos.',
      ],
    },
  },
  config: {
    cadastros: {
      titulo: '👥 Config › Cadastros',
      itens: [
        'Proprietários: usados na cor/identificação dos títulos.',
        'Funcionários: cada um tem PIN próprio para confirmar pagamentos.',
        'Credor: nome, CPF/CNPJ e Cidade/Estado usados nas Promissórias.',
      ],
    },
    financeiro: {
      titulo: '💰 Config › Financeiro',
      itens: [
        'Taxa de Juros Mensal aplicada nos títulos vencidos.',
        'Cadastre até 5 Chaves PIX (aparecem na cobrança WhatsApp).',
        'Formas de Pagamento aparecem ao Registrar Pagamento (Dinheiro, PIX, Cartão...).',
      ],
    },
    alertas: {
      titulo: '🔔 Config › Alertas',
      itens: [
        'Cadastre telefones para receber alerta diário (vencem amanhã).',
        'Use o botão "Enviar Alertas Agora" para abrir o WhatsApp.',
        'Painel de E-mail envia cobranças/textos livres via Gmail Web.',
      ],
    },
    aparencia: {
      titulo: '🎨 Config › Aparência',
      itens: [
        'Modo Escuro alterna o tema do app.',
        'Avatar de Ajuda: ative/desative este mascote.',
        'Logo da Empresa: faça upload do logotipo para impressões.',
      ],
    },
    sistema: {
      titulo: '⚙️ Config › Sistema',
      itens: [
        'Backup gera um único arquivo JSON com títulos + configurações.',
        'Importação restaura tudo (substitui dados atuais).',
        'Timer de Ociosidade: bloqueia o app após inatividade.',
        'Chave do Sistema: recurso futuro de licenciamento.',
        'LOG do Sistema: registra todas as operações realizadas.',
      ],
    },
  },
};

export function AvatarAjuda({ ativo, tab }: Props) {
  const [aberto, setAberto] = useState(false);
  const [subTabs, setSubTabs] = useState<Record<string, string>>({});

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { tab: string; sub: string };
      if (!detail) return;
      setSubTabs(prev => ({ ...prev, [detail.tab]: detail.sub }));
    };
    window.addEventListener('avatar-subtab', handler);
    return () => window.removeEventListener('avatar-subtab', handler);
  }, []);

  useEffect(() => {
    setAberto(false);
  }, [tab, subTabs[tab]]);

  if (!ativo) return null;

  const sub = subTabs[tab];
  const dica: Dica =
    (sub && SUB_DICAS[tab]?.[sub]) ||
    DICAS[tab] ||
    (SUB_DICAS[tab] && Object.values(SUB_DICAS[tab])[0]) ||
    { titulo: 'Ajuda', itens: ['Selecione uma aba para ver as dicas.'] };

  return (
    <div className="fixed bottom-24 right-4 z-30">
      {aberto && (
        <div className="absolute bottom-16 right-0 w-72 bg-card border border-border rounded-lg shadow-xl p-3 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-start justify-between mb-1">
            <p className="font-semibold text-sm">{dica.titulo}</p>
            <button
              onClick={() => setAberto(false)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <ul className="text-xs space-y-1 text-muted-foreground list-disc pl-4">
            {dica.itens.map((d, i) => <li key={i}>{d}</li>)}
          </ul>
          <p className="text-[10px] text-muted-foreground mt-2 italic">
            💡 Posso desativar este ajudante em Config › Aparência.
          </p>
        </div>
      )}
      <button
        onClick={() => setAberto(v => !v)}
        className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition-transform border-2 border-background"
        aria-label="Ajuda"
        title="Ajuda contextual"
      >
        <span className="text-2xl" role="img" aria-label="mascote">🤖</span>
      </button>
      {!aberto && (
        <span className="absolute -top-1 -left-1 bg-accent text-accent-foreground rounded-full p-0.5">
          <HelpCircle className="h-3 w-3" />
        </span>
      )}
    </div>
  );
}
