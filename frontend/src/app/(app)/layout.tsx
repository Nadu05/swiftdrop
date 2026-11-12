import Sidebar from '@/components/Sidebar';

/**
 * App shell layout — renders the sidebar navigation.
 * All non-auth pages (dashboard, health, api-tester) live in this group.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

