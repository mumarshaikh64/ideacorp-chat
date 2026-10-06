import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import InviteCustomerModal from '../components/admin/InviteCustomerModal';
import { 
  Hash, 
  Search, 
  Sparkles, 
  Upload, 
  Download, 
  RefreshCw, 
  Phone, 
  Copy, 
  Check, 
  Plus, 
  FileSpreadsheet, 
  ExternalLink, 
  Trash2, 
  AlertCircle, 
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Send,
  Radio,
  Lock,
  Clock
} from 'lucide-react';
import { getSocket } from '../services/socket';

const DEFAULT_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1IKbNNNBmNWJ8EvKh-utBdBpatIoqKB0du4V3RSEejlk/edit?gid=0#gid=0';

export default function NumbersInventoryPage() {
  const [numbers, setNumbers] = useState([]);
  const [stats, setStats] = useState({ total: 0, categories: {}, statuses: {} });
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [limit, setLimit] = useState(50);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Copy feedback state
  const [copiedId, setCopiedId] = useState(null);

  // Modals state
  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);
  const [sheetUrl, setSheetUrl] = useState(DEFAULT_SHEET_URL);
  const [isImportingSheet, setIsImportingSheet] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newNumber, setNewNumber] = useState({
    mssid: '',
    category: 'Silver',
    owner: 'RESELLER MANAGEMENT',
    assignedDate: '',
    status: 'available'
  });
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);

  // Send SMS Invite Modal with this number
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [promoNumberForInvite, setPromoNumberForInvite] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch numbers
  const fetchNumbers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/numbers', {
        params: {
          page,
          limit,
          search: debouncedSearch || undefined,
          category: selectedCategory !== 'all' ? selectedCategory : undefined,
          status: selectedStatus !== 'all' ? selectedStatus : undefined
        }
      });
      if (res.data.success) {
        setNumbers(res.data.numbers || []);
        setTotalCount(res.data.total || 0);
        setTotalPages(res.data.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to fetch numbers:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, debouncedSearch, selectedCategory, selectedStatus]);

  // Fetch stats
  const fetchStats = async () => {
    try {
      const res = await api.get('/numbers/stats');
      if (res.data.success) {
        setStats(res.data.stats || { total: 0, categories: {}, statuses: {} });
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  useEffect(() => {
    fetchNumbers();
  }, [fetchNumbers]);

  useEffect(() => {
    fetchStats();
  }, []);

  const handleCopy = (mssid, id) => {
    navigator.clipboard.writeText(mssid);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Google Sheet Import
  const handleImportGoogleSheet = async (e) => {
    e.preventDefault();
    setIsImportingSheet(true);
    setImportResult(null);

    try {
      const res = await api.post('/numbers/import-google-sheet', { sheetUrl });
      if (res.data.success) {
        setImportResult({
          type: 'success',
          message: res.data.message,
          count: res.data.totalProcessed
        });
        fetchStats();
        fetchNumbers();
      } else {
        setImportResult({
          type: 'error',
          message: res.data.error || 'Failed to import Google Sheet'
        });
      }
    } catch (err) {
      setImportResult({
        type: 'error',
        message: err.response?.data?.error || err.message
      });
    } finally {
      setIsImportingSheet(false);
    }
  };

  // CSV File Upload
  const handleUploadCsv = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await api.post('/numbers/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        setImportResult({
          type: 'success',
          message: res.data.message,
          count: res.data.totalProcessed
        });
        setSelectedFile(null);
        fetchStats();
        fetchNumbers();
        setTimeout(() => setIsUploadModalOpen(false), 2000);
      } else {
        setImportResult({
          type: 'error',
          message: res.data.error || 'Failed to upload CSV'
        });
      }
    } catch (err) {
      setImportResult({
        type: 'error',
        message: err.response?.data?.error || err.message
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Add Single Number
  const handleCreateNumber = async (e) => {
    e.preventDefault();
    if (!newNumber.mssid) return;

    setIsSubmittingNew(true);
    try {
      const res = await api.post('/numbers', newNumber);
      if (res.data.success) {
        setIsAddModalOpen(false);
        setNewNumber({
          mssid: '',
          category: 'Silver',
          owner: 'RESELLER MANAGEMENT',
          assignedDate: '',
          status: 'available'
        });
        fetchStats();
        fetchNumbers();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add number');
    } finally {
      setIsSubmittingNew(false);
    }
  };

  // Update Status
  const handleStatusChange = async (id, status) => {
    try {
      await api.patch(`/numbers/${id}`, { status });
      setNumbers(prev => prev.map(n => n.id === id ? { ...n, status } : n));
      fetchStats();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  // Mark Number as Sold
  const handleMarkSold = async (mssid) => {
    if (!window.confirm(`Mark ${mssid} as SOLD? This number will become permanently unavailable.`)) return;
    try {
      await api.post('/numbers/sell', { mssid });
      fetchNumbers();
      fetchStats();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to mark number as sold');
    }
  };

  // Release Reserved Number back to available pool
  const handleReleaseNumber = async (mssid) => {
    if (!window.confirm(`Release ${mssid} reservation back to the available pool?`)) return;
    try {
      await api.post('/numbers/release', { mssid });
      fetchNumbers();
      fetchStats();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to release number');
    }
  };

  const getExpiryCountdown = (expiryDate) => {
    if (!expiryDate) return '';
    const diff = new Date(expiryDate).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return `${days}d ${remHours}h left`;
  };

  // Real-time socket updates for inventory
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleInventoryUpdate = () => {
      fetchNumbers();
      fetchStats();
    };

    socket.on('numbers:inventory_updated', handleInventoryUpdate);
    return () => {
      socket.off('numbers:inventory_updated', handleInventoryUpdate);
    };
  }, [fetchNumbers]);

  // Delete Number
  const handleDeleteNumber = async (id, mssid) => {
    if (!window.confirm(`Are you sure you want to remove ${mssid} from inventory?`)) return;
    try {
      await api.delete(`/numbers/${id}`);
      setNumbers(prev => prev.filter(n => n.id !== id));
      setTotalCount(prev => Math.max(0, prev - 1));
      fetchStats();
    } catch (err) {
      console.error('Failed to delete number:', err);
    }
  };

  // Export current view as CSV
  const handleExportCsv = () => {
    if (numbers.length === 0) return;
    const headers = ['MSSID', 'Owner', 'Category', 'assigned date', 'status'];
    const rows = numbers.map(n => [
      n.mssid,
      `"${n.owner || ''}"`,
      n.category || '',
      `"${n.assigned_date || ''}"`,
      n.status || ''
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `telecom_numbers_${selectedCategory}_page_${page}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Category badge color
  const getCategoryBadgeClass = (category = '') => {
    const cat = category.toLowerCase();
    if (cat.includes('platinum')) {
      return 'bg-gradient-to-r from-purple-100 to-indigo-100 text-indigo-900 border-indigo-300 font-bold';
    }
    if (cat.includes('gold')) {
      return 'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-900 border-amber-300 font-bold';
    }
    if (cat.includes('silver')) {
      return 'bg-gradient-to-r from-slate-100 to-blue-50 text-slate-800 border-slate-300 font-semibold';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Action Buttons */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-telecom-600 to-indigo-600 text-white flex items-center justify-center shadow-sm">
              <Hash className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Telecom Numbers Inventory
              </h1>
              <p className="text-xs text-slate-500">
                Postpaid Platinum, Gold, Silver & Standard numbers for customer promotions
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              setImportResult(null);
              setIsSheetModalOpen(true);
            }}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Sync from Google Sheet</span>
          </button>

          <button
            onClick={() => {
              setImportResult(null);
              setIsUploadModalOpen(true);
            }}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Upload CSV</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-telecom-50 hover:bg-telecom-100 text-telecom-700 border border-telecom-200 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Single Number</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={numbers.length === 0}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors disabled:opacity-40"
            title="Export page as CSV"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards: Category & Lifecycle Distribution */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Card */}
        <div
          onClick={() => {
            setSelectedCategory('all');
            setSelectedStatus('all');
          }}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            selectedCategory === 'all' && selectedStatus === 'all'
              ? 'bg-telecom-900 text-white border-telecom-900 shadow-md ring-2 ring-telecom-500/20'
              : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs opacity-75 mb-1 font-semibold">
            <span>Total</span>
            <Hash className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl font-black tracking-tight">{stats.total?.toLocaleString() || 0}</div>
          <div className="text-[10px] opacity-70 mt-1">Total in system</div>
        </div>

        {/* Reserved (3-Day Hold) Card */}
        <div
          onClick={() => {
            setSelectedStatus(selectedStatus === 'reserved' ? 'all' : 'reserved');
            setSelectedCategory('all');
          }}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            selectedStatus === 'reserved'
              ? 'bg-gradient-to-tr from-amber-700 to-yellow-600 text-white border-amber-600 shadow-md ring-2 ring-amber-500/20'
              : 'bg-white text-slate-800 border-slate-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-amber-600 mb-1 font-bold">
            <span className="flex items-center gap-1">🟡 Reserved</span>
            <Lock className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-xl font-black text-amber-900 tracking-tight">
            {(stats.statuses?.reserved || 0).toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">3-day locked hold</div>
        </div>

        {/* Platinum Card */}
        <div
          onClick={() => {
            setSelectedCategory('Platinum');
            setSelectedStatus('all');
          }}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            selectedCategory === 'Platinum'
              ? 'bg-gradient-to-tr from-purple-900 to-indigo-900 text-white border-indigo-900 shadow-md ring-2 ring-purple-500/20'
              : 'bg-white text-slate-800 border-slate-200 hover:border-purple-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-indigo-500 mb-1 font-bold">
            <span className="flex items-center gap-1">💎 Platinum</span>
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-xl font-black text-indigo-900 tracking-tight">
            {stats.categories?.Platinum?.toLocaleString() || 0}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Top tier VIP pool</div>
        </div>

        {/* Gold & Gold Plus Card */}
        <div
          onClick={() => {
            setSelectedCategory('Gold');
            setSelectedStatus('all');
          }}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            selectedCategory === 'Gold'
              ? 'bg-gradient-to-tr from-amber-600 to-yellow-500 text-white border-amber-600 shadow-md ring-2 ring-amber-500/20'
              : 'bg-white text-slate-800 border-slate-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-amber-600 mb-1 font-bold">
            <span className="flex items-center gap-1">✨ Gold Tier</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-xl font-black text-amber-900 tracking-tight">
            {((stats.categories?.Gold || 0) + (stats.categories?.['Gold plus'] || 0)).toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Gold & Plus pool
          </div>
        </div>

        {/* Silver & Silver Plus Card */}
        <div
          onClick={() => {
            setSelectedCategory('Silver');
            setSelectedStatus('all');
          }}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            selectedCategory === 'Silver'
              ? 'bg-slate-800 text-white border-slate-800 shadow-md ring-2 ring-slate-500/20'
              : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1 font-bold">
            <span className="flex items-center gap-1">🥈 Silver Tier</span>
            <Hash className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-xl font-black text-slate-900 tracking-tight">
            {((stats.categories?.Silver || 0) + (stats.categories?.['Silver plus'] || 0)).toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Silver & Plus pool
          </div>
        </div>

        {/* Sold / Closed Card */}
        <div
          onClick={() => {
            setSelectedStatus(selectedStatus === 'sold' ? 'all' : 'sold');
            setSelectedCategory('all');
          }}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            selectedStatus === 'sold'
              ? 'bg-rose-900 text-white border-rose-900 shadow-md ring-2 ring-rose-500/20'
              : 'bg-white text-slate-800 border-slate-200 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-rose-600 mb-1 font-bold">
            <span>🔴 Sold Out</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="text-xl font-black text-rose-900 tracking-tight">
            {(stats.statuses?.sold || 0).toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Unavailable</div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search phone number (e.g. 9900, 777)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-telecom-500 focus:bg-white font-mono"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 font-medium">Status:</span>
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="available">🟢 Available</option>
                <option value="reserved">🟡 Reserved (3-Day Hold)</option>
                <option value="sold">🔴 Sold / Unavailable</option>
              </select>
            </div>

            {/* Rows Per Page */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 font-medium">Show:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none cursor-pointer"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pt-1 pb-0.5 border-t border-slate-100 text-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 flex-shrink-0">
            <Filter className="w-3 h-3" /> Category:
          </span>
          {[
            { id: 'all', label: 'All Categories' },
            { id: 'Platinum', label: '💎 Platinum' },
            { id: 'Gold', label: '✨ Gold' },
            { id: 'Gold plus', label: '⭐ Gold Plus' },
            { id: 'Silver', label: '🥈 Silver' },
            { id: 'Silver plus', label: '🥈 Silver Plus' },
            { id: 'Standard', label: 'Standard' }
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategory(cat.id);
                setPage(1);
              }}
              className={`px-3 py-1 rounded-xl text-xs font-medium transition-all flex-shrink-0 whitespace-nowrap cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-telecom-600 text-white font-bold shadow-2xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">MSSID / Phone Number</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Owner / Management</th>
                <th className="py-3 px-4">Assigned Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-telecom-600" />
                    Loading numbers inventory...
                  </td>
                </tr>
              ) : numbers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-16 text-center text-slate-400">
                    <Hash className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm font-semibold text-slate-700">No phone numbers found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Try searching with different terms or click "Sync from Google Sheet" to load inventory.
                    </p>
                  </td>
                </tr>
              ) : (
                numbers.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* MSSID */}
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 text-sm">
                      <div className="flex items-center gap-2">
                        <span>{item.mssid}</span>
                        <button
                          onClick={() => handleCopy(item.mssid, item.id)}
                          className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition-colors"
                          title="Copy phone number"
                        >
                          {copiedId === item.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs border ${getCategoryBadgeClass(item.category)}`}>
                        {item.category?.toLowerCase().includes('platinum') && '💎'}
                        {item.category?.toLowerCase().includes('gold') && '✨'}
                        {item.category?.toLowerCase().includes('silver') && '🥈'}
                        <span>{item.category || 'Standard'}</span>
                      </span>
                    </td>

                    {/* Owner */}
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {item.owner || 'RESELLER MANAGEMENT'}
                    </td>

                    {/* Assigned Date */}
                    <td className="py-3 px-4 text-slate-500 font-mono">
                      {item.assigned_date || '—'}
                    </td>

                    {/* Status Column */}
                    <td className="py-3 px-4">
                      {item.status === 'reserved' ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs">
                            <Lock className="w-3 h-3 text-amber-600" />
                            <span>Reserved (3d)</span>
                          </span>
                          <div className="text-[10px] text-amber-900 font-semibold flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>{getExpiryCountdown(item.reservation_expires_at)}</span>
                          </div>
                          {item.reserved_for_customer_phone && (
                            <div className="text-[10px] text-slate-500 font-mono">
                              👤 {item.reserved_for_customer_phone}
                            </div>
                          )}
                        </div>
                      ) : item.status === 'sold' ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
                            🔴 Sold / Unavailable
                          </span>
                          {item.sold_at && (
                            <div className="text-[10px] text-slate-400">
                              {new Date(item.sold_at).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          🟢 Available
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {item.status === 'reserved' && (
                        <>
                          <button
                            onClick={() => handleMarkSold(item.mssid)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer shadow-2xs"
                            title="Mark as sold (deal finalized)"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Mark Sold</span>
                          </button>

                          <button
                            onClick={() => handleReleaseNumber(item.mssid)}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                            title="Release reservation back to pool"
                          >
                            Release
                          </button>
                        </>
                      )}

                      {item.status === 'available' && (
                        <button
                          onClick={() => {
                            setPromoNumberForInvite(item.mssid);
                            setIsInviteModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-telecom-50 hover:bg-telecom-100 text-telecom-700 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                          title="Send SMS promo showcasing this number"
                        >
                          <Send className="w-3 h-3" />
                          <span>Send Promo</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteNumber(item.id, item.mssid)}
                        className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                        title="Delete number from inventory"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Showing <span className="font-semibold text-slate-800">{numbers.length > 0 ? (page - 1) * limit + 1 : 0}</span> to{' '}
            <span className="font-semibold text-slate-800">{Math.min(page * limit, totalCount)}</span> of{' '}
            <span className="font-semibold text-slate-800">{totalCount.toLocaleString()}</span> numbers
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 transition-colors"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 transition-colors"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Google Sheet Sync Modal */}
      <Modal
        isOpen={isSheetModalOpen}
        onClose={() => setIsSheetModalOpen(false)}
        title="Sync Numbers from Google Sheet"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleImportGoogleSheet} className="space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed">
            Import numbers directly from your Google Sheet. It parses <code className="bg-slate-100 px-1 py-0.5 rounded text-telecom-700 font-mono">MSSID, Owner, Category, assigned date</code> columns and automatically updates your local inventory.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Google Sheet URL
            </label>
            <input
              type="url"
              required
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/.../edit#gid=0"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-telecom-500 focus:bg-white"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Ensure sheet sharing permissions are set to "Anyone with the link can view".
            </span>
          </div>

          {importResult && (
            <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
              importResult.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              {importResult.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1 font-medium">{importResult.message}</div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsSheetModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isImportingSheet}
              className="px-5 py-2 bg-telecom-600 hover:bg-telecom-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              {isImportingSheet ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Importing (Please wait)...</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Start Import</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* CSV File Upload Modal */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Upload Telecom Numbers CSV"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleUploadCsv} className="space-y-4">
          <p className="text-xs text-slate-500">
            Upload any CSV file containing telecom inventory numbers.
          </p>

          <div className="p-4 border-2 border-dashed border-slate-300 hover:border-telecom-500 rounded-2xl bg-slate-50/50 text-center transition-colors">
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <input
              type="file"
              accept=".csv,.txt"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-telecom-50 file:text-telecom-700 hover:file:bg-telecom-100 cursor-pointer"
            />
            {selectedFile && (
              <p className="text-xs font-semibold text-telecom-700 mt-2">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] text-slate-500">
            <span className="font-bold text-slate-700 block mb-1">Expected CSV Columns:</span>
            <code className="font-mono text-telecom-700">MSSID,Owner,Category,assigned date</code>
          </div>

          {importResult && (
            <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
              importResult.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{importResult.message}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedFile || isUploading}
              className="px-5 py-2 bg-telecom-600 hover:bg-telecom-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 transition-all flex items-center gap-1.5"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload & Save</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Single Number Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Single Phone Number"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateNumber} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Phone Number / MSSID <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 971509900011"
              value={newNumber.mssid}
              onChange={(e) => setNewNumber({ ...newNumber, mssid: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-telecom-500 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Category
              </label>
              <select
                value={newNumber.category}
                onChange={(e) => setNewNumber({ ...newNumber, category: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none cursor-pointer"
              >
                <option value="Platinum">💎 Platinum</option>
                <option value="Gold">✨ Gold</option>
                <option value="Gold plus">⭐ Gold plus</option>
                <option value="Silver">🥈 Silver</option>
                <option value="Silver plus">🥈 Silver plus</option>
                <option value="Standard">Standard</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Status
              </label>
              <select
                value={newNumber.status}
                onChange={(e) => setNewNumber({ ...newNumber, status: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none cursor-pointer"
              >
                <option value="available">🟢 Available</option>
                <option value="reserved">🟡 Reserved</option>
                <option value="assigned">⚪ Assigned / Sold</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Owner / Management
            </label>
            <input
              type="text"
              value={newNumber.owner}
              onChange={(e) => setNewNumber({ ...newNumber, owner: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-telecom-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Assigned Date
            </label>
            <input
              type="text"
              placeholder="e.g. 22 Sep"
              value={newNumber.assignedDate}
              onChange={(e) => setNewNumber({ ...newNumber, assignedDate: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-telecom-500 focus:bg-white"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingNew || !newNumber.mssid}
              className="px-5 py-2 bg-telecom-600 hover:bg-telecom-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
            >
              {isSubmittingNew ? 'Saving...' : 'Add Number'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Global SMS Invite Modal pre-filled with selected promotional number */}
      <InviteCustomerModal
        isOpen={isInviteModalOpen}
        onClose={() => {
          setIsInviteModalOpen(false);
          setPromoNumberForInvite('');
        }}
        initialPromoNumber={promoNumberForInvite}
      />
    </div>
  );
}
