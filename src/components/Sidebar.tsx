import { useState, useEffect } from 'react';
import {
  LayoutDashboard, List, ShoppingCart, Users,
  ScrollText, BarChart3, Settings2, LogOut, Menu, X, Cake
} from 'lucide-react';

type Tab = 'lista' | 'dashboard' | 'relatorios' | 'clientes' | 'promissoria' | 'vendas' | 'config' | 'aniversariantes';

interface SidebarProps {
  tab: Tab;
  onTabChange: (t: Tab) => void;
  onLogout: () => void;
  userName: string;
  userLevel: string;
  logoEmpresa?: string;
}

const NAV_ITEMS: { id: Tab; icon: React.FC<{ className?: string }>; label: string }[] = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'lista', icon: List, label: 'Títulos' },
  { id: 'vendas', icon: ShoppingCart, label: 'Vendas' },
  { id: 'clientes', icon: Users, label: 'Clientes' },
  { id: 'aniversariantes', icon: Cake, label: 'Aniversariantes' },
  { id: 'promissoria', icon: ScrollText, label: 'Promissórias' },
  { id: 'relatorios', icon: BarChart3, label: 'Relatórios' },
  { id: 'config', icon: Settings2, label: 'Configurações' },
];

export function Sidebar({ tab, onTabChange, onLogout, userName, userLevel, logoEmpresa }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close sidebar when tab changes on mobile
  useEffect(() => {
    setMobileOpen(false);
  }, [tab]);

  // Close on escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const initial = userName ? userName.charAt(0).toUpperCase() : '?';

  return (
    <>
      {/* Hamburger button (mobile only) */}
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

      {/* Overlay */}
      {mobileOpen && (
        <div className="zoom-overlay active" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`zoom-sidebar${mobileOpen ? ' mobile-open' : ''}`}>
        {/* Header */}
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

        {/* Nav */}
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
        </nav>

        {/* Footer */}
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
          <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginTop: '6px' }}>v2.1.1</p>
        </div>
      </aside>
    </>
  );
}
