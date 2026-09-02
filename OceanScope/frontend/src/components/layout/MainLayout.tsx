import React from 'react';
import { Navbar } from './Navbar';
import { Footer } from '../common/Footer';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-[#F7F9FC] text-[#172033] font-sans selection:bg-sky-100 selection:text-sky-900">
      <Navbar />
      <main className="flex-1 w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-6">{children}</main>
      <Footer />
    </div>
  );
};

