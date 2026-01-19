
import React, { useState, useEffect } from 'react';
import { TARGET_DATE } from '../constants';

const CountdownTimer: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = TARGET_DATE - now;

      if (distance < 0) {
        clearInterval(interval);
        return;
      }

      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000)
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const TimeUnit = ({ value, label }: { value: number, label: string }) => (
    <div className="flex flex-col items-center mx-4 bg-white shadow-lg rounded-2xl p-6 min-w-[120px] border-b-4 border-pink-500">
      <span className="text-5xl font-bold text-pink-600 mb-1">{value}</span>
      <span className="text-gray-500 font-semibold">{label}</span>
    </div>
  );

  return (
    /* flex-row-reverse ensures that in a RTL environment, the first element (Days) is positioned at the far left */
    <div className="flex flex-row-reverse justify-center items-center my-10 animate-fade-in">
      <TimeUnit value={timeLeft.days} label="ימים" />
      <TimeUnit value={timeLeft.hours} label="שעות" />
      <TimeUnit value={timeLeft.minutes} label="דקות" />
      <TimeUnit value={timeLeft.seconds} label="שניות" />
    </div>
  );
};

export default CountdownTimer;
