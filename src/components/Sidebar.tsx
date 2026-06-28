import { useState, useEffect } from 'react';
import {
  LayoutDashboard, List, ShoppingCart, Users,
  ScrollText, BarChart3, Settings2, LogOut, X, Cake, ChevronDown, Receipt
} from 'lucide-react';

type Tab = 'lista' | 'dashboard' | 'relatorios' | 'clientes' | 'promissoria' | 'vendas' | 'config' | 'aniversariantes' | 'contas-pagar';

interface SidebarProps {
  tab: Tab;
  onTabChange: (t: Tab) => void;
  onLogout: () => void;
  userName: string;
  userLevel: string;
  logoEmpresa?: string;
}

const NAV_ITEMS: { id: Exclude<Tab, 'config' | 'contas-pagar'>; icon: React.FC<{ className?: string }>; label: string }[] = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'lista', icon: List, label: 'Títulos' },
  { id: 'vendas', icon: ShoppingCart, label: 'Vendas' },
  { id: 'clientes', icon: Users, label: 'Clientes' },
  { id: 'aniversariantes', icon: Cake, label: 'Aniversariantes' },
  { id: 'promissoria', icon: ScrollText, label: 'Promissórias' },
  { id: 'relatorios', icon: BarChart3, label: 'Relatórios' },
];

export function Sidebar({ tab, onTabChange, onLogout, userName, userLevel, logoEmpresa }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(tab === 'config' || tab === 'contas-pagar');

  useEffect(() => {
    setMobileOpen(false);
  }, [tab]);

  useEffect(() => {
    if (tab === 'config' || tab === 'contas-pagar') {
      setConfigOpen(true);
    }
  }, [tab]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const initial = userName ? userName.charAt(0).toUpperCase() : '?';

  return (
    <>
      <button
        className="zoom-hamburger"
        onClick={() => setMobileOpen(v => !v)}
        aria-label="Menu"
      >
        {mobileOpen ? <X className="w-5 h-5 text-white" /> : (
          <>
            <span /><span /><span />
          </>
        )}
      </button>

      {mobileOpen && (
        <div className="zoom-overlay active" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`zoom-sidebar${mobileOpen ? ' mobile-open' : ''}`}>
        <div className="zoom-sidebar-header">
          <div className="zoom-logo-box">
            {logoEmpresa ? (
              <img src={logoEmpresa} alt="Logo" />
            ) : (
              'ZOOM'
            )}
          </div>
          <div className="zoom-sidebar-title">
            Controle
            <span>FINANCEIRO</span>
          </div>
        </div>

        <nav className="zoom-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={`zoom-nav-btn${tab === item.id ? ' active' : ''}`}
              onClick={() => onTabChange(item.id)}
            >
              <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
              {item.label}
            </button>
          ))}

          <div className="space-y-1">
            <button
              className={`zoom-nav-btn${tab === 'config' || tab === 'contas-pagar' ? ' active' : ''}`}
              onClick={() => setConfigOpen(value => !value)}
              aria-expanded={configOpen}
            >
              <Settings2 className="w-[18px] h-[18px] flex-shrink-0" />
              <span className="flex-1 text-left">Configurações</span>
              <ChevronDown className={`w-4 h-4 transition-transform${configOpen ? ' rotate-180' : ''}`} />
            </button>

            {configOpen && (
              <div className="ml-4 space-y-1 border-l border-white/10 pl-3">
                <button
                  className={`zoom-nav-btn text-sm${tab === 'config' ? ' active' : ''}`}
                  onClick={() => onTabChange('config')}
                >
                  <Settings2 className="w-[16px] h-[16px] flex-shrink-0" />
                  Configurações Gerais
                </button>

                {userLevel === 'MASTER' && (
                  <button
                    className={`zoom-nav-btn text-sm${tab === 'contas-pagar' ? ' active' : ''}`}
                    onClick={() => onTabChange('contas-pagar')}
                  >
                    <Receipt className="w-[16px] h-[16px] flex-shrink-0" />
                    Contas a Pagar
                  </button>
                )}
              </div>
            )}
          </div>
        </nav>

        <div className="zoom-sidebar-footer">
          <div className="zoom-user-badge">
            <div className="zoom-avatar">{initial}</div>
            <div className="zoom-user-info">
              <span className="zoom-user-name">{userName}</span>
              <span className="zoom-user-role">{userLevel}</span>
            </div>
          </div>
          <button className="zoom-logout-btn" onClick={onLogout}>
            <LogOut className="w-4 h-4" />
            Sair
          </button>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)', textAlign: 'center', marginTop: '8px', letterSpacing: '0.05em' }}>v2.2.0</p>
        </div>
      </aside>
    </>
  );
}