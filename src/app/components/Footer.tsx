import Link from 'next/link';

const Footer = () => {
  return (
    <footer className="w-full bg-gradient-to-r from-gray-900 to-gray-800 text-white py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-400">
              SmartRSSFeed
            </span>
          </div>
          
          <div className="flex flex-col items-center md:items-end space-y-2">
            <p className="text-sm text-gray-400">
              Dev by{' '}
              <Link 
                href="https://medahad.github.io" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 transition-colors duration-200 font-medium"
              >
                MEda
              </Link>
            </p>
            <p className="text-xs text-gray-500">
              © {new Date().getFullYear()} All rights reserved
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 