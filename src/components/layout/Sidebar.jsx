import React from 'react';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Store, 
  Receipt, 
  Settings, 
  Users, 
  ChevronLeft, 
  ChevronRight,
  Boxes
} from 'lucide-react';

export function Sidebar({ currentRoute, setCurrentRoute, isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }) {
  const navGroups = [
    {
      label: 'WORKSPACE',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'inventory', label: 'Inventory', icon: Package },
        { id: 'procurement', label: 'Procurement', icon: ShoppingCart },
        { id: 'sales', label: 'Sales & POS', icon: Store },
        { id: 'accounts', label: 'Accounts / Invoices', icon: Receipt },
      ]
    },
    {
      label: 'ADMINISTRATION',
      items: [
        { id: 'settings', label: 'Settings', icon: Settings },
        { id: 'users', label: 'User Management', icon: Users },
      ]
    }
  ];

  const sidebarClasses = `fixed inset-y-0 left-0 z-40 bg-slate-900 text-slate-300 transition-all duration-300 flex flex-col border-r border-slate-800 ${
    isCollapsed ? 'w-20' : 'w-64'
  } ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`;

  return (
    <aside className={sidebarClasses}>
      {/* Brand Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="bg-blue-600 text-white p-2 rounded-lg flex-shrink-0">
            <Boxes className="w-5 h-5" />
          </div>
          {!isCollapsed && (
            <div className="leading-tight">
              <span className="font-bold text-white tracking-wider text-base block">NEXUS ERP</span>
              <span className="text-xs text-slate-400">Retail Operations</span>
            </div>
          )}
        </div>
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {navGroups.map((group, idx) => (
          <div key={idx}>
            {!isCollapsed && (
              <p className="px-3 mb-2 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                {group.label}
              </p>
            )}
            <nav className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentRoute === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentRoute(item.id);
                      setIsMobileOpen(false);
                    }}
                    title={isCollapsed ? item.label : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive 
                        ? 'bg-blue-600 text-white shadow-sm' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </button>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Footer Info */}
      {!isCollapsed && (
        <div className="p-4 border-t border-slate-800 text-xs text-slate-500">
          <p className="font-medium text-slate-400">AURA Intelligent ERP</p>
          <p>v2.4.0-stable</p>
        </div>
      )}
    </aside>
  );
}