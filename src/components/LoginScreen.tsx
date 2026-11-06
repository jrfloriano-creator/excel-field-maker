import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { AppConfig, Usuario } from '@/types/titulo';
import { verifyPin, hashPin } from '@/lib/storage';
import { SessionUser, ensureMasterUser } from '@/lib/auth';
import { toast } from 'sonner';
import { User, Lock } from 'lucide-react';

interface Props {
  config: AppConfig;
  onUpdate: (patch: Partial<AppConfig>) => void;
  onLogin: (user: SessionUser) => void;
  loading?: boolean;
}

export function LoginScreen({ config, onUpdate, onLogin, loading = false }: Props) {
  const [usuarios, setUsuarios] = useState<Usuario[]>(config.usuarios || []);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    if (loading) return;
    ensureMasterUser(config.usuarios).then(u => {
      setUsuarios(u);
      setLoadingUsers(false);
      const hasMaster = (config.usuarios || []).some(x => (x as any).master);
      if (!hasMaster) onUpdate({ usuarios: u });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const [userId, setUserId] = useState('');
  useEffect(() => {
    if (!userId && usuarios.length > 0) {
      setUserId(usuarios.find(u => (u as any).master)?.id || usuarios[0]?.id || '');
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
        backgroundImage: "url('/fundo-loja-roupas.svg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
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
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
          maxWidth: '420px',
          animation: 'loginSlideUp .35s ease',
        }}
      >
        {/* Logo Z */}
        <img
          src="/logo-zoom-rest.png"
          alt="Zoom Rest"
          style={{ 
            width: '180px', 
            height: '180px', 
            marginBottom: '4px',
            objectFit: 'contain',
            filter: 'drop-shadow(0 4px 12px rgba(26, 111, 232, 0.15))'
          }}
        />

        {/* Título */}
        <h1
          style={{
            fontSize: '44px',
            fontWeight: 800,
            color: '#1a6fe8',
            margin: '0 0 36px 0',
            letterSpacing: '-1px',
          }}
        >
          Zoom Loja
        </h1>

        {/* Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px', width: '100%' }}>
          {/* Usuário */}
          <div style={{ position: 'relative' }}>
            <User
              size={22}
              style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#1a6fe8',
                pointerEvents: 'none',
              }}
            />
            {loadingUsers ? (
              <div
                style={{
                  border: '1px solid #d7e3f0',
                  borderRadius: '14px',
                  padding: '15px 16px 15px 50px',
                  fontSize: '15px',
                  color: '#a0aec0',
                  background: '#f4f8fc',
                }}
              >
                Carregando...
              </div>
            ) : (
              <select
                value={userId}
                onChange={e => setUserId(e.target.value)}
                style={{
                  width: '100%',
                  fontFamily: "'Poppins', sans-serif",
                  border: '1px solid #d7e3f0',
                  borderRadius: '14px',
                  padding: '15px 16px 15px 50px',
                  fontSize: '15px',
                  color: '#1a202c',
                  background: 'white',
                  cursor: 'pointer',
                  outline: 'none',
                  appearance: 'auto',
                  boxShadow: '0 2px 8px rgba(0,0,0,.04)',
                }}
              >
                {usuarios.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.nome} {(u as any).master ? '(MASTER)' : `(${u.nivel})`}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Senha */}
          <div style={{ position: 'relative' }}>
            <Lock
              size={22}
              style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#1a6fe8',
                pointerEvents: 'none',
              }}
            />
            <Input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={e => { setPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setError(''); }}
              placeholder="Senha"
              style={{
                paddingLeft: '50px',
                paddingRight: '50px',
                fontSize: '16px',
                letterSpacing: '0.5em',
                fontWeight: 600,
                padding: '15px 16px 15px 50px',
                border: '1px solid #d7e3f0',
                borderRadius: '14px',
                fontFamily: "'Poppins', sans-serif",
                boxShadow: '0 2px 8px rgba(0,0,0,.04)',
                height: 'auto',
              }}
              autoFocus
            />
          </div>

          {error && (
            <div
              style={{
                fontSize: '13px',
                color: '#e53e3e',
                textAlign: 'center',
                padding: '10px 12px',
                background: '#fff5f5',
                borderRadius: '10px',
                border: '1px solid #feb2b2',
              }}
            >
              {error}
            </div>
          )}

          {/* Botão Entrar */}
          <button
            type="submit"
            style={{
              background: 'linear-gradient(135deg, #1a6fe8 0%, #2b8ef0 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '14px',
              padding: '16px',
              fontSize: '16px',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: "'Poppins', sans-serif",
              boxShadow: '0 4px 16px rgba(26,111,232,.35)',
              transition: 'all 0.2s ease',
              marginTop: '4px',
            }}
            onMouseEnter={e => {
              (e.target as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(26,111,232,.5)';
              (e.target as HTMLButtonElement).style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
              (e.target as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(26,111,232,.35)';
              (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
            }}
          >
            Entrar
          </button>

          <p style={{ fontSize: '11px', color: '#718096', textAlign: 'center', marginTop: '4px' }}>
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
