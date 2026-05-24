import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AppConfig, Usuario } from '@/types/titulo';
import { verifyPin, hashPin } from '@/lib/storage';
import { SessionUser, ensureMasterUser } from '@/lib/auth';
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
    ensureMasterUser(config.usuarios).then(u => {
      setUsuarios(u);
      setLoadingUsers(false);
      const hasMaster = (config.usuarios || []).some(x => x.master);
      if (!hasMaster) onUpdate({ usuarios: u });
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
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const u = usuarios.find(x => x.id === userId);
    if (!u) { setError('Selecione um usuário'); return; }
    if (pin.length !== 4) { setError('Senha deve ter 4 dígitos'); return; }

    const isValid = await verifyPin(pin, u.pin);
    if (!isValid) {
      setError('Usuário ou senha incorretos.');
      return;
    }

    if (!u.pin.startsWith('v1:')) {
      const newHash = await hashPin(pin);
      const updated = usuarios.map(x => x.id === u.id ? { ...x, pin: newHash } : x);
      onUpdate({ usuarios: updated });
    }

    toast.success(`Bem-vindo, ${u.nome}`);
    onLogin({ id: u.id, nome: u.nome, nivel: u.nivel });
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'linear-gradient(135deg, #1a2035 0%, #2d3561 50%, #1a2035 100%)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: "'Poppins', sans-serif",
      }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '20px',
          padding: '40px 36px',
          width: '100%',
          maxWidth: '400px',
          boxShadow: '0 20px 60px rgba(0,0,0,.4)',
          animation: 'loginSlideUp .35s ease',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          {config.logoEmpresa ? (
            <img
              src={config.logoEmpresa}
              alt="Logo"
              style={{
                width: '64px',
                height: '64px',
                objectFit: 'contain',
                borderRadius: '16px',
                margin: '0 auto 14px',
                display: 'block',
              }}
            />
          ) : (
            <div
              style={{
                width: '64px',
                height: '64px',
                background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                fontWeight: 800,
                color: 'white',
                margin: '0 auto 14px',
                boxShadow: '0 6px 20px rgba(79,172,254,.45)',
                letterSpacing: '1px',
              }}
            >
              ZOOM
            </div>
          )}
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1a202c', marginBottom: '4px' }}>
            Controle Financeiro
          </h2>
          <p style={{ fontSize: '12px', color: '#718096' }}>Faça login para continuar</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <Label style={{ fontSize: '12px', fontWeight: 600, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Usuário
            </Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger
                style={{
                  fontFamily: "'Poppins', sans-serif",
                  border: '1px solid #e2e8f0',
                  borderRadius: '9px',
                  marginTop: '5px',
                }}
              >
                <SelectValue />
              </SelectTrigger>
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
            <Label style={{ fontSize: '12px', fontWeight: 600, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Senha (4 dígitos)
            </Label>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={e => { setPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setError(''); }}
              style={{
                textAlign: 'center',
                fontSize: '24px',
                letterSpacing: '0.5em',
                fontWeight: 700,
                padding: '12px',
                border: '1px solid #e2e8f0',
                borderRadius: '9px',
                fontFamily: "'Poppins', sans-serif",
                marginTop: '5px',
              }}
              autoFocus
            />
          </div>

          {error && (
            <div style={{
              fontSize: '12px',
              color: '#e53e3e',
              textAlign: 'center',
              padding: '8px 12px',
              background: '#fff5f5',
              borderRadius: '8px',
              border: '1px solid #feb2b2',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            style={{
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              padding: '12px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: "'Poppins', sans-serif",
              boxShadow: '0 2px 8px rgba(79,172,254,.3)',
              transition: 'all 0.2s ease',
              marginTop: '4px',
            }}
            onMouseEnter={e => {
              (e.target as HTMLButtonElement).style.boxShadow = '0 4px 14px rgba(79,172,254,.5)';
              (e.target as HTMLButtonElement).style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
              (e.target as HTMLButtonElement).style.boxShadow = '0 2px 8px rgba(79,172,254,.3)';
              (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
            }}
          >
            Entrar
          </button>

          <p style={{ fontSize: '11px', color: '#718096', textAlign: 'center' }}>
            Primeiro acesso: usuário <strong>MASTER</strong>, senha <strong>1111</strong>
          </p>
        </form>
      </div>

      <style>{`
        @keyframes loginSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
