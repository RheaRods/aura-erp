import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { TopHeader } from './components/layout/TopHeader';
import { Toast } from './components/ui/Toast';

import { Dashboard } from './pages/Dashboard';
import { Inventory } from './pages/Inventory';
import { Procurement } from './pages/Procurement';
import { Sales } from './pages/Sales';
import { Accounts } from './pages/Accounts';
import { Settings } from './pages/Settings';
import { Users } from './pages/Users';

import { 
  initialInventory, 
  initialPurchaseOrders, 
  initialSalesOrders, 
  initialInvoices, 
  initialUsers 
} from './data/mockData';

export function App() {
  const [currentRoute, setCurrentRoute] = useState('dashboard');
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('nexus_sidebar_collapsed') === 'true';
  });
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [toast, setToast] = useState(null);

  // Core State
  const [inventory, setInventory] = useState(initialInventory);
  const [purchaseOrders, setPurchaseOrders] = useState(initialPurchaseOrders);
  const [salesOrders, setSalesOrders] = useState(initialSalesOrders);
  const [invoices, setInvoices] = useState(initialInvoices);
  const [usersList, setUsersList] = useState(initialUsers);

  useEffect(() => {
    localStorage.setItem('nexus_sidebar_collapsed', isCollapsed);
  }, [isCollapsed]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleUpdatePOStatus = (id, newStatus) => {
    setPurchaseOrders(prev => prev.map(po => po.id === id ? {...po, status: newStatus} : po));
    showToast(`Purchase order ${id} marked as ${newStatus}`);
  };

  const handleAddPO = (newPO) => {
    setPurchaseOrders(prev => [newPO, ...prev]);
    showToast(`Purchase order ${newPO.id} successfully created`);
  };

  const handleCompleteSale = (newOrder) => {
    setSalesOrders(prev => [newOrder, ...prev]);
    showToast(`Sale completed successfully! Order ${newOrder.id} logged.`);
  };

  const handleAddInvoice = (newInv) => {
    setInvoices(prev => [newInv, ...prev]);
    showToast(`Invoice ${newInv.id} extracted & ERP synced`);
  };

  const handleAddUser = (newUser) => {
    setUsersList(prev => [...prev, newUser]);
    showToast(`User ${newUser.name} added successfully`);
  };

  const handleAddItem = (newItem) => {
    setInventory(prev => [newItem, ...prev]);
    showToast(`Item ${newItem.sku} added to inventory`);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <Sidebar 
        currentRoute={currentRoute}
        setCurrentRoute={setCurrentRoute}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* Main Container */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isCollapsed ? 'md:pl-20' : 'md:pl-64'}`}>
        <TopHeader currentRoute={currentRoute} setIsMobileOpen={setIsMobileOpen} />

        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          {currentRoute === 'dashboard' && <Dashboard purchaseOrders={purchaseOrders} />}
          
          {currentRoute === 'inventory' && (
            <Inventory 
              inventoryData={inventory} 
              onAddItem={handleAddItem} 
            />
          )}
          
          {currentRoute === 'procurement' && (
            <Procurement 
              purchaseOrders={purchaseOrders} 
              onUpdateStatus={handleUpdatePOStatus} 
              onAddPO={handleAddPO} 
            />
          )}
          
          {currentRoute === 'sales' && (
            <Sales 
              salesOrders={salesOrders} 
              onCompleteSale={handleCompleteSale} 
            />
          )}
          
          {currentRoute === 'accounts' && (
            <Accounts 
              invoices={invoices} 
              onAddInvoice={handleAddInvoice} 
            />
          )}
          
          {currentRoute === 'settings' && <Settings showToast={showToast} />}
          
          {currentRoute === 'users' && (
            <Users 
              usersList={usersList} 
              onAddUser={handleAddUser} 
            />
          )}
        </main>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

export default App;