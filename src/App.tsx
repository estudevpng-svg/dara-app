import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Table as TableIcon, Settings, LogOut, BarChart3, Menu, X, Sun, Moon } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Components
import Dashboard from './components/Dashboard';
import DetailTable from './components/DetailTable';
import AdminPanel from './components/AdminPanel';
import Login from './components/Login';

export default function App() {
  const [user, setUser] = useState<{ email: string; role: string; bidang?: string } | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleLogin = (userData: { email: string; role: string; bidang?: string }) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  return (
    <Router>
      <div className="flex h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300">
        {/* Sidebar */}
        <Sidebar user={user} onLogout={handleLogout} />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <header className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-brand-green dark:text-emerald-400 font-display">
                DARA <span className="text-brand-orange">-</span> Dashboard Realisasi Anggaran
              </h1>
              <p className="text-slate-500 dark:text-slate-400">Dinas Pertanian, Ketahanan Pangan dan Perikanan Kabupaten Ponorogo Tahun 2026</p>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={toggleTheme}
                className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-brand-orange transition-colors shadow-sm"
                title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              >
                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
              </button>
              {user ? (
                <div className="hidden items-center gap-4 md:flex">
                  <div className="text-right">
                    <p className="text-sm font-medium">{user.email}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{user.role === 'super_admin' ? 'Admin' : `User (${user.bidang})`}</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-brand-green flex items-center justify-center text-white font-bold shadow-sm border-2 border-brand-orange">
                    {user.email[0].toUpperCase()}
                  </div>
                </div>
              ) : (
                <Link 
                  to="/login"
                  className="rounded-lg bg-brand-green px-4 py-2 text-sm font-bold text-white hover:bg-brand-green/90 transition-colors shadow-sm border-b-2 border-brand-orange"
                >
                  Login Petugas
                </Link>
              )}
            </div>
          </header>

          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/login" element={user ? <Navigate to="/" /> : <Login onLogin={handleLogin} />} />
            <Route 
              path="/detail" 
              element={user ? <DetailTable /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/admin" 
              element={(user && (user.role === 'super_admin' || user.role === 'admin')) ? <AdminPanel /> : <Navigate to="/login" />} 
            />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

function Sidebar({ user, onLogout }: { user: any; onLogout: () => void }) {
  const [isOpen, setIsOpen] = useState(true);

  const NavItem = ({ to, icon: Icon, label }: { to: string; icon: any; label: string }) => (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-slate-600 dark:text-slate-400 transition-colors hover:bg-brand-orange/10 hover:text-brand-orange group"
    >
      <Icon size={20} className="group-hover:scale-110 transition-transform" />
      <span className={cn("font-bold font-display", !isOpen && "hidden")}>{label}</span>
    </Link>
  );

  return (
    <aside className={cn(
      "flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 backdrop-blur-xl transition-all duration-300",
      isOpen ? "w-64" : "w-20"
    )}>
      <div className="flex h-16 items-center justify-between px-6 border-b border-slate-100 dark:border-slate-800">
        <div className={cn("flex items-center gap-2 text-brand-green dark:text-emerald-400", !isOpen && "hidden")}>
          <BarChart3 className="text-brand-orange" />
          <span className="text-xl font-black font-display tracking-tighter">DARA</span>
        </div>
        <button onClick={() => setIsOpen(!isOpen)} className="text-slate-400 hover:text-brand-orange transition-colors">
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        <NavItem to="/" icon={LayoutDashboard} label="Overview" />
        {user && (
          <>
            <NavItem to="/detail" icon={TableIcon} label="Detail Anggaran" />
            <NavItem to="/admin" icon={Settings} label="Input Data & Progres" />
          </>
        )}
      </nav>

      <div className="border-t border-slate-200 dark:border-slate-800 p-4">
        {user ? (
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-900/30"
          >
            <LogOut size={20} />
            <span className={cn("font-medium", !isOpen && "hidden")}>Logout</span>
          </button>
        ) : (
          <Link
            to="/login"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-brand-green dark:text-emerald-400 transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
          >
            <Settings size={20} />
            <span className={cn("font-medium", !isOpen && "hidden")}>Login Petugas</span>
          </Link>
        )}
      </div>
    </aside>
  );
}
