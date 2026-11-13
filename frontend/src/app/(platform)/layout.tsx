import Sidebar from '@/components/Sidebar';

/**
 * Layout for the existing platform tooling pages (Dashboard, Service Health,
 * API Tester). Kept in a route group so the dispatcher area can use its own
 * sidebar without this one being rendered as well. URLs are unaffected.
 */
export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

