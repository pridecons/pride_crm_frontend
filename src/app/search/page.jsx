'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Cookies from 'js-cookie';
import { axiosInstance } from '@/api/Axios';
import { Search, X } from 'lucide-react';

const PAGE_SIZE = 20;

export default function SearchPage() {
    const router = useRouter();
    const sp = useSearchParams();

    // URL params
    const urlKind = (sp.get('kind') || '').toLowerCase();    // e.g., 'response'
    const urlValue = sp.get('value') || '';                   // e.g., 'NPC'
    const urlQ = sp.get('q') || '';

    // Local state
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [leads, setLeads] = useState([]);                // raw results from API
    const [respOptions, setRespOptions] = useState([]);    // [{id,name}, ...]
    const [selectedResp, setSelectedResp] = useState('');  // response name filter
    const [page, setPage] = useState(1);
    const debounceRef = useRef(null);

    // Ensure auth header (if not already set globally)
    useEffect(() => {
        const accessToken = Cookies.get('access_token');
        if (accessToken) {
            axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        }
    }, []);

    // Bootstrap: load response options once
    useEffect(() => {
        (async () => {
            try {
                const { data } = await axiosInstance.get('/lead-config/responses/', {
                    baseURL: 'https://crm.24x7techelp.com/api/v1',
                });
                setRespOptions(Array.isArray(data) ? data : []);
            } catch (e) {
                console.error('Failed to load response options', e);
            }
        })();
    }, []);

    // Initialize query and selected response from URL or sessionStorage
    useEffect(() => {
        const saved = typeof window !== 'undefined'
            ? (sessionStorage.getItem('globalSearchQuery') || '')
            : '';

        const initialQ = urlQ || saved || '';
        const initialResp = urlKind === 'response' && urlValue ? urlValue : '';
        setQuery(initialQ);
        setSelectedResp(initialResp);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // run once

    // Fetch search results (debounced on query)
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);

        debounceRef.current = setTimeout(async () => {
            const term = (query || '').trim();
            if (!term) {
                setLeads([]);
                setPage(1);
                return;
            }

            setLoading(true);
            try {
                const url = `/leads/search/?q=${encodeURIComponent(term)}&search_type=all`;
                const { data } = await axiosInstance.get(url, {
                    baseURL: 'https://crm.24x7techelp.com/api/v1',
                });

                const list = Array.isArray(data)
                    ? data
                    : (data?.items || data?.results || data?.leads || []);

                setLeads(list);
                setPage(1);
            } catch (e) {
                console.error('Search failed', e);
                setLeads([]);
                setPage(1);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(debounceRef.current);
    }, [query]);

    // Build maps and counts
    const respMap = useMemo(() => {
        const m = {};
        for (const r of respOptions || []) {
            if (r && r.id != null && r.name) m[r.id] = r.name;
        }
        return m;
    }, [respOptions]);

    const countsByRespId = useMemo(() => {
        const c = {};
        for (const l of leads) {
            let rid = l?.lead_response_id ?? null;

            if (rid == null && l?.lead_response_name) {
                const match = (respOptions || []).find(
                    r => (r.name || '').toLowerCase() === String(l.lead_response_name || '').toLowerCase()
                );
                if (match) rid = match.id;
            }
            if (rid != null) c[rid] = (c[rid] || 0) + 1;
        }
        return c;
    }, [leads, respOptions]);

    // Response summary array including ZERO counts
    const respSummary = useMemo(() => {
        const rows = (respOptions || []).map(r => ({
            id: r.id,
            name: r.name,
            count: countsByRespId[r.id] || 0,
        }));
        rows.sort((a, b) => (b.count - a.count) || a.name.localeCompare(b.name));
        return rows;
    }, [respOptions, countsByRespId]);

    // Filtered results by selected response (by name)
    const filteredLeads = useMemo(() => {
        if (!selectedResp) return leads;
        const target = selectedResp.toLowerCase();
        return leads.filter(l => {
            const byName = (l?.lead_response_name || '').toLowerCase();
            const byIdName = respMap[l?.lead_response_id]?.toLowerCase() || '';
            return byName === target || byIdName === target;
        });
    }, [leads, respMap, selectedResp]);

    // Pagination
    const total = filteredLeads.length;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const pageLeads = useMemo(() => {
        const start = (page - 1) * PAGE_SIZE;
        return filteredLeads.slice(start, start + PAGE_SIZE);
    }, [filteredLeads, page]);

    const goToLead = (id) => router.push(`/dashboard/leads/${id}`);

    // Update URL when filters/search change (replace, no scroll)
    const updateUrl = (next) => {
        const params = new URLSearchParams();
        if (next.q) params.set('q', next.q);
        if (next.kind && next.value) {
            params.set('kind', next.kind);
            params.set('value', next.value);
        }
        router.replace(`/search${params.toString() ? `?${params.toString()}` : ''}`, { scroll: false });
    };

    const handleChipClick = (name) => {
        const nextName = name === selectedResp ? '' : name; // toggle
        setSelectedResp(nextName);
        updateUrl({
            q: (query || '').trim(),
            kind: nextName ? 'response' : undefined,
            value: nextName || undefined,
        });
        setPage(1);
    };

    const clearAll = () => {
        setSelectedResp('');
        setQuery('');
        setLeads([]);
        setPage(1);
        router.replace('/search', { scroll: false });
    };

    return (
        <div className="p-4 md:p-6">

            {/* Results */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 text-gray-600">
                            <tr>
                                <th className="text-left font-medium px-4 py-2">Name</th>
                                <th className="text-left font-medium px-4 py-2">Mobile</th>
                                <th className="text-left font-medium px-4 py-2">Email</th>
                                <th className="text-left font-medium px-4 py-2">Branch</th> {/* NEW */}
                                <th className="text-left font-medium px-4 py-2">Response</th>
                                <th className="text-left font-medium px-4 py-2">Type</th>
                            </tr>
                        </thead>
                        <tbody>
                            {!loading && pageLeads.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                        {query ? 'No results found.' : 'Type something to search.'}
                                    </td>
                                </tr>
                            )}
                            {pageLeads.map((l) => {
                                const respName = l?.lead_response_name || respMap[l?.lead_response_id] || '-';
                                const branchName = l?.branch_name || l?.branch?.name || l?.branch_title || '-'; // NEW

                                return (
                                    <tr
                                        key={l.id}
                                        onClick={() => goToLead(l.id)}
                                        className="border-t hover:bg-blue-50/40 cursor-pointer"
                                    >
                                        <td className="px-4 py-2 font-medium text-gray-900">{l.full_name || '-'}</td>
                                        <td className="px-4 py-2">{l.mobile || '-'}</td>
                                        <td className="px-4 py-2">{l.email || '-'}</td>
                                        <td className="px-4 py-2">{branchName}</td> {/* NEW */}
                                        <td className="px-4 py-2">
                                            <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                                                {respName}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2">
                                            {l.is_client
                                                ? <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-700">Client</span>
                                                : <span className="px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700">Lead</span>}
                                        </td>
                                    </tr>
                                );
                            })}

                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
