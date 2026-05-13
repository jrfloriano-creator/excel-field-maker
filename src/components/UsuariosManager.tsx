import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, KeyRound } from 'lucide-react';
import { Usuario, NivelUsuario, AppConfig, ALL_PERMISSOES, PERMISSAO_LABELS, Permissao } from '@/types/titulo';
import { generateId, hashPin } from '@/lib/storage';
import { defaultPermissoes, ensureMasterUser } from '@/lib/auth';
import { toast } from 'sonner';

interface Props {
  config: AppConfig;
  onUpdate: (patch: Partial<AppConfig>) => void;
}

export function UsuariosManager({ config, onUpdate }: Props) {
  const [usuarios, setUsuarios] = useState<Usuario[]>(config.usuarios || []);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    ensureMasterUser(config.usuarios).then(u => {
      setUsuarios(u);
      setLoadingUsers(false);
    });
  }, [config.usuarios]);

  const permissoes = config.permissoes || defaultPermissoes();

  const [nome, setNome] = useState('');
  const [pin, setPin] = useState('');
  const [nivel, setNivel] = useState<NivelUsuario>('USUARIO');
  const [editPin, setEditPin] = useState<{ id: string; valor: string } | null>(null);
  const [nivelAberto, setNivelAberto] = useState<NivelUsuario | null>(null);

  const addUsuario = async () => {
    if (!nome.trim()) { toast.error('Informe o nome'); return; }
    if (pin.length !== 4) { toast.error('Senha deve ter 4 dígitos'); return; }
    const pinHash = await hashPin(pin);
    const novo: Usuario = { id: generateId(), nome: nome.trim(), pin: pinHash, nivel };
    onUpdate({ usuarios: [...usuarios, novo] });
    setNome(''); setPin(''); setNivel('USUARIO');
    toast.success('Usuário cadastrado');
  };

  const removeUsuario = (u: Usuario) => {
    if (u.master) { toast.error('Usuário MASTER não pode ser excluído'); return; }
    onUpdate({ usuarios: usuarios.filter(x => x.id !== u.id) });
  };

  const salvarSenha = async () => {
    if (!editPin) return;
    if (editPin.valor.length !== 4) { toast.error('Senha deve ter 4 dígitos'); return; }
    const pinHash = await hashPin(editPin.valor);
    onUpdate({
      usuarios: usuarios.map(u => u.id === editPin.id ? { ...u, pin: pinHash } : u),
    });
    setEditPin(null);
    toast.success('Senha atualizada');
  };

  const togglePerm = (n: NivelUsuario, p: Permissao) => {
    const lista = permissoes[n] || [];
    const novo = lista.includes(p) ? lista.filter(x => x !== p) : [...lista, p];
    onUpdate({ permissoes: { ...permissoes, [n]: novo } });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">🔑 Usuários do Sistema</CardTitle>
        <p className="text-xs text-muted-foreground">
          Cadastre usuários e defina o nível (USUÁRIO, GERENCIAL ou MASTER).
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {usuarios.map(u => (
          <div key={u.id} className="p-2 bg-secondary rounded space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <p className="text-sm font-medium">{u.nome} {u.master && <span className="text-[10px] bg-primary text-primary-foreground px-1 rounded">MASTER</span>}</p>
                <p className="text-xs text-muted-foreground">{u.nivel}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setEditPin({ id: u.id, valor: '' })}>
                <KeyRound className="h-4 w-4" />
              </Button>
              {!u.master && (
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removeUsuario(u)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            {editPin?.id === u.id && (
              <div className="flex gap-1">
                <Input
                  type="password" inputMode="numeric" maxLength={4}
                  placeholder="Nova senha"
                  value={editPin.valor}
                  onChange={e => setEditPin({ id: u.id, valor: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                  className="text-center tracking-[0.4em]"
                />
                <Button size="sm" onClick={salvarSenha}>OK</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditPin(null)}>X</Button>
              </div>
            )}
          </div>
        ))}

        <div className="space-y-2 pt-2 border-t">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Nome</Label>
              <Input value={nome} onChange={e => setNome(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Nível</Label>
              <Select value={nivel} onValueChange={(v) => setNivel(v as NivelUsuario)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USUARIO">USUÁRIO</SelectItem>
                  <SelectItem value="GERENCIAL">GERENCIAL</SelectItem>
                  <SelectItem value="MASTER">MASTER</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Senha (4 dígitos)</Label>
            <Input
              type="password" inputMode="numeric" maxLength={4}
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className="text-center tracking-[0.4em]"
            />
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={addUsuario}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar Usuário
          </Button>
        </div>

        <div className="pt-3 border-t">
          <p className="text-xs font-medium mb-2">Permissões por nível</p>
          {(['USUARIO','GERENCIAL','MASTER'] as NivelUsuario[]).map(n => (
            <div key={n} className="border rounded mb-2">
              <button
                type="button"
                className="w-full text-left px-2 py-1.5 text-xs font-medium bg-secondary"
                onClick={() => setNivelAberto(nivelAberto === n ? null : n)}
              >
                {n} ({(permissoes[n] || []).length}/{ALL_PERMISSOES.length}) {nivelAberto === n ? '▾' : '▸'}
              </button>
              {nivelAberto === n && (
                <div className="p-2 space-y-1 max-h-64 overflow-y-auto">
                  {n === 'MASTER' && (
                    <p className="text-[10px] text-muted-foreground italic mb-1">MASTER tem acesso total automaticamente.</p>
                  )}
                  {ALL_PERMISSOES.map(p => (
                    <label key={p} className="flex items-start gap-2 text-xs cursor-pointer">
                      <Checkbox
                        checked={n === 'MASTER' ? true : (permissoes[n] || []).includes(p)}
                        disabled={n === 'MASTER'}
                        onCheckedChange={() => togglePerm(n, p)}
                      />
                      <span>{PERMISSAO_LABELS[p]}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
