const Logo = () => {
  return (
    <div className="flex items-center space-x-2">
      <div className="relative">
        <svg
          className="w-10 h-10"
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Microphone base with gradient */}
          <path
            d="M20 30c5.523 0 10-4.477 10-10V10c0-5.523-4.477-10-10-10S10 4.477 10 10v10c0 5.523 4.477 10 10 10z"
            fill="url(#gradient-mic)"
          />
          {/* Fire flames with animation */}
          <path
            className="animate-flicker"
            d="M20 35c8 0 12-4 12-4s-4-8-4-12c0-4-2-6-4-6s-4 2-4 6c0-4-2-6-4-6s-4 2-4 6c0 4-4 12-4 12s4 4 12 4z"
            fill="url(#gradient-fire)"
          />
          {/* Definitions for gradients */}
          <defs>
            <linearGradient id="gradient-mic" x1="10" y1="0" x2="30" y2="30" gradientUnits="userSpaceOnUse">
              <stop stopColor="#3B82F6" />
              <stop offset="1" stopColor="#1D4ED8" />
            </linearGradient>
            <linearGradient id="gradient-fire" x1="8" y1="13" x2="32" y2="35" gradientUnits="userSpaceOnUse">
              <stop stopColor="#EF4444" />
              <stop offset="1" stopColor="#DC2626" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div className="flex flex-col">
        <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-red-600">
          Hawi
        </span>
        <span className="text-sm font-medium text-gray-500">SmartRSSFeed</span>
      </div>
    </div>
  );
};

export default Logo; 