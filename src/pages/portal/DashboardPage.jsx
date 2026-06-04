import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  Building2,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/contexts/SQLServerAuthContext';
import { getApiBase } from '@/lib/utils';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export default function DashboardPage() {
  const { user, session } = useAuth();
  const [portfolioData, setPortfolioData] = useState(null);
  const [distributions, setDistributions] = useState([]);
  const [loading, setLoading] = useState(true);

  function safeNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  function formatCurrency(value) {
    return safeNumber(value).toLocaleString('en-US', { maximumFractionDigits: 2 });
  }

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.UserID || !session?.token) {
        setLoading(false);
        return;
      }

      try {
        // Fetch portfolio data
        const authHeaders = session?.token
          ? { Authorization: `Bearer ${session.token}` }
          : {};

        const portfolioRes = await fetch(`${getApiBase()}/api/user/${user.UserID}/portfolio`, {
          headers: authHeaders,
        });
        const portfolioJson = await portfolioRes.json();
        if (portfolioJson.success) {
          setPortfolioData(portfolioJson.data);
        }

        // Fetch distributions
        const distRes = await fetch(`${getApiBase()}/api/user/${user.UserID}/distributions`, {
          headers: authHeaders,
        });
        const distJson = await distRes.json();
        if (distJson.success) {
          setDistributions(distJson.data.slice(0, 5));
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading || !portfolioData) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-slate-grey">Loading dashboard...</p>
      </div>
    );
  }

  const summary = portfolioData.summary;
  const investments = portfolioData.investments || [];

  const desktopStats = [
    {
      label: 'Portfolio Value',
      value: `$${formatCurrency(summary?.PortfolioValue)}`,
      change: '+12.5%',
      trend: 'up',
      icon: PieChart,
      color: 'from-teal-500 to-cyan-400',
    },
    {
      label: 'Total Returns',
      value: `$${formatCurrency(summary?.TotalDistributions)}`,
      change: '+8.3%',
      trend: 'up',
      icon: TrendingUp,
      color: 'from-emerald-500 to-green-400',
    },
    {
      label: 'Active Properties',
      value: investments.length.toString(),
      change: '+1',
      trend: 'up',
      icon: Building2,
      color: 'from-blue-500 to-indigo-400',
    },
    {
      label: 'Wallet Balance',
      value: `$${formatCurrency(summary?.AvailableBalance)}`,
      change: '',
      trend: 'neutral',
      icon: Wallet,
      color: 'from-violet-500 to-purple-400',
    },
  ];

  return (
    <div className="p-6 md:p-8 space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {desktopStats.map((stat, index) => (
          <motion.div
            key={stat.label}
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-2xl p-6 border border-gray-100 shadow-md hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
            </div>
            {stat.change && (
              <div className="flex items-center gap-1 mt-3">
                {stat.trend === 'up' ? (
                  <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-red-500" />
                )}
                <span className={`text-sm font-medium ${stat.trend === 'up' ? 'text-emerald-500' : 'text-red-500'}`}>
                  {stat.change}
                </span>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Browse More Button */}
      <Link
        to="/portal/properties"
        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-accent hover:bg-steel-blue text-white font-semibold rounded-xl transition-colors"
      >
        Browse Properties <ArrowRight className="w-4 h-4" />
      </Link>

      {/* Recent Activity */}
      <motion.div
        variants={fadeUp}
        initial="initial"
        animate="animate"
        className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
          <Link to="/portal/investments" className="text-primary-accent hover:underline text-sm font-medium">
            View all →
          </Link>
        </div>
        <div className="space-y-4">
          {distributions.length > 0 ? (
            distributions.map((dist, idx) => (
              <div key={idx} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <ArrowDownRight className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{dist.PropertyName}</p>
                    <p className="text-sm text-gray-500">{dist.City}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-emerald-600">+${formatCurrency(dist.AmountReceived)}</p>
                  <p className="text-xs text-gray-500">
                    {dist.DistributionDate ? new Date(dist.DistributionDate).toLocaleDateString() : ''}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500 py-8">No distributions yet</p>
          )}
        </div>
      </motion.div>

      {/* Your Investments */}
      {investments.length > 0 && (
        <motion.div
          variants={fadeUp}
          initial="initial"
          animate="animate"
          className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Your Investments</h3>
          <div className="space-y-4">
            {investments.slice(0, 3).map((inv) => (
              <div key={inv.InvestmentID} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <div>
                  <p className="font-medium text-gray-900">{inv.PropertyName}</p>
                  <p className="text-sm text-gray-500">{inv.City}, {inv.Country}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">${formatCurrency(inv.InvestmentAmount)}</p>
                  <p className="text-sm text-emerald-600">{inv.FractionsOwned || inv.fractions_owned} fractions</p>
                </div>
              </div>
            ))}
          </div>
          <Link to="/portal/investments" className="mt-4 block text-center text-primary-accent hover:underline font-medium">
            View all investments →
          </Link>
        </motion.div>
      )}
    </div>
  );
}
