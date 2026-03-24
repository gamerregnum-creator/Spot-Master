'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/context';
import { WalletButton } from '@/components/ui/WalletButton';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t, locale, setLocale } = useLanguage();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const langs = [
    { code: 'en', label: 'EN' },
    { code: 'es', label: 'ES' },
  ] as const;

  const holderLinks = [
    { href: '/dashboard',         label: t('RESUMEN') },
    { href: '/dashboard/staking', label: t('STAKING') },
  ];

  const adminLinks = [
    { href: '/admin/revenue',  label: t('REVENUE_ROUTER') },
    { href: '/admin/holders',  label: t('HOLDERS') },
  ];

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div style={{ marginBottom: '40px', padding: '0 10px' }}>
        <h1 style={{ fontSize: '1rem', color: '#fff', lineHeight: 1.3 }}>
          SMDT<br />
          <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>SPOT MASTER</span><br />
          <span className="glow-text-pink" style={{ fontSize: '0.9rem' }}>ADMIN PANEL</span>
        </h1>
        <p style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '2px', marginTop: '5px' }}>
          PROTOCOL CONTROL
        </p>
      </div>

      {/* Nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
        {/* Holder section */}
        <div>
          <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', padding: '0 10px', marginBottom: '10px', fontWeight: 'bold', letterSpacing: '1px' }}>
            {t('HOLDER_PORTAL')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {holderLinks.map(({ href, label }) => (
              <Link
                key={href} href={href}
                onClick={() => setSidebarOpen(false)}
                className={`sidebar-link ${pathname === href ? 'active' : ''}`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        {/* Admin section */}
        <div>
          <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', padding: '0 10px', marginBottom: '10px', fontWeight: 'bold', letterSpacing: '1px' }}>
            {t('ADMIN_PORTAL')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {adminLinks.map(({ href, label }) => (
              <Link
                key={href} href={href}
                onClick={() => setSidebarOpen(false)}
                className={`sidebar-link ${pathname === href ? 'active' : ''}`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div style={{ marginTop: 'auto', padding: '20px 10px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '25px', width: '100%', justifyContent: 'center' }}>
          {langs.map(l => (
            <button
              key={l.code}
              onClick={() => setLocale(l.code as any)}
              style={{
                padding: '8px 12px', fontSize: '0.8rem',
                background: locale === l.code ? 'var(--accent-pink)' : 'rgba(255,255,255,0.05)',
                color: locale === l.code ? '#000' : '#fff',
                border: 'none', borderRadius: '4px', cursor: 'pointer',
                fontWeight: 'bold', transition: 'all 0.2s', minWidth: '45px',
              }}
            >
              {l.label}
            </button>
          ))}
        </div>
        <WalletButton />
      </div>
    </>
  );

  return (
    <div className="dashboard-container">
      {/* ── Desktop sidebar ── */}
      <aside className="sidebar admin-sidebar-desktop" style={{ borderColor: 'var(--accent-pink)' }}>
        <SidebarContent />
      </aside>

      {/* ── Mobile topbar ── */}
      <div className="admin-mobile-bar">
        <span style={{ fontFamily: 'var(--font-orbitron)', fontSize: '0.85rem', color: 'var(--accent-pink)', fontWeight: 'bold' }}>
          ADMIN PANEL
        </span>
        <button
          onClick={() => setSidebarOpen(o => !o)}
          style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff', padding: '8px 12px', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1 }}
          aria-label="Toggle menu"
        >
          {sidebarOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* ── Mobile drawer ── */}
      {sidebarOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setSidebarOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)', zIndex: 199 }}
          />
          {/* Drawer */}
          <aside style={{
            position: 'fixed', top: 0, left: 0, bottom: 0, width: '260px',
            background: 'rgba(7,20,40,0.98)', borderRight: '1px solid var(--accent-pink)',
            padding: '30px 20px', display: 'flex', flexDirection: 'column',
            zIndex: 200, overflowY: 'auto',
          }}>
            <SidebarContent />
          </aside>
        </>
      )}

      <main className="dashboard-content admin-main-content">
        {children}
      </main>
    </div>
  );
}
