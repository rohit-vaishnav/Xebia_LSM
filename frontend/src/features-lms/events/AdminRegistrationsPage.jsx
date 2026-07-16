import { useState, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useEvents } from './EventsContext';
import { ArrowLeft, Search, Download, ArrowUpDown, ChevronLeft, ChevronRight, ChevronRight as BreadcrumbRight } from 'lucide-react';
import { useToast } from '@/hooks-lms/useToast';

export default function AdminRegistrationsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { events, registrations } = useEvents();
  const { showToast } = useToast();

  const event = useMemo(() => {
    return events.find((ev) => String(ev.id) === String(id));
  }, [events, id]);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('studentName');
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' or 'desc'
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const eventRegs = useMemo(() => {
    return registrations.filter((reg) => String(reg.eventId) === String(id));
  }, [registrations, id]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleExport = () => {
    showToast('Export feature is a frontend placeholder (mock only).', 'info');
  };

  // Filter & Sort
  const processedRegs = useMemo(() => {
    let result = [...eventRegs];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (reg) =>
          reg.studentName.toLowerCase().includes(query) ||
          reg.email.toLowerCase().includes(query) ||
          reg.studentId.toLowerCase().includes(query)
      );
    }

    // Sort
    result.sort((a, b) => {
      const valA = (a[sortField] || '').toString().toLowerCase();
      const valB = (b[sortField] || '').toString().toLowerCase();

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [eventRegs, searchQuery, sortField, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(processedRegs.length / itemsPerPage) || 1;
  const paginatedRegs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return processedRegs.slice(startIndex, startIndex + itemsPerPage);
  }, [processedRegs, currentPage]);

  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, processedRegs.length);

  if (!event) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white">Event Not Found</h2>
        <button onClick={() => navigate('/admin/events')} className="mt-4 text-purple-600 font-bold hover:underline">
          Return to Events
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-brand-surface text-brand-text-primary transition-colors duration-200">
      
      {/* 1. Page Header (Full-Width, aligned with rest of portal) */}
      <div className="flex items-center justify-between px-8 py-5 bg-white dark:bg-slate-900 border-b border-brand-border">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/events')}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-205 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-[10px] font-black uppercase text-slate-400 tracking-wider">
              <span>Events</span>
              <BreadcrumbRight className="h-2.5 w-2.5" />
              <span className="text-[#6C1D5F] dark:text-purple-400">Registrations</span>
            </div>
            
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">{event.title} - Registrations</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
              Review student attendance and registration rosters.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Content Area (Aligned padding: 32px px-8, 28px py-7) */}
      <div className="flex-1 px-8 py-7 space-y-6">
        
        {/* Controls: Search and Export */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-202 dark:border-slate-800 shadow-sm">
          <div className="relative max-w-sm w-full">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-slate-400" />
            </span>
            <input
              type="text"
              placeholder="Search by student, email, ID..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-xl border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-900 pl-10 pr-4 py-2 text-xs font-semibold text-slate-700 dark:text-white placeholder-slate-400 focus:border-[#6C1D5F] focus:outline-none"
            />
          </div>

          <button
            onClick={handleExport}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all opacity-50 cursor-not-allowed"
            title="Export as Excel"
            disabled
          >
            <Download className="h-4 w-4" /> Export to Excel
          </button>
        </div>

        {/* Registrations Table */}
        <div className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-202 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="py-4 px-6 cursor-pointer hover:text-slate-700 dark:hover:text-white select-none" onClick={() => handleSort('studentName')}>
                    <div className="flex items-center gap-1.5">
                      Student Name <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="py-4 px-6 cursor-pointer hover:text-slate-700 dark:hover:text-white select-none" onClick={() => handleSort('email')}>
                    <div className="flex items-center gap-1.5">
                      Email Address <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="py-4 px-6 cursor-pointer hover:text-slate-700 dark:hover:text-white select-none" onClick={() => handleSort('studentId')}>
                    <div className="flex items-center gap-1.5">
                      Student ID <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="py-4 px-6 cursor-pointer hover:text-slate-700 dark:hover:text-white select-none" onClick={() => handleSort('registrationDate')}>
                    <div className="flex items-center gap-1.5">
                      Registration Date <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold text-slate-705 dark:text-slate-300">
                {paginatedRegs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-400 font-medium bg-slate-50/50 dark:bg-slate-950/10">
                      No registrations found.
                    </td>
                  </tr>
                ) : (
                  paginatedRegs.map((reg) => (
                    <tr key={reg.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="py-4 px-6 font-bold text-slate-900 dark:text-white">{reg.studentName}</td>
                      <td className="py-4 px-6 font-mono text-[11px] text-slate-500 dark:text-slate-400">{reg.email}</td>
                      <td className="py-4 px-6">{reg.studentId}</td>
                      <td className="py-4 px-6 text-slate-500 dark:text-slate-400">{reg.registrationDate}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Info Footer */}
          {processedRegs.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 gap-4">
              <div>
                Showing <span className="font-bold text-slate-800 dark:text-white">{startIndex}</span> to{' '}
                <span className="font-bold text-slate-800 dark:text-white">{endIndex}</span> of{' '}
                <span className="font-bold text-slate-800 dark:text-white">{processedRegs.length}</span> registrations
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg text-slate-655 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="font-bold px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg text-slate-655 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
