import React from 'react';
import { Navbar } from './Navbar';
import { Header } from '../common/Header';
import { Footer } from '../common/Footer';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-ocean-950 text-slate-100 font-sans">
      <Header />
      <Navbar />
      <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto">{children}</main>
      <Footer />
    </div>
  );
};
