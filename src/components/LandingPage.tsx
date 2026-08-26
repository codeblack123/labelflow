import React from 'react';
import { FiActivity, FiArrowRight, FiSearch, FiGlobe, FiMenu } from 'react-icons/fi';

interface LandingPageProps {
    onGetStarted: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
    const [lang, setLang] = React.useState<'en' | 'id'>('en');

    const t = {
        en: {
            features: "Features",
            solutions: "Solutions",
            pricing: "Pricing",
            resources: "Resources",
            signIn: "Sign In",
            tagline: "NEXT GEN LOGISTICS",
            heroTitleMain: "OPTIMIZE YOUR",
            heroTitleAccent: "INVENTORY",
            heroTitleSuffix: "OPERATIONS",
            heroDesc: "Streamline your shipping labels, track stock in real-time, and eliminate fulfillment errors with our advanced customization platform.",
            getStarted: "Get Started Now",
            featuresTitle: "Why Choose Label Customizer?",
            solutionsTitle: "Integrated Solutions",
            pricingTitle: "Flexible Pricing",
            resourcesTitle: "Learning & Resources",
            stats: {
                uptime: "Uptime",
                orders: "Orders/Day",
                support: "Support"
            }
        },
        id: {
            features: "Fitur",
            solutions: "Solusi",
            pricing: "Harga",
            resources: "Sumber Daya",
            signIn: "Masuk",
            tagline: "LOGISTIK GENERASI BARU",
            heroTitleMain: "OPTIMALKAN",
            heroTitleAccent: "INVENTARIS",
            heroTitleSuffix: "ANDA",
            heroDesc: "Sederhanakan label pengiriman, lacak stok secara real-time, dan hilangkan kesalahan pemenuhan dengan platform kustomisasi canggih kami.",
            getStarted: "Mulai Sekarang",
            featuresTitle: "Mengapa Memilih Label Customizer?",
            solutionsTitle: "Solusi Terintegrasi",
            pricingTitle: "Harga Fleksibel",
            resourcesTitle: "Pembelajaran & Sumber Daya",
            stats: {
                uptime: "Waktu Aktif",
                orders: "Order/Hari",
                support: "Dukungan"
            }
        }
    };

    const content = t[lang];

    return (
        <div className="min-h-screen flex flex-col font-sans">
            {/* Header - Blue Theme matching App.tsx */}
            <header className="bg-blue-600 border-b border-blue-700 sticky top-0 z-50 shadow-lg relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <svg className="absolute left-0 top-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
                        <pattern id="header-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                            <rect x="0" y="0" width="2" height="2" fill="white" />
                            <rect x="10" y="10" width="2" height="2" fill="white" />
                        </pattern>
                        <rect width="100%" height="100%" fill="url(#header-pattern)" />
                    </svg>
                </div>

                <div className="relative mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        {/* Logo */}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/10 shadow-inner">
                                <FiActivity className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white tracking-tight leading-tight">Label Customizer</h1>
                                <p className="text-[0.7rem] text-blue-100 font-medium opacity-90 tracking-wide">WAREHOUSE SOLUTIONS</p>
                            </div>
                        </div>

                        {/* Desktop Nav */}
                        <nav className="hidden md:flex gap-6 text-blue-100 font-medium text-sm ml-4">
                            <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-white hover:bg-white/10 px-3 py-2 rounded-lg transition-colors">{content.features}</button>
                            <button onClick={() => document.getElementById('solutions')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-white hover:bg-white/10 px-3 py-2 rounded-lg transition-colors">{content.solutions}</button>
                            <button onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-white hover:bg-white/10 px-3 py-2 rounded-lg transition-colors">{content.pricing}</button>
                            <button onClick={() => document.getElementById('resources')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-white hover:bg-white/10 px-3 py-2 rounded-lg transition-colors">{content.resources}</button>
                        </nav>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setLang(prev => prev === 'en' ? 'id' : 'en')}
                            className="text-blue-100 hover:text-white hover:bg-white/10 px-3 py-2 rounded-lg transition-colors flex items-center gap-2 font-medium text-sm"
                        >
                            <FiGlobe className="w-5 h-5" />
                            <span>{lang === 'en' ? 'ID' : 'EN'}</span>
                        </button>
                        <div className="h-6 w-px bg-blue-400/30 hidden md:block"></div>
                        <button
                            onClick={onGetStarted}
                            className="text-sm font-bold bg-white text-blue-600 px-5 py-2.5 rounded-lg shadow-sm hover:bg-blue-50 transition-colors"
                        >
                            {content.signIn}
                        </button>
                        <button className="md:hidden text-white"><FiMenu className="w-6 h-6" /></button>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <main className="flex-grow relative bg-gray-900 text-white flex items-center min-h-[600px]">
                {/* Background Image - Warehouse/Inventory theme */}
                <div className="absolute inset-0 z-0">
                    <img
                        src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"
                        alt="Warehouse Inventory"
                        className="w-full h-full object-cover opacity-50"
                    />
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-gray-900/95 via-gray-900/70 to-transparent"></div>
                </div>

                <div className="container mx-auto px-6 relative z-10 py-20">
                    <div className="max-w-3xl animate-in slide-in-from-left fade-in duration-700">
                        <div className="inline-block px-3 py-1 bg-blue-500/20 border border-blue-400/30 rounded-full text-blue-300 text-xs font-bold tracking-wider mb-6 backdrop-blur-sm">
                            {content.tagline}
                        </div>
                        <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-8 tracking-tight">
                            {content.heroTitleMain}<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">{content.heroTitleAccent}</span><br />
                            {content.heroTitleSuffix}
                        </h1>

                        <p className="text-xl md:text-2xl mb-6 font-light text-gray-300 max-w-2xl leading-relaxed">
                            {content.heroDesc}
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 mb-12">
                            <button
                                onClick={onGetStarted}
                                className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-8 rounded-xl text-lg transition-all transform hover:scale-[1.02] shadow-lg shadow-blue-900/50 flex items-center justify-center gap-3"
                            >
                                {content.getStarted} <FiArrowRight className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Stats / Trust indicators */}
                        <div className="grid grid-cols-3 gap-8 border-t border-white/10 pt-8 max-w-lg">
                            <div>
                                <div className="text-3xl font-bold text-white mb-1">99.9%</div>
                                <div className="text-sm text-gray-400">{content.stats.uptime}</div>
                            </div>
                            <div>
                                <div className="text-3xl font-bold text-white mb-1">10k+</div>
                                <div className="text-sm text-gray-400">{content.stats.orders}</div>
                            </div>
                            <div>
                                <div className="text-3xl font-bold text-white mb-1">24/7</div>
                                <div className="text-sm text-gray-400">{content.stats.support}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Content Sections */}
            <section id="features" className="py-24 bg-white">
                <div className="container mx-auto px-6 text-center">
                    <h2 className="text-3xl font-bold mb-12">{content.featuresTitle}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                        <div className="p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mx-auto mb-6">
                                <FiSearch className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-4">Fast Extraction</h3>
                            <p className="text-gray-600">Extract order IDs and SKUs from PDFs and Excel files in seconds with 99.9% accuracy.</p>
                        </div>
                        <div className="p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-6">
                                <FiActivity className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-4">Batch Processing</h3>
                            <p className="text-gray-600">Handle thousands of labels at once with our specialized Massal Pro toolkit.</p>
                        </div>
                        <div className="p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-6">
                                <FiGlobe className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-4">Multi-Platform</h3>
                            <p className="text-gray-600">Support for Ginee, Shopee, TikTok, and more with specialized XLSX/PDF handling.</p>
                        </div>
                    </div>
                </div>
            </section>

            <section id="solutions" className="py-24 bg-gray-50">
                <div className="container mx-auto px-6 text-center">
                    <h2 className="text-3xl font-bold mb-12">{content.solutionsTitle}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 text-left">
                        <div className="flex gap-6 items-start">
                            <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0">1</div>
                            <div>
                                <h3 className="text-lg font-bold mb-2">Automated Sorting</h3>
                                <p className="text-gray-600">Automatically group labels by courier, region, or SKU for faster fulfillment.</p>
                            </div>
                        </div>
                        <div className="flex gap-6 items-start">
                            <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0">2</div>
                            <div>
                                <h3 className="text-lg font-bold mb-2">Inventory Sync</h3>
                                <p className="text-gray-600">Connect with your WMS to sync inventory levels in real-time as labels are scanned.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section id="pricing" className="py-24 bg-white">
                <div className="container mx-auto px-6 text-center">
                    <h2 className="text-3xl font-bold mb-12">{content.pricingTitle}</h2>
                    <div className="max-w-md mx-auto p-8 rounded-2xl border-2 border-blue-600 shadow-xl">
                        <h3 className="text-2xl font-bold mb-4">Enterprise Edition</h3>
                        <p className="text-4xl font-bold mb-6 text-blue-600">Custom</p>
                        <ul className="text-left space-y-4 mb-8">
                            <li className="flex items-center gap-3"><FiActivity className="text-blue-600" /> Unlimited Processing</li>
                            <li className="flex items-center gap-3"><FiActivity className="text-blue-600" /> Dedicated Support</li>
                            <li className="flex items-center gap-3"><FiActivity className="text-blue-600" /> Custom Integrations</li>
                        </ul>
                        <button onClick={onGetStarted} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors">Contact Sales</button>
                    </div>
                </div>
            </section>

            <section id="resources" className="py-24 bg-gray-900 text-white">
                <div className="container mx-auto px-6 text-center">
                    <h2 className="text-3xl font-bold mb-12">{content.resourcesTitle}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
                        <a href="#" className="p-6 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
                            <h3 className="font-bold mb-2">Documentation</h3>
                            <p className="text-sm text-gray-400">Everything you need to get started with our API and toolkit.</p>
                        </a>
                        <a href="#" className="p-6 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
                            <h3 className="font-bold mb-2">Video Tutorials</h3>
                            <p className="text-sm text-gray-400">Watch our step-by-step guides for advanced batch processing.</p>
                        </a>
                    </div>
                </div>
            </section>

            <footer className="bg-white py-12 border-t border-gray-100">
                <div className="container mx-auto px-6 text-center text-gray-500 text-sm">
                    &copy; {new Date().getFullYear()} Label Customizer Warehouse Solutions. All rights reserved.
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
