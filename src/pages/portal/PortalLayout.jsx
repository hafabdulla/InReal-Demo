import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Building2, 
  TrendingUp, 
  FileText,
  ShieldCheck,
  Settings,
  Menu,
  X,
  LogOut,
  User,
  Home
} from 'lucide-react';
import { useAuth } from '@/contexts/SQLServerAuthContext';
import AccountDeclinedNotice from '@/pages/portal/AccountDeclinedNotice';

const navigation = [
  { name: 'Dashboard', href: '/portal', icon: LayoutDashboard },
  { name: 'Properties', href: '/portal/properties', icon: Building2 },
  { name: 'My Investments', href: '/portal/investments', icon: TrendingUp },
  { name: 'My Documents', href: '/portal/documents', icon: FileText },
  // Sits above Settings rather than at the end: for an unapproved investor this
  // is the only page that does anything, so burying it under Settings would
  // hide the one thing standing between them and an approved account.
  { name: 'Verification', href: '/portal/verification', icon: ShieldCheck },
  { name: 'Settings', href: '/portal/settings', icon: Settings },
];

export default function PortalLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  // A declined account never reaches the portal. Intercepting here rather than
  // per-page means a new page added later is covered automatically, instead of
  // silently becoming reachable because someone forgot to add a guard to it.
  //
  // Note this hook order: the interception happens AFTER all hooks above have
  // run, and the early return sits below the remaining hooks too, because
  // returning before a hook would change the hook count between renders and
  // break React. The real access control is the server's anyway — this only
  // decides what the person sees.
  const accountDeclined = user?.KYCStatus === 'Declined';

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
      // Close sidebar on desktop
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    signOut();
    navigate('/auth', { replace: true });
  };

  // Placed after every hook above, so the hook count stays identical between
  // the declined and normal renders.
  if (accountDeclined) {
    return <AccountDeclinedNotice />;
  }

  return (
    <div className="w-full h-screen bg-portal-primary flex flex-col overflow-hidden">
      {/* Mobile sidebar backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar - fixed on all screen sizes */}
      <motion.aside
        initial={false}
        animate={isDesktop ? { x: 0 } : { x: sidebarOpen ? 0 : '-100%' }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="fixed top-0 left-0 h-screen w-64 bg-portal-secondary border-r border-portal-border-subtle z-50"
      >
          <div className="flex flex-col h-full">
          {/* Logo — links home, the convention everywhere else on the web.
              On its own it is not enough (see the "Back to Website" item at the
              bottom): a clickable logo is only discoverable to someone who
              already expects it to be clickable, and the PO's report was
              literally "why can't I go back to the home page?" */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-portal-border-subtle">
            <Link to="/" onClick={() => setSidebarOpen(false)} aria-label="InReal home">
              <img
                src="/logo-dark.png"
                alt="InReal"
                className="h-6 hover:opacity-80 transition-opacity"
              />
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-portal-secondary hover:text-portal-primary transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`portal-sidebar-link ${isActive ? 'portal-sidebar-link-active' : ''}`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* User section — actions first, then the profile card.
              The two actions sit directly under the nav they belong with, and
              the profile card anchors the bottom of the sidebar as a passive
              identity label rather than sitting between the navigation and the
              things you can do with it. */}
          <div className="p-4 border-t border-portal-border-subtle">
            {/* Leaving the portal is not the same as leaving the account, and
                until now the only exit from here was Logout — so "I want to look
                at the website" and "I want to end my session" were the same
                button. Grouped with Logout rather than with the portal sections
                above because it leaves the portal rather than navigating inside
                it, and an active-state check against a portal route would never
                match it anyway. The session is untouched: coming back through
                Dashboard lands straight here, no second sign-in. */}
            <Link
              to="/"
              onClick={() => setSidebarOpen(false)}
              className="w-full portal-sidebar-link text-portal-tertiary hover:text-portal-primary"
            >
              <Home className="w-5 h-5" />
              <span>Back to Website</span>
            </Link>
            <button
              onClick={handleLogout}
              className="w-full mt-1 portal-sidebar-link text-portal-tertiary hover:text-red-400"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
            <div className="flex items-center gap-3 px-4 py-3 mt-3 rounded-lg bg-portal-tertiary">
              <div className="w-10 h-10 rounded-full bg-[#01CED1] flex items-center justify-center">
                <User className="w-5 h-5 text-[#0F0F0F]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-portal-primary truncate">
                  {user?.FirstName && user?.LastName
                    ? `${user.FirstName} ${user.LastName}`
                    : user?.Email || 'User'}
                </p>
                <p className="text-xs text-portal-tertiary truncate">{user?.Email || ''}</p>
              </div>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main layout container */}
      <div className="flex flex-1 overflow-hidden lg:ml-64">
        {/* Main content wrapper */}
        <div className="flex-1 flex flex-col overflow-hidden w-full">
        {/* Top header */}
        <header className="sticky top-0 z-30 bg-portal-secondary border-b border-portal-border-subtle px-5 md:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-portal-primary"
            >
              <Menu className="w-6 h-6" />
            </button>
            
            <div className="flex-1 lg:flex-none">
              <h1 className="text-xl font-bold text-portal-primary">
                Dashboard
              </h1>
            </div>


          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
        </div>
      </div>
    </div>
  );
}