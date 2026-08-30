import React from 'react';
import { Navbar } from './Navbar';
import { Footer } from '../common/Footer';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-[#030712] text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      <Navbar />
      <main className="flex-1 w-full max-w-[1600px] mx-auto px-2 sm:px-4 py-3">{children}</main>
      <Footer />
    </div>
  );
};

