import { CheckCircle2, Award, Heart, ShieldCheck } from 'lucide-react';

export default function About() {
  return (
    <div className="pt-20">
      {/* Hero */}
      <section className="py-20 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl lg:text-6xl font-bold mb-6">Our Mission</h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
            Empowering driving schools worldwide with technology that simplifies management 
            and enhances the learning experience for every student.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=2070&auto=format&fit=crop"
                alt="Our Team"
                className="rounded-3xl shadow-2xl"
              />
              <div className="absolute -bottom-8 -right-8 bg-emerald-500 text-white p-8 rounded-2xl shadow-xl hidden sm:block">
                <div className="text-4xl font-bold">10+</div>
                <div className="text-sm font-medium opacity-80">Years of Experience</div>
              </div>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-6">Built by Experts for Experts</h2>
              <p className="text-lg text-slate-600 mb-6 leading-relaxed">
                DriveFlow was founded with a simple goal: to eliminate the paperwork and administrative 
                headaches that slow down driving schools. We understand the unique challenges of 
                managing instructors, vehicles, and student schedules.
              </p>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                Our team consists of industry veterans and tech enthusiasts who are passionate about 
                road safety and educational technology. We're constantly innovating to stay ahead 
                of the curve.
              </p>
              <div className="space-y-4">
                {[
                  'Student-centric approach',
                  'Instructor-focused tools',
                  'Data-driven insights',
                  'Reliable and secure platform'
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-slate-700 font-medium">
                    <CheckCircle2 className="text-emerald-500" size={20} />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-16">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Our Core Values</h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            These principles guide everything we do, from feature development to customer support.
          </p>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: 'Innovation',
                desc: 'We constantly push the boundaries of what is possible in school management.',
                icon: <Award className="text-emerald-500" size={32} />
              },
              {
                title: 'Integrity',
                desc: 'Transparency and trust are the foundation of our relationships with schools.',
                icon: <ShieldCheck className="text-blue-500" size={32} />
              },
              {
                title: 'Impact',
                desc: 'We measure our success by the growth and success of the schools we serve.',
                icon: <Heart className="text-rose-500" size={32} />
              }
            ].map((value, i) => (
              <div key={i} className="bg-white p-10 rounded-3xl text-center shadow-sm hover:shadow-md transition-shadow border border-slate-100">
                <div className="bg-slate-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  {value.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">{value.title}</h3>
                <p className="text-slate-600 leading-relaxed">
                  {value.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
