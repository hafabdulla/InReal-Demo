
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Building2,
  MapPin,
  ArrowRight,
} from 'lucide-react';
import PortalLayout from '@/pages/portal/PortalLayout';
import { availableProperties } from '@/data/portalData';

const categories = ['All', 'Residential', 'Commercial', 'Hospitality'];
const statuses = ['All', 'Funding', 'Funded'];

export default function PropertiesPage() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('Funding');

  // Transform availableProperties to match the expected format
  const allProperties = availableProperties.map(p => ({
    id: p.id,
    title: p.name,
    name: p.name,
    location: p.location,
    country: p.location.split(', ').pop(),
    returns: `${p.expectedReturn}%`,
    annualReturn: `${p.expectedReturn}%`,
    image: p.image,
    propertyType: p.propertyType,
    status: p.fundingProgress >= 100 ? 'Funded' : 'Funding',
    funded: p.fundingProgress,
    rentalYield: `${(p.expectedReturn * 0.6).toFixed(1)}%`,
    minInvestment: `$${(p.investmentAmount / 100).toLocaleString()}`,
    propertyValue: `$${(p.totalValue / 1000000).toFixed(1)}M`,
    appreciation: `${(p.expectedReturn * 0.4).toFixed(1)}%`,
    investors: p.investors,
    completionDate: p.completionDate,
    description: p.description
  }));

  const sortedProperties = [...allProperties].sort((a, b) => {
    if (a.status === b.status) return b.funded - a.funded;
    return a.status === 'Funding' ? -1 : 1;
  });

  const featuredFunding = sortedProperties
    .filter((p) => p.status === 'Funding')
    .slice(0, 3);

  const filteredProperties = sortedProperties.filter((p) => {
    const matchesCategory = selectedCategory === 'All' || p.propertyType === selectedCategory;
    const matchesStatus = selectedStatus === 'All' || p.status === selectedStatus;
    return matchesCategory && matchesStatus;
  });

  return (
    <div className="p-6 md:p-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Browse Properties</h1>
          <p className="text-gray-500 mt-1">Discover curated real estate investment opportunities worldwide</p>
        </div>

        {/* Featured Funding Title Card */}
        <div className="relative overflow-hidden rounded-3xl border border-primary-accent/20 bg-gradient-to-r from-[#0f253f] via-[#123257] to-[#1a436d] p-6 sm:p-8 text-white shadow-md">
          <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-primary-accent/20 blur-2xl" />
          <div className="absolute -left-8 -bottom-8 h-28 w-28 rounded-full bg-cyan-300/10 blur-xl" />
          <p className="text-xs uppercase tracking-[0.2em] text-primary-accent/90 font-semibold">Funding Projects</p>
          <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold leading-tight">
            Earn more - Funding projects
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-200/90">
            Top opportunities currently open for funding
          </p>
        </div>

        {/* Top 3 Funding Carousel */}
        {featuredFunding.length > 0 && (
          <div className="overflow-x-auto pb-2 -mx-1 px-1">
            <div className="flex gap-4 snap-x snap-mandatory">
              {featuredFunding.map((property, index) => (
                <motion.div
                  key={`featured-${property.id}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08 }}
                  className="min-w-[84%] sm:min-w-[48%] lg:min-w-[32%] snap-start bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm"
                >
                  <div className="relative h-44 overflow-hidden">
                    <img
                      src={property.image}
                      alt={property.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3">
                      <span className="px-2.5 py-1 bg-primary-accent text-white text-xs font-semibold rounded-lg">
                        Funding
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900">{property.name}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{property.location}</p>
                    <div className="mt-3">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-gray-500">Funded</span>
                        <span className="font-semibold text-gray-900">{property.funded}%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-primary-accent to-cyan-400" style={{ width: `${property.funded}%` }} />
                      </div>
                    </div>
                    <Link
                      to={`/portal/properties/${property.id}`}
                      className="mt-4 inline-flex items-center gap-1 text-sm text-primary-accent font-medium hover:underline"
                    >
                      View Property <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Filter Pills */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Project Status</p>
            <div className="flex flex-wrap gap-2">
              {statuses.map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedStatus(s)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedStatus === s
                      ? 'bg-primary-accent text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Property Type</p>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === cat
                      ? 'bg-primary-accent text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results count */}
        <p className="text-sm text-gray-500">
          Showing <span className="font-medium text-gray-900">{filteredProperties.length}</span> properties
        </p>

        {/* Properties Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredProperties.map((property, index) => (
              <motion.div
                key={property.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-all group"
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={property.image}
                    alt={property.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  <div className="absolute top-3 left-3 flex gap-2">
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg backdrop-blur-sm ${
                      property.status === 'Funded'
                        ? 'bg-emerald-500/90 text-white'
                        : 'bg-primary-accent/90 text-white'
                    }`}>
                      {property.status}
                    </span>
                    <span className="px-2.5 py-1 bg-white/90 backdrop-blur-sm text-gray-700 text-xs font-medium rounded-lg">
                      {property.propertyType}
                    </span>
                  </div>
                  <div className="absolute top-3 right-3 flex flex-col gap-2">
                    <div className="bg-primary-accent/20 backdrop-blur-sm rounded-full px-3 py-1.5 font-semibold text-primary-accent text-xs border border-primary-accent/40">
                      {property.annualReturn} Est. ROI
                    </div>
                    <div className="bg-white/95 backdrop-blur-sm rounded-full px-3 py-1.5 font-semibold text-primary-accent text-xs">
                      {property.funded}% Funded
                    </div>
                  </div>
                  <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-white">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="text-sm font-medium">{property.location}</span>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-semibold text-gray-900 text-lg">{property.name}</h3>

                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="text-center bg-gray-50 rounded-xl py-3">
                      <p className="text-xs text-gray-400">Tgt. Rental Yield</p>
                      <p className="text-sm font-bold text-primary-accent mt-0.5">{property.rentalYield}</p>
                    </div>
                    <div className="text-center bg-gray-50 rounded-xl py-3">
                      <p className="text-xs text-gray-400">Min. Investment</p>
                      <p className="text-sm font-bold text-gray-900 mt-0.5">{property.minInvestment}</p>
                    </div>
                    <div className="text-center bg-gray-50 rounded-xl py-3">
                      <p className="text-xs text-gray-400">Property Value</p>
                      <p className="text-sm font-bold text-gray-900 mt-0.5">{property.propertyValue}</p>
                    </div>
                    <div className="text-center bg-gray-50 rounded-xl py-3">
                      <p className="text-xs text-gray-400">Tgt. Appreciation</p>
                      <p className="text-sm font-bold text-primary-accent mt-0.5">{property.appreciation}</p>
                    </div>
                  </div>

                  {/* Funding Progress */}
                  <div className="mt-4">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-gray-500">Funded</span>
                      <span className="font-semibold text-gray-900">{property.funded}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${property.funded}%` }}
                        transition={{ delay: 0.3 + index * 0.05, duration: 0.8 }}
                        className={`h-full rounded-full ${
                          property.funded === 100
                            ? 'bg-emerald-500'
                            : 'bg-gradient-to-r from-primary-accent to-cyan-400'
                        }`}
                      />
                    </div>
                  </div>

                  <Link
                    to={`/portal/properties/${property.id}`}
                    className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-xl transition-colors"
                  >
                    View Property <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>

        {filteredProperties.length === 0 && (
          <div className="text-center py-16">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No properties found</p>
            <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filters</p>
          </div>
        )}
    </div>
  );
}
