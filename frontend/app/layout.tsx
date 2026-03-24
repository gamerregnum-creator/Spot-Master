import type { Metadata } from "next";
import { Orbitron, Saira } from "next/font/google";
import "./globals.css";

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["700", "900"],
});

const saira = Saira({
  variable: "--font-saira",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Regna Revolution | Premium Gaming Ecosystem",
  description: "Hybrid physical/digital gaming ecosystem powered by Solana.",
};

import { ClerkProvider } from "@clerk/nextjs";
import { LanguageProvider } from "@/lib/i18n/context";
import { WalletContextProvider } from "@/components/providers/WalletContextProvider";
import UserSync from "@/components/auth/UserSync";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={`${orbitron.variable} ${saira.variable}`}>
          <LanguageProvider>
            <WalletContextProvider>
              <UserSync />
              {children}
            </WalletContextProvider>
          </LanguageProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
