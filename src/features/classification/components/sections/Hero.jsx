import { ExternalLink } from "lucide-react";

export const Hero = ({
    badge,
    title,
    description,
    image,
    imageAlt,
    imageHref,
    imageLinkLabel,
    links = [],
}) => (
    <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-blue-900 to-cyan-700 px-8 py-10 text-white shadow-xl">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-stretch lg:justify-between">
            <div className="min-w-0 flex-1">
                <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">{badge}</p>
                <h1 className="mt-3 text-4xl font-bold">{title}</h1>
                <p className="mt-4 max-w-3xl text-base leading-7 text-slate-100">{description}</p>
                {links.length ? (
                    <div className="mt-6 flex flex-wrap gap-3">
                        {links.map(({ id, href, label }) => (
                            <a
                                key={id}
                                href={href}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white transition hover:bg-white/20"
                            >
                                {label}
                                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                            </a>
                        ))}
                    </div>
                ) : null}
            </div>
            {image ? (
                <a
                    href={imageHref}
                    target="_blank"
                    rel="noreferrer"
                    className="relative block shrink-0 self-center p-1 transition hover:scale-[1.02] focus:outline-none lg:-my-6 lg:-mr-4"
                    aria-label={imageLinkLabel ?? title}
                >
                    <img
                        src={image}
                        alt={imageAlt ?? title}
                        className="block h-auto min-h-36 w-full rounded-2xl border border-white/40 object-contain shadow-lg lg:min-h-0 lg:w-80"
                    />
                </a>
            ) : null}
        </div>
    </div>
);
