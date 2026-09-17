import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  MapPin,
  Building2,
  Calendar,
  DollarSign,
  Bed,
  Bath,
  Maximize2,
  FileText,
} from 'lucide-react';
import { getApiBase, formatCalendarDate } from '@/lib/utils';
import { fadeUp, staggerContainer, staggerItem } from '@/animations.js';
import ExpressInterest from './ExpressInterest';

function money(value) {
  const n = Number(value) || 0;
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function PropertyDetailPage() {
  const { id } = useParams();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Index rather than the image itself, so the selection survives the gallery
  // being refetched with new signed URLs — holding the object would leave the
  // main image pointing at a URL that is no longer in the list.
  const [activeImage, setActiveImage] = useState(0);

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
        // null when the current valuation does not state one. Kept apart from
        // zero so the page says "Not stated" instead of showing an investor a
        // 0% yield or $0 rent that nobody claimed.
        const projectedYield = data.ProjectedAnnualYield === null || data.ProjectedAnnualYield === undefined
          ? null
          : Number(data.ProjectedAnnualYield);
        const monthlyIncome = data.MonthlyRentalIncome === null || data.MonthlyRentalIncome === undefined
          ? null
          : Number(data.MonthlyRentalIncome);
        const fractionsSold = Number(data.FractionsSold) || 0;
        const totalFractions = Number(data.TotalFractions) || 0;
        const funded = totalFractions > 0 ? Math.round((fractionsSold / totalFractions) * 100) : 0;

        setProperty({
          id: data.PropertyID,
          name: data.PropertyName,
          location: `${data.City}, ${data.Country}`,
          country: data.Country,
          // The operator-curated gallery, in their chosen order. Falls back to
          // the legacy single ImageURL column so the seeded properties keep
          // showing something until someone uploads a real photo — the two
          // are not merged, because a stock photo sitting among real ones is
          // worse than either on its own.
          images: Array.isArray(data.Media) && data.Media.length > 0
            ? data.Media.filter((m) => m.Url).map((m) => ({ url: m.Url, caption: m.Caption }))
            : (data.ImageURL ? [{ url: data.ImageURL, caption: null }] : []),
          // The price of one fraction. This used to be labelled "Min.
          // Investment" on the page below, which it never was — the minimum is
          // a platform-wide figure the server owns, and showing the fraction
          // price under that label told an investor the minimum was $890 when
          // it is $3,000.
          fractionPrice,
          // Published by the property endpoint from the one server constant,
          // so this page never carries its own copy of the figure.
          minimumIndicativeAmount: Number(data.MinimumIndicativeAmount) || null,
          totalValue: propertyValue,
          rentalYieldPct: projectedYield,
          // No appreciation figure. This page used to show 40% of the projected
          // yield as an "appreciation estimate" — a number with no source at
          // all, which REQ-USR-15's "source and date on any forward-looking
          // figure" rules out on a product page.
          investors: fractionsSold,
          funded,
          propertyType: data.PropertyType,
          size: data.SquareMeter ? `${data.SquareMeter} sqm` : 'N/A',
          bedrooms: Number(data.Bedrooms) || 0,
          bathrooms: Number(data.Bathrooms) || 0,
          // The year read straight off the 'YYYY-MM-DD' string. Through new
          // Date() it would put 1 January in the previous year for anyone west
          // of UTC.
          acquiredYear: data.AcquisitionDate ? String(data.AcquisitionDate).slice(0, 4) : null,
          valuationAsOf: formatCalendarDate(data.ValuationAsOf),
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

    setActiveImage(0);
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
                <img
                  src={property.images[Math.min(activeImage, property.images.length - 1)].url}
                  alt={property.images[Math.min(activeImage, property.images.length - 1)].caption || property.name}
                  className="w-full h-full object-cover"
                />
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

            {/* Only shown when there is genuinely more than one photo — a strip
                holding a single thumbnail is a control that does nothing. */}
            {property.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto p-3">
                {property.images.map((image, index) => (
                  <button
                    key={image.url}
                    type="button"
                    onClick={() => setActiveImage(index)}
                    aria-label={image.caption || `View photo ${index + 1}`}
                    aria-current={index === activeImage}
                    className={`shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${
                      index === activeImage ? 'border-primary-accent' : 'border-transparent hover:border-gray-300'
                    }`}
                  >
                    <img
                      src={image.url}
                      alt={image.caption || `${property.name} photo ${index + 1}`}
                      className="w-20 h-16 object-cover"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            )}

            {property.images[activeImage]?.caption && (
              <p className="px-4 pb-4 text-sm text-gray-500">{property.images[activeImage].caption}</p>
            )}
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
                <p className="text-xs text-gray-400">Price per fraction</p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">{money(property.fractionPrice)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400">Property Value</p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">{money(property.totalValue)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400">Projected Annual Yield</p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">
                  {property.rentalYieldPct === null ? 'Not stated' : `${property.rentalYieldPct.toFixed(1)}%`}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400">Current Funding</p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">{property.funded}%</p>
              </div>
            </div>
            {property.valuationAsOf && (
              <p className="text-xs text-gray-400">Figures as of {property.valuationAsOf}</p>
            )}
          </motion.div>
        </motion.div>

        <motion.div variants={staggerItem} className="space-y-6">
          {/* First in the column on purpose: it is the one thing an investor
              can actually do on this page. */}
          <ExpressInterest
            propertyId={property.id}
            propertyName={property.name}
            minimumAmount={property.minimumIndicativeAmount}
          />

          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
            <h2 className="font-semibold text-gray-900">Property Snapshot</h2>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-center gap-2"><Maximize2 className="w-4 h-4 text-gray-400" /> {property.size}</div>
              <div className="flex items-center gap-2"><Bed className="w-4 h-4 text-gray-400" /> {property.bedrooms} bedrooms</div>
              <div className="flex items-center gap-2"><Bath className="w-4 h-4 text-gray-400" /> {property.bathrooms} bathrooms</div>
              <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-gray-400" /> Acquired: {property.acquiredYear || 'Not stated'}</div>
              <div className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-gray-400" /> Monthly rental income: {property.monthlyIncome === null ? 'Not stated' : money(property.monthlyIncome)}</div>
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
