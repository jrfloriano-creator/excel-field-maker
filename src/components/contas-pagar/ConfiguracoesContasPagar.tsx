import { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Save, Trash2, X } from 'lucide-react';
import { contasPagarDbDriver } from '@/lib/contasPagarDb';
import { useContasPagarCatalog } from '@/hooks/useContasPagarCatalog';
import { Credor, ContaPagarContatoInfo, DespesaFixa, GrupoDespesa, TipoTitulo, TituloConfig } from '@/types/contasPagar';

function generateId(): string {
  return crypto.randomUUID();
}

const TIPOS_TITULO: TipoTitulo[] = ['BOLETO', 'CHEQUE', 'CARTAO', 'OUTROS'];

const emptyCredor = (): Credor => ({
  id: '',
  nomeEmpresa: '',
  nomeFantasia: '',
  rua: '',
  bairro: '',
  cep: '',
  numero: '',
  telefone: '',
  whatsapp: '',
  contatos: [{ id: generateId(), nome: '', telefone: '', whatsapp: '' }],
  criadoEm: '',
  atualizadoEm: '',
});

// ===================== TÍTULO CARD =====================
function TituloCard({ items, onReload }: { items: TituloConfig[]; onReload: () => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<TipoTitulo>('BOLETO');
  const [ativo, setAtivo] = useState(true);
  const editing = editingId !== null;

  const resetForm = () => {
    setEditingId(null);
    setNome('');
    setTipo('BOLETO');
    setAtivo(true);
  };

  const handleSalvar = async () => {
    const nomeTrim = nome.trim();
    if (!nomeTrim) return toast.error('Informe o nome do título.');
    const item: TituloConfig = { id: editingId || generateId(), nome: nomeTrim, tipo, ativo };
    try {
      await contasPagarDbDriver.saveTituloConfig(item);
      toast.success('Título salvo com sucesso!');
      resetForm();
      onReload();
    } catch {
      toast.error('Erro ao salvar título.');
    }
  };

  const handleEditar = (item: TituloConfig) => {
    setEditingId(item.id);
    setNome(item.nome);
    setTipo(item.tipo);
    setAtivo(item.ativo);
  };

  const handleExcluir = async (id: string) => {
    try {
      await contasPagarDbDriver.deleteTituloConfig(id);
      toast.success('Título removido.');
      if (editingId === id) resetForm();
      onReload();
    } catch {
      toast.error('Erro ao remover título.');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>TÍTULO</CardTitle>
        {editing && (
          <Button size="sm" variant="ghost" onClick={resetForm}><X className="h-4 w-4" /></Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 md:grid-cols-3">
          <Input
            value={nome}
            onChange={(event) => setNome(event.target.value)}
            placeholder="Nome do tipo de título"
            className={editing ? 'text-red-600' : ''}
          />
          <Select value={tipo} onValueChange={(value) => setTipo(value as TipoTitulo)}>
            <SelectTrigger className={editing ? 'text-red-600' : ''}><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIPOS_TITULO.map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Switch checked={ativo} onCheckedChange={setAtivo} />
            <span className="text-sm">Ativo</span>
          </div>
        </div>
        <Button size="sm" onClick={handleSalvar}><Save className="h-4 w-4 mr-1" />{editing ? 'Atualizar' : 'Salvar'}</Button>

        <div className="space-y-2 pt-2 border-t">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum título cadastrado.</p>
          ) : items.map(item => (
            <div key={item.id} className="flex items-center gap-2 rounded border px-3 py-2 text-sm">
              <div className="flex-1">
                <span className="font-medium">{item.nome}</span>
                <span className="text-muted-foreground"> • {item.tipo} • {item.ativo ? 'Ativo' : 'Inativo'}</span>
              </div>
              <Button size="icon" variant="ghost" onClick={() => handleEditar(item)}><Pencil className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleExcluir(item.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ===================== CREDOR CARD =====================
function CredorCard({ items, onReload }: { items: Credor[]; onReload: () => void }) {
  const [draft, setDraft] = useState<Credor>(emptyCredor());
  const editing = draft.id !== '';

  const resetForm = () => setDraft(emptyCredor());

  const handleSalvar = async () => {
    if (!draft.nomeEmpresa.trim()) return toast.error('Informe o nome da empresa.');
    const now = new Date().toISOString();
    const item: Credor = {
      ...draft,
      id: draft.id || generateId(),
      contatos: draft.contatos.filter(contato => contato.nome.trim()),
      criadoEm: draft.criadoEm || now,
      atualizadoEm: now,
    };
    try {
      await contasPagarDbDriver.saveCredor(item);
      toast.success('Credor salvo com sucesso!');
      resetForm();
      onReload();
    } catch {
      toast.error('Erro ao salvar credor.');
    }
  };

  const handleEditar = (item: Credor) => setDraft({ ...item, contatos: item.contatos.length ? item.contatos : [{ id: generateId(), nome: '', telefone: '', whatsapp: '' }] });

  const handleExcluir = async (id: string) => {
    try {
      await contasPagarDbDriver.deleteCredor(id);
      toast.success('Credor removido.');
      if (draft.id === id) resetForm();
      onReload();
    } catch {
      toast.error('Erro ao remover credor.');
    }
  };

  const updateContato = (id: string, patch: Partial<ContaPagarContatoInfo>) => {
    setDraft(prev => ({ ...prev, contatos: prev.contatos.map(item => item.id === id ? { ...item, ...patch } : item) }));
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>CREDOR</CardTitle>
        {editing && (
          <Button size="sm" variant="ghost" onClick={resetForm}><X className="h-4 w-4" /></Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <div><Label>Nome Empresa</Label><Input value={draft.nomeEmpresa} onChange={(event) => setDraft(prev => ({ ...prev, nomeEmpresa: event.target.value }))} className={editing ? 'text-red-600' : ''} /></div>
          <div><Label>Nome Fantasia</Label><Input value={draft.nomeFantasia || ''} onChange={(event) => setDraft(prev => ({ ...prev, nomeFantasia: event.target.value }))} className={editing ? 'text-red-600' : ''} /></div>
          <div><Label>Rua</Label><Input value={draft.rua || ''} onChange={(event) => setDraft(prev => ({ ...prev, rua: event.target.value }))} className={editing ? 'text-red-600' : ''} /></div>
          <div><Label>Bairro</Label><Input value={draft.bairro || ''} onChange={(event) => setDraft(prev => ({ ...prev, bairro: event.target.value }))} className={editing ? 'text-red-600' : ''} /></div>
          <div><Label>CEP</Label><Input value={draft.cep || ''} onChange={(event) => setDraft(prev => ({ ...prev, cep: event.target.value }))} className={editing ? 'text-red-600' : ''} /></div>
          <div><Label>Número</Label><Input value={draft.numero || ''} onChange={(event) => setDraft(prev => ({ ...prev, numero: event.target.value }))} className={editing ? 'text-red-600' : ''} /></div>
          <div><Label>Telefone</Label><Input value={draft.telefone || ''} onChange={(event) => setDraft(prev => ({ ...prev, telefone: event.target.value }))} className={editing ? 'text-red-600' : ''} /></div>
          <div><Label>WhatsApp</Label><Input value={draft.whatsapp || ''} onChange={(event) => setDraft(prev => ({ ...prev, whatsapp: event.target.value }))} className={editing ? 'text-red-600' : ''} /></div>
        </div>
        <div className="space-y-2">
          <Label>Contatos</Label>
          {draft.contatos.map((contato, index) => (
            <div key={contato.id} className="grid gap-2 md:grid-cols-[1fr_1fr_1fr_auto]">
              <Input value={contato.nome} onChange={(event) => updateContato(contato.id, { nome: event.target.value })} placeholder={`Contato ${index + 1}`} className={editing ? 'text-red-600' : ''} />
              <Input value={contato.telefone || ''} onChange={(event) => updateContato(contato.id, { telefone: event.target.value })} placeholder="Telefone" className={editing ? 'text-red-600' : ''} />
              <Input value={contato.whatsapp || ''} onChange={(event) => updateContato(contato.id, { whatsapp: event.target.value })} placeholder="WhatsApp" className={editing ? 'text-red-600' : ''} />
              <Button type="button" variant="ghost" size="icon" onClick={() => setDraft(prev => ({ ...prev, contatos: prev.contatos.filter(item => item.id !== contato.id) }))}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => setDraft(prev => ({ ...prev, contatos: [...prev.contatos, { id: generateId(), nome: '', telefone: '', whatsapp: '' }] }))}>
            <Plus className="h-4 w-4 mr-1" />Adicionar contato
          </Button>
        </div>
        <Button size="sm" onClick={handleSalvar}><Save className="h-4 w-4 mr-1" />{editing ? 'Atualizar' : 'Salvar'}</Button>

        <div className="space-y-2 pt-2 border-t">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum credor cadastrado.</p>
          ) : items.map(item => (
            <div key={item.id} className="flex items-center gap-2 rounded border px-3 py-2 text-sm">
              <div className="flex-1">
                <span className="font-medium">{item.nomeEmpresa}</span>
                {item.nomeFantasia && <span className="text-muted-foreground"> • {item.nomeFantasia}</span>}
              </div>
              <Button size="icon" variant="ghost" onClick={() => handleEditar(item)}><Pencil className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleExcluir(item.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ===================== GRUPO CARD =====================
function GrupoCard({ items, onReload }: { items: GrupoDespesa[]; onReload: () => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [cor, setCor] = useState('#94a3b8');
  const editing = editingId !== null;

  const resetForm = () => {
    setEditingId(null);
    setNome('');
    setCor('#94a3b8');
  };

  const handleSalvar = async () => {
    const nomeTrim = nome.trim().toUpperCase();
    if (!nomeTrim) return toast.error('Informe o nome do grupo.');
    const item: GrupoDespesa = { id: editingId || generateId(), nome: nomeTrim, cor };
    try {
      await contasPagarDbDriver.saveGrupoDespesa(item);
      toast.success('Grupo salvo com sucesso!');
      resetForm();
      onReload();
    } catch {
      toast.error('Erro ao salvar grupo.');
    }
  };

  const handleEditar = (item: GrupoDespesa) => {
    setEditingId(item.id);
    setNome(item.nome);
    setCor(item.cor || '#94a3b8');
  };

  const handleExcluir = async (id: string) => {
    try {
      await contasPagarDbDriver.deleteGrupoDespesa(id);
      toast.success('Grupo removido.');
      if (editingId === id) resetForm();
      onReload();
    } catch {
      toast.error('Erro ao remover grupo.');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>GRUPO DE DESPESA</CardTitle>
        {editing && (
          <Button size="sm" variant="ghost" onClick={resetForm}><X className="h-4 w-4" /></Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 md:grid-cols-[1fr_auto]">
          <Input value={nome} onChange={(event) => setNome(event.target.value)} placeholder="Nome do grupo" className={editing ? 'text-red-600' : ''} />
          <Input type="color" value={cor} onChange={(event) => setCor(event.target.value)} className="w-16 p-1" />
        </div>
        <Button size="sm" onClick={handleSalvar}><Save className="h-4 w-4 mr-1" />{editing ? 'Atualizar' : 'Salvar'}</Button>

        <div className="space-y-2 pt-2 border-t">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum grupo cadastrado.</p>
          ) : items.map(item => (
            <div key={item.id} className="flex items-center gap-2 rounded border px-3 py-2 text-sm">
              <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: item.cor || '#94a3b8' }} />
              <span className="flex-1 font-medium">{item.nome}</span>
              <Button size="icon" variant="ghost" onClick={() => handleEditar(item)}><Pencil className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleExcluir(item.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ===================== DESPESA CARD =====================
function DespesaCard({ items, grupos, onReload }: { items: DespesaFixa[]; grupos: GrupoDespesa[]; onReload: () => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [grupoId, setGrupoId] = useState('');
  const [valorPadrao, setValorPadrao] = useState('');
  const [recorrente, setRecorrente] = useState(true);
  const [diaVencimento, setDiaVencimento] = useState('');
  const editing = editingId !== null;

  const resetForm = () => {
    setEditingId(null);
    setNome('');
    setGrupoId('');
    setValorPadrao('');
    setRecorrente(true);
    setDiaVencimento('');
  };

  const handleSalvar = async () => {
    const nomeTrim = nome.trim();
    const valor = Number(valorPadrao.replace(',', '.'));
    if (!nomeTrim) return toast.error('Informe o nome da despesa.');
    if (!grupoId) return toast.error('Selecione o grupo.');
    if (!Number.isFinite(valor) || valor < 0) return toast.error('Informe um valor padrão válido.');
    const dia = diaVencimento ? Number(diaVencimento) : undefined;
    const item: DespesaFixa = {
      id: editingId || generateId(),
      nome: nomeTrim,
      grupoId,
      valorPadrao: valor,
      recorrente,
      diaVencimento: dia,
    };
    try {
      await contasPagarDbDriver.saveDespesaFixa(item);
      toast.success('Despesa fixa salva com sucesso!');
      resetForm();
      onReload();
    } catch {
      toast.error('Erro ao salvar despesa.');
    }
  };

  const handleEditar = (item: DespesaFixa) => {
    setEditingId(item.id);
    setNome(item.nome);
    setGrupoId(item.grupoId);
    setValorPadrao(String(item.valorPadrao));
    setRecorrente(item.recorrente);
    setDiaVencimento(item.diaVencimento ? String(item.diaVencimento) : '');
  };

  const handleExcluir = async (id: string) => {
    try {
      await contasPagarDbDriver.deleteDespesaFixa(id);
      toast.success('Despesa removida.');
      if (editingId === id) resetForm();
      onReload();
    } catch {
      toast.error('Erro ao remover despesa.');
    }
  };

  const grupoNome = (id: string) => grupos.find(item => item.id === id)?.nome || 'Sem grupo';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>DESPESA FIXA</CardTitle>
        {editing && (
          <Button size="sm" variant="ghost" onClick={resetForm}><X className="h-4 w-4" /></Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 md:grid-cols-2">
          <Input value={nome} onChange={(event) => setNome(event.target.value)} placeholder="Nome da despesa fixa" className={editing ? 'text-red-600' : ''} />
          <Select value={grupoId || 'none'} onValueChange={(value) => setGrupoId(value === 'none' ? '' : value)}>
            <SelectTrigger className={editing ? 'text-red-600' : ''}><SelectValue placeholder="Grupo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Selecione</SelectItem>
              {grupos.map(grupo => <SelectItem key={grupo.id} value={grupo.id}>{grupo.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input value={valorPadrao} onChange={(event) => setValorPadrao(event.target.value)} placeholder="Valor padrão (R$)" className={editing ? 'text-red-600' : ''} />
          <Input value={diaVencimento} onChange={(event) => setDiaVencimento(event.target.value.replace(/\D/g, ''))} placeholder="Dia de vencimento (opcional)" className={editing ? 'text-red-600' : ''} />
          <div className="flex items-center gap-2 md:col-span-2">
            <Switch checked={recorrente} onCheckedChange={setRecorrente} />
            <span className="text-sm">Recorrente</span>
          </div>
        </div>
        <Button size="sm" onClick={handleSalvar}><Save className="h-4 w-4 mr-1" />{editing ? 'Atualizar' : 'Salvar'}</Button>

        <div className="space-y-2 pt-2 border-t">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma despesa fixa cadastrada.</p>
          ) : items.map(item => (
            <div key={item.id} className="flex items-center gap-2 rounded border px-3 py-2 text-sm">
              <div className="flex-1">
                <span className="font-medium">{item.nome}</span>
                <span className="text-muted-foreground"> • {grupoNome(item.grupoId)} • R$ {item.valorPadrao.toFixed(2)}</span>
              </div>
              <Button size="icon" variant="ghost" onClick={() => handleEditar(item)}><Pencil className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleExcluir(item.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ===================== MAIN COMPONENT =====================
export function ConfiguracoesContasPagar() {
  const { tituloConfigs, credores, gruposDespesa, despesasFixas, loading, reload } = useContasPagarCatalog();

  if (loading) {
    return <div className="py-10 text-center text-muted-foreground">Carregando configurações...</div>;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <TituloCard items={tituloConfigs} onReload={reload} />
      <CredorCard items={credores} onReload={reload} />
      <DespesaCard items={despesasFixas} grupos={gruposDespesa} onReload={reload} />
      <GrupoCard items={gruposDespesa} onReload={reload} />
    </div>
  );
}
