export const initialInventory = [
  { id: 1, sku: 'SKU-BAS-001', product: 'Basmati Rice 5kg', category: 'Grains', warehouse: 'Margao Central Whse', available: 120, reserved: 15, reorderLevel: 30, unitCost: 400, status: 'In Stock' },
  { id: 2, sku: 'SKU-SAL-002', product: 'Tata Salt 1kg', category: 'Groceries', warehouse: 'Margao Central Whse', available: 450, reserved: 40, reorderLevel: 100, unitCost: 28, status: 'In Stock' },
  { id: 3, sku: 'SKU-PAR-003', product: 'Parle-G Biscuits', category: 'Snacks', warehouse: 'Ponda Sub-Depot', available: 18, reserved: 5, reorderLevel: 50, unitCost: 10, status: 'Low Stock' },
  { id: 4, sku: 'SKU-SUR-004', product: 'Surf Excel 2kg', category: 'Household', warehouse: 'Margao Central Whse', available: 85, reserved: 10, reorderLevel: 25, unitCost: 430, status: 'In Stock' },
  { id: 5, sku: 'SKU-AML-005', product: 'Amul Butter 500g', category: 'Dairy', warehouse: 'Margao Central Whse', available: 6, reserved: 2, reorderLevel: 20, unitCost: 275, status: 'Low Stock' },
  { id: 6, sku: 'SKU-COC-006', product: 'Coca-Cola 750ml', category: 'Beverages', warehouse: 'Panaji Hub', available: 310, reserved: 50, reorderLevel: 80, unitCost: 45, status: 'In Stock' },
  { id: 7, sku: 'SKU-AAS-007', product: 'Aashirvaad Atta 5kg', category: 'Grains', warehouse: 'Margao Central Whse', available: 95, reserved: 12, reorderLevel: 30, unitCost: 240, status: 'In Stock' },
  { id: 8, sku: 'SKU-KUN-008', product: 'Kunafa Chocolate 200g', category: 'Confectionery', warehouse: 'Margao Central Whse', available: 0, reserved: 0, reorderLevel: 15, unitCost: 450, status: 'Out of Stock' },
  { id: 9, sku: 'SKU-MAG-009', product: 'Maggi Noodles 12-pack', category: 'Snacks', warehouse: 'Ponda Sub-Depot', available: 215, reserved: 30, reorderLevel: 60, unitCost: 140, status: 'In Stock' },
  { id: 10, sku: 'SKU-BRW-0010', product: 'Bru Gold Coffee 50g', category: 'Beverages', warehouse: 'Margao Central Whse', available: 42, reserved: 4, reorderLevel: 20, unitCost: 175, status: 'In Stock' },
];

export const initialPurchaseOrders = [
  { id: 'PO-2026-101', product: 'Basmati Rice 5kg', supplier: 'Goa Wholesale Mart', quantity: 120, estimatedCost: 48000, status: 'Pending', created: '2026-08-12', requestedBy: 'Rhea Rodrigues' },
  { id: 'PO-2026-102', product: 'Amul Butter 500g', supplier: 'Coastal Distributors', quantity: 80, estimatedCost: 22000, status: 'Approved', created: '2026-08-11', requestedBy: 'Rajesh Naik' },
  { id: 'PO-2026-103', product: 'Surf Excel 2kg', supplier: 'Metro FMCG Supply', quantity: 50, estimatedCost: 21500, status: 'Rejected', created: '2026-08-10', requestedBy: 'Rhea Rodrigues' },
  { id: 'PO-2026-104', product: 'Tata Salt 1kg', supplier: 'Goa Wholesale Mart', quantity: 200, estimatedCost: 5600, status: 'Received', created: '2026-08-08', requestedBy: 'Amit Desai' },
  { id: 'PO-2026-105', product: 'Kunafa Chocolate 200g', supplier: 'MiddleEast Imports India', quantity: 100, estimatedCost: 45000, status: 'Pending', created: '2026-08-13', requestedBy: 'Rhea Rodrigues' },
];

export const initialSalesOrders = [
  { id: 'ORD-9012', customer: 'Siera Rodrigues', items: 4, total: 1850, payment: 'UPI / GooglePay', date: '2026-08-13 14:22', status: 'Completed' },
  { id: 'ORD-9011', customer: 'Vikram Volvoikar', items: 2, total: 680, payment: 'Cash', date: '2026-08-13 13:45', status: 'Completed' },
  { id: 'ORD-9010', customer: 'Priya Kamat', items: 7, total: 3420, payment: 'Credit Card', date: '2026-08-13 12:10', status: 'Completed' },
  { id: 'ORD-9009', customer: 'John Fernandes', items: 1, total: 450, payment: 'UPI', date: '2026-08-13 11:05', status: 'Processing' },
];

export const initialInvoices = [
  { id: 'INV-5541', supplier: 'Goa Wholesale Mart', invoiceDate: '2026-08-10', dueDate: '2026-08-25', amount: 48000, status: 'Pending' },
  { id: 'INV-5540', supplier: 'Coastal Distributors', invoiceDate: '2026-08-05', dueDate: '2026-08-20', amount: 22000, status: 'Paid' },
  { id: 'INV-5539', supplier: 'Metro FMCG Supply', invoiceDate: '2026-07-28', dueDate: '2026-08-12', amount: 35400, status: 'Overdue' },
  { id: 'INV-5538', supplier: 'Hindustan Unilever Ltd', invoiceDate: '2026-08-01', dueDate: '2026-08-15', amount: 145000, status: 'Processing' },
];

export const initialUsers = [
  { id: 1, name: 'Rhea Rodrigues', role: 'Administrator', store: 'Margao Store #1', lastActive: 'Active Now', status: 'Active' },
  { id: 2, name: 'Rajesh Naik', role: 'Store Manager', store: 'Margao Store #1', lastActive: '10 mins ago', status: 'Active' },
  { id: 3, name: 'Amit Desai', role: 'Procurement Manager', store: 'Margao Central', lastActive: '1 hour ago', status: 'Active' },
  { id: 4, name: 'Sneha Shirodkar', role: 'Accountant', store: 'Headquarters', lastActive: 'Yesterday', status: 'Active' },
  { id: 5, name: 'Rahul Gaude', role: 'Sales Associate', store: 'Margao Store #1', lastActive: '3 hours ago', status: 'Inactive' },
];

export const initialSuppliers = [
  { id: 1, name: 'Goa Wholesale Mart', category: 'Grains & Staples', rating: 4.6, phone: '+91 98231 44552', onTimeRate: '95%' },
  { id: 2, name: 'Coastal Distributors', category: 'Dairy & Perishables', rating: 4.2, phone: '+91 97654 33211', onTimeRate: '88%' },
  { id: 3, name: 'Metro FMCG Supply', category: 'Household & Cleaning', rating: 3.9, phone: '+91 94220 11889', onTimeRate: '79%' },
  { id: 4, name: 'MiddleEast Imports India', category: 'Specialty Confectionery', rating: 4.8, phone: '+91 91522 77889', onTimeRate: '98%' },
];