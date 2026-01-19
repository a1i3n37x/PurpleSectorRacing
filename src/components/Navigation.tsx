'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/journey', label: 'The Journey' },
  { href: '/racing-log', label: 'Racing Log' },
  { href: '/content', label: 'Content' },
  { href: '/partners', label: 'Partners' },
];

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50">
      {/* Background blur */}
      <div className="absolute inset-0 bg-[var(--background)]/80 backdrop-blur-md border-b border-[var(--purple-primary)]/20" />

      <div className="relative max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--purple-primary)] to-[var(--purple-bright)] flex items-center justify-center font-bold text-white text-lg">
                PS
              </div>
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-[var(--purple-primary)] to-[var(--purple-bright)] opacity-0 group-hover:opacity-50 blur-lg transition-opacity" />
            </div>
            <span className="font-semibold text-lg tracking-tight hidden sm:block">
              Purple<span className="text-[var(--purple-bright)]">Sectors</span>Racing
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative px-4 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-white'
                      : 'text-[var(--foreground-muted)] hover:text-white'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute inset-0 bg-[var(--purple-primary)]/30 rounded-lg border border-[var(--purple-primary)]/50"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <span className="relative z-10">{link.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 text-[var(--foreground-muted)] hover:text-white transition-colors"
            aria-label="Toggle menu"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden relative bg-[var(--background-secondary)] border-b border-[var(--purple-primary)]/20"
          >
            <div className="px-6 py-4 space-y-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-[var(--purple-primary)]/30 text-white border border-[var(--purple-primary)]/50'
                        : 'text-[var(--foreground-muted)] hover:bg-[var(--purple-primary)]/10 hover:text-white'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
