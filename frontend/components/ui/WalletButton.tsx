'use client';

import React, { FC, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useLanguage } from '@/lib/i18n/context';

export const WalletButton: FC = () => {
    const { publicKey, disconnect, connecting, connected } = useWallet();
    const { setVisible } = useWalletModal();
    const { t } = useLanguage();

    const handleClick = useCallback(() => {
        if (connected) {
            disconnect();
        } else {
            setVisible(true);
        }
    }, [connected, disconnect, setVisible]);

    const content = connected 
        ? `${publicKey?.toBase58().slice(0, 4)}...${publicKey?.toBase58().slice(-4)}`
        : connecting 
            ? '...' 
            : t('COMMENCE_STAKING').includes('STAKING') ? 'CONNECT WALLET' : 'CONECTAR'; // Basic fallback logic for now

    return (
        <button 
            onClick={handleClick}
            className="btn-premium"
            style={{ 
                width: '100%', 
                marginTop: '10px',
                fontSize: '0.8rem',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '10px',
                minHeight: '45px'
            }}
        >
            <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: connected ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.2)',
                boxShadow: connected ? '0 0 10px var(--accent-cyan)' : 'none'
            }} />
            {content}
        </button>
    );
};
