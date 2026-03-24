'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/context';
import { WalletButton } from '@/components/ui/WalletButton';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { t, locale, setLocale } = useLanguage();

  const links = [
    { href: '/dashboard', label: t('OVERVIEW') },
    { href: '/dashboard/staking', label: t('STAKING') },
  ];

  const langs = [
    { code: 'en', label: 'EN' },
    { code: 'es', label: 'ES' },
    { code: 'it', label: 'IT' },
    { code: 'jp', label: 'JP' },
    { code: 'zh', label: 'ZH' },
  ] as const;

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div style={{ marginBottom: '40px', padding: '0 10px' }}>
          <h1 style={{ fontSize: '1rem', color: '#fff', lineHeight: '1.2' }}>
            SMDT <br/>
            <span style={{fontSize: '0.7rem', opacity: 0.7}}>SPOT MASTER</span> <br/>
            <span className="glow-text-cyan" style={{fontSize: '0.9rem'}}>DIGITAL TOKEN</span>
          </h1>
          <p style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '2px', marginTop: '5px' }}>
            {t('PROTOCOL_DASHBOARD')}
          </p>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`sidebar-link ${pathname === link.href ? 'active' : ''}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div style={{ marginTop: 'auto', padding: '20px 10px 40px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* Language Selection Grid (3-2) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '25px', width: '100%' }}>
                {/* Row 1: EN, ES, IT */}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    {langs.slice(0, 3).map((l) => (
                        <button
                            key={l.code}
                            onClick={() => setLocale(l.code as any)}
                            style={{
                                padding: '8px 12px',
                                fontSize: '0.8rem',
                                background: locale === l.code ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.05)',
                                color: locale === l.code ? '#000' : '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                transition: 'all 0.2s',
                                minWidth: '45px'
                            }}
                        >
                            {l.label}
                        </button>
                    ))}
                </div>
                {/* Row 2: JP, ZH */}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    {langs.slice(3).map((l) => (
                        <button
                            key={l.code}
                            onClick={() => setLocale(l.code as any)}
                            style={{
                                padding: '8px 12px',
                                fontSize: '0.8rem',
                                background: locale === l.code ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.05)',
                                color: locale === l.code ? '#000' : '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                transition: 'all 0.2s',
                                minWidth: '45px'
                            }}
                        >
                            {l.label}
                        </button>
                    ))}
                </div>
            </div>
            <WalletButton />
        </div>
      </aside>
      <main className="dashboard-content">
        {children}
      </main>
    </div>
  );
}
