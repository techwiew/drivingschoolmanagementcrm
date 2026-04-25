import { ArrowRight, Shield, Users, FileText, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="pt-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32 bg-slate-50">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-emerald-500/5 -skew-x-12 transform origin-top" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                New: AI-Powered Scheduling
              </div>
              <h1 className="text-5xl lg:text-6xl font-extrabold text-slate-900 leading-tight mb-6">
                Manage Your <span className="text-emerald-600">Driving School</span> Efficiency
              </h1>
              <p className="text-xl text-slate-600 mb-8 leading-relaxed">
                Everything you need to run your driving school in one place. From student enrollment 
                to resource management and progress tracking.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/book-demo"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-xl shadow-blue-500/30 transition-all flex items-center justify-center gap-2 group"
                >
                  Book a Demo <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  to="/features"
                  className="bg-white border-2 border-slate-200 hover:border-blue-500 hover:text-blue-600 text-slate-700 px-8 py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center"
                >
                  View Features
                </Link>
              </div>
              <div className="mt-8 flex items-center gap-4 text-sm text-slate-500">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <img 
                      key={i} 
                      className="w-8 h-8 rounded-full border-2 border-white" 
                      src={`https://i.pravatar.cc/100?u=${i}`} 
                      alt="User" 
                    />
                  ))}
                </div>
                <span>Joined by 500+ driving schools worldwide</span>
              </div>
            </div>
            <div className="relative perspective-1000">
              <div className="bg-white p-4 rounded-[2.5rem] shadow-2xl border border-slate-100 relative z-10 transition-transform duration-700 hover:rotate-y-6 hover:-rotate-x-3 preserve-3d">
                <img
                  src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2026&auto=format&fit=crop"
                  alt="Dashboard Preview"
                  className="rounded-[1.8rem] shadow-inner"
                />
              </div>
              {/* Decorative elements */}
              <div className="absolute -top-6 -right-6 w-32 h-32 bg-blue-200 rounded-full blur-3xl opacity-50 animate-pulse" />
              <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-emerald-200 rounded-full blur-3xl opacity-50 animate-pulse" />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { label: 'Active Students', value: '10k+' },
              { label: 'Schools', value: '500+' },
              { label: 'Success Rate', value: '98%' },
              { label: 'Support', value: '24/7' },
            ].map((stat, i) => (
              <div key={i}>
                <div className="text-3xl font-bold text-slate-900">{stat.value}</div>
                <div className="text-slate-500 text-sm mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-white" id="features">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Powerful Features for Modern Schools
            </h2>
            <p className="text-lg text-slate-600">
              Our platform provides all the tools you need to digitize your driving school 
              operations and provide a premium experience to your students.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: 'Student Tracking',
                desc: 'Monitor student progress, attendance, and performance in real-time.',
                icon: <Users className="text-emerald-500" size={32} />,
                bg: 'bg-emerald-50'
              },
              {
                title: 'Notifications',
                desc: 'Notifications for upcoming lessons, payments, and mock tests.',
                icon: <Bell className="text-blue-500" size={32} />,
                bg: 'bg-blue-50'
              },
              {
                title: 'Resource Management',
                desc: 'Manage vehicles, trainers, and classrooms efficiently from one dashboard.',
                icon: <Shield className="text-purple-500" size={32} />,
                bg: 'bg-purple-50'
              },
              {
                title: 'Mock Tests',
                desc: 'Create and assign mock theory tests to prepare students for the real deal.',
                icon: <FileText className="text-indigo-500" size={32} />,
                bg: 'bg-indigo-50'
              },
              {
                title: 'Trainer Support',
                desc: 'Dedicated portals for trainers to manage their schedules and students.',
                icon: <Shield className="text-pink-500" size={32} />,
                bg: 'bg-pink-50'
              }
            ].map((feature, i) => (
              <div key={i} className="hover-3d p-8 rounded-3xl border border-slate-100 bg-white hover:border-blue-200 transition-all group">
                <div className={`${feature.bg} w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-slate-900 rounded-[3rem] p-12 lg:p-20 relative overflow-hidden text-center">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-emerald-600/20 to-transparent pointer-events-none" />
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-8 relative z-10">
              Ready to Transform Your Driving School?
            </h2>
            <p className="text-slate-400 text-xl mb-10 max-w-2xl mx-auto relative z-10">
              Join hundreds of schools that have already modernized their management with DriveFlow.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
              <Link
                to="/book-demo"
                className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-2xl font-bold text-lg transition-all"
              >
                Book a Demo
              </Link>
              <Link
                to="/about"
                className="bg-transparent border border-slate-700 hover:border-slate-500 text-white px-10 py-4 rounded-2xl font-bold text-lg transition-all"
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
