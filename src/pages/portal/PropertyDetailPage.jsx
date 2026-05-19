
import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MapPin,
  TrendingUp,
  Users,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Building2,
  Calendar,
  Percent,
  DollarSign,
  Bed,
  Bath,
  Maximize2,
  Shield,
  FileText,
  Download,
  Check,
} from 'lucide-react';
import PortalLayout from '@/pages/portal/PortalLayout';

const propertiesData = {
  1: {
    name: 'Bangkok Premium Condo',
    location: 'Sukhumvit, Bangkok',
    country: 'Thailand',
    images: ['/Copy of Regent 1.jpeg', '/Copy of Regent 2.jpeg', '/Copy of Regent 3.jpeg', '/Copy of Regent 4.jpeg'],
    minInvestment: 500,
    totalValue: '$2,500,000',
    rentalYieldPct: 6.5,
    appreciationPct: 7.5,
    investors: 247,
    funded: 78,
    propertyType: 'Luxury Condominium',
    size: '85 sqm',
    bedrooms: 2,
    bathrooms: 2,
    yearBuilt: 2022,
    status: 'Funding',
    description:
      'A premium luxury condominium located in the heart of Bangkok\'s Sukhumvit district. This property offers direct access to the BTS Skytrain, world-class dining, and premium shopping. Professionally managed with a strong rental yield from both short-term and long-term tenants.',
    highlights: [
      'Prime Sukhumvit location with BTS access',
      'Fully furnished with premium fittings',
      'Rooftop infinity pool & gym',
      'Professional property management',
      'Strong rental demand year-round',
      'SPV-backed ownership structure',
    ],
    documents: [
      { name: 'Investment Memorandum', size: '2.4 MB' },
      { name: 'Property Valuation Report', size: '1.8 MB' },
      { name: 'SPV Structure Overview', size: '890 KB' },
      { name: 'Financial Projections', size: '1.2 MB' },
    ],
    timeline: [
      { date: 'Jan 2025', event: 'Funding opened', completed: true },
      { date: 'Jun 2025', event: 'Funding target reached', completed: false },
      { date: 'Jul 2025', event: 'First distribution', completed: false },
      { date: 'Quarterly', event: 'Ongoing distributions', completed: false },
    ],
  },
  2: {
    name: 'Dubai Marina Tower',
    location: 'Marina District, Dubai',
    country: 'UAE',
    images: ['/Copy of Regent 2.jpeg', '/Copy of Regent 1.jpeg', '/Copy of Regent 3.jpeg'],
    minInvestment: 1000,
    totalValue: '$5,000,000',
    rentalYieldPct: 5.8,
    appreciationPct: 5.4,
    investors: 189,
    funded: 92,
    propertyType: 'Luxury Apartment',
    size: '120 sqm',
    bedrooms: 3,
    bathrooms: 3,
    yearBuilt: 2023,
    status: 'Funding',
    description:
      'An ultra-premium apartment in Dubai Marina, one of the most sought-after waterfront communities. Floor-to-ceiling windows with panoramic marina views, access to private beach, and 5-star hotel-style amenities.',
    highlights: [
      'Waterfront location with marina views',
      'Direct beach access',
      '5-star amenities & concierge service',
      'High occupancy rates',
      'Tax-free returns in UAE',
      'SPV-backed ownership structure',
    ],
    documents: [
      { name: 'Investment Memorandum', size: '3.1 MB' },
      { name: 'Property Valuation Report', size: '2.2 MB' },
      { name: 'SPV Structure Overview', size: '890 KB' },
    ],
    timeline: [
      { date: 'Mar 2025', event: 'Funding opened', completed: true },
      { date: 'May 2025', event: 'Funding target reached', completed: false },
      { date: 'Jun 2025', event: 'First distribution', completed: false },
    ],
  },
};

// Fallback for any property ID
const getProperty = (id) =>
  propertiesData[id] || propertiesData[1];

export default function PropertyDetailPage() {
  const { id } = useParams();
  const property = getProperty(id);
  const [currentImage, setCurrentImage] = useState(0);
  const [investAmount, setInvestAmount] = useState(property.minInvestment);

  // Always invest in exact multiples of minInvestment
  const shares = Math.max(1, Math.floor(investAmount / property.minInvestment));
  const effectiveInvestment = shares * property.minInvestment;

  const annualReturnPct = property.rentalYieldPct + property.appreciationPct;

  // Rental yield = cash distributed monthly
  const estimatedMonthlyIncome = (effectiveInvestment * property.rentalYieldPct) / 100 / 12;
  const estimatedAnnualRentalIncome = estimatedMonthlyIncome * 12;

  // Appreciation = capital gain (not paid out monthly, realised on exit)
  const estimatedAnnualAppreciation = (effectiveInvestment * property.appreciationPct) / 100;

  const handleAmountChange = (e) => {
    const raw = Number(e.target.value);
    // Snap to nearest valid multiple of minInvestment, never below it
    const snapped = Math.max(property.minInvestment, Math.round(raw / property.minInvestment) * property.minInvestment);
    setInvestAmount(snapped);
  };

  // Quick amounts: only show values that are valid multiples of minInvestment
  const quickAmounts = [500, 1000, 2500, 5000].filter((a) => a >= property.minInvestment);

  return (
    <div className="p-6 md:p-8 space-y-6">
        {/* Back Button */}
        <Link
          to="/portal/properties"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Properties
        </Link>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="xl:col-span-2 space-y-6">
            {/* Image Gallery */}
            <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
              <div className="relative h-64 sm:h-80 lg:h-96">
                <img
                  src={property.images[currentImage]}
                  alt={property.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />

                {property.images.length > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentImage((prev) => (prev === 0 ? property.images.length - 1 : prev - 1))}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-lg"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setCurrentImage((prev) => (prev === property.images.length - 1 ? 0 : prev + 1))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-lg"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}

                <div className="absolute bottom-3 left-3 flex gap-2">
                  <span className={`px-3 py-1 text-xs font-semibold rounded-lg backdrop-blur-sm ${
                    property.status === 'Funded' ? 'bg-emerald-500/90 text-white' : 'bg-primary-accent/90 text-white'
                  }`}>
                    {property.status}
                  </span>
                </div>

                <div className="absolute bottom-3 right-3 flex gap-1.5">
                  {property.images.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImage(idx)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        idx === currentImage ? 'bg-white w-6' : 'bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Thumbnail strip */}
              <div className="flex gap-2 p-3 overflow-x-auto">
                {property.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImage(idx)}
                    className={`flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                      idx === currentImage ? 'border-primary-accent' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Property Details */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{property.name}</h1>
                  <div className="flex items-center gap-1.5 text-gray-500 mt-1">
                    <MapPin className="w-4 h-4" />
                    <span>{property.location}, {property.country}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Total Property Value</p>
                  <p className="text-xl font-bold text-gray-900">{property.totalValue}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                  <Building2 className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-400">Type</p>
                    <p className="text-sm font-medium text-gray-900">{property.propertyType}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                  <Maximize2 className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-400">Size</p>
                    <p className="text-sm font-medium text-gray-900">{property.size}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                  <Bed className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-400">Bedrooms</p>
                    <p className="text-sm font-medium text-gray-900">{property.bedrooms}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                  <Bath className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-400">Bathrooms</p>
                    <p className="text-sm font-medium text-gray-900">{property.bathrooms}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="font-semibold text-gray-900 mb-3">About This Property</h3>
                <p className="text-gray-600 leading-relaxed">{property.description}</p>
              </div>

              <div className="mt-6">
                <h3 className="font-semibold text-gray-900 mb-3">Investment Highlights</h3>
                <div className="grid sm:grid-cols-2 gap-2">
                  {property.highlights.map((h, i) => (
                    <div key={i} className="flex items-start gap-2.5 py-2">
                      <div className="w-5 h-5 rounded-full bg-primary-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-primary-accent" />
                      </div>
                      <span className="text-sm text-gray-600">{h}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Documents */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-gray-400" />
                <h3 className="font-semibold text-gray-900">Legal Documents</h3>
              </div>
              <div className="space-y-2">
                {property.documents.map((doc, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                        <p className="text-xs text-gray-400">{doc.size}</p>
                      </div>
                    </div>
                    <Download className="w-4 h-4 text-gray-400 group-hover:text-primary-accent transition-colors" />
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4">Investment Timeline</h3>
              <div className="space-y-4">
                {property.timeline.map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        item.completed ? 'bg-primary-accent' : 'bg-gray-200'
                      }`}>
                        {item.completed ? (
                          <Check className="w-4 h-4 text-white" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-gray-400" />
                        )}
                      </div>
                      {i < property.timeline.length - 1 && (
                        <div className={`w-0.5 flex-1 mt-1 ${item.completed ? 'bg-primary-accent' : 'bg-gray-200'}`} />
                      )}
                    </div>
                    <div className="pb-6">
                      <p className="text-sm font-medium text-gray-900">{item.event}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{item.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar — Investment Panel */}
          <div className="space-y-6">
            {/* Investment Card */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm sticky top-24">
              <h3 className="font-semibold text-gray-900 text-lg mb-4">Invest in this Property</h3>

              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-emerald-600 font-medium">Annual Return</p>
                  <p className="text-xl font-bold text-emerald-600 mt-1">{annualReturnPct.toFixed(1)}%</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-blue-600 font-medium">Rental Yield</p>
                  <p className="text-xl font-bold text-blue-600 mt-1">{property.rentalYieldPct}%</p>
                </div>
              </div>

              {/* Funding Progress */}
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-500">Funding Progress</span>
                  <span className="font-semibold text-gray-900">{property.funded}%</span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${property.funded}%` }}
                    transition={{ duration: 0.8 }}
                    className="h-full rounded-full bg-gradient-to-r from-primary-accent to-cyan-400"
                  />
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-xs text-gray-400">{property.investors} investors</span>
                  <span className="text-xs text-gray-400">{100 - property.funded}% remaining</span>
                </div>
              </div>

              {/* Investment Amount */}
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  Investment Amount
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    min={property.minInvestment}
                    step={property.minInvestment}
                    value={investAmount}
                    onChange={handleAmountChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-accent/30 focus:border-primary-accent"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Min: ${property.minInvestment.toLocaleString()} per share · {shares} share{shares !== 1 ? 's' : ''}
                  {effectiveInvestment !== investAmount && (
                    <span className="text-amber-500 ml-1">(effective: ${effectiveInvestment.toLocaleString()})</span>
                  )}
                </p>
              </div>

              {/* Quick amounts */}
              <div className="flex flex-wrap gap-2 mb-6">
                {quickAmounts.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setInvestAmount(amount)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      investAmount === amount
                        ? 'bg-primary-accent text-white border-primary-accent'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-primary-accent hover:text-primary-accent'
                    }`}
                  >
                    ${amount.toLocaleString()}
                  </button>
                ))}
              </div>

              {/* Estimated Returns */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <p className="text-sm font-medium text-gray-700 mb-3">
                  Estimated Returns
                  <span className="text-xs text-gray-400 font-normal ml-1">(on ${effectiveInvestment.toLocaleString()})</span>
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Monthly Rental Income</span>
                    <span className="text-sm font-semibold text-emerald-600">
                      ${estimatedMonthlyIncome.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Annual Rental Income</span>
                    <span className="text-sm font-semibold text-emerald-600">
                      ${estimatedAnnualRentalIncome.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Annual Appreciation</span>
                    <span className="text-sm font-semibold text-blue-600">
                      ${estimatedAnnualAppreciation.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-200">
                    <span className="text-sm text-gray-500">Total Annual Return</span>
                    <span className="text-sm font-bold text-gray-900">
                      {annualReturnPct.toFixed(1)}% · ${(estimatedAnnualRentalIncome + estimatedAnnualAppreciation).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <button className="w-full py-3.5 bg-primary-accent hover:bg-steel-blue text-white font-semibold rounded-xl transition-colors text-sm">
                Invest ${effectiveInvestment.toLocaleString()}
              </button>
              <p className="text-xs text-gray-400 text-center mt-3">
                By investing, you agree to our Terms of Service
              </p>
            </div>
          </div>
        </div>
    </div>
  );
}
