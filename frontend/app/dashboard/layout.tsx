'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/context';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { t, locale, setLocale } = useLanguage();

  const links = [
    { href: '/dashboard', label: t('OVERVIEW') },
    { href: '/dashboard/staking', label: t('STAKING_DIVIDENDS') },
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

        <div style={{ marginTop: 'auto', padding: '20px 10px' }}>
            <div style={{ display: 'flex', gap: '5px', marginBottom: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
                {langs.map((l) => (
                    <button
                        key={l.code}
                        onClick={() => setLocale(l.code as any)}
                        style={{
                            padding: '5px 8px',
                            fontSize: '0.6rem',
                            background: locale === l.code ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.05)',
                            color: locale === l.code ? '#000' : '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            transition: 'all 0.2s'
                        }}
                    >
                        {l.label}
                    </button>
                ))}
            </div>
            <button className="btn-premium" style={{width: '100%', fontSize: '0.7rem'}}>
                {t('DISCONNECT')}
            </button>
        </div>
      </aside>
      <main className="dashboard-content">
        {children}
      </main>
    </div>
  );
}
