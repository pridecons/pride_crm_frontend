"use client";
import React, { useRef, useEffect } from "react";

// Nifty30StockSlider.jsx
// Default-exported React component. Tailwind CSS required in your app.
// Usage: <Nifty30StockSlider data={yourArrayOf30Objects} autoplayInterval={3000} />

const sampleData = [
  { symbol: "RELIANCE", price: 1395.5, change_percent: 0.88 },
  { symbol: "HDFCBANK", price: 1400.0, change_percent: 0.70 },
  { symbol: "ICICIBANK", price: 1412.1, change_percent: 0.75 },
  { symbol: "TCS", price: 3131.9, change_percent: 0.25 },
  { symbol: "INFY", price: 1527.6, change_percent: 1.19 },
  { symbol: "HINDUNILVR", price: 270.4, change_percent: -0.25 },
  { symbol: "LT", price: 2417.0, change_percent: 0.42 },
  { symbol: "AXISBANK", price: 1102.2, change_percent: 1.36 },
  { symbol: "SBIN", price: 780.5, change_percent: 0.95 },
  { symbol: "BHARTIARTL", price: 1916.0, change_percent: 0.15 },
  { symbol: "ONGC", price: 170.8, change_percent: -0.12 },
  { symbol: "MARUTI", price: 15369.0, change_percent: 1.82 },
  { symbol: "TATAMOTORS", price: 714.45, change_percent: 1.22 },
  { symbol: "SUNPHARMA", price: 1616.8, change_percent: 0.44 },
  { symbol: "DRREDDY", price: 1313.7, change_percent: 0.81 },
  { symbol: "UPL", price: 600.0, change_percent: -0.18 },
  { symbol: "BAJFINANCE", price: 989.7, change_percent: 2.0 },
  { symbol: "ASIANPAINT", price: 2550.0, change_percent: -0.23 },
  { symbol: "WIPRO", price: 420.5, change_percent: 0.33 },
  { symbol: "KOTAKBANK", price: 1979.0, change_percent: 0.35 },
  { symbol: "NTPC", price: 263.4, change_percent: 0.10 },
  { symbol: "TECHM", price: 1526.0, change_percent: 0.37 },
  { symbol: "COALINDIA", price: 393.9, change_percent: 0.14 },
  { symbol: "TATASTEEL", price: 124.2, change_percent: -0.55 },
  { symbol: "GODREJPROP", price: 1770.0, change_percent: 0.60 },
  { symbol: "INDUSINDBK", price: 1600.0, change_percent: 0.47 },
  { symbol: "BPCL", price: 558.5, change_percent: -0.20 },
  { symbol: "HCLTECH", price: 1466.9, change_percent: -0.05 },
  { symbol: "GRASIM", price: 2805.0, change_percent: 0.21 }
];

export default function Nifty30StockSlider({ data = sampleData, autoplayInterval = 3000 }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const id = setInterval(() => {
      if (!containerRef.current) return;
      const el = containerRef.current;
      const card = el.querySelector('[data-card]');
      if (!card) return;
      const scrollAmount = card.offsetWidth + parseInt(getComputedStyle(card).marginRight || '16');
      const maxScrollLeft = el.scrollWidth - el.clientWidth;
      if (Math.round(el.scrollLeft + scrollAmount) >= maxScrollLeft) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    }, autoplayInterval);
    return () => clearInterval(id);
  }, [autoplayInterval]);
return (
  <div className="w-full px-5 pt-1 mx-auto bg-gradient-to-r from-gray-900 via-black to-gray-900">
    <div
      ref={containerRef}
      className="scrollbar-hide overflow-x-auto scroll-smooth whitespace-nowrap snap-x snap-mandatory -mx-2 px-2"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {data.map((item, idx) => {
        const isUp = Number(item.change_percent) >= 0;
        return (
          <div
            key={item.symbol + idx}
            data-card
            role="group"
            aria-label={`${item.symbol} ${item.price} INR ${isUp ? 'up' : 'down'} ${item.change_percent}%`}
            className="inline-block align-top mr-2 snap-start bg-gradient-to-br from-white via-gray-50 to-gray-100 shadow-md rounded-xl px-2 border border-gray-200"
          >
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700 font-medium pr-1">{item.symbol}</div>
              <div className="text-sm font-bold text-gray-900">
                {item.price.toLocaleString('en-IN')}
              </div>
              <div className="text-right">
                <div
                  className={`text-sm font-semibold ${
                    isUp
                      ? 'text-emerald-600 drop-shadow-sm'
                      : 'text-rose-600 drop-shadow-sm'
                  }`}
                >
                  {isUp ? '▲' : '▼'} {Math.abs(Number(item.change_percent)).toFixed(2)}%
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);
}