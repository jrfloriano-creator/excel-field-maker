import { useEffect, useState } from 'react';
import { Cliente, Titulo, AppConfig } from '@/types/titulo';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, Pencil, X, Search, UserPlus, MessageCircle, CreditCard, Printer } from 'lucide-react';
import { generateId } from '@/lib/storage';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/calculos';
import { obterNomeCliente } from '@/lib/whatsapp/message';
import { enviarWhatsAppUnico } from '@/lib/whatsapp/whatsappService';
import { SessionUser, hasPerm } from '@/lib/auth';
import { RecebimentoTitulosDialog } from '@/components/clientes/RecebimentoTitulosDialog';
import { ReimprimirTitulosDialog } from '@/components/clientes/ReimprimirTitulosDialog';

const ESTADOS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
];

interface Props {
  clientes: Cliente[];
  onUpdate: (clientes: Cliente[]) => void;
  titulos?: Titulo[];
  requirePin?: (kind: 'edit' | 'delete', id: string) => void;
  config?: AppConfig;
  user?: SessionUser | null;
  updateTitulo?: (id: string, data: Partial<Titulo>) => void | Promise<void>;
  updateConfig?: (data: Partial<AppConfig>) => void | Promise<void>;
}

const today = () => new Date().toISOString().split('T')[0];

function validarCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;
  const calc = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += parseInt(digits[i]) * (len + 1 - i);
    const rem = (sum * 10) % 11;
    return rem === 10 || rem === 11 ? 0 : rem;
  };
  return calc(9) === parseInt(digits[9]) && calc(10) === parseInt(digits[10]);
}

const empty: Omit<Cliente, 'id'> = {
  nome: '', apelido: '', telefone: '', email: '', dataNascimento: '', cpfCnpj: '', cep: '', logradouro: '', numero: '', bairro: '', cidade: '', estado: '', dataCadastro: '', indicacao: '',
};

export function ClientesManager({ clientes, onUpdate, titulos = [], requirePin, config, user, updateTitulo, updateConfig }: Props) {
  const [viewing, setViewing] = useState<Cliente | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [data, setData] = useState<Omit<Cliente, 'id'>>(empty);
  const [busca, setBusca] = useState('');
  const [loadingCep, setLoadingCep] = useState(false);
  const [cpfError, setCpfError] = useState('');
  const [recebendoCliente, setRecebendoCliente] = useState<Cliente | null>(null);
  const [reimprimindoCliente, setReimprimindoCliente] = useState<Cliente | null>(null);

  const doOpen = (c?: Cliente) => {
    if (c) {
      setEditing(c);
      setData({ ...c });
    } else {
      setEditing(null);
      setData({ ...empty, dataCadastro: today() });
    }
    setShowForm(true);
  };

  const open = (c?: Cliente) => {
    if (c && requirePin) {
      requirePin('edit', c.id);
      return;
    }
    doOpen(c);
  };

  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      const c = clientes.find(x => x.id === id);
      if (c) doOpen(c);
    };
    window.addEventListener('cliente-edit-unlock', handler);
    return () => window.removeEventListener('cliente-edit-unlock', handler);
  }, [clientes]);

  const close = () => {
    setShowForm(false);
    setEditing(null);
    setData(empty);
    setCpfError('');
  };

  const handleCepBlur = async () => {
    const cep = data.cep.replace(/\D/g, '');
    if (cep.length !== 8) return;
    setLoadingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const json = await res.json();
      if (json.erro) {
        toast.error('CEP não encontrado');
      } else {
        setData(d => ({
          ...d,
          logradouro: json.logradouro || d.logradouro,
          bairro: json.bairro || d.bairro,
          cidade: json.localidade || d.cidade,
          estado: json.uf || d.estado,
        }));
        toast.success('Endereço preenchido');
      }
    } catch {
      toast.error('Erro ao buscar CEP');
    } finally {
      setLoadingCep(false);
    }
  };

  const handleCpfBlur = () => {
    const val = (data.cpfCnpj || '').trim();
    if (!val) { setCpfError(''); return; }
    const digits = val.replace(/\D/g, '');
    if (digits.length === 11 && !validarCPF(val)) {
      setCpfError('CPF inválido');
    } else {
      setCpfError('');
    }
  };

  const handleSave = () => {
    if (!data.nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    const cpfVal = (data.cpfCnpj || '').trim();
    const cpfDigits = cpfVal.replace(/\D/g, '');
    if (cpfDigits.length === 11 && !validarCPF(cpfVal)) {
      setCpfError('CPF inválido');
      toast.error('CPF inválido');
      return;
    }
    if (editing) {
      onUpdate(clientes.map(c => c.id === editing.id ? { ...editing, ...data, nome: data.nome.toUpperCase() } : c));
      toast.success('Cliente atualizado');
    } else {
      const novo: Cliente = { id: generateId(), ...data, nome: data.nome.toUpperCase() };
      onUpdate([...clientes, novo]);
      toast.success('Cliente cadastrado');
    }
    close();
  };

  const handleRemove = (id: string) => {
    if (requirePin) {
      requirePin('delete', id);
      return;
    }
    onUpdate(clientes.filter(c => c.id !== id));
    toast.success('Cliente removido');
  };

  const filtrados = clientes.filter(c =>
    c.nome.toLowerCase().includes(busca.toLowerCase()) ||
    c.telefone.includes(busca)
  ).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));

  const incompletos = clientes.filter(c =>
    !c.nome || !c.telefone || !c.dataNascimento || !c.cpfCnpj
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold" style={{ color: '#ffffff' }}>Clientes ({clientes.length})</h2>
        {!showForm && (
          <Button size="sm" onClick={() => open()}>
            <UserPlus className="h-4 w-4 mr-1" /> Novo
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2 text-sm" style={{ color: '#000000' }}>
        <span style={{ color: '#000000' }}>Clientes Cadastrados: <strong>{clientes.length}</strong></span>
        <span style={{ color: '#000000' }}>—</span>
        <span style={{ color: '#000000' }}>Cadastros Incompletos: <strong>{incompletos}</strong></span>
      </div>

      {showForm && (
        <Card className="border-primary/20 shadow-lg">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">{editing ? 'Editar Cliente' : 'Novo Cliente'}</CardTitle>
            <Button variant="ghost" size="icon" onClick={close}><X className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Nome *</Label>
              <Input value={data.nome} onChange={e => setData({ ...data, nome: e.target.value })} placeholder="Nome completo" />
            </div>
            <div>
              <Label className="text-xs">Apelido</Label>
              <Input
                value={data.apelido || ''}
                onChange={e => setData({ ...data, apelido: e.target.value })}
                placeholder="Como o cliente é chamado (usado no WhatsApp)"
              />
            </div>
            <div>
              <Label className="text-xs">Contato (Celular)</Label>
              <Input
                type="tel"
                value={data.telefone}
                onChange={e => setData({ ...data, telefone: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                placeholder="11999999999"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">E-mail</Label>
                <Input
                  type="email"
                  value={data.email || ''}
                  onChange={e => setData({ ...data, email: e.target.value })}
                  placeholder="cliente@email.com"
                />
              </div>
              <div>
                <Label className="text-xs">Aniversário</Label>
                <Input
                  type="date"
                  value={data.dataNascimento || ''}
                  onChange={e => setData({ ...data, dataNascimento: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Data de Cadastro</Label>
                <Input
                  type="date"
                  value={data.dataCadastro || ''}
                  onChange={e => setData({ ...data, dataCadastro: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Indicação</Label>
                <Input
                  value={data.indicacao || ''}
                  onChange={e => setData({ ...data, indicacao: e.target.value })}
                  placeholder="Quem indicou?"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">CPF/CNPJ</Label>
              <Input
                value={data.cpfCnpj || ''}
                onChange={e => { setData({ ...data, cpfCnpj: e.target.value }); setCpfError(''); }}
                onBlur={handleCpfBlur}
                placeholder="000.000.000-00"
                className={cpfError ? 'border-destructive' : ''}
              />
              {cpfError && <p className="text-xs text-destructive mt-0.5">{cpfError}</p>}
            </div>
            <div>
              <Label className="text-xs">CEP</Label>
              <div className="flex gap-2">
                <Input
                  value={data.cep}
                  onChange={e => setData({ ...data, cep: e.target.value.replace(/\D/g, '').slice(0, 8) })}
                  onBlur={handleCepBlur}
                  placeholder="00000000"
                  maxLength={8}
                />
                <Button type="button" variant="outline" size="icon" onClick={handleCepBlur} disabled={loadingCep}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-xs">Logradouro</Label>
              <Input value={data.logradouro} onChange={e => setData({ ...data, logradouro: e.target.value })} placeholder="Rua / Avenida" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Número</Label>
                <Input value={data.numero} onChange={e => setData({ ...data, numero: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Bairro</Label>
                <Input value={data.bairro} onChange={e => setData({ ...data, bairro: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-[1fr_90px] gap-2">
              <div>
                <Label className="text-xs">Cidade</Label>
                <Input value={data.cidade} onChange={e => setData({ ...data, cidade: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">UF</Label>
                <Select value={data.estado} onValueChange={v => setData({ ...data, estado: v })}>
                  <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                  <SelectContent>
                    {ESTADOS.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleSave} className="w-full">
              {editing ? 'Salvar Alterações' : 'Cadastrar Cliente'}
            </Button>
          </CardContent>
        </Card>
      )}

      <Input
        placeholder="🔍 Buscar por nome ou telefone..."
        value={busca}
        onChange={e => setBusca(e.target.value)}
      />

      {filtrados.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          {clientes.length === 0 ? 'Nenhum cliente cadastrado' : 'Nenhum cliente encontrado'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtrados.map(c => {
            // Busca títulos pelo clienteId (preferencial) ou por nome+telefone (legado)
            const titulosDoCliente = titulos.filter(t =>
              t.clienteId === c.id ||
              (!t.clienteId && (
                t.cliente?.toUpperCase() === c.nome.toUpperCase() ||
                (c.telefone && t.telefone === c.telefone)
              ))
            );
            const enviarRelacao = async (e: React.MouseEvent) => {
              e.stopPropagation();
              if (!c.telefone) { toast.error('Cliente sem telefone'); return; }
              if (titulosDoCliente.length === 0) { toast.info('Nenhum título cadastrado para este cliente'); return; }
              const apelido = obterNomeCliente(c);
              const ordenados = [...titulosDoCliente].sort(
                (a, b) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime()
              );
              const linhas = ordenados.map((t, i) => {
                const status = t.dataPagamento ? '✅ PAGO' : 'EM ABERTO';
                return `${i + 1}. ${t.tipo} | Emissão: ${formatDate(t.dataEmissao)} | Venc.: ${formatDate(t.vencimento)} | Valor: ${formatCurrency(t.valor)} | ${status}`;
              }).join('\n');
              const msg = `*Controle Financeiro ZOOM*\n\nConforme solicitado ${apelido}, segue a relação de suas parcelas:\n\n${linhas}`;
              await enviarWhatsAppUnico(c.telefone, msg);
            };
            const camposFaltando: string[] = [];
            if (!c.telefone) camposFaltando.push('telefone');
            if (!c.cpfCnpj) camposFaltando.push('CPF/CNPJ');
            if (!c.cep) camposFaltando.push('CEP');
            if (!c.logradouro) camposFaltando.push('endereço');
            if (!c.cidade || !c.estado) camposFaltando.push('cidade/UF');
            const incompleto = camposFaltando.length > 0;
            return (
              <Card
                key={c.id}
                className="cursor-pointer hover:bg-accent/30 transition-colors"
                onClick={() => setViewing(c)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold truncate">{c.nome}</p>
                        {incompleto && (
                          <span className="text-[10px] bg-destructive/15 text-destructive px-1.5 py-0.5 rounded font-medium" title={`Faltando: ${camposFaltando.join(', ')}`}>
                            ⚠ Incompleto
                          </span>
                        )}
                      </div>
                      {c.apelido && <p className="text-xs text-muted-foreground italic">"{c.apelido}"</p>}
                      {c.telefone && <p className="text-xs text-muted-foreground">📱 {c.telefone}</p>}
                      {(c.logradouro || c.cidade) && (
                        <p className="text-xs text-muted-foreground truncate">
                          📍 {[c.logradouro, c.numero].filter(Boolean).join(', ')}
                          {c.bairro ? ` - ${c.bairro}` : ''}
                          {c.cidade ? `, ${c.cidade}` : ''}{c.estado ? `/${c.estado}` : ''}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        className="bg-destructive hover:bg-destructive/90 text-destructive-foreground h-7 text-[10px] px-2"
                        onClick={enviarRelacao}
                        title="Enviar títulos em aberto via WhatsApp"
                      >
                        <MessageCircle className="h-3 w-3 mr-1" />
                        Enviar títulos
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-paid/10 hover:bg-paid/20 text-paid h-7 text-[10px] px-2"
                        disabled={titulosDoCliente.length === 0}
                        onClick={() => {
                          if (config && !hasPerm(config, user ?? null, 'titulo.receber')) {
                            toast.error('Sem permissão para receber títulos');
                            return;
                          }
                          setRecebendoCliente(c);
                        }}
                        title="Receber títulos pendentes"
                      >
                        <CreditCard className="h-3 w-3 mr-1" />
                        Receber Títulos
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[10px] px-2"
                        disabled={titulosDoCliente.length === 0}
                        onClick={() => setReimprimindoCliente(c)}
                        title="Reimprimir títulos do cliente"
                      >
                        <Printer className="h-3 w-3 mr-1" />
                        Reimprimir
                      </Button>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => open(c)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleRemove(c.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{viewing?.nome}</DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="space-y-2 text-sm">
              {viewing.apelido && <p><strong>Apelido:</strong> {viewing.apelido}</p>}
              {viewing.telefone && <p><strong>Telefone:</strong> {viewing.telefone}</p>}
              {viewing.email && <p><strong>E-mail:</strong> {viewing.email}</p>}
              {viewing.dataNascimento && <p><strong>Aniversário:</strong> {formatDate(viewing.dataNascimento)}</p>}
              {viewing.cpfCnpj && <p><strong>CPF/CNPJ:</strong> {viewing.cpfCnpj}</p>}
              {viewing.dataCadastro && <p><strong>Cadastrado em:</strong> {formatDate(viewing.dataCadastro)}</p>}
              {viewing.indicacao && <p><strong>Indicação:</strong> {viewing.indicacao}</p>}
              {(viewing.logradouro || viewing.cidade) && (
                <p>
                  <strong>Endereço:</strong>{' '}
                  {[viewing.logradouro, viewing.numero, viewing.bairro,
                    viewing.cidade && viewing.estado ? `${viewing.cidade}/${viewing.estado}` : '',
                    viewing.cep ? `CEP ${viewing.cep}` : ''
                  ].filter(Boolean).join(', ')}
                </p>
              )}
              <div className="pt-2">
                <p className="font-semibold">Títulos ({titulos.filter(t => t.clienteId === viewing.id).length})</p>
                <div className="space-y-1 max-h-48 overflow-y-auto mt-1">
                  {titulos
                    .filter(t => t.clienteId === viewing.id)
                    .sort((a, b) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime())
                    .map(t => (
                      <div key={t.id} className="text-xs border border-border rounded p-1.5">
                        <div className="flex justify-between">
                          <span>{t.tipo}</span>
                          <span className="font-semibold">{formatCurrency(t.valor)}</span>
                        </div>
                        <p className="text-muted-foreground">
                          Venc.: {formatDate(t.vencimento)} {t.dataPagamento ? '— ✅ PAGO' : '— EM ABERTO'}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {config && updateTitulo && updateConfig && (
        <RecebimentoTitulosDialog
          cliente={recebendoCliente}
          titulos={titulos}
          config={config}
          user={user ?? null}
          updateTitulo={updateTitulo}
          updateConfig={updateConfig}
          onClose={() => setRecebendoCliente(null)}
        />
      )}

      {config && (
        <ReimprimirTitulosDialog
          cliente={reimprimindoCliente}
          titulos={titulos}
          config={config}
          onClose={() => setReimprimindoCliente(null)}
        />
      )}
    </div>
  );
}
