import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X } from 'lucide-react';

interface PinDialogProps {
  mode: 'setup' | 'verify';
  onSuccess: (pin: string) => void;
  onClose: () => void;
}

export function PinDialog({ mode, onSuccess, onClose }: PinDialogProps) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      setError('A senha deve ter 4 dígitos numéricos');
      return;
    }
    if (mode === 'setup') {
      if (pin !== confirmPin) {
        setError('As senhas não conferem');
        return;
      }
    }
    onSuccess(pin);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-lg">
            {mode === 'setup' ? '🔐 Criar Senha' : '🔒 Digite a Senha'}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={4}
                pattern="\d{4}"
                placeholder="Senha de 4 dígitos"
                value={pin}
                onChange={e => { setPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setError(''); }}
                className="text-center text-2xl tracking-[0.5em]"
                autoFocus
              />
            </div>
            {mode === 'setup' && (
              <div>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  pattern="\d{4}"
                  placeholder="Confirme a senha"
                  value={confirmPin}
                  onChange={e => { setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setError(''); }}
                  className="text-center text-2xl tracking-[0.5em]"
                />
              </div>
            )}
            {error && <p className="text-destructive text-xs text-center">{error}</p>}
            <Button type="submit" className="w-full">
              {mode === 'setup' ? 'Criar Senha' : 'Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
