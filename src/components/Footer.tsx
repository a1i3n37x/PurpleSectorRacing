import Link from 'next/link';
import { Youtube, Twitter, Instagram } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="relative border-t border-[var(--purple-primary)]/20 bg-[var(--background-secondary)]">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--purple-primary)] to-[var(--purple-bright)] flex items-center justify-center font-bold text-white text-lg">
                PS
              </div>
              <span className="font-semibold text-lg tracking-tight">
                Purple<span className="text-[var(--purple-bright)]">Sectors</span>Racing
              </span>
            </div>
            <p className="text-[var(--foreground-muted)] text-sm max-w-md mb-6">
              Chasing the perfect lap. Documenting the journey from sim racer to something more.
              Every session, every tenth of a second counts.
            </p>
            {/* Social Links */}
            <div className="flex gap-4">
              <a
                href="#"
                className="p-2 rounded-lg bg-[var(--background-card)] border border-[var(--purple-primary)]/20 text-[var(--foreground-muted)] hover:text-white hover:border-[var(--purple-primary)]/50 transition-all"
                aria-label="YouTube"
              >
                <Youtube size={20} />
              </a>
              <a
                href="#"
                className="p-2 rounded-lg bg-[var(--background-card)] border border-[var(--purple-primary)]/20 text-[var(--foreground-muted)] hover:text-white hover:border-[var(--purple-primary)]/50 transition-all"
                aria-label="Twitter"
              >
                <Twitter size={20} />
              </a>
              <a
                href="#"
                className="p-2 rounded-lg bg-[var(--background-card)] border border-[var(--purple-primary)]/20 text-[var(--foreground-muted)] hover:text-white hover:border-[var(--purple-primary)]/50 transition-all"
                aria-label="Instagram"
              >
                <Instagram size={20} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider text-[var(--foreground-muted)] mb-4">
              Navigation
            </h4>
            <ul className="space-y-2">
              {['Home', 'The Journey', 'Racing Log', 'Content', 'Partners'].map((item) => (
                <li key={item}>
                  <Link
                    href={item === 'Home' ? '/' : `/${item.toLowerCase().replace(' ', '-').replace('the-', '')}`}
                    className="text-sm text-[var(--foreground-muted)] hover:text-white transition-colors"
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider text-[var(--foreground-muted)] mb-4">
              Get in Touch
            </h4>
            <p className="text-sm text-[var(--foreground-muted)] mb-4">
              Interested in partnerships or collaborations?
            </p>
            <Link
              href="/partners"
              className="inline-block text-sm font-medium text-[var(--purple-bright)] hover:text-[var(--purple-glow)] transition-colors"
            >
              Work With Me →
            </Link>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-[var(--purple-primary)]/10 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-[var(--foreground-muted)]">
            © {new Date().getFullYear()} PurpleSectorsRacing. All rights reserved.
          </p>
          <p className="text-xs text-[var(--foreground-muted)]">
            Built with obsession. Fueled by the pursuit of speed.
          </p>
        </div>
      </div>
    </footer>
  );
}
