import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  MapPin,
  TrendingUp,
  Users,
  ArrowRight,
  X,
  ChevronLeft,
  ChevronRight,
  Building,
  Calendar,
  Percent,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function FeaturedProperties() {
  const { t } = useTranslation();
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const properties = [
    {
      title: "Bangkok Premium Condo",
      location: "Sukhumvit, Bangkok",
      image:
        "Modern luxury condominium in Bangkok Sukhumvit area with city views",
      price: "$500",
      returns: "14%",
      investors: "247",
      funded: "78%",
      images: [
        "https://raw.githubusercontent.com/hafabdulla/inrealdemowebsite/main/public/Copy%20of%20Regent%201.jpeg",
        "https://raw.githubusercontent.com/hafabdulla/inrealdemowebsite/main/public/Copy%20of%20Regent%202.jpeg",
        "https://raw.githubusercontent.com/hafabdulla/inrealdemowebsite/main/public/Copy%20of%20Regent%203.jpeg",
        "https://raw.githubusercontent.com/hafabdulla/inrealdemowebsite/main/public/Copy%20of%20Regent%204.jpeg",
        "https://raw.githubusercontent.com/hafabdulla/inrealdemowebsite/main/public/Copy%20of%20Regent%2031%20floor%20plan.jpeg",
      ],
      details: {
        propertyType: "Luxury Condominium",
        size: "85 sqm",
        bedrooms: "2",
        bathrooms: "2",
        yearBuilt: "2022",
        totalUnits: "500",
        rentalYield: "6.5%",
        appreciation: "7.5%",
        description:
          "Premium condominium in the heart of Sukhumvit, Bangkok's most sought-after district. Features modern amenities including infinity pool, fitness center, and 24/7 security. Minutes away from BTS Skytrain and major shopping centers.",
        amenities: [
          "Infinity Pool",
          "Fitness Center",
          "24/7 Security",
          "Parking",
          "Rooftop Garden",
          "Co-working Space",
        ],
      },
    },
    {
      title: "Riverside Luxury Apartment",
      location: "Chao Phraya, Bangkok",
      image:
        "Luxury riverside apartment building along Chao Phraya river Bangkok",
      price: "$750",
      returns: "16%",
      investors: "189",
      funded: "92%",
      images: [
        "https://raw.githubusercontent.com/hafabdulla/inrealdemowebsite/main/public/Copy%20of%20Regent%205.jpeg",
        "https://raw.githubusercontent.com/hafabdulla/inrealdemowebsite/main/public/Copy%20of%20Regent%207.jpeg",
        "https://raw.githubusercontent.com/hafabdulla/inrealdemowebsite/main/public/Copy%20of%20Regent%208.jpeg",
        "https://raw.githubusercontent.com/hafabdulla/inrealdemowebsite/main/public/Copy%20of%20Regent%209.jpeg",
        "https://raw.githubusercontent.com/hafabdulla/inrealdemowebsite/main/public/Copy%20of%20Regent%2010.jpeg",
      ],
      details: {
        propertyType: "Luxury Apartment",
        size: "120 sqm",
        bedrooms: "3",
        bathrooms: "2",
        yearBuilt: "2021",
        totalUnits: "300",
        rentalYield: "7.2%",
        appreciation: "8.8%",
        description:
          "Stunning riverside apartment with panoramic views of the Chao Phraya River. This premium development offers world-class amenities and is located near ICONSIAM, one of Bangkok's premier shopping destinations.",
        amenities: [
          "River View",
          "Private Pier",
          "Spa & Wellness",
          "Tennis Court",
          "Kids Club",
          "Concierge Service",
        ],
      },
    },
    {
      title: "Downtown Business Suite",
      location: "Silom, Bangkok",
      image: "Modern business district high-rise building in Bangkok Silom",
      price: "$600",
      returns: "15%",
      investors: "312",
      funded: "65%",
      images: [
        "https://raw.githubusercontent.com/hafabdulla/inrealdemowebsite/main/public/Copy%20of%20Regent%20Actual%201.jpeg",
        "https://raw.githubusercontent.com/hafabdulla/inrealdemowebsite/main/public/Copy%20of%20Regent%20Actual%202.jpeg",
        "https://raw.githubusercontent.com/hafabdulla/inrealdemowebsite/main/public/Copy%20of%20Regent%20Actual%203.jpeg",
        "https://raw.githubusercontent.com/hafabdulla/inrealdemowebsite/main/public/Copy%20of%20Regent%20Actual%204.jpeg",
        "https://raw.githubusercontent.com/hafabdulla/inrealdemowebsite/main/public/Copy%20of%20WhatsApp%20Image%202025-12-02%20at%2013.16.10.jpeg",
      ],
      details: {
        propertyType: "Business Suite",
        size: "95 sqm",
        bedrooms: "2",
        bathrooms: "2",
        yearBuilt: "2023",
        totalUnits: "450",
        rentalYield: "6.8%",
        appreciation: "8.2%",
        description:
          "Modern business suite in Bangkok's financial district. Perfect for professionals seeking a premium living experience with easy access to MRT and BTS stations. Features state-of-the-art facilities and smart home technology.",
        amenities: [
          "Smart Home",
          "Business Center",
          "Meeting Rooms",
          "Sky Lounge",
          "Valet Parking",
          "EV Charging",
        ],
      },
    },
  ];

  const openOverlay = (property) => {
    setSelectedProperty(property);
    setCurrentImageIndex(0);
    document.body.style.overflow = "hidden";
  };

  const closeOverlay = () => {
    setSelectedProperty(null);
    setCurrentImageIndex(0);
    document.body.style.overflow = "unset";
  };

  const nextImage = () => {
    if (selectedProperty) {
      setCurrentImageIndex((prev) =>
        prev === selectedProperty.images.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevImage = () => {
    if (selectedProperty) {
      setCurrentImageIndex((prev) =>
        prev === 0 ? selectedProperty.images.length - 1 : prev - 1
      );
    }
  };

  return (
    <section
      id="properties"
      className="py-12 md:py-20 px-4 sm:px-6 lg:px-8 bg-charcoal-black"
    >
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{
            opacity: 0,
            y: 20,
          }}
          whileInView={{
            opacity: 1,
            y: 0,
          }}
          viewport={{
            once: true,
          }}
          className="text-center mb-8 sm:mb-12 md:mb-16"
        >
          <p className="text-primary-accent font-bold text-sm md:text-base lg:text-xl uppercase mb-4">
            {t('properties.tagline')}
          </p>
          <h2 className="text-white font-bold text-3xl sm:text-4xl md:text-5xl leading-tight normal-case">
            {t('properties.title')}{" "}
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
          {properties.map((property, index) => (
            <motion.div
              key={property.title}
              initial={{
                opacity: 0,
                y: 20,
              }}
              whileInView={{
                opacity: 1,
                y: 0,
              }}
              viewport={{
                once: true,
              }}
              transition={{
                delay: index * 0.2,
              }}
              className="group"
            >
              <div className="bg-modern-grey/80 text-off-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 border border-slate-grey/30">
                <div
                  className="relative overflow-hidden h-48 sm:h-56 md:h-64 cursor-pointer"
                  onClick={() => openOverlay(property)}
                >
                  <img
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    alt={property.title}
                    src={property.images[0]}
                  />

                  <div className="absolute top-3 right-3 sm:top-4 sm:right-4 bg-black/95 backdrop-blur-sm rounded-full px-3 py-1.5 sm:px-4 sm:py-2 font-semibold text-primary-accent text-sm sm:text-base">
                    {property.funded} Funded
                  </div>
                </div>

                <div className="p-4 sm:p-5 md:p-6">
                  <h3 className="font-bold mb-2 text-primary-accent normal-case text-xl sm:text-2xl">
                    {property.title}
                  </h3>

                  <div className="flex items-center text-slate-grey mb-3 sm:mb-4 text-sm sm:text-base">
                    <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 text-primary-accent" />
                    <span>{property.location}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6 py-3 sm:py-4 border-y border-modern-grey/20">
                    <div className="text-center">
                      <p className="text-xs sm:text-sm text-slate-grey mb-0.5 sm:mb-1">
                        Min. Investment
                      </p>
                      <p className="text-base sm:text-lg font-bold text-off-white">
                        {property.price}
                      </p>
                    </div>
                    <div className="text-center border-x border-modern-grey/20">
                      <p className="text-xs sm:text-sm text-slate-grey mb-0.5 sm:mb-1">
                        Returns
                      </p>
                      <p className="text-base sm:text-lg font-bold text-primary-accent flex items-center justify-center">
                        <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" />
                        {property.returns}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs sm:text-sm text-slate-grey mb-0.5 sm:mb-1">
                        Investors
                      </p>
                      <p className="text-base sm:text-lg font-bold text-off-white flex items-center justify-center">
                        <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" />
                        {property.investors}
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={() => openOverlay(property)}
                    className="w-full bg-primary-accent hover:bg-steel-blue text-charcoal-black font-bold group"
                  >
                    View Details
                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Property Detail Overlay */}
      <AnimatePresence>
        {selectedProperty && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm"
            onClick={closeOverlay}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-deep-graphite rounded-xl sm:rounded-2xl max-w-5xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl border border-modern-grey/30 custom-scrollbar relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={closeOverlay}
                className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 sm:p-2 transition-colors"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              {/* Image Carousel */}
              <div className="relative h-56 sm:h-72 md:h-96 overflow-hidden rounded-t-xl sm:rounded-t-2xl">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={currentImageIndex}
                    src={selectedProperty.images[currentImageIndex]}
                    alt={`${selectedProperty.title} - Image ${
                      currentImageIndex + 1
                    }`}
                    className="w-full h-full object-cover"
                    initial={{ opacity: 0, x: 100 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ duration: 0.3 }}
                  />
                </AnimatePresence>

                {/* Carousel Controls */}
                <button
                  onClick={prevImage}
                  className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 sm:p-3 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 sm:p-3 transition-colors"
                >
                  <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>

                {/* Image Indicators */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {selectedProperty.images.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`w-3 h-3 rounded-full transition-colors ${
                        idx === currentImageIndex
                          ? "bg-primary-accent"
                          : "bg-white/50 hover:bg-white/70"
                      }`}
                    />
                  ))}
                </div>

                {/* Funded Badge */}
                <div className="absolute top-2 left-2 sm:top-4 sm:left-4 bg-black/80 backdrop-blur-sm rounded-full px-3 py-1.5 sm:px-4 sm:py-2 font-semibold text-primary-accent text-sm sm:text-base">
                  {selectedProperty.funded} Funded
                </div>
              </div>

              {/* Property Details */}
              <div className="p-4 sm:p-6 md:p-8">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-primary-accent mb-1 sm:mb-2">
                      {selectedProperty.title}
                    </h2>
                    <div className="flex items-center text-slate-grey">
                      <MapPin className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 text-primary-accent" />
                      <span className="text-base sm:text-lg">
                        {selectedProperty.location}
                      </span>
                    </div>
                  </div>
                  <div className="text-left md:text-right">
                    <p className="text-sm text-slate-grey">Min. Investment</p>
                    <p className="text-2xl sm:text-3xl font-bold text-off-white">
                      {selectedProperty.price}
                    </p>
                  </div>
                </div>

                {/* Key Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-6 sm:mb-8 p-3 sm:p-4 bg-charcoal-black/50 rounded-xl">
                  <div className="text-center p-2 sm:p-3">
                    <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1.5 sm:mb-2 text-primary-accent" />
                    <p className="text-xs sm:text-sm text-slate-grey">
                      Total Returns
                    </p>
                    <p className="text-lg sm:text-xl font-bold text-primary-accent">
                      {selectedProperty.returns}
                    </p>
                  </div>
                  <div className="text-center p-2 sm:p-3">
                    <Percent className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1.5 sm:mb-2 text-primary-accent" />
                    <p className="text-xs sm:text-sm text-slate-grey">
                      Rental Yield
                    </p>
                    <p className="text-lg sm:text-xl font-bold text-off-white">
                      {selectedProperty.details.rentalYield}
                    </p>
                  </div>
                  <div className="text-center p-2 sm:p-3">
                    <Users className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1.5 sm:mb-2 text-primary-accent" />
                    <p className="text-xs sm:text-sm text-slate-grey">
                      Investors
                    </p>
                    <p className="text-lg sm:text-xl font-bold text-off-white">
                      {selectedProperty.investors}
                    </p>
                  </div>
                  <div className="text-center p-2 sm:p-3">
                    <Building className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1.5 sm:mb-2 text-primary-accent" />
                    <p className="text-xs sm:text-sm text-slate-grey">
                      Property Type
                    </p>
                    <p className="text-lg sm:text-xl font-bold text-off-white">
                      {selectedProperty.details.propertyType.split(" ")[0]}
                    </p>
                  </div>
                </div>

                {/* Description */}
                <div className="mb-6 sm:mb-8">
                  <h3 className="text-lg sm:text-xl font-bold text-off-white mb-2 sm:mb-3">
                    About This Property
                  </h3>
                  <p className="text-slate-grey leading-relaxed text-sm sm:text-base">
                    {selectedProperty.details.description}
                  </p>
                </div>

                {/* Property Info Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4 mb-6 sm:mb-8">
                  <div className="bg-charcoal-black/30 p-3 sm:p-4 rounded-lg">
                    <p className="text-xs sm:text-sm text-slate-grey">Size</p>
                    <p className="text-base sm:text-lg font-semibold text-off-white">
                      {selectedProperty.details.size}
                    </p>
                  </div>
                  <div className="bg-charcoal-black/30 p-3 sm:p-4 rounded-lg">
                    <p className="text-xs sm:text-sm text-slate-grey">
                      Bedrooms
                    </p>
                    <p className="text-base sm:text-lg font-semibold text-off-white">
                      {selectedProperty.details.bedrooms}
                    </p>
                  </div>
                  <div className="bg-charcoal-black/30 p-3 sm:p-4 rounded-lg">
                    <p className="text-xs sm:text-sm text-slate-grey">
                      Bathrooms
                    </p>
                    <p className="text-base sm:text-lg font-semibold text-off-white">
                      {selectedProperty.details.bathrooms}
                    </p>
                  </div>
                  <div className="bg-charcoal-black/30 p-3 sm:p-4 rounded-lg">
                    <p className="text-xs sm:text-sm text-slate-grey">
                      Year Built
                    </p>
                    <p className="text-base sm:text-lg font-semibold text-off-white">
                      {selectedProperty.details.yearBuilt}
                    </p>
                  </div>
                  <div className="bg-charcoal-black/30 p-3 sm:p-4 rounded-lg">
                    <p className="text-xs sm:text-sm text-slate-grey">
                      Total Units
                    </p>
                    <p className="text-base sm:text-lg font-semibold text-off-white">
                      {selectedProperty.details.totalUnits}
                    </p>
                  </div>
                  <div className="bg-charcoal-black/30 p-3 sm:p-4 rounded-lg">
                    <p className="text-xs sm:text-sm text-slate-grey">
                      Appreciation
                    </p>
                    <p className="text-base sm:text-lg font-semibold text-primary-accent">
                      {selectedProperty.details.appreciation}
                    </p>
                  </div>
                </div>

                {/* Amenities */}
                <div className="mb-6 sm:mb-8">
                  <h3 className="text-lg sm:text-xl font-bold text-off-white mb-2 sm:mb-3">
                    Amenities
                  </h3>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {selectedProperty.details.amenities.map((amenity, idx) => (
                      <span
                        key={idx}
                        className="bg-primary-accent/20 text-primary-accent px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium"
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <Button className="flex-1 bg-primary-accent hover:bg-steel-blue text-charcoal-black font-bold py-4 sm:py-6 text-base sm:text-lg">
                    <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    Invest Now
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 border-primary-accent text-primary-accent hover:bg-primary-accent hover:text-black font-bold py-4 sm:py-6 text-base sm:text-lg"
                  >
                    <Calendar className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    Schedule a Call
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}