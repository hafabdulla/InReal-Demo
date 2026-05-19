
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
import PortalLayout from '@/pages/portal/PortalLayout';

export default function SettingsPage() {
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

  return (
    <div className="p-6 md:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-gray-500 mt-1">Manage your account preferences</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Tabs */}
          <div className="lg:w-56 flex-shrink-0">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2 flex lg:flex-col gap-1 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-primary-accent/10 text-primary-accent'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            {activeTab === 'profile' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6"
              >
                <h3 className="font-semibold text-gray-900 text-lg">Profile Information</h3>

                {/* Avatar */}
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-2xl bg-primary-accent/10 flex items-center justify-center">
                      <User className="w-8 h-8 text-primary-accent" />
                    </div>
                    <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary-accent text-white rounded-lg flex items-center justify-center hover:bg-steel-blue transition-colors">
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Profile Photo</p>
                    <p className="text-sm text-gray-500">JPG, PNG or GIF. Max 5MB.</p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">First Name</label>
                    <input
                      type="text"
                      defaultValue="John"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-accent/30 focus:border-primary-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name</label>
                    <input
                      type="text"
                      defaultValue="Doe"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-accent/30 focus:border-primary-accent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      defaultValue="john@example.com"
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-accent/30 focus:border-primary-accent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      defaultValue="+1 (555) 000-0000"
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-accent/30 focus:border-primary-accent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Country</label>
                  <div className="relative">
                    <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <select className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-accent/30 focus:border-primary-accent appearance-none bg-white">
                      <option>United States</option>
                      <option>United Kingdom</option>
                      <option>United Arab Emirates</option>
                      <option>Germany</option>
                      <option>Italy</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleSave}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-accent hover:bg-steel-blue text-white font-medium rounded-xl transition-colors text-sm"
                  >
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
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                  <h3 className="font-semibold text-gray-900 text-lg">Change Password</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Current Password</label>
                    <input
                      type="password"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-accent/30 focus:border-primary-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                    <input
                      type="password"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-accent/30 focus:border-primary-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm New Password</label>
                    <input
                      type="password"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-accent/30 focus:border-primary-accent"
                    />
                  </div>
                  <div className="flex justify-end pt-2">
                    <button className="px-6 py-2.5 bg-primary-accent hover:bg-steel-blue text-white font-medium rounded-xl transition-colors text-sm">
                      Update Password
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
                        <Lock className="w-5 h-5 text-violet-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Two-Factor Authentication</p>
                        <p className="text-sm text-gray-500">Add an extra layer of security</p>
                      </div>
                    </div>
                    <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors text-sm">
                      Enable
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-emerald-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">KYC Verification</p>
                        <p className="text-sm text-gray-500">Identity verified</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-sm font-medium rounded-lg">
                      Verified
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'notifications' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"
              >
                <h3 className="font-semibold text-gray-900 text-lg mb-6">Notification Preferences</h3>
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
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h3 className="font-semibold text-gray-900 text-lg mb-4">Linked Bank Accounts</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 border border-gray-100 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                          <CreditCard className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Chase Bank ****4821</p>
                          <p className="text-xs text-gray-400">Checking Account</p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 text-xs font-medium rounded-lg">Primary</span>
                    </div>
                  </div>
                  <button className="mt-4 w-full py-2.5 border-2 border-dashed border-gray-200 text-gray-500 hover:border-primary-accent hover:text-primary-accent rounded-xl text-sm font-medium transition-colors">
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
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="text-sm text-gray-500">{desc}</p>
      </div>
      <button
        onClick={() => setEnabled(!enabled)}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          enabled ? 'bg-primary-accent' : 'bg-gray-200'
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
