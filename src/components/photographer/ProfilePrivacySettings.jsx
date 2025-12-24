import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { usePhotographer } from '../../contexts/PhotographerContext';

const ToggleSwitch = ({ enabled, onChange, disabled }) => {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-teal focus:ring-offset-2 ${
        enabled ? 'bg-teal' : 'bg-gray-200'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
};

const ProfilePrivacySettings = () => {
  const { photographerProfile, refreshPhotographerProfile } = usePhotographer();
  const [settings, setSettings] = useState({
    show_bio: true,
    show_stats: true,
    show_achievements: true,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (photographerProfile?.privacy_settings) {
      setSettings(photographerProfile.privacy_settings);
    }
  }, [photographerProfile]);

  const handleToggle = async (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    await saveSettings(newSettings);
  };

  const saveSettings = async (newSettings) => {
    if (!photographerProfile?.id) return;

    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const { error } = await supabase
        .from('photographer_profiles')
        .update({ privacy_settings: newSettings })
        .eq('id', photographerProfile.id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Settings saved!' });
      await refreshPhotographerProfile();

      setTimeout(() => setMessage({ type: '', text: '' }), 2000);
    } catch (error) {
      console.error('Error saving privacy settings:', error);
      setMessage({ type: 'error', text: 'Failed to save settings' });
      // Revert on error
      if (photographerProfile?.privacy_settings) {
        setSettings(photographerProfile.privacy_settings);
      }
    } finally {
      setSaving(false);
    }
  };

  const settingsConfig = [
    {
      key: 'show_bio',
      title: 'Bio & Description',
      description: 'Show your bio on photo pages when viewers look up their photos',
      icon: '📝',
    },
    {
      key: 'show_stats',
      title: 'Statistics',
      description: 'Display your total photos, views, and downloads count',
      icon: '📊',
    },
    {
      key: 'show_achievements',
      title: 'Achievements',
      description: 'Show badges and achievements you have earned',
      icon: '🏆',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-lg p-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-teal/10 rounded-xl flex items-center justify-center">
          <span className="text-xl">🔒</span>
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-800">Profile Privacy</h3>
          <p className="text-sm text-gray-500">Control what viewers see on your profile</p>
        </div>
      </div>

      {/* Message */}
      {message.text && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-4 px-4 py-2 rounded-lg text-sm font-medium ${
            message.type === 'success'
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          }`}
        >
          {message.text}
        </motion.div>
      )}

      <div className="space-y-4">
        {settingsConfig.map((item, index) => (
          <motion.div
            key={item.key}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{item.icon}</span>
              <div>
                <p className="font-semibold text-gray-800">{item.title}</p>
                <p className="text-sm text-gray-500">{item.description}</p>
              </div>
            </div>
            <ToggleSwitch
              enabled={settings[item.key]}
              onChange={(value) => handleToggle(item.key, value)}
              disabled={saving}
            />
          </motion.div>
        ))}
      </div>

      {/* Preview info */}
      <div className="mt-6 p-4 bg-teal/5 border border-teal/20 rounded-xl">
        <p className="text-sm text-gray-600">
          <span className="font-semibold text-teal">Tip:</span> These settings control what viewers see when they look up photos using your codes. Your full profile is always visible to you in the dashboard.
        </p>
      </div>
    </motion.div>
  );
};

export default ProfilePrivacySettings;
