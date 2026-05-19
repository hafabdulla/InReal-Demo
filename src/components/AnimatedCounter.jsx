import React, { useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

export default function AnimatedCounter({ 
  target, 
  prefix = '', 
  suffix = '', 
  decimals = 0 
}) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => {
    return decimals > 0 
      ? latest.toFixed(decimals)
      : Math.round(latest).toLocaleString();
  });

  useEffect(() => {
    const controls = animate(count, target, {
      duration: 2,
      ease: [0.4, 0, 0.2, 1],
    });

    return controls.stop;
  }, [target, count]);

  return (
    <motion.span>
      {prefix}
      <motion.span>{rounded}</motion.span>
      {suffix}
    </motion.span>
  );
}