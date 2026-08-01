import { useState, useEffect } from 'react';
import { 
    Package, 
    Search, 
    Filter, 
    Plus, 
    AlertTriangle, 
    XCircle,
    ArrowUpRight, 
    Layers, 
    History,
    MoreHorizontal,
    Box,
    Loader2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

const Inventory = () => {
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [stats, setStats] = useState({
        total: 0,
        lowStock: 0,
        outOfStock: 0,
        value: '₹345,000'
    });

    useEffect(() => {
        fetchInventory();
    }, []);

    const fetchInventory = async () => {
        setLoading(true);
        try {
            // Mocking inventory data for now as specific table might not exist
            // If the table exists, we'd query it here.
            setTimeout(() => {
                const mockItems = [
                    { id: 1, name: 'Smart Projector XL-40', category: 'AV Equipment', sku: 'AV-4022', stock: 12, minStock: 5, unit: 'Units', status: 'In Stock' },
                    { id: 2, name: 'Ergonomic Faculty Chairs', category: 'Furniture', sku: 'FN-1002', stock: 45, minStock: 10, unit: 'Units', status: 'In Stock' },
                    { id: 3, name: 'A4 Copier Paper (Rim)', category: 'Stationery', sku: 'ST-001', stock: 3, minStock: 20, unit: 'Rims', status: 'Low Stock' },
                    { id: 4, name: 'Laboratory Microscope', category: 'Lab Supplies', sku: 'LB-902', stock: 0, minStock: 1, unit: 'Units', status: 'Out of Stock' },
                    { id: 5, name: 'Marker Pens (Black)', category: 'Stationery', sku: 'ST-002', stock: 120, minStock: 50, unit: 'Boxes', status: 'In Stock' },
                ];
                setItems(mockItems);
                setStats({
                    total: mockItems.length,
                    lowStock: mockItems.filter(i => i.status === 'Low Stock').length,
                    outOfStock: mockItems.filter(i => i.status === 'Out of Stock').length,
                    value: '₹345,000'
                });
                setLoading(false);
            }, 800);
        } catch (error) {
            console.error('Inventory Fetch Error:', error);
            setLoading(false);
        }
    };

    const filteredItems = items.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return (
        <div className="p-20 flex flex-col items-center justify-center gap-4">
            <Loader2 className="animate-spin text-[#1a1b4b]" size={40} />
            <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest">Scanning Stock Vectors...</p>
        </div>
    );

    return (
        <div className="p-6 sm:p-8 space-y-8 bg-[#fcfdfe] min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-3xl font-black text-[#1a1b4b] uppercase tracking-tighter flex items-center gap-3">
                        <Package size={32} className="text-[#ef4444]" /> Central Inventory
                    </h1>
                    <p className="text-gray-400 font-bold text-[12px] tracking-[0.3em] uppercase mt-1">Campus Resource Management • Live Stock Tracker</p>
                </div>
                
                <div className="flex gap-4">
                    <button className="px-5 py-2.5 bg-white border-2 border-slate-100 rounded-xl flex items-center gap-3 text-[12px] font-black uppercase tracking-widest text-[#1a1b4b] hover:border-[#1a1b4b]/20 transition-all outline-none">
                        <History size={16} /> Audit Log
                    </button>
                    <button className="px-5 py-2.5 bg-[#1a1b4b] text-white rounded-xl flex items-center gap-3 text-[12px] font-black uppercase tracking-widest shadow-xl shadow-[#1a1b4b]/20 hover:bg-[#ef4444] transition-all outline-none">
                        <Plus size={16} /> Add Asset
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Total Assets', value: stats.total, icon: Box, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Inventory Value', value: stats.value, icon: Layers, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                    { label: 'Low Stock', value: stats.lowStock, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', trend: 'Critical' },
                    { label: 'Stockouts', value: stats.outOfStock, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', trend: 'Urgent' },
                ].map((kpi, idx) => (
                    <div key={idx} className="bg-white rounded-[2rem] p-6 border-2 border-slate-50 shadow-sm transition-all group overflow-hidden relative">
                         <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-xl ${kpi.bg} ${kpi.color} shadow-inner`}>
                                <kpi.icon size={20} />
                            </div>
                            {kpi.trend && (
                                <div className="text-right">
                                    <span className={`flex items-center gap-1 text-[11px] font-black ${kpi.color} ${kpi.bg} px-2 py-0.5 rounded-full`}>
                                        {kpi.trend}
                                    </span>
                                </div>
                            )}
                         </div>
                         <h3 className="text-[12px] font-black text-gray-400 uppercase tracking-widest mb-0.5">{kpi.label}</h3>
                         <p className="text-3xl font-black text-[#1a1b4b] tracking-tighter tabular-nums">{kpi.value}</p>
                    </div>
                ))}
            </div>

            {/* Inventory List */}
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white p-6 rounded-3xl border-2 border-slate-50 shadow-sm">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                        <input 
                            type="text" 
                            placeholder="SEARCH BY ASSET NAME OR SKU..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-14 pr-6 text-[12px] font-black tracking-widest outline-none focus:bg-white focus:border-[#1a1b4b]/20 transition-all uppercase placeholder:text-gray-300"
                        />
                    </div>
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <button className="flex-1 md:flex-none px-6 py-4 bg-slate-50 text-gray-400 rounded-2xl text-[12px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:text-[#1a1b4b] transition-colors border border-transparent hover:border-slate-200">
                            <Filter size={16} /> Categories
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-[3rem] border-2 border-slate-50 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50/50">
                                    <th className="px-10 py-6 text-left text-[12px] font-black text-gray-400 uppercase tracking-widest border-b border-slate-100">Asset Detail</th>
                                    <th className="px-10 py-6 text-left text-[12px] font-black text-gray-400 uppercase tracking-widest border-b border-slate-100">Category</th>
                                    <th className="px-10 py-6 text-center text-[12px] font-black text-gray-400 uppercase tracking-widest border-b border-slate-100">Stock Level</th>
                                    <th className="px-10 py-6 text-center text-[12px] font-black text-gray-400 uppercase tracking-widest border-b border-slate-100">Status</th>
                                    <th className="px-10 py-6 text-right text-[12px] font-black text-gray-400 uppercase tracking-widest border-b border-slate-100">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredItems.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-all group">
                                        <td className="px-10 py-8">
                                            <div>
                                                <p className="text-[16px] font-black text-[#1a1b4b] tracking-tight">{item.name}</p>
                                                <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest mt-0.5">SKU: {item.sku}</p>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8 text-sm font-bold text-slate-600">
                                            {item.category}
                                        </td>
                                        <td className="px-10 py-8 text-center text-sm font-black text-[#1a1b4b]">
                                            {item.stock} <span className="text-gray-400 text-xs">{item.unit}</span>
                                        </td>
                                        <td className="px-10 py-8 text-center">
                                            <span className={`px-3 py-1 rounded-md text-[12px] font-black uppercase tracking-widest ${
                                                item.status === 'In Stock' ? 'bg-emerald-50 text-emerald-600' :
                                                item.status === 'Low Stock' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
                                            }`}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="px-10 py-8 text-right">
                                            <button className="p-2.5 bg-gray-50 rounded-xl hover:bg-[#1a1b4b] hover:text-white transition-all">
                                                <MoreHorizontal size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Inventory;
