'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const links = [
    { href: '/dashboard', label: 'HOLDER PORTAL' },
    { href: '/admin/revenue', label: 'REVENUE ROUTER' },
    { href: '/admin/holders', label: 'HOLDERS' },
  ];

  return (
    <div className="dashboard-container">
      <aside className="sidebar" style={{borderColor: 'var(--accent-pink)'}}>
        <div style={{ marginBottom: '40px', padding: '0 10px' }}>
          <h1 style={{ fontSize: '1rem', color: '#fff', lineHeight: '1.2' }}>
            SMDT <br/>
            <span style={{fontSize: '0.7rem', opacity: 0.7}}>SPOT MASTER</span> <br/>
            <span className="glow-text-pink" style={{fontSize: '0.9rem'}}>ADMIN PANEL</span>
          </h1>
          <p style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '2px', marginTop: '5px' }}>
            PROTOCOL CONTROL
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
            <button className="btn-premium" style={{width: '100%', fontSize: '0.7rem'}}>
                DISCONNECT
            </button>
        </div>
      </aside>
      <main className="dashboard-content">
        {children}
      </main>
    </div>
  );
}
