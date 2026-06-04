
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  ArrowRight,
  ArrowUpRight,
  Building2,
  MapPin,
  Download,
  PieChart,
} from 'lucide-react';
import { useAuth } from '@/contexts/SQLServerAuthContext';
import { getApiBase } from '@/lib/utils';

const allocationColors = ['bg-teal-500', 'bg-blue-500', 'bg-violet-500', 'bg-amber-500'];

export default function InvestmentsPage() {
  const { user, session } = useAuth();
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');

  useEffect(() => {
    const fetchInvestments = async () => {
      if (!user?.UserID || !session?.token) {
        setLoading(false);
        return;
      }

      try {
        const authHeaders = session?.token
          ? { Authorization: `Bearer ${session.token}` }
          : {};

        const res = await fetch(`${getApiBase()}/api/user/${user.UserID}/portfolio`, {
          headers: authHeaders,
        });
        const data = await res.json();
        if (data.success && data.data.investments) {
          // Normalize numeric fields and add status for filtering
          const investmentsWithStatus = data.data.investments.map((inv) => ({
            ...inv,
            // Ensure numeric fields are numbers (pg returns numeric as strings)
            InvestmentAmount: Number(inv.InvestmentAmount) || 0,
            DistributionEarned: Number(inv.DistributionEarned) || 0,
            FractionsOwned: Number(inv.FractionsOwned || inv.fractions_owned) || 0,
            // Provide both `status` and `Status` keys used in different places
            status: inv.Status || inv.status || 'Active',
            Status: inv.Status || inv.status || 'Active',
          }));
          setInvestments(investmentsWithStatus);
        }
      } catch (error) {
        console.error('Failed to fetch investments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInvestments();
  }, [user, session]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-slate-grey">Loading investments...</p>
      </div>
    );
  }

  const filteredInvestments = investments.filter((inv) =>
    activeTab === 'active' ? inv.Status === 'Active' : inv.Status === 'Pending'
  );

  // Compute totals from actual data
  const totalInvested = investments.reduce((sum, inv) => sum + (inv.InvestmentAmount || 0), 0);
  const totalCurrentValue = investments.reduce(
    (sum, inv) => sum + (inv.InvestmentAmount || 0) + (inv.DistributionEarned || 0),
    0
  );
  const totalDistributions = investments.reduce((sum, inv) => sum + (inv.DistributionEarned || 0), 0);
  const totalReturnsPct = totalInvested > 0 ? ((totalCurrentValue - totalInvested) / totalInvested) * 100 : 0;

  // Compute allocation percentages from investment amounts
  const portfolioAllocation = investments.map((inv, i) => ({
    name: inv.PropertyName?.split(' ').slice(0, 2).join(' ') || `Property ${i + 1}`,
    percentage: totalInvested > 0 ? Math.round((inv.InvestmentAmount / totalInvested) * 100) : 0,
    color: allocationColors[i % allocationColors.length],
  }));

  const fmt = (n) => {
    const v = Number(n) || 0;
    return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  const fmtInt = (n) => {
    const v = Number(n) || 0;
    return `$${v.toLocaleString('en-US')}`;
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">My Investments</h1>
            <p className="text-gray-500 mt-1">Track and manage your real estate portfolio</p>
          </div>
          <Link
            to="/portal/properties"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-accent hover:bg-steel-blue text-white font-medium rounded-xl transition-colors text-sm"
          >
            <Building2 className="w-4 h-4" />
            Browse Properties
          </Link>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <p className="text-sm text-gray-500">Total Invested</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{fmtInt(totalInvested)}</p>
            <p className="text-sm text-gray-400 mt-1">{investments.length} properties</p>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <p className="text-sm text-gray-500">Current Value</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{fmtInt(totalCurrentValue)}</p>
            <div className="flex items-center gap-1 mt-1">
              <ArrowUpRight className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-medium text-emerald-500">+{totalReturnsPct.toFixed(1)}%</span>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <p className="text-sm text-gray-500">Total Distributions</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{fmt(totalDistributions)}</p>
            <p className="text-sm text-gray-400 mt-1">Lifetime earnings</p>
          </div>
        </div>

        {/* Portfolio Allocation */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="w-5 h-5 text-gray-400" />
            <h3 className="font-semibold text-gray-900">Portfolio Allocation</h3>
          </div>
          <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
            {portfolioAllocation.map((item) => (
              <motion.div
                key={item.name}
                initial={{ width: 0 }}
                animate={{ width: `${item.percentage}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className={`${item.color} rounded-full`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-4 mt-4">
            {portfolioAllocation.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${item.color}`} />
                <span className="text-sm text-gray-600">{item.name}</span>
                <span className="text-sm font-medium text-gray-900">{item.percentage}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'active' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Active ({investments.filter((i) => i.Status === 'Active').length})
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'pending' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Pending ({investments.filter((i) => i.Status === 'Pending').length})
          </button>
        </div>

        {/* Investment Cards */}
        <div className="space-y-4">
          {filteredInvestments.length > 0 ? (
            filteredInvestments.map((inv, index) => (
              <motion.div
                key={inv.InvestmentID}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg">{inv.PropertyName}</h3>
                      <div className="flex items-center gap-1.5 text-gray-500 mt-1">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="text-sm">{inv.City}, {inv.Country}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Invested on {new Date(inv.InvestmentDate).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-3 py-1 text-xs font-semibold rounded-lg whitespace-nowrap ${
                      inv.Status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {inv.Status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400">Invested Amount</p>
                      <p className="text-sm font-semibold text-gray-900 mt-0.5">{fmt(inv.InvestmentAmount)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400">Current Value</p>
                      <p className="text-sm font-semibold text-gray-900 mt-0.5">
                        {fmt((inv.InvestmentAmount || 0) + (inv.DistributionEarned || 0))}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400">Fractions Owned</p>
                      <p className="text-sm font-semibold text-gray-900 mt-0.5">{inv.FractionsOwned}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400">Total Distributions</p>
                      <p className="text-sm font-semibold text-primary-accent mt-0.5">{fmt(inv.DistributionEarned)}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
              <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No {activeTab} investments</p>
              <Link
                to="/portal/properties"
                className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-primary-accent text-white rounded-xl text-sm font-medium hover:bg-steel-blue transition-colors"
              >
                Browse Properties <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
    </div>
  );
}
