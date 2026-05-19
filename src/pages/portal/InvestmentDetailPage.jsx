
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Building2,
  Maximize2,
  BedDouble,
  Bath,
  TrendingUp,
  Calendar,
  DollarSign,
  BarChart3,
  Download,
  FileText,
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import PortalLayout from '@/pages/portal/PortalLayout';
import { fadeUp, staggerContainer, staggerItem } from '@/animations.js';

// Mock data for user's invested properties
const investedProperties = [
  {
    id: 1,
    name: 'Bangkok Premium Condo',
    location: 'Sukhumvit, Bangkok, Thailand',
    image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop',
    gallery: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop'
    ],
    investedAmount: 2500,
    currentValue: 2812,
    monthlyYield: 45.50,
    totalDistributions: 273.00,
    sharesOwned: 5,
    totalShares: 500,
    investmentDate: 'Jan 15, 2025',
    performance: 12.5,
    status: 'Active',
    roi: 9.8,
    rentalYield: 6.5,
    appreciation: 7.5,
    details: {
      size: '88 sqm',
      bedrooms: 2,
      bathrooms: 2,
      propertyType: 'Residential'
    },
    description: 'Premium condominium in Sukhumvit, Bangkok with modern amenities and excellent rental income potential. Located in Thailand\'s most sought-after business district.',
    highlights: [
      'Prime Sukhumvit location',
      'Modern infrastructure',
      'High rental occupancy',
      'Growing market appreciation',
      'Excellent tenant demand',
      'Strong long-term growth'
    ],
    documents: [
      { name: 'Investment Certificate', size: '1.2 MB' },
      { name: 'Property Valuation Report', size: '2.1 MB' },
      { name: 'Lease Agreement', size: '890 KB' }
    ]
  },
  {
    id: 2,
    name: 'Dubai Marina Tower',
    location: 'Marina District, Dubai, UAE',
    image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop',
    gallery: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop'
    ],
    investedAmount: 5000,
    currentValue: 5430,
    monthlyYield: 72.00,
    totalDistributions: 432.00,
    sharesOwned: 10,
    totalShares: 800,
    investmentDate: 'Mar 5, 2025',
    performance: 8.6,
    status: 'Active',
    roi: 11.2,
    rentalYield: 5.8,
    appreciation: 8.5,
    details: {
      size: '120 sqm',
      bedrooms: 3,
      bathrooms: 3,
      propertyType: 'Luxury Apartment'
    },
    description: 'An ultra-premium apartment in Dubai Marina, one of the most sought-after waterfront communities. Floor-to-ceiling windows with panoramic marina views, access to private beach, and 5-star hotel-style amenities.',
    highlights: [
      'Waterfront location with marina views',
      'Direct beach access',
      '5-star amenities & concierge service',
      'High occupancy rates',
      'Tax-free returns in UAE',
      'SPV-backed ownership structure'
    ],
    documents: [
      { name: 'Investment Certificate', size: '1.5 MB' },
      { name: 'Property Valuation Report', size: '2.2 MB' },
      { name: 'Lease Agreement', size: '950 KB' }
    ]
  },
  {
    id: 3,
    name: 'Phuket Beach Villa',
    location: 'Kamala, Phuket, Thailand',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=600&fit=crop',
    gallery: [
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=300&fit=crop'
    ],
    investedAmount: 3000,
    currentValue: 3258,
    monthlyYield: 52.00,
    totalDistributions: 208.00,
    sharesOwned: 6,
    totalShares: 600,
    investmentDate: 'Jun 20, 2025',
    performance: 8.6,
    status: 'Active',
    roi: 12.8,
    rentalYield: 6.8,
    appreciation: 8.2,
    details: {
      size: '150 sqm',
      bedrooms: 3,
      bathrooms: 3,
      propertyType: 'Beach Villa'
    },
    description: 'Luxury beachfront villa in Kamala, Phuket with stunning ocean views. Perfect for short-term rentals and holiday vacations with premium amenities.',
    highlights: [
      'Beachfront location',
      'Stunning ocean views',
      'Premium resort amenities',
      'High seasonal demand',
      'Luxury furnishings',
      'Strong rental history'
    ],
    documents: [
      { name: 'Investment Certificate', size: '1.3 MB' },
      { name: 'Property Valuation Report', size: '2.5 MB' },
      { name: 'Lease Agreement', size: '875 KB' }
    ]
  },
  {
    id: 4,
    name: 'Bali Luxury Retreat',
    location: 'Seminyak, Bali, Indonesia',
    image: 'https://images.unsplash.com/photo-1551632786-de41ec16a67a?w=800&h=600&fit=crop',
    gallery: [
      'https://images.unsplash.com/photo-1551632786-de41ec16a67a?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop'
    ],
    investedAmount: 1500,
    currentValue: 1650,
    monthlyYield: 35.25,
    totalDistributions: 145.50,
    sharesOwned: 3,
    totalShares: 400,
    investmentDate: 'Apr 10, 2025',
    performance: 10.0,
    status: 'Active',
    roi: 13.5,
    rentalYield: 8.2,
    appreciation: 5.3,
    details: {
      size: '120 sqm',
      bedrooms: 2,
      bathrooms: 2,
      propertyType: 'Luxury Villa'
    },
    description: 'Luxury tropical villa in Seminyak, Bali with lush gardens and private pool. Premium location in Bali\'s most exclusive resort area.',
    highlights: [
      'Prime Seminyak location',
      'Tropical luxury design',
      'Private pool and gardens',
      'High occupancy rates',
      'Premium amenities',
      'Strong market growth'
    ],
    documents: [
      { name: 'Investment Certificate', size: '1.1 MB' },
      { name: 'Property Valuation Report', size: '2.0 MB' },
      { name: 'Lease Agreement', size: '820 KB' }
    ]
  }
];

export default function InvestmentDetailPage() {
  const { id } = useParams();
  const investment = investedProperties.find(p => p.id === parseInt(id));
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  if (!investment) {
    return (
      <PortalLayout>
        <div className="p-8 text-center">
          <p className="text-gray-500">Investment not found</p>
        </div>
      </PortalLayout>
    );
  }

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % investment.gallery.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + investment.gallery.length) % investment.gallery.length);
  };

  return (
    <PortalLayout>
      <motion.div className="p-8" variants={staggerContainer} initial="initial" animate="animate">
        {/* Back Button */}
        <motion.div variants={staggerItem} className="mb-6">
          <Link
            to="/portal/investments"
            className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={20} />
            Back to Investments
          </Link>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Images & Details */}
          <motion.div variants={staggerItem} className="lg:col-span-2">
            {/* Image Carousel */}
            <div className="relative mb-8 rounded-2xl overflow-hidden bg-gray-800">
              <img
                src={investment.gallery[currentImageIndex]}
                alt={investment.name}
                className="w-full h-96 object-cover"
              />

              {/* Navigation Buttons */}
              <button
                onClick={prevImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 p-2 rounded-full transition-all"
              >
                <ChevronLeft size={24} className="text-white" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 p-2 rounded-full transition-all"
              >
                <ChevronRight size={24} className="text-white" />
              </button>

              {/* Status Badge */}
              <div className="absolute bottom-4 left-4">
                <span className="px-4 py-2 rounded-full text-sm font-medium bg-emerald-500 text-white">
                  {investment.status}
                </span>
              </div>

              {/* Thumbnails */}
              <div className="flex gap-2 p-4 bg-gray-800">
                {investment.gallery.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`w-24 h-24 rounded-lg overflow-hidden border-2 transition-all ${
                      idx === currentImageIndex
                        ? 'border-primary-accent'
                        : 'border-gray-600 hover:border-gray-400'
                    }`}
                  >
                    <img src={img} alt={`Gallery ${idx}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Property Title & Location */}
            <motion.div variants={staggerItem} className="mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">{investment.name}</h1>
              <p className="text-gray-500 flex items-center gap-2 mb-4">
                <MapPin size={20} className="text-primary-accent" />
                {investment.location}
              </p>
            </motion.div>

            {/* Investment Summary Card */}
            <motion.div variants={staggerItem} className="bg-white rounded-2xl p-6 mb-8 border border-gray-100 shadow-sm">
              <p className="text-gray-500 text-sm mb-4">Invested on {investment.investmentDate}</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-500 text-sm mb-1">Amount Invested</p>
                  <p className="text-2xl font-bold text-gray-900">${investment.investedAmount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm mb-1">Current Value</p>
                  <p className="text-2xl font-bold text-gray-900">${investment.currentValue.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm mb-1">Monthly Yield</p>
                  <p className="text-2xl font-bold text-primary-accent">${investment.monthlyYield.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm mb-1">Total Distributions</p>
                  <p className="text-2xl font-bold text-primary-accent">${investment.totalDistributions.toFixed(2)}</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-gray-500 text-sm">{investment.sharesOwned} of {investment.totalShares} shares</p>
              </div>
            </motion.div>

            {/* Property Specs */}
            <motion.div variants={staggerItem} className="grid grid-cols-4 gap-4 mb-8">
              {[
                { icon: Building2, label: 'Type', value: investment.details.propertyType },
                { icon: Maximize2, label: 'Size', value: investment.details.size },
                { icon: BedDouble, label: 'Bedrooms', value: investment.details.bedrooms },
                { icon: Bath, label: 'Bathrooms', value: investment.details.bathrooms }
              ].map((spec, idx) => (
                <div key={idx} className="bg-white rounded-2xl p-4 text-center border border-gray-100 shadow-sm">
                  <spec.icon className="text-primary-accent mx-auto mb-2" size={24} />
                  <p className="text-gray-500 text-sm mb-1">{spec.label}</p>
                  <p className="text-gray-900 font-semibold">{spec.value}</p>
                </div>
              ))}
            </motion.div>

            {/* Performance Metrics */}
            <motion.div variants={staggerItem} className="grid grid-cols-3 gap-4 mb-8">
              {[
                { icon: TrendingUp, label: 'Annual ROI', value: `${investment.roi.toFixed(1)}%` },
                { icon: BarChart3, label: 'Rental Yield', value: `${investment.rentalYield.toFixed(1)}%` },
                { icon: DollarSign, label: 'Appreciation', value: `${investment.appreciation.toFixed(1)}%` }
              ].map((metric, idx) => (
                <div key={idx} className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-100">
                  <metric.icon className="text-primary-accent mx-auto mb-2" size={24} />
                  <p className="text-gray-500 text-sm mb-2">{metric.label}</p>
                  <p className="text-2xl font-bold text-primary-accent">{metric.value}</p>
                </div>
              ))}
            </motion.div>

            {/* Description */}
            <motion.div variants={staggerItem} className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">About This Property</h2>
              <p className="text-gray-600 leading-relaxed">{investment.description}</p>
            </motion.div>

            {/* Investment Highlights */}
            <motion.div variants={staggerItem} className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Investment Highlights</h2>
              <div className="grid grid-cols-2 gap-4">
                {investment.highlights.map((highlight, idx) => (
                  <div key={idx} className="flex gap-3 items-start">
                    <div className="w-5 h-5 rounded-full bg-primary-accent flex-shrink-0 mt-1" />
                    <span className="text-gray-600">{highlight}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Legal Documents */}
            <motion.div variants={staggerItem}>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FileText size={28} className="text-primary-accent" />
                Your Documents
              </h2>
              <div className="space-y-3">
                {investment.documents.map((doc, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-white rounded-2xl p-4 hover:bg-gray-50 transition-all border border-gray-100 shadow-sm"
                  >
                    <div>
                      <p className="text-gray-900 font-medium">{doc.name}</p>
                      <p className="text-sm text-gray-500">{doc.size}</p>
                    </div>
                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-all">
                      <Download size={20} className="text-primary-accent" />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>

          {/* Right Column - Investment Summary Panel */}
          <motion.div
            variants={staggerItem}
            className="bg-white rounded-2xl p-6 sticky top-24 h-fit border border-gray-100 shadow-sm"
          >
            <div className="mb-6">
              <p className="text-gray-500 text-sm mb-2">Your Performance</p>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-bold text-primary-accent">+{investment.performance.toFixed(1)}%</span>
                <TrendingUp size={28} className="text-primary-accent mb-1" />
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-gray-500 text-sm mb-2">Invested</p>
                <p className="text-2xl font-bold text-gray-900">${investment.investedAmount.toLocaleString()}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-gray-500 text-sm mb-2">Current Value</p>
                <p className="text-2xl font-bold text-gray-900">${investment.currentValue.toLocaleString()}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-gray-500 text-sm mb-2">Total Gain</p>
                <p className="text-2xl font-bold text-primary-accent">${(investment.currentValue - investment.investedAmount).toFixed(2)}</p>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-6">
              <p className="text-sm font-semibold text-gray-900 mb-4">Monthly Income</p>
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <p className="text-gray-500 text-sm mb-1">Rental Income</p>
                <p className="text-xl font-bold text-primary-accent">${investment.monthlyYield.toFixed(2)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-gray-500 text-sm mb-1">Lifetime Earnings</p>
                <p className="text-xl font-bold text-primary-accent">${investment.totalDistributions.toFixed(2)}</p>
              </div>
            </div>

            <button className="w-full mt-6 py-3 bg-primary-accent text-white font-semibold rounded-2xl hover:bg-steel-blue transition-all">
              View Full Report
            </button>
          </motion.div>
        </div>
      </motion.div>
    </PortalLayout>
  );
}
