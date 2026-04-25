import { CheckCircle2 } from 'lucide-react';
import data from '../data/frontendData.json';
import { resolveIcon } from '../utils/iconResolver';

export default function About() {
  const { hero, story, values } = data.about;

  return (
    <div className="pt-20">
      {/* Hero */}
      <section className="py-20 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl lg:text-6xl font-bold mb-6">{hero.title}</h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
            {hero.description}
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="relative">
              <img
                src={story.image}
                alt="Our Team"
                className="rounded-3xl shadow-2xl"
              />
              <div className="absolute -bottom-8 -right-8 bg-emerald-500 text-white p-8 rounded-2xl shadow-xl hidden sm:block">
                <div className="text-4xl font-bold">{story.experience.value}</div>
                <div className="text-sm font-medium opacity-80">{story.experience.label}</div>
              </div>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-6">{story.title}</h2>
              {story.paragraphs.map((p, i) => (
                <p key={i} className="text-lg text-slate-600 mb-6 leading-relaxed">
                  {p}
                </p>
              ))}
              <div className="space-y-4">
                {story.points.map((item, i) => (
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
            {values.map((value, i) => (
              <div key={i} className="bg-white p-10 rounded-3xl text-center shadow-sm hover:shadow-md transition-shadow border border-slate-100">
                <div className="bg-slate-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  {resolveIcon(value.icon, 32, value.iconColor)}
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
