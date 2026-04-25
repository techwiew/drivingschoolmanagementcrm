import { useState } from 'react';
import { Mail, Phone, MapPin, Star, ArrowRight, Building2 } from 'lucide-react';

export default function BookDemo() {
  const [formData, setFormData] = useState({
    fullName: '',
    schoolName: '',
    workEmail: '',
    phoneNumber: '',
    preferredDate: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Demo request:', formData);
    alert('Demo request submitted successfully! We will contact you soon.');
  };

  return (
    <div className="pt-32 pb-20 bg-[#f8faff]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb / Label */}
        <div className="mb-6">
          <span className="bg-cyan-100 text-cyan-600 px-3 py-1 rounded-md text-xs font-bold tracking-wider uppercase">
            Contact Us
          </span>
        </div>

        {/* Hero Section */}
        <div className="mb-16">
          <h1 className="text-5xl lg:text-6xl font-bold text-slate-900 mb-6">
            Let's scale your<br />school's efficiency.
          </h1>
          <p className="text-slate-500 text-lg max-w-2xl leading-relaxed">
            Our team of experts is ready to show you how DriveFlow can transform 
            your logistics and student management through high-velocity automation.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left Side: Info & Testimonial */}
          <div className="lg:col-span-4 space-y-8">
            {/* Contact Info Card */}
            <div className="hover-3d bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-4 mb-8">
                <div className="bg-cyan-100 p-3 rounded-xl text-cyan-600">
                  <Building2 size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Central HQ</h3>
                  <p className="text-sm text-slate-500">San Francisco, California</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-4 text-slate-600 hover:text-cyan-600 transition-colors cursor-pointer">
                  <Mail size={20} className="text-blue-500" />
                  <span className="text-sm font-medium">info@driveflow.com</span>
                </div>
                <div className="flex items-center gap-4 text-slate-600 hover:text-cyan-600 transition-colors cursor-pointer">
                  <Phone size={20} className="text-blue-500" />
                  <span className="text-sm font-medium">+1 800-DRIVE-FLOW</span>
                </div>
                <div className="flex items-center gap-4 text-slate-600 hover:text-cyan-600 transition-colors cursor-pointer">
                  <MapPin size={20} className="text-blue-500" />
                  <span className="text-sm font-medium">123 Tech Lane, San Francisco</span>
                </div>
              </div>
            </div>

            {/* Map Placeholder */}
            <div className="hover-3d relative rounded-3xl overflow-hidden h-64 shadow-sm border border-slate-100">
              <img 
                src="https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=2074&auto=format&fit=crop" 
                alt="Map" 
                className="w-full h-full object-cover grayscale opacity-60 hover:grayscale-0 transition-all duration-500"
              />
              <div className="absolute bottom-4 left-4 bg-white px-4 py-2 rounded-lg shadow-md flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                <span className="text-xs font-bold text-slate-900 uppercase">HQ: Open Now</span>
              </div>
            </div>

            {/* Testimonial Card */}
            <div className="hover-3d bg-blue-600 p-8 rounded-3xl text-white shadow-xl shadow-blue-500/20">
              <div className="flex gap-1 mb-6">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} size={16} fill="white" />
                ))}
              </div>
              <p className="text-lg font-medium leading-relaxed mb-8 italic">
                "The high-velocity onboarding experience was unparalleled. We were live in 48 hours."
              </p>
              <div className="flex items-center gap-4">
                <img 
                  src="https://i.pravatar.cc/100?u=director" 
                  alt="Avatar" 
                  className="w-12 h-12 rounded-xl border-2 border-white/20"
                />
                <div>
                  <h4 className="font-bold text-sm">Operations Director</h4>
                  <p className="text-xs text-blue-100">Global Driving Schools</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Demo Form */}
          <div className="lg:col-span-8">
            <div className="bg-white p-10 lg:p-16 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Book a Demo</h2>
              <p className="text-slate-500 mb-10">
                Schedule a 15-minute technical walkthrough with one of our operations architects.
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Full Name</label>
                    <input
                      type="text"
                      placeholder="John Smith"
                      required
                      className="w-full bg-[#f0f4ff] border-none rounded-xl py-4 px-6 focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-400"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">School Name</label>
                    <input
                      type="text"
                      placeholder="Elite Driving Academy"
                      required
                      className="w-full bg-[#f0f4ff] border-none rounded-xl py-4 px-6 focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-400"
                      value={formData.schoolName}
                      onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Work Email</label>
                    <input
                      type="email"
                      placeholder="john@school.edu"
                      required
                      className="w-full bg-[#f0f4ff] border-none rounded-xl py-4 px-6 focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-400"
                      value={formData.workEmail}
                      onChange={(e) => setFormData({ ...formData, workEmail: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Phone Number</label>
                    <input
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      className="w-full bg-[#f0f4ff] border-none rounded-xl py-4 px-6 focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-400"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Preferred Date</label>
                  <div className="relative">
                    <input
                      type="date"
                      required
                      className="w-full bg-[#f0f4ff] border-none rounded-xl py-4 px-6 focus:ring-2 focus:ring-blue-500 transition-all text-slate-600"
                      value={formData.preferredDate}
                      onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-3 group"
                  >
                    Confirm Demo Request <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                  <p className="mt-6 text-[10px] text-slate-400 text-center">
                    By clicking confirm, you agree to our Terms of Service and Privacy Policy.
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
