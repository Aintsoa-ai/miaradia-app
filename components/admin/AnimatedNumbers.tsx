import React, { useState, useEffect } from 'react';
import { formatPrice } from '../../lib/formatPrice';

export const AnimatedPrice = ({ value }: { value: number }) => {
  const [displayValue, setDisplayValue] = useState(value);
  
  useEffect(() => {
    if (displayValue === value) return;
    let start = displayValue;
    const end = value;
    const duration = 1000; // ms
    const startTime = Date.now();
    let animationFrame: number;
    
    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = Math.floor(start + (end - start) * easeProgress);
      setDisplayValue(current);
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setDisplayValue(end);
      }
    };
    
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value]);

  return <>{formatPrice(displayValue)}</>;
};

export const AnimatedSimpleNumber = ({ value }: { value: number }) => {
  const [displayValue, setDisplayValue] = useState(value);
  
  useEffect(() => {
    if (displayValue === value) return;
    let start = displayValue;
    const end = value;
    const duration = 1000;
    const startTime = Date.now();
    let animationFrame: number;
    
    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = Math.floor(start + (end - start) * easeProgress);
      setDisplayValue(current);
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setDisplayValue(end);
      }
    };
    
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value]);

  return <>{displayValue}</>;
};
