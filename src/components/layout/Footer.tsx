export default function Footer() {
  return (
    <footer className="hidden border-t border-[var(--border)] bg-background md:block">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <span className="text-xs text-muted">
          &copy; {new Date().getFullYear()} HOODLRZ. All rights reserved.
        </span>

        <nav className="flex items-center gap-4">
          {/* Placeholder links */}
          <a
            href="#"
            className="text-xs text-muted transition-colors hover:text-foreground"
          >
            Terms
          </a>
          <a
            href="#"
            className="text-xs text-muted transition-colors hover:text-foreground"
          >
            Privacy
          </a>
          <a
            href="#"
            className="text-xs text-muted transition-colors hover:text-foreground"
          >
            Contact
          </a>
        </nav>
      </div>
    </footer>
  );
}
