import { useEffect, useState } from 'react';
import { X, HelpCircle } from 'lucide-react';

interface Props {
  ativo: boolean;
  tab: string;
}

const DICAS: Record<string, { titulo: string; itens: string[] }> = {
  lista: {
    titulo: '📋 Aba Títulos',
    itens: [
      'Use as abas de meses no topo para filtrar por período.',
      'Filtros: Todos / Vencidos / No Prazo / Pagos.',
      'Toque no botão + para cadastrar um novo título.',
      'Cada cartão permite editar, receber pagamento ou excluir.',
    ],
  },
  clientes: {
    titulo: '👥 Aba Clientes',
    itens: [
      'Cadastre Nome, Telefone, E-mail e Aniversário.',
      'Digite o CEP e clique na lupa para preencher o endereço.',
      'O e-mail é usado pelas cobranças automáticas em Config.',
    ],
  },
  promissoria: {
    titulo: '📄 Aba Promissória',
    itens: [
      'Selecione um cliente já cadastrado como devedor.',
      'Informe quantidade de notas, valor total e 1º vencimento.',
      'Use Criar PDF, Imprimir ou salvar diretamente como Títulos.',
      'Configure o Credor antes na aba Config.',
    ],
  },
  dashboard: {
    titulo: '📊 Aba Dashboard',
    itens: [
      'Selecione o mês para visualizar o gráfico do período.',
      'Use "Todos" para ver o total geral.',
    ],
  },
  relatorios: {
    titulo: '📑 Aba Relatórios',
    itens: ['Visualize totais por status, proprietário e período.'],
  },
  config: {
    titulo: '⚙️ Aba Configurações',
    itens: [
      'Cadastre Proprietários, Funcionários, Credor e Chaves PIX.',
      'Configure telefones para alerta diário no WhatsApp.',
      'Use o painel de E-mail para cobranças via Gmail.',
      'Faça backup ou importe dados em CSV.',
    ],
  },
};

export function AvatarAjuda({ ativo, tab }: Props) {
  const [aberto, setAberto] = useState(false);

  // Fecha ao trocar de aba
  useEffect(() => {
    setAberto(false);
  }, [tab]);

  if (!ativo) return null;

  const dica = DICAS[tab] ?? { titulo: 'Ajuda', itens: ['Selecione uma aba para ver as dicas.'] };

  return (
    <div className="fixed bottom-24 left-4 z-30">
      {aberto && (
        <div className="absolute bottom-16 left-0 w-72 bg-card border border-border rounded-lg shadow-xl p-3 animate-in fade-in slide-in-from-bottom-2">
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
            💡 Posso desativar este ajudante em Config.
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
        <span className="absolute -top-1 -right-1 bg-accent text-accent-foreground rounded-full p-0.5">
          <HelpCircle className="h-3 w-3" />
        </span>
      )}
    </div>
  );
}
