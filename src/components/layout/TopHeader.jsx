import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Bell, User, Settings, LogOut, Menu, ChevronDown } from 'lucide-react';

export function TopHeader({ currentRoute, setIsMobileOpen }) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatTitle = (route) => {
    switch(route) {
      case 'dashboard': return 'Dashboard';
      case 'inventory': return 'Inventory & Stock';
      case 'procurement': return 'Procurement & Purchase Orders';
      case 'sales': return 'Sales & POS Terminal';
      case 'accounts': return 'Accounts & Invoices';
      case 'settings': return 'System Settings';
      case 'users': return 'User Management';
      default: return 'Dashboard';
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 h-16 px-4 md:px-8 flex items-center justify-between shadow-xs">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => setIsMobileOpen(true)}
          className="md:hidden text-slate-600 hover:text-slate-900 p-1 rounded"
        >
          <Menu className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-semibold text-slate-900 capitalize">
          {formatTitle(currentRoute)}
        </h1>
      </div>

      <div className="flex items-center gap-6">
        {/* Store Selector */}
        <div className="hidden sm:flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700">
          <MapPin className="w-3.5 h-3.5 text-blue-600" />
          <span>Margao Store #1</span>
        </div>

        {/* Network Status */}
        <div className="hidden lg:flex items-center gap-2 text-xs font-medium text-slate-600">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Connected</span>
        </div>

        {/* Notifications */}
        <button className="relative text-slate-600 hover:text-slate-900 p-1.5 rounded-full hover:bg-slate-100">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full"></span>
        </button>

        {/* User Profile Dropdown */}
        <div className="relative" ref={menuRef}>
          <button 
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-3 focus:outline-none"
          >
            <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-semibold text-sm flex items-center justify-center shadow-xs">
              RR
            </div>
            <div className="hidden md:block text-left">
              <span className="text-sm font-medium text-slate-900 block leading-tight">Rhea Rodrigues</span>
              <span className="text-xs text-slate-500 block">Administrator</span>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 hidden md:block" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50 animate-fade-in">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-medium text-slate-900">Rhea Rodrigues</p>
                <p className="text-xs text-slate-500">rhearodrigues106@gmail.com</p>
              </div>
              <button className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                <User className="w-4 h-4 text-slate-400" /> Profile
              </button>
              <button className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                <Settings className="w-4 h-4 text-slate-400" /> Preferences
              </button>
              <div className="border-t border-slate-100 my-1"></div>
              <button 
                onClick={() => alert('Signed out successfully (Prototype session)')}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 font-medium"
              >
                <LogOut className="w-4 h-4 text-rose-500" /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}