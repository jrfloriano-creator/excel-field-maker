import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AppConfig, Usuario } from '@/types/titulo';
import { verifyPin } from '@/lib/storage';
import { ensureMasterUser, SessionUser, setSession } from '@/lib/auth';
import { toast } from 'sonner';

interface Props {
  config: AppConfig;
  onUpdate: (patch: Partial<AppConfig>) => void;
  onLogin: (user: SessionUser) => void;
}

export function LoginScreen({ config, onUpdate, onLogin }: Props) {
  const [usuarios, setUsuarios] = useState<Usuario[]>(config.usuarios || []);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    import('@/lib/auth').then(({ ensureMasterUser }) => {
      ensureMasterUser(config.usuarios).then(u => {
        setUsuarios(u);
        setLoadingUsers(false);
        const hasMaster = (config.usuarios || []).some(x => x.master);
        if (!hasMaster) onUpdate({ usuarios: u });
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [userId, setUserId] = useState('');
  useEffect(() => {
    if (!userId && usuarios.length > 0) {
      setUserId(usuarios.find(u => u.master)?.id || usuarios[0]?.id || '');
    }
  }, [usuarios, userId]);
  const [pin, setPin] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const u = usuarios.find(x => x.id === userId);
    if (!u) { toast.error('Selecione um usuário'); return; }
    if (pin.length !== 4) { toast.error('Senha incorreta'); return; }
    
    const isValid = await verifyPin(pin, u.pin);
    if (!isValid) {
      toast.error('Senha incorreta');
      return;
    }

    if (!u.pin.startsWith('v1:')) {
      const { hashPin } = await import('@/lib/storage');
      const newHash = await hashPin(pin);
      const updated = usuarios.map(x => x.id === u.id ? { ...x, pin: newHash } : x);
      onUpdate({ usuarios: updated });
    }

    onLogin({ id: u.id, nome: u.nome, nivel: u.nivel });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-sm shadow-xl">
        <CardHeader>
          <div className="flex flex-col items-center gap-2">
            {config.logoEmpresa && (
              <img src={config.logoEmpresa} alt="Logo" className="h-16 object-contain" />
            )}
            <CardTitle className="text-center text-xl">💰 Controle Financeiro ZOOM</CardTitle>
            <p className="text-xs text-muted-foreground text-center">Faça login para continuar</p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <Label className="text-xs">Usuário</Label>
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {usuarios.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nome} {u.master ? '(MASTER)' : `(${u.nivel})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Senha (4 dígitos)</Label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="text-center text-2xl tracking-[0.5em]"
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full">Entrar</Button>
            <p className="text-[11px] text-muted-foreground text-center">
              Primeiro acesso: usuário <strong>MASTER</strong>, senha <strong>1111</strong>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
