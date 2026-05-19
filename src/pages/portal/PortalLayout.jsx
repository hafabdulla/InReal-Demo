
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Building2, 
  TrendingUp, 
  Settings, 
  Menu, 
  X, 
  LogOut,
  User
} from 'lucide-react';
import { useAuth } from '@/contexts/SQLServerAuthContext';

const navigation = [
  { name: 'Dashboard', href: '/portal', icon: LayoutDashboard },
  { name: 'Properties', href: '/portal/properties', icon: Building2 },
  { name: 'My Investments', href: '/portal/investments', icon: TrendingUp },
  { name: 'Settings', href: '/portal/settings', icon: Settings },
];

export default function PortalLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

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
          {/* Logo */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-portal-border-subtle">
            <img 
              src="https://horizons-cdn.hostinger.com/9e1f4551-bf70-48a3-a592-c6f31edcad6a/25979fe1840cf294bcca6defc52c98c7.png" 
              alt="InReal" 
              className="h-6"
            />
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

          {/* User section */}
          <div className="p-4 border-t border-portal-border-subtle">
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-portal-tertiary">
              <div className="w-10 h-10 rounded-full bg-[#01CED1] flex items-center justify-center">
                <User className="w-5 h-5 text-[#0F0F0F]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-portal-primary truncate">Demo User</p>
                <p className="text-xs text-portal-tertiary truncate">demo@inreal.com</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full mt-3 portal-sidebar-link text-portal-tertiary hover:text-red-400"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
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
