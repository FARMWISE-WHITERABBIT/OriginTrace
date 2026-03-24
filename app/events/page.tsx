import type { Metadata } from 'next';
import Link from 'next/link';
import { MarketingNav } from '@/components/marketing/nav';
import { MarketingFooter } from '@/components/marketing/footer';
import { getAdminClient } from '@/lib/supabase/admin';
import { Calendar, Clock, MapPin, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Events & Programmes | OriginTrace',
  description:
    'Join OriginTrace at upcoming events, workshops, and export development programmes across Africa.',
};

// Revalidate every 5 minutes so new events added in superadmin appear promptly
export const revalidate = 300;

interface Event {
  slug: string;
  title: string;
  short_title: string | null;
  theme: string | null;
  partner: string | null;
  date: string;
  start_time: string;
  location: string;
  tags: string[];
  is_free: boolean;
  registration_open: boolean;
  registration_closes_at: string | null;
}

async function getUpcomingEvents(): Promise<Event[]> {
  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('events')
      .select(
        'slug, title, short_title, theme, partner, date, start_time, ' +
        'location, tags, is_free, registration_open, registration_closes_at'
      )
      .gte('date', new Date().toISOString().slice(0, 10))
      .order('date', { ascending: true });

    if (error) {
      console.error('[events page] fetch error:', error);
      return [];
    }
    return (data ?? []) as Event[];
  } catch {
    return [];
  }
}

function isRegistrationOpen(event: Event): boolean {
  if (!event.registration_open) return false;
  if (event.registration_closes_at && new Date() > new Date(event.registration_closes_at)) {
    return false;
  }
  return true;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(':');
  const d = new Date();
  d.setHours(Number(h), Number(m));
  return d.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export default async function EventsPage() {
  const events = await getUpcomingEvents();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MarketingNav />

      {/* Hero */}
      <section className="pt-32 pb-16 px-6 bg-gradient-to-b from-emerald-50/60 to-background dark:from-emerald-950/20 dark:to-background">
        <div className="max-w-6xl mx-auto">
          <p className="text-emerald-600 dark:text-emerald-400 text-sm font-semibold tracking-widest uppercase mb-3">
            OriginTrace Events
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground leading-tight mb-4">
            Events &amp; Programmes
          </h1>
          <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl">
            Workshops, export programmes, and industry gatherings — where African exporters connect, learn, and grow.
          </p>
        </div>
      </section>

      {/* Events list */}
      <section className="flex-1 px-6 py-16">
        <div className="max-w-6xl mx-auto">
          {events.length > 0 ? (
            <>
              <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-8">
                Upcoming Events
              </h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {events.map((event) => {
                  const open = isRegistrationOpen(event);
                  return (
                    <div
                      key={event.slug}
                      className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden hover:shadow-lg hover:border-emerald-200 dark:hover:border-emerald-800 transition-all duration-200"
                    >
                      {/* Colour bar */}
                      <div className="h-2 bg-gradient-to-r from-[#0D3D32] to-[#2E7D6B]" />

                      <div className="p-6">
                        {/* Badges */}
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                          {event.partner && (
                            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-100 dark:border-emerald-900">
                              {event.partner}
                            </span>
                          )}
                          {event.is_free && (
                            <span className="text-xs font-semibold text-white bg-emerald-600 px-2.5 py-1 rounded-full">
                              Free
                            </span>
                          )}
                          {!open && (
                            <span className="text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                              Closed
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        {event.short_title && (
                          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                            {event.short_title}
                          </p>
                        )}
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-snug mb-3">
                          {event.title}
                        </h3>

                        {/* Theme */}
                        {event.theme && (
                          <p className="text-sm text-slate-500 dark:text-slate-400 italic mb-5 leading-relaxed">
                            {event.theme}
                          </p>
                        )}

                        {/* Details */}
                        <div className="space-y-2 mb-6">
                          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                            <Calendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>{formatDate(event.date)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                            <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>{formatTime(event.start_time)} prompt</span>
                          </div>
                          <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                            <MapPin className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                            <span>{event.location}</span>
                          </div>
                        </div>

                        {/* Tags */}
                        {event.tags?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-6">
                            {event.tags.map((tag) => (
                              <span key={tag} className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* CTA */}
                        <Link
                          href={`/events/${event.slug.replace('-2026', '').replace('-', '/')}`}
                          className={`flex items-center justify-center gap-2 w-full text-sm font-semibold py-3 px-5 rounded-xl transition-colors ${
                            open
                              ? 'bg-[#1F5F52] hover:bg-[#174D42] text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-default'
                          }`}
                        >
                          {open ? 'Register Free' : 'Registration Closed'}
                          {open && <ArrowRight className="h-4 w-4" />}
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 p-16 text-center">
              <p className="text-slate-500 dark:text-slate-400 font-medium mb-1">No upcoming events</p>
              <p className="text-slate-400 dark:text-slate-500 text-sm">Check back soon — more events are on the way.</p>
            </div>
          )}
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
