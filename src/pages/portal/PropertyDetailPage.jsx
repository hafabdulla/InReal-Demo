import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  MapPin,
  Building2,
  Calendar,
  Percent,
  DollarSign,
  Bed,
  Bath,
  Maximize2,
  FileText,
} from 'lucide-react';
import { getApiBase } from '@/lib/utils';
import { fadeUp, staggerContainer, staggerItem } from '@/animations.js';

function money(value) {
  const n = Number(value) || 0;
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function PropertyDetailPage() {
  const { id } = useParams();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadProperty = async () => {
      try {
        setLoading(true);
        setError('');

        const response = await fetch(`${getApiBase()}/api/properties/${id}`);
        const payload = await response.json();

        if (!payload.success) {
          throw new Error(payload.error || 'Property not found');
        }

        const data = payload.data;
        const propertyValue = Number(data.PropertyValue) || 0;
        const fractionPrice = Number(data.FractionPrice) || 0;
        const projectedYield = Number(data.ProjectedAnnualYield) || 0;
        const monthlyIncome = Number(data.MonthlyRentalIncome) || 0;
        const fractionsSold = Number(data.FractionsSold) || 0;
        const totalFractions = Number(data.TotalFractions) || 0;
        const funded = totalFractions > 0 ? Math.round((fractionsSold / totalFractions) * 100) : 0;

        setProperty({
          id: data.PropertyID,
          name: data.PropertyName,
          location: `${data.City}, ${data.Country}`,
          country: data.Country,
          images: data.ImageURL ? [data.ImageURL] : [],
          minInvestment: fractionPrice,
          totalValue: propertyValue,
          rentalYieldPct: projectedYield,
          appreciationPct: Math.max(0, projectedYield * 0.4),
          investors: fractionsSold,
          funded,
          propertyType: data.PropertyType,
          size: data.SquareMeter ? `${data.SquareMeter} sqm` : 'N/A',
          bedrooms: Number(data.Bedrooms) || 0,
          bathrooms: Number(data.Bathrooms) || 0,
          yearBuilt: data.AcquisitionDate ? new Date(data.AcquisitionDate).getFullYear() : 'N/A',
          status: data.Status || 'Funding',
          description: data.PropertyDescription || 'No description available.',
          monthlyIncome,
        });
      } catch (err) {
        setError(err.message || 'Failed to load property');
      } finally {
        setLoading(false);
      }
    };

    if (id) loadProperty();
  }, [id]);

  if (loading) {
    return (
      <div className="p-6 md:p-8 text-center text-gray-500">Loading property...</div>
    );
  }

  if (error || !property) {
    return (
      <div className="p-6 md:p-8">
        <Link
          to="/portal/properties"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors text-sm mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Properties
        </Link>
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <p className="text-gray-900 font-semibold">Unable to load property</p>
          <p className="text-gray-500 mt-2">{error || 'Property not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <Link
        to="/portal/properties"
        className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Properties
      </Link>

      <motion.div className="grid grid-cols-1 xl:grid-cols-3 gap-6" variants={staggerContainer} initial="initial" animate="animate">
        <motion.div variants={staggerItem} className="xl:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
            <div className="relative h-64 sm:h-80 lg:h-96 bg-gray-100 flex items-center justify-center overflow-hidden">
              {property.images.length > 0 ? (
                <img src={property.images[0]} alt={property.name} className="w-full h-full object-cover" />
              ) : (
                <div className="text-center text-gray-400">
                  <Building2 className="w-16 h-16 mx-auto mb-3" />
                  <p>No property image available</p>
                </div>
              )}
              <div className="absolute bottom-3 left-3">
                <span className={`px-3 py-1 text-xs font-semibold rounded-lg backdrop-blur-sm ${
                  property.status === 'Funded' ? 'bg-emerald-500/90 text-white' : 'bg-primary-accent/90 text-white'
                }`}>
                  {property.status}
                </span>
              </div>
            </div>
          </div>

          <motion.div variants={fadeUp} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{property.name}</h1>
                <div className="flex items-center gap-1.5 text-gray-500 mt-1">
                  <MapPin className="w-4 h-4" />
                  <span>{property.location}</span>
                </div>
              </div>
              <span className="inline-flex items-center rounded-lg bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
                {property.propertyType}
              </span>
            </div>

            <p className="text-gray-600 leading-7">{property.description}</p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400">Min. Investment</p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">{money(property.minInvestment)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400">Property Value</p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">{money(property.totalValue)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400">Projected Annual Yield</p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">{Number(property.rentalYieldPct || 0).toFixed(1)}%</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400">Current Funding</p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">{property.funded}%</p>
              </div>
            </div>
          </motion.div>
        </motion.div>

        <motion.div variants={staggerItem} className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
            <h2 className="font-semibold text-gray-900">Property Snapshot</h2>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-center gap-2"><Maximize2 className="w-4 h-4 text-gray-400" /> {property.size}</div>
              <div className="flex items-center gap-2"><Bed className="w-4 h-4 text-gray-400" /> {property.bedrooms} bedrooms</div>
              <div className="flex items-center gap-2"><Bath className="w-4 h-4 text-gray-400" /> {property.bathrooms} bathrooms</div>
              <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-gray-400" /> Built / acquired: {property.yearBuilt}</div>
              <div className="flex items-center gap-2"><Percent className="w-4 h-4 text-gray-400" /> Appreciation estimate: {property.appreciationPct.toFixed(1)}%</div>
              <div className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-gray-400" /> Monthly rental income: {money(property.monthlyIncome)}</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
            <h2 className="font-semibold text-gray-900">Activity</h2>
            <div className="text-sm text-gray-600 space-y-2">
              <div className="flex items-center justify-between"><span>Fractions sold</span><span className="font-medium text-gray-900">{property.investors}</span></div>
              <div className="flex items-center justify-between"><span>Status</span><span className="font-medium text-gray-900">{property.status}</span></div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-3">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2"><FileText className="w-4 h-4 text-gray-400" /> Documents</h2>
            <p className="text-sm text-gray-500">Document storage is locked behind authenticated access. Use the backend proof endpoints or curl-based demo flow.</p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
