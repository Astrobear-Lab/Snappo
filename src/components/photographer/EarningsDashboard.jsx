import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { supabase } from '../../lib/supabase';
import { usePhotographer } from '../../contexts/PhotographerContext';

const EarningsDashboard = () => {
  const { photographerProfile, refreshPhotographerProfile } = usePhotographer();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [earnings, setEarnings] = useState({
    totalEarnings: 0,
    thisMonthEarnings: 0,
    pendingPayouts: 0,
    salesCount: 0,
  });
  const [monthlyData, setMonthlyData] = useState([]);
  const [codeEarnings, setCodeEarnings] = useState([]);
  const [payoutHistory, setPayoutHistory] = useState([]);

  useEffect(() => {
    if (photographerProfile?.id) {
      fetchAllData();
    }
  }, [photographerProfile?.id]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchEarningsSummary(),
        fetchMonthlyEarnings(),
        fetchCodeEarnings(),
        fetchPayoutHistory(),
      ]);
    } catch (error) {
      console.error('Error fetching earnings data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEarningsSummary = async () => {
    const photographerId = photographerProfile?.id;
    if (!photographerId) return;

    // This month's start
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Fetch this month's transactions
    const { data: monthlyTransactions } = await supabase
      .from('transactions')
      .select('photographer_earnings')
      .eq('photographer_id', photographerId)
      .eq('payment_status', 'completed')
      .gte('created_at', startOfMonth.toISOString());

    // Fetch pending payouts
    const { data: pendingPayouts } = await supabase
      .from('payouts')
      .select('amount')
      .eq('photographer_id', photographerId)
      .in('status', ['pending', 'in_transit']);

    // Fetch total sales count
    const { count: salesCount } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('photographer_id', photographerId)
      .eq('payment_status', 'completed');

    setEarnings({
      totalEarnings: photographerProfile?.total_earnings || 0,
      thisMonthEarnings:
        monthlyTransactions?.reduce(
          (sum, t) => sum + Number(t.photographer_earnings),
          0
        ) || 0,
      pendingPayouts:
        pendingPayouts?.reduce((sum, p) => sum + Number(p.amount), 0) || 0,
      salesCount: salesCount || 0,
    });
  };

  const fetchMonthlyEarnings = async () => {
    const photographerId = photographerProfile?.id;
    if (!photographerId) return;

    // Last 12 months
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setHours(0, 0, 0, 0);

    const { data } = await supabase
      .from('transactions')
      .select('photographer_earnings, created_at')
      .eq('photographer_id', photographerId)
      .eq('payment_status', 'completed')
      .gte('created_at', twelveMonthsAgo.toISOString())
      .order('created_at', { ascending: true });

    // Group by month
    const monthlyMap = {};

    // Initialize all 12 months with 0
    for (let i = 0; i < 12; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - (11 - i));
      const monthKey = date.toISOString().slice(0, 7);
      monthlyMap[monthKey] = 0;
    }

    // Add actual earnings
    data?.forEach((t) => {
      const month = new Date(t.created_at).toISOString().slice(0, 7);
      if (monthlyMap[month] !== undefined) {
        monthlyMap[month] += Number(t.photographer_earnings);
      }
    });

    const chartData = Object.entries(monthlyMap).map(([month, earnings]) => ({
      month: new Date(month + '-01').toLocaleDateString('en-US', {
        month: 'short',
      }),
      earnings: Number(earnings.toFixed(2)),
    }));

    setMonthlyData(chartData);
  };

  const fetchCodeEarnings = async () => {
    const photographerId = photographerProfile?.id;
    if (!photographerId) return;

    const { data } = await supabase
      .from('transactions')
      .select(
        `
        photographer_earnings,
        created_at,
        photo_code:photo_codes(code, note)
      `
      )
      .eq('photographer_id', photographerId)
      .eq('payment_status', 'completed')
      .order('created_at', { ascending: false });

    // Group by code
    const codeMap = {};
    data?.forEach((t) => {
      const code = t.photo_code?.code || 'Unknown';
      if (!codeMap[code]) {
        codeMap[code] = {
          code,
          note: t.photo_code?.note,
          earnings: 0,
          count: 0,
          lastSale: t.created_at,
        };
      }
      codeMap[code].earnings += Number(t.photographer_earnings);
      codeMap[code].count += 1;
    });

    setCodeEarnings(
      Object.values(codeMap).sort((a, b) => b.earnings - a.earnings)
    );
  };

  const fetchPayoutHistory = async () => {
    const photographerId = photographerProfile?.id;
    if (!photographerId) return;

    const { data } = await supabase
      .from('payouts')
      .select('*')
      .eq('photographer_id', photographerId)
      .order('created_at', { ascending: false })
      .limit(50);

    setPayoutHistory(data || []);
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'codes', label: 'By Code', icon: '🎫' },
    { id: 'payouts', label: 'Payout History', icon: '💸' },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'in_transit':
        return 'bg-blue-100 text-blue-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      case 'canceled':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl shadow-lg p-8">
        <div className="flex items-center justify-center py-12">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 border-4 border-teal border-t-transparent rounded-full"
          />
          <span className="ml-3 text-gray-600">Loading earnings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Earnings Dashboard</h2>
          <p className="text-gray-600">
            Track your photo sales and payouts
          </p>
        </div>
        <motion.button
          onClick={fetchAllData}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold text-gray-700 flex items-center gap-2"
        >
          <span>🔄</span>
          Refresh
        </motion.button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-teal to-cyan-500 rounded-2xl shadow-lg p-6 text-white"
        >
          <div className="text-3xl mb-2">💰</div>
          <div className="text-3xl font-bold mb-1">
            {formatCurrency(earnings.totalEarnings)}
          </div>
          <div className="text-white/80 text-sm">Total Earnings</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          <div className="text-3xl mb-2">📅</div>
          <div className="text-3xl font-bold text-gray-800 mb-1">
            {formatCurrency(earnings.thisMonthEarnings)}
          </div>
          <div className="text-gray-600 text-sm">This Month</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          <div className="text-3xl mb-2">⏳</div>
          <div className="text-3xl font-bold text-gray-800 mb-1">
            {formatCurrency(earnings.pendingPayouts)}
          </div>
          <div className="text-gray-600 text-sm">Pending Payouts</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          <div className="text-3xl mb-2">📸</div>
          <div className="text-3xl font-bold text-gray-800 mb-1">
            {earnings.salesCount}
          </div>
          <div className="text-gray-600 text-sm">Total Sales</div>
        </motion.div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-2xl shadow-lg p-2 flex gap-2">
        {tabs.map((tab) => (
          <motion.button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold transition-colors ${
              activeTab === tab.id
                ? 'bg-teal text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </motion.button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-3xl shadow-lg p-6"
          >
            <h3 className="text-xl font-bold text-gray-800 mb-6">
              Monthly Earnings (Last 12 Months)
            </h3>

            {monthlyData.length > 0 &&
            monthlyData.some((d) => d.earnings > 0) ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData}>
                    <defs>
                      <linearGradient
                        id="colorEarnings"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#14b8a6"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#14b8a6"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="month"
                      stroke="#9ca3af"
                      fontSize={12}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#9ca3af"
                      fontSize={12}
                      tickLine={false}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        boxShadow:
                          '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                      }}
                      formatter={(value) => [
                        formatCurrency(value),
                        'Earnings',
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="earnings"
                      stroke="#14b8a6"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorEarnings)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-80 flex flex-col items-center justify-center text-gray-500">
                <div className="text-6xl mb-4">📊</div>
                <p className="text-lg font-semibold">No earnings data yet</p>
                <p className="text-sm">
                  Your earnings will appear here after your first sale
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* By Code Tab */}
        {activeTab === 'codes' && (
          <motion.div
            key="codes"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-3xl shadow-lg p-6"
          >
            <h3 className="text-xl font-bold text-gray-800 mb-6">
              Earnings by Code
            </h3>

            {codeEarnings.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-600">
                        Code
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-600">
                        Note
                      </th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-600">
                        Sales
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-600">
                        Earnings
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-600">
                        Last Sale
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {codeEarnings.map((code, index) => (
                      <motion.tr
                        key={code.code}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="py-4 px-4">
                          <span className="font-mono font-bold text-teal bg-teal/10 px-3 py-1 rounded-lg">
                            {code.code}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-gray-600">
                          {code.note || '-'}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full font-semibold">
                            {code.count}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right font-bold text-gray-800">
                          {formatCurrency(code.earnings)}
                        </td>
                        <td className="py-4 px-4 text-right text-gray-500 text-sm">
                          {formatDate(code.lastSale)}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-gray-500">
                <div className="text-6xl mb-4">🎫</div>
                <p className="text-lg font-semibold">No sales yet</p>
                <p className="text-sm">
                  Earnings by code will appear here after your first sale
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Payout History Tab */}
        {activeTab === 'payouts' && (
          <motion.div
            key="payouts"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-3xl shadow-lg p-6"
          >
            <h3 className="text-xl font-bold text-gray-800 mb-6">
              Payout History
            </h3>

            {payoutHistory.length > 0 ? (
              <div className="space-y-3">
                {payoutHistory.map((payout, index) => (
                  <motion.div
                    key={payout.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          payout.type === 'transfer'
                            ? 'bg-teal/10 text-teal'
                            : 'bg-purple-100 text-purple-600'
                        }`}
                      >
                        {payout.type === 'transfer' ? '➡️' : '🏦'}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800">
                          {payout.type === 'transfer'
                            ? 'Transfer to Stripe'
                            : 'Bank Payout'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatDate(payout.created_at)}
                          {payout.arrival_date && (
                            <span className="ml-2">
                              · Expected: {formatDate(payout.arrival_date)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(
                          payout.status
                        )}`}
                      >
                        {payout.status.charAt(0).toUpperCase() +
                          payout.status.slice(1).replace('_', ' ')}
                      </span>
                      <span className="font-bold text-gray-800 text-lg">
                        {formatCurrency(payout.amount)}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-gray-500">
                <div className="text-6xl mb-4">💸</div>
                <p className="text-lg font-semibold">No payouts yet</p>
                <p className="text-sm">
                  Your payout history will appear here after you make your first sale
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EarningsDashboard;
