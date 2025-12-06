import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { usePhotographer } from '../../contexts/PhotographerContext';
import CodeCard from './CodeCard';

const ActiveCodesBoard = ({ onCodeClick, onUploadClick }) => {
  const { getCodesByStatus, loadingCodes } = usePhotographer();
  const [activeTab, setActiveTab] = useState('pending_upload');

  const tabs = [
    {
      id: 'pending_upload',
      label: 'Pending Upload',
      icon: '⏳',
      color: 'yellow',
    },
    {
      id: 'published',
      label: 'Published',
      icon: '✓',
      color: 'teal',
    },
    {
      id: 'unlocked',
      label: 'Unlocked',
      icon: '🔓',
      color: 'green',
    },
    {
      id: 'expired',
      label: 'Expired',
      icon: '⏰',
      color: 'gray',
    },
  ];

  const currentCodes = getCodesByStatus(activeTab);

  return (
    <div className="bg-white rounded-3xl shadow-lg p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Active Codes</h2>
        <p className="text-gray-600">
          Manage your photo codes and track their status
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map((tab) => {
          const count = getCodesByStatus(tab.id).length;
          const isActive = activeTab === tab.id;

          return (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`relative px-4 py-3 rounded-xl font-semibold text-sm transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-teal text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {count > 0 && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </div>

              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-teal rounded-xl -z-10"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Codes Grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          {loadingCodes ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">⏳</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                Loading codes...
              </h3>
              <p className="text-gray-600">
                Fetching your codes from the database
              </p>
            </div>
          ) : currentCodes.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                No codes here yet
              </h3>
              <p className="text-gray-600">
                {activeTab === 'pending_upload'
                  ? 'Generate a new code to get started'
                  : `No ${tabs.find((t) => t.id === activeTab)?.label.toLowerCase()} codes`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentCodes.map((code) => (
                <CodeCard
                  key={code.id}
                  code={code}
                  onUploadClick={onUploadClick}
                  onDetailClick={onCodeClick}
                />
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default ActiveCodesBoard;
