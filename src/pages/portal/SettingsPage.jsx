import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Mail,
  Phone,
  Shield,
  Bell,
  CreditCard,
  Globe,
  Lock,
  Camera,
  Check,
} from 'lucide-react';
import { useAuth } from '@/contexts/SQLServerAuthContext';

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'payment', label: 'Payment Methods', icon: CreditCard },
  ];

  const tabButtonClass = (isActive) =>
    `flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
      isActive
        ? 'bg-[#01CED1]/10 text-[#01CED1]'
        : 'text-portal-secondary hover:text-portal-primary hover:bg-portal-tertiary'
    }`;

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-portal-primary">Settings</h1>
        <p className="text-portal-secondary mt-1">Manage your account preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-56 flex-shrink-0">
          <div className="portal-card p-2 flex lg:flex-col gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={tabButtonClass(activeTab === tab.id)}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1">
          {activeTab === 'profile' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="portal-card space-y-6"
            >
              <h3 className="font-semibold text-portal-primary text-lg">Profile Information</h3>

              <div className="flex items-center gap-5">
                <div className="relative">
                  <div className="w-20 h-20 rounded-2xl bg-[#01CED1]/10 flex items-center justify-center">
                    <User className="w-8 h-8 text-[#01CED1]" />
                  </div>
                  <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#01CED1] text-[#0F0F0F] rounded-lg flex items-center justify-center hover:bg-[#00B8BB] transition-colors">
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div>
                  <p className="font-medium text-portal-primary">Profile Photo</p>
                  <p className="text-sm text-portal-secondary">JPG, PNG or GIF. Max 5MB.</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-portal-secondary mb-1.5">First Name</label>
                  <input
                    type="text"
                    defaultValue={user?.FirstName || ''}
                    className="portal-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-portal-secondary mb-1.5">Last Name</label>
                  <input
                    type="text"
                    defaultValue={user?.LastName || ''}
                    className="portal-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-portal-secondary mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-portal-tertiary" />
                  <input
                    type="email"
                    defaultValue={user?.Email || ''}
                    readOnly
                    className="portal-input pl-10 opacity-80"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-portal-secondary mb-1.5">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-portal-tertiary" />
                  <input
                    type="tel"
                    defaultValue=""
                    placeholder="Not set"
                    className="portal-input pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-portal-secondary mb-1.5">Country</label>
                <div className="relative">
                  <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-portal-tertiary" />
                  <select className="portal-input pl-10 appearance-none" defaultValue={user?.CountryCode || ''}>
                    <option value="US">United States</option>
                    <option value="GB">United Kingdom</option>
                    <option value="AE">United Arab Emirates</option>
                    <option value="DE">Germany</option>
                    <option value="IT">Italy</option>
                    <option value="SG">Singapore</option>
                    <option value="TH">Thailand</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button onClick={handleSave} className="portal-btn-primary text-sm py-2.5">
                  {saved ? <><Check className="w-4 h-4" /> Saved</> : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'security' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="portal-card space-y-4">
                <h3 className="font-semibold text-portal-primary text-lg">Change Password</h3>
                <div>
                  <label className="block text-sm font-medium text-portal-secondary mb-1.5">Current Password</label>
                  <input type="password" className="portal-input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-portal-secondary mb-1.5">New Password</label>
                  <input type="password" className="portal-input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-portal-secondary mb-1.5">Confirm New Password</label>
                  <input type="password" className="portal-input" />
                </div>
                <div className="flex justify-end pt-2">
                  <button className="portal-btn-primary text-sm py-2.5">Update Password</button>
                </div>
              </div>

              <div className="portal-card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-portal-tertiary flex items-center justify-center">
                      <Lock className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                      <p className="font-medium text-portal-primary">Two-Factor Authentication</p>
                      <p className="text-sm text-portal-secondary">Add an extra layer of security</p>
                    </div>
                  </div>
                  <button className="portal-btn-secondary text-sm py-2 px-4">Enable</button>
                </div>
              </div>

              <div className="portal-card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-portal-tertiary flex items-center justify-center">
                      <Shield className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-medium text-portal-primary">KYC Verification</p>
                      <p className="text-sm text-portal-secondary">
                        {/* CORRECTION 09 July 2026: 'Approved' was correct originally — reverted after a mis-read of the KYC-decision code's column order. */}
                        {user?.KYCStatus === 'Approved' ? 'Identity verified' : 'Verification pending'}
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 text-sm font-medium rounded-lg ${
                    user?.IdentityVerified
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-amber-500/10 text-amber-400'
                  }`}>
                    {user?.IdentityVerified ? 'Verified' : 'Pending'}
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'notifications' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="portal-card"
            >
              <h3 className="font-semibold text-portal-primary text-lg mb-6">Notification Preferences</h3>
              <div className="space-y-5">
                {[
                  { title: 'Distribution Payments', desc: 'Get notified when you receive distributions', defaultOn: true },
                  { title: 'New Properties', desc: 'Be the first to know about new listings', defaultOn: true },
                  { title: 'Investment Updates', desc: 'Updates about your property investments', defaultOn: true },
                  { title: 'Price Alerts', desc: 'Notifications when property values change', defaultOn: false },
                  { title: 'Marketing Emails', desc: 'Promotions, tips and InReal news', defaultOn: false },
                ].map((item) => (
                  <NotificationToggle key={item.title} {...item} />
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'payment' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="portal-card">
                <h3 className="font-semibold text-portal-primary text-lg mb-4">Linked Bank Accounts</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 border border-portal-subtle rounded-xl bg-portal-tertiary">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-portal-secondary flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-[#01CED1]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-portal-primary">Chase Bank ****4821</p>
                        <p className="text-xs text-portal-tertiary">Checking Account</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-medium rounded-lg">Primary</span>
                  </div>
                </div>
                <button className="mt-4 w-full py-2.5 border-2 border-dashed border-portal-subtle text-portal-secondary hover:border-[#01CED1] hover:text-[#01CED1] rounded-xl text-sm font-medium transition-colors">
                  + Add Bank Account
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function NotificationToggle({ title, desc, defaultOn }) {
  const [enabled, setEnabled] = useState(defaultOn);
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-portal-primary">{title}</p>
        <p className="text-sm text-portal-secondary">{desc}</p>
      </div>
      <button
        onClick={() => setEnabled(!enabled)}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          enabled ? 'bg-[#01CED1]' : 'bg-portal-tertiary'
        }`}
      >
        <motion.div
          animate={{ x: enabled ? 20 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
        />
      </button>
    </div>
  );
}