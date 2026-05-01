import { useState } from 'react';
import { Cliente } from '@/types/titulo';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Pencil, X, Search, UserPlus } from 'lucide-react';
import { generateId } from '@/lib/storage';
import { toast } from 'sonner';

const ESTADOS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
];

interface Props {
  clientes: Cliente[];
  onUpdate: (clientes: Cliente[]) => void;
}

const empty: Omit<Cliente, 'id'> = {
  nome: '', telefone: '', email: '', dataNascimento: '', cpfCnpj: '', cep: '', logradouro: '', numero: '', bairro: '', cidade: '', estado: '',
};

export function ClientesManager({ clientes, onUpdate }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [data, setData] = useState<Omit<Cliente, 'id'>>(empty);
  const [busca, setBusca] = useState('');
  const [loadingCep, setLoadingCep] = useState(false);

  const open = (c?: Cliente) => {
    if (c) {
      setEditing(c);
      setData({ ...c });
    } else {
      setEditing(null);
      setData(empty);
    }
    setShowForm(true);
  };

  const close = () => {
    setShowForm(false);
    setEditing(null);
    setData(empty);
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

  const handleSave = () => {
    if (!data.nome.trim()) {
      toast.error('Nome é obrigatório');
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
    onUpdate(clientes.filter(c => c.id !== id));
    toast.success('Cliente removido');
  };

  const filtrados = clientes.filter(c =>
    c.nome.toLowerCase().includes(busca.toLowerCase()) ||
    c.telefone.includes(busca)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Clientes ({clientes.length})</h2>
        {!showForm && (
          <Button size="sm" onClick={() => open()}>
            <UserPlus className="h-4 w-4 mr-1" /> Novo
          </Button>
        )}
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
            <div>
              <Label className="text-xs">CPF/CNPJ</Label>
              <Input
                value={data.cpfCnpj || ''}
                onChange={e => setData({ ...data, cpfCnpj: e.target.value })}
                placeholder="000.000.000-00"
              />
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
          {filtrados.map(c => (
            <Card key={c.id}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{c.nome}</p>
                    {c.telefone && <p className="text-xs text-muted-foreground">📱 {c.telefone}</p>}
                    {(c.logradouro || c.cidade) && (
                      <p className="text-xs text-muted-foreground truncate">
                        📍 {[c.logradouro, c.numero].filter(Boolean).join(', ')}
                        {c.bairro ? ` - ${c.bairro}` : ''}
                        {c.cidade ? `, ${c.cidade}` : ''}{c.estado ? `/${c.estado}` : ''}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => open(c)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleRemove(c.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
