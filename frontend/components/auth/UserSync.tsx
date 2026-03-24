'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect } from 'react';

export default function UserSync() {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (isLoaded && user) {
      const syncProfile = async () => {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1'}/user/sync`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id: user.id,
              email: user.primaryEmailAddress?.emailAddress,
              display_name: user.fullName || user.username || 'User',
              role: (user.publicMetadata?.role as string) || 'USER',
            }),
          });
          
          if (!res.ok) {
            console.error('Failed to sync user profile');
          }
        } catch (error) {
          console.error('Error syncing user profile:', error);
        }
      };

      syncProfile();
    }
  }, [isLoaded, user]);

  return null;
}
